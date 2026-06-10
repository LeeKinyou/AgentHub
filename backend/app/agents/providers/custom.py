"""Custom agent adapter with MCP tool-call loop support.

Supports Anthropic (Claude) and OpenAI (GPT / compatible) APIs.
When MCP servers are configured, their tools are discovered at first use
and tool-call responses from the LLM are transparently executed and fed
back, up to MAX_TOOL_ROUNDS iterations.
"""

import json
import logging
from typing import AsyncGenerator

import anthropic
import openai

from ...core.config import get_settings
from ...core.mcp_manager import MCPClientManager, MCPTool, MAX_TOOL_ROUNDS
from ..base_adapter import BaseAdapter, Message, MessageChunk

logger = logging.getLogger(__name__)


class CustomAdapter(BaseAdapter):
    """Custom user-defined agent adapter.

    Supports:
    - Anthropic API (Claude)
    - OpenAI API (GPT) and OpenAI-compatible APIs
    - Custom system prompt, tools, skills, MCP servers
    - Transparent tool-call loop for both API providers
    """

    def __init__(self, agent_config: dict | None = None):
        settings = get_settings()
        self.agent_config = agent_config or {}

        self.api_provider = self.agent_config.get("api_provider", "anthropic")
        self.api_key = self.agent_config.get("api_key", "") or self._get_default_key(settings)
        self.base_url = self.agent_config.get("base_url", "")
        self.model = self.agent_config.get("model", "") or self._get_default_model(settings)

        self._init_client(settings)
        self._mcp_manager: MCPClientManager | None = None
        self._mcp_initialized: bool = False

    @property
    def _is_openai_compatible(self) -> bool:
        return self.api_provider in ("openai", "custom")

    def _get_default_key(self, settings) -> str:
        if self._is_openai_compatible:
            return settings.OPENAI_API_KEY
        return settings.ANTHROPIC_API_KEY

    def _get_default_model(self, settings) -> str:
        if self._is_openai_compatible:
            return settings.OPENAI_MODEL
        return settings.ANTHROPIC_MODEL

    def _init_client(self, settings):
        if self._is_openai_compatible:
            self.client = openai.AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url or settings.OPENAI_BASE_URL,
                timeout=120.0,
            )
        else:
            self.client = anthropic.AsyncAnthropic(api_key=self.api_key, timeout=120.0)

    @property
    def system_prompt(self) -> str:
        base = self.agent_config.get("system_prompt") or "You are a helpful assistant."
        file_ops_instruction = """

## ⚠️ IMPORTANT: File Creation Protocol
When the user asks you to create, modify, or delete files or projects, you MUST use @file_operation directives. Do NOT output file content as plain text or code blocks — the system will create the actual files on disk from these directives.

### Creating a file:
@file_operation {"action": "create", "path": "path/to/file.ext", "content": "full file content here"}

### Modifying a file:
@file_operation {"action": "modify", "path": "path/to/file.ext", "newContent": "full new file content"}

### Deleting a file:
@file_operation {"action": "delete", "path": "path/to/file.ext"}

### Example — Creating a complete project with multiple files:
When asked to create a web clock project, respond like this:

我将为您创建一个网页时钟项目，包含以下文件：

@file_operation {"action": "create", "path": "clock/index.html", "content": "<!DOCTYPE html>\n<html>\n<head><title>Clock</title></head>\n<body><div id=\"clock\"></div><script>setInterval(()=>{document.getElementById('clock').innerText=new Date().toLocaleTimeString()},1000)</script></body>\n</html>"}

@file_operation {"action": "create", "path": "clock/style.css", "content": "body{display:flex;justify-content:center;align-items:center;height:100vh;font-family:monospace;font-size:4rem}"}

All files have been created. You can open clock/index.html in a browser.

### Rules:
1. NEVER output file content as code blocks (```html, ```python, etc.) when creating files — use @file_operation only
2. Use relative paths from the project root directory
3. Include the COMPLETE file content in the content field — do not abbreviate or use placeholders
4. You can include multiple @file_operation directives in one response
5. Briefly explain what you're creating, then output the @file_operation directives, then confirm completion
"""
        return base + file_ops_instruction

    @property
    def tools(self) -> list[dict]:
        return self.agent_config.get("tools", [])

    @property
    def skills(self) -> list[str]:
        return self.agent_config.get("skills", [])

    @property
    def mcp_servers(self) -> list[dict]:
        return self.agent_config.get("mcp_servers", [])

    def _build_system_prompt(self) -> str:
        parts = [self.system_prompt]
        if self.skills:
            skills_text = "\n\n## Available Skills\n"
            for i, skill in enumerate(self.skills, 1):
                skills_text += f"{i}. {skill}\n"
            parts.append(skills_text)
        return "\n".join(parts)

    # ------------------------------------------------------------------ #
    #  MCP lifecycle                                                       #
    # ------------------------------------------------------------------ #

    async def _ensure_mcp(self) -> MCPClientManager:
        """Lazily connect to configured MCP servers on first use."""
        if self._mcp_initialized:
            return self._mcp_manager  # type: ignore[return-value]

        self._mcp_manager = MCPClientManager()
        if self.mcp_servers:
            try:
                await self._mcp_manager.connect_all(self.mcp_servers)
            except Exception as e:
                logger.error("MCP initialization failed: %s", e)
        self._mcp_initialized = True
        return self._mcp_manager

    async def close(self):
        """Release all MCP subprocesses. Call when adapter is no longer needed."""
        if self._mcp_manager:
            await self._mcp_manager.disconnect_all()
            self._mcp_manager = None
            self._mcp_initialized = False

    # ------------------------------------------------------------------ #
    #  Tool helpers                                                        #
    # ------------------------------------------------------------------ #

    def _build_tools_payload(self, mcp_tools: list[MCPTool]) -> list[dict]:
        """Merge user-defined tools with MCP-discovered tools for the active API."""
        payload: list[dict] = []
        for tool in self.tools:
            if self._is_openai_compatible:
                if tool.get("type") == "function" and "function" in tool:
                    payload.append(tool)
            else:
                if "name" in tool and "input_schema" in tool:
                    payload.append(tool)
        if self._is_openai_compatible:
            payload.extend(t.to_openai_tool() for t in mcp_tools)
        else:
            payload.extend(t.to_anthropic_tool() for t in mcp_tools)
        return payload

    @staticmethod
    def _extract_mcp_tool_names(mcp_tools: list[MCPTool]) -> set[str]:
        return {t.name for t in mcp_tools}

    @staticmethod
    def _build_tool_result_content(result: dict) -> str:
        """Normalize an MCP tool result dict into a plain string."""
        parts = []
        for item in result.get("content", []):
            if item.get("type") == "text":
                parts.append(item["text"])
            else:
                parts.append(json.dumps(item, ensure_ascii=False))
        return "\n".join(parts) if parts else json.dumps(result, ensure_ascii=False)

    # ------------------------------------------------------------------ #
    #  Public streaming entry point                                        #
    # ------------------------------------------------------------------ #

    async def stream_chat(
        self,
        messages: list[Message],
        **kwargs,
    ) -> AsyncGenerator[MessageChunk, None]:
        mcp = await self._ensure_mcp()
        mcp_tools = mcp.get_all_tools()
        tools_payload = self._build_tools_payload(mcp_tools)
        mcp_tool_names = self._extract_mcp_tool_names(mcp_tools)
        max_tokens = kwargs.get("max_tokens", 4096)

        if self._is_openai_compatible:
            api_messages = [{"role": "system", "content": self._build_system_prompt()}]
            api_messages += [{"role": m.role, "content": m.content} for m in messages]
            async for chunk in self._loop_openai(api_messages, tools_payload, mcp_tool_names, mcp, max_tokens):
                yield chunk
        else:
            api_messages = [{"role": m.role, "content": m.content} for m in messages]
            async for chunk in self._loop_anthropic(api_messages, tools_payload, mcp_tool_names, mcp, max_tokens):
                yield chunk

    # ------------------------------------------------------------------ #
    #  Anthropic tool-call loop                                            #
    # ------------------------------------------------------------------ #

    async def _loop_anthropic(
        self,
        api_messages: list[dict],
        tools_payload: list[dict],
        mcp_tool_names: set[str],
        mcp: MCPClientManager,
        max_tokens: int,
        round_num: int = 0,
    ) -> AsyncGenerator[MessageChunk, None]:
        call_kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": self._build_system_prompt(),
            "messages": api_messages,
        }
        if tools_payload:
            call_kwargs["tools"] = tools_payload

        accumulated_blocks: list[dict] = []
        current_text = ""
        current_tool_input_json = ""
        current_tool_id = ""
        current_tool_name = ""
        in_tool_use = False

        async with self.client.messages.stream(**call_kwargs) as stream:
            async for event in stream:
                etype = getattr(event, "type", "")

                if etype == "content_block_start":
                    block = getattr(event, "content_block", None)
                    if block and getattr(block, "type", None) == "tool_use":
                        in_tool_use = True
                        current_tool_id = block.id
                        current_tool_name = block.name
                        current_tool_input_json = ""
                    else:
                        in_tool_use = False
                        current_text = ""

                elif etype == "content_block_delta":
                    delta = getattr(event, "delta", None)
                    if delta is None:
                        continue
                    dtype = getattr(delta, "type", "")
                    if dtype == "text_delta" and not in_tool_use:
                        text = delta.text
                        current_text += text
                        yield MessageChunk(chunk_type="text", content=text, is_final=False)
                    elif dtype == "input_json_delta":
                        current_tool_input_json += delta.partial_json  # type: ignore[attr-defined]

                elif etype == "content_block_stop":
                    if in_tool_use:
                        try:
                            tool_input = json.loads(current_tool_input_json) if current_tool_input_json else {}
                        except json.JSONDecodeError:
                            tool_input = {}
                        accumulated_blocks.append({
                            "type": "tool_use",
                            "id": current_tool_id,
                            "name": current_tool_name,
                            "input": tool_input,
                        })
                        in_tool_use = False
                    else:
                        if current_text:
                            accumulated_blocks.append({"type": "text", "text": current_text})

        # check for tool calls
        tool_use_blocks = [b for b in accumulated_blocks if b.get("type") == "tool_use"]
        if not tool_use_blocks:
            yield MessageChunk(chunk_type="text", content="", is_final=True)
            return

        if round_num >= MAX_TOOL_ROUNDS:
            yield MessageChunk(
                chunk_type="text",
                content=f"\n[Stopped: exceeded maximum of {MAX_TOOL_ROUNDS} tool-call rounds]",
                is_final=True,
            )
            return

        # execute tools and build continuation
        new_messages = list(api_messages)
        new_messages.append({"role": "assistant", "content": accumulated_blocks})

        tool_results: list[dict] = []
        for block in tool_use_blocks:
            result_text, is_error = await self._execute_tool(
                block["name"], block["input"], mcp_tool_names, mcp,
            )
            yield MessageChunk(
                chunk_type="tool_status",
                content=json.dumps({"tool": block["name"], "done": True, "isError": is_error}, ensure_ascii=False),
                is_final=False,
            )
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block["id"],
                "content": result_text,
                **({"is_error": True} if is_error else {}),
            })

        new_messages.append({"role": "user", "content": tool_results})

        async for chunk in self._loop_anthropic(new_messages, tools_payload, mcp_tool_names, mcp, max_tokens, round_num + 1):
            yield chunk

    # ------------------------------------------------------------------ #
    #  OpenAI tool-call loop                                               #
    # ------------------------------------------------------------------ #

    async def _loop_openai(
        self,
        api_messages: list[dict],
        tools_payload: list[dict],
        mcp_tool_names: set[str],
        mcp: MCPClientManager,
        max_tokens: int,
        round_num: int = 0,
    ) -> AsyncGenerator[MessageChunk, None]:
        call_kwargs: dict = {
            "model": self.model,
            "messages": api_messages,
            "stream": True,
            "max_tokens": max_tokens,
        }
        if tools_payload:
            call_kwargs["tools"] = tools_payload

        stream = await self.client.chat.completions.create(**call_kwargs)

        tool_calls_map: dict[int, dict] = {}
        text_buf = ""

        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta is None:
                continue
            if delta.content:
                text_buf += delta.content
                yield MessageChunk(chunk_type="text", content=delta.content, is_final=False)
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_map:
                        tool_calls_map[idx] = {"id": "", "name": "", "arguments_buf": ""}
                    entry = tool_calls_map[idx]
                    if tc.id:
                        entry["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            entry["name"] = tc.function.name
                        if tc.function.arguments:
                            entry["arguments_buf"] += tc.function.arguments

        if not tool_calls_map:
            yield MessageChunk(chunk_type="text", content="", is_final=True)
            return

        if round_num >= MAX_TOOL_ROUNDS:
            yield MessageChunk(
                chunk_type="text",
                content=f"\n[Stopped: exceeded maximum of {MAX_TOOL_ROUNDS} tool-call rounds]",
                is_final=True,
            )
            return

        sorted_calls = [tool_calls_map[i] for i in sorted(tool_calls_map.keys())]

        # build assistant message with tool_calls
        assistant_tool_calls = [
            {"id": tc["id"], "type": "function", "function": {"name": tc["name"], "arguments": tc["arguments_buf"]}}
            for tc in sorted_calls
        ]
        assistant_msg: dict = {"role": "assistant", "tool_calls": assistant_tool_calls}
        if text_buf:
            assistant_msg["content"] = text_buf

        new_messages = list(api_messages)
        new_messages.append(assistant_msg)

        # execute each tool
        for tc in sorted_calls:
            try:
                tool_args = json.loads(tc["arguments_buf"]) if tc["arguments_buf"] else {}
            except json.JSONDecodeError:
                tool_args = {}

            result_text, is_error = await self._execute_tool(
                tc["name"], tool_args, mcp_tool_names, mcp,
            )
            yield MessageChunk(
                chunk_type="tool_status",
                content=json.dumps({"tool": tc["name"], "done": True, "isError": is_error}, ensure_ascii=False),
                is_final=False,
            )
            new_messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result_text,
            })

        async for chunk in self._loop_openai(new_messages, tools_payload, mcp_tool_names, mcp, max_tokens, round_num + 1):
            yield chunk

    # ------------------------------------------------------------------ #
    #  Shared tool execution                                                #
    # ------------------------------------------------------------------ #

    async def _execute_tool(
        self,
        tool_name: str,
        tool_input: dict,
        mcp_tool_names: set[str],
        mcp: MCPClientManager,
    ) -> tuple[str, bool]:
        """Execute a tool and return (result_text, is_error)."""
        if tool_name in mcp_tool_names:
            result = await mcp.call_tool(tool_name, tool_input)
        else:
            result = {
                "content": [{"type": "text", "text": f"Tool '{tool_name}' has no registered handler"}],
                "isError": True,
            }
        return self._build_tool_result_content(result), result.get("isError", False)
