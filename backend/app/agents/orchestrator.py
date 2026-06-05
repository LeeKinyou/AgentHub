import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import AsyncGenerator, Union

import anthropic

from .base_adapter import AgentStatusEvent, BaseAdapter, Message, MessageChunk
from .registry import get_adapter

logger = logging.getLogger(__name__)

OrchestratorEvent = Union[MessageChunk, AgentStatusEvent]

# ---------------------------------------------------------------------------
# Planning prompt — produces a structured execution plan from user intent
# ---------------------------------------------------------------------------

PLANNING_SYSTEM_PROMPT = """\
You are the orchestration brain of a multi-agent coding platform.

Given a user request and a roster of expert agents, analyse the intent and
produce an execution plan as a JSON array.

Respond with ONLY a valid JSON array (no markdown fences, no explanation):
[
  {"agent_id": "<id>", "task": "<concise sub-task description>"},
  ...
]

Rules:
- Each step targets exactly one agent whose expertise best matches the sub-task.
- Steps execute sequentially; later steps may use earlier outputs as context.
- Prefer the MINIMUM number of steps — do not split tasks unnecessarily.
- If the request is simple enough for a single agent, emit a single-step plan.
- Reference agents by their exact `id` value from the roster."""


def _build_roster_prompt(agent_roster: list["AgentDescriptor"]) -> str:
    """Build a rich textual description of available agents for the planner."""
    parts: list[str] = []
    for a in agent_roster:
        block = f"[{a.agent_id}] {a.name} — role: {a.role}"
        if a.description:
            block += f"\n  description: {a.description}"
        if a.skills:
            block += f"\n  skills: {', '.join(a.skills)}"
        parts.append(block)
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class AgentDescriptor:
    agent_id: str
    name: str
    role: str
    adapter_type: str
    description: str | None = None
    system_prompt: str | None = None
    agent_config: dict | None = None
    skills: list[str] = field(default_factory=list)


@dataclass
class PlanStep:
    agent_id: str
    task: str
    depends_on: list[int] = field(default_factory=list)


def group_steps_into_levels(steps: list[PlanStep]) -> list[list[int]]:
    """Group steps into execution levels based on dependencies.

    Steps in the same level have no dependencies on each other
    and can run in parallel.

    Returns list of levels, each level is a list of step indices.
    """
    levels: list[list[int]] = []
    completed: set[int] = set()
    remaining = set(range(len(steps)))

    while remaining:
        ready = sorted(
            idx for idx in remaining
            if all(dep in completed for dep in steps[idx].depends_on)
        )
        if not ready:
            # Circular dependency — break by taking first remaining
            ready = [min(remaining)]

        levels.append(ready)
        completed.update(ready)
        remaining -= set(ready)

    return levels


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

class Orchestrator:
    """Multi-agent orchestrator with LLM-based intent routing.

    Flow:
    1. Single agent → delegate directly (no planning overhead).
    2. Multiple agents → call LLM planner to produce a plan.
    3. Execute plan steps sequentially, streaming each expert's output
       and forwarding accumulated context between steps.
    4. On planning failure → degrade to single-agent (first in roster).
    """

    def __init__(self) -> None:
        self._adapters: dict[str, BaseAdapter] = {}
        self._planner_client: anthropic.AsyncAnthropic | None = None
        self._planner_api_key: str | None = None

    # ------------------------------------------------------------------ #
    #  Public entry point                                                  #
    # ------------------------------------------------------------------ #

    async def process(
        self,
        session_id: str,
        user_content: str,
        agent_roster: list[AgentDescriptor],
        conversation_history: list[Message] | None = None,
    ) -> AsyncGenerator[OrchestratorEvent, None]:
        """Route user input through the orchestration pipeline.

        Args:
            session_id: current session identifier
            user_content: the latest user message
            agent_roster: all agents bound to this session
            conversation_history: prior messages for multi-turn context (optional)
        """
        if not agent_roster:
            yield MessageChunk(
                chunk_type="text",
                content="No agents configured for this session.",
                is_final=True,
            )
            return

        # --- fast path: single agent, skip planning ---
        if len(agent_roster) == 1:
            async for event in self._delegate_single(
                agent_roster[0],
                user_content,
                session_id,
                conversation_history=conversation_history,
            ):
                yield event
            return

        # --- multi-agent: plan then execute ---
        yield AgentStatusEvent(
            agent_id="orchestrator",
            status="analyzing",
            display_text="Analysing intent and planning execution…",
        )

        steps = await self._plan_execution(user_content, agent_roster)

        if steps is None:
            # Planning failed — degrade to single-agent (first expert)
            logger.warning(
                "Planning failed for session %s — degrading to single-agent",
                session_id,
            )
            fallback = agent_roster[0]
            yield AgentStatusEvent(
                agent_id="orchestrator",
                status="analyzing",
                display_text=f"Falling back to {fallback.name}…",
            )
            async for event in self._delegate_single(
                fallback,
                user_content,
                session_id,
                conversation_history=conversation_history,
            ):
                yield event
            return

        if not steps:
            yield MessageChunk(
                chunk_type="text",
                content="Planning produced an empty execution plan.",
                is_final=True,
            )
            return

        logger.info(
            "Execution plan for session %s: %d step(s)",
            session_id,
            len(steps),
        )

        # --- fast path: single-step plan, delegate directly ---
        if len(steps) == 1:
            step = steps[0]
            agent = self._find_agent(step.agent_id, agent_roster)
            if agent is None:
                yield MessageChunk(
                    chunk_type="text",
                    content=f"Planned agent {step.agent_id!r} not found in roster.",
                    is_final=True,
                )
                return
            async for event in self._delegate_single(
                agent,
                step.task,
                session_id,
                conversation_history=conversation_history,
            ):
                yield event
            return

        # --- multi-step: execute sequentially with context relay ---
        async for event in self._execute_plan(
            steps,
            agent_roster,
            session_id,
            conversation_history=conversation_history,
        ):
            yield event

    # ------------------------------------------------------------------ #
    #  Single-agent delegation                                             #
    # ------------------------------------------------------------------ #

    async def _delegate_single(
        self,
        agent: AgentDescriptor,
        user_content: str,
        session_id: str,
        conversation_history: list[Message] | None = None,
    ) -> AsyncGenerator[OrchestratorEvent, None]:
        """Delegate a task to a single agent with full streaming relay."""
        yield AgentStatusEvent(
            agent_id=agent.agent_id,
            status="executing",
            display_text=f"{agent.name} is working…",
        )

        adapter = self._get_adapter(agent)

        # Build message list: optional history + current user turn
        messages: list[Message] = []
        if conversation_history:
            messages.extend(conversation_history)
        messages.append(Message(role="user", content=user_content))

        try:
            async for chunk in adapter.stream_chat(messages):
                yield MessageChunk(
                    chunk_type=chunk.chunk_type,
                    content=chunk.content,
                    is_final=chunk.is_final,
                    agent_id=agent.agent_id,
                )
            yield AgentStatusEvent(
                agent_id=agent.agent_id,
                status="completed",
                display_text=f"{agent.name} finished.",
            )
        except Exception as exc:
            logger.exception("Agent %s failed: %s", agent.agent_id, exc)
            yield AgentStatusEvent(
                agent_id=agent.agent_id,
                status="failed",
                display_text=f"{agent.name} encountered an error.",
            )
            yield MessageChunk(
                chunk_type="text",
                content=f"[{agent.name}] Error: {exc}",
                is_final=True,
                agent_id=agent.agent_id,
            )

    # ------------------------------------------------------------------ #
    #  LLM-based planning                                                  #
    # ------------------------------------------------------------------ #

    async def _plan_execution(
        self,
        user_content: str,
        agent_roster: list[AgentDescriptor],
    ) -> list[PlanStep] | None:
        """Call an LLM to decompose the user request into sub-tasks.

        Uses the first agent whose role is 'orchestrator' (if any), otherwise
        falls back to the default Anthropic model from settings.

        Returns a list of PlanStep on success, None on failure.
        """
        roster_text = _build_roster_prompt(agent_roster)
        prompt = (
            f"Available agents:\n{roster_text}\n\n"
            f"User request:\n{user_content}"
        )

        # Pick the planning model: prefer an orchestrator-role agent's config
        plan_model, plan_api_key = self._resolve_planner_credentials(agent_roster)

        try:
            # Reuse cached client if API key matches
            if self._planner_client is None or self._planner_api_key != plan_api_key:
                self._planner_client = anthropic.AsyncAnthropic(api_key=plan_api_key)
                self._planner_api_key = plan_api_key

            response = await self._planner_client.messages.create(
                model=plan_model,
                max_tokens=1024,
                system=PLANNING_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            return self._parse_plan(raw, agent_roster)

        except Exception as exc:
            logger.exception("Planning LLM call failed: %s", exc)
            return None

    @staticmethod
    def _resolve_planner_credentials(
        agent_roster: list[AgentDescriptor],
    ) -> tuple[str, str]:
        """Return (model, api_key) for the planning LLM.

        Preference order:
        1. An agent with role='orchestrator' in the roster
        2. Global settings default
        """
        from ..core.config import get_settings

        for agent in agent_roster:
            if agent.role == "orchestrator" and agent.agent_config:
                cfg = agent.agent_config
                model = cfg.get("model", "")
                api_key = cfg.get("api_key", "")
                if model and api_key:
                    return model, api_key

        settings = get_settings()
        return settings.ANTHROPIC_MODEL, settings.ANTHROPIC_API_KEY

    # ------------------------------------------------------------------ #
    #  Plan parsing & validation                                           #
    # ------------------------------------------------------------------ #

    def _parse_plan(
        self,
        raw: str,
        agent_roster: list[AgentDescriptor],
    ) -> list[PlanStep] | None:
        """Parse and validate the LLM-generated execution plan."""
        valid_ids = {a.agent_id for a in agent_roster}

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Planning response is not valid JSON: %s", raw[:300])
            return None

        if not isinstance(data, list):
            logger.warning("Planning response is not a JSON array: %s", type(data).__name__)
            return None

        steps: list[PlanStep] = []
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                logger.warning("Plan step %d is not a dict, skipping", i)
                continue
            agent_id = item.get("agent_id", "")
            task = item.get("task", "")
            if agent_id not in valid_ids:
                logger.warning("Plan step %d references unknown agent %r, skipping", i, agent_id)
                continue
            if not task:
                logger.warning("Plan step %d has empty task, skipping", i)
                continue
            steps.append(PlanStep(agent_id=agent_id, task=task))

        return steps

    # ------------------------------------------------------------------ #
    #  Multi-step sequential execution                                     #
    # ------------------------------------------------------------------ #

    async def _execute_plan(
        self,
        steps: list[PlanStep],
        agent_roster: list[AgentDescriptor],
        session_id: str,
        conversation_history: list[Message] | None = None,
    ) -> AsyncGenerator[OrchestratorEvent, None]:
        """Execute plan steps with parallel execution for independent steps.

        Steps are grouped into levels based on dependencies. Steps in the
        same level have no dependencies on each other and run in parallel.
        """
        roster_map = {a.agent_id: a for a in agent_roster}
        accumulated_outputs: list[str] = [""] * len(steps)
        accumulated_names: list[str] = [""] * len(steps)

        levels = group_steps_into_levels(steps)

        for level in levels:
            # Execute all steps in this level concurrently
            async def _run_step(step_idx: int) -> tuple[int, list[OrchestratorEvent], str, str]:
                step = steps[step_idx]
                agent = roster_map.get(step.agent_id)
                events: list[OrchestratorEvent] = []

                if agent is None:
                    logger.warning("Step %d targets unknown agent %r", step_idx, step.agent_id)
                    return step_idx, events, "", ""

                events.append(AgentStatusEvent(
                    agent_id=agent.agent_id,
                    status="analyzing",
                    display_text=f"{agent.name} is analysing step {step_idx + 1}/{len(steps)}…",
                ))

                task_prompt = self._build_step_prompt(
                    step.task, step_idx, steps,
                    accumulated_outputs, accumulated_names,
                )

                events.append(AgentStatusEvent(
                    agent_id=agent.agent_id,
                    status="executing",
                    display_text=f"{agent.name} is working on step {step_idx + 1}…",
                ))

                step_output = ""
                adapter = self._get_adapter(agent)
                messages: list[Message] = []
                if conversation_history:
                    messages.extend(conversation_history)
                messages.append(Message(role="user", content=task_prompt))

                try:
                    async for chunk in adapter.stream_chat(messages):
                        step_output += chunk.content
                        events.append(MessageChunk(
                            chunk_type=chunk.chunk_type,
                            content=chunk.content,
                            is_final=chunk.is_final,
                            agent_id=agent.agent_id,
                        ))
                    events.append(AgentStatusEvent(
                        agent_id=agent.agent_id,
                        status="completed",
                        display_text=f"{agent.name} completed step {step_idx + 1}.",
                    ))
                except Exception as exc:
                    logger.exception("Agent %s failed on step %d: %s", agent.agent_id, step_idx, exc)
                    events.append(AgentStatusEvent(
                        agent_id=agent.agent_id,
                        status="failed",
                        display_text=f"{agent.name} encountered an error on step {step_idx + 1}.",
                    ))
                    step_output = f"[Error from {agent.name}: {exc}]"
                    events.append(MessageChunk(
                        chunk_type="text", content=step_output,
                        is_final=True, agent_id=agent.agent_id,
                    ))

                return step_idx, events, step_output, agent.name

            results = await asyncio.gather(*[_run_step(idx) for idx in level])

            # Yield events and accumulate outputs in step order
            for step_idx, events, step_output, agent_name in sorted(results, key=lambda r: r[0]):
                for event in events:
                    yield event
                accumulated_outputs[step_idx] = step_output
                accumulated_names[step_idx] = agent_name

    @staticmethod
    def _build_step_prompt(
        task: str,
        step_idx: int,
        steps: list[PlanStep],
        accumulated_outputs: list[str],
        accumulated_names: list[str],
    ) -> str:
        """Compose the prompt for a plan step, including prior context."""
        if not accumulated_outputs:
            return task

        context_parts: list[str] = []
        for j, (output, name) in enumerate(zip(accumulated_outputs, accumulated_names)):
            context_parts.append(
                f"--- Output from {name} (step {j + 1}) ---\n{output}"
            )

        remaining = len(steps) - step_idx - 1
        hint = f"\n\n({remaining} step(s) remain after yours)" if remaining > 0 else ""

        return (
            "Previous agent outputs for context:\n\n"
            + "\n\n".join(context_parts)
            + "\n\n---\n\nYour task:\n"
            + task
            + hint
        )

    # ------------------------------------------------------------------ #
    #  Adapter management                                                  #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _find_agent(
        agent_id: str,
        roster: list[AgentDescriptor],
    ) -> AgentDescriptor | None:
        for a in roster:
            if a.agent_id == agent_id:
                return a
        return None

    def _get_adapter(self, agent: AgentDescriptor) -> BaseAdapter:
        if agent.agent_id in self._adapters:
            return self._adapters[agent.agent_id]

        adapter = get_adapter(agent.adapter_type, agent.agent_config)
        self._adapters[agent.agent_id] = adapter
        return adapter

    async def cleanup(self):
        """Release resources held by all cached adapters (e.g. MCP subprocesses)."""
        for adapter in self._adapters.values():
            close_fn = getattr(adapter, "close", None)
            if close_fn:
                try:
                    await close_fn()
                except Exception as e:
                    logger.warning("Adapter cleanup error: %s", e)
        self._adapters.clear()
