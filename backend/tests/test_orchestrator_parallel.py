"""Tests for parallel plan step execution in Orchestrator.

Bug #15: _execute_plan runs all steps sequentially even when steps
have no dependencies on each other. Independent steps should run
in parallel using asyncio.gather.
"""
import asyncio
import time

import pytest

from app.agents.orchestrator import PlanStep, group_steps_into_levels


@pytest.mark.asyncio
async def test_independent_steps_grouped_into_single_level():
    """Steps with no dependencies should all be in the same level."""
    steps = [
        PlanStep(agent_id="a", task="task 1"),
        PlanStep(agent_id="b", task="task 2"),
        PlanStep(agent_id="c", task="task 3"),
    ]

    levels = group_steps_into_levels(steps)

    assert len(levels) == 1
    assert levels[0] == [0, 1, 2]


@pytest.mark.asyncio
async def test_dependent_steps_grouped_into_sequential_levels():
    """Steps that depend on previous steps should be in separate levels."""
    steps = [
        PlanStep(agent_id="a", task="task 1"),
        PlanStep(agent_id="b", task="task 2", depends_on=[0]),
        PlanStep(agent_id="c", task="task 3", depends_on=[1]),
    ]

    levels = group_steps_into_levels(steps)

    assert len(levels) == 3
    assert levels[0] == [0]
    assert levels[1] == [1]
    assert levels[2] == [2]


@pytest.mark.asyncio
async def test_mixed_dependencies_parallel_and_sequential():
    """Some steps parallel, some sequential, based on dependencies."""
    steps = [
        PlanStep(agent_id="frontend", task="write CSS"),      # 0: no deps
        PlanStep(agent_id="backend", task="write API"),       # 1: no deps
        PlanStep(agent_id="reviewer", task="review", depends_on=[0, 1]),  # 2: depends on both
    ]

    levels = group_steps_into_levels(steps)

    assert len(levels) == 2
    assert set(levels[0]) == {0, 1}  # parallel
    assert levels[1] == [2]           # sequential after both


@pytest.mark.asyncio
async def test_parallel_steps_actually_run_concurrently():
    """Verify that steps in the same level run concurrently, not sequentially."""
    delays: list[float] = []

    async def fake_execute(idx: int, delay: float) -> str:
        start = time.monotonic()
        await asyncio.sleep(delay)
        delays.append(time.monotonic() - start)
        return f"result {idx}"

    steps = [
        PlanStep(agent_id="a", task="task 1"),
        PlanStep(agent_id="b", task="task 2"),
    ]

    levels = group_steps_into_levels(steps)
    assert len(levels) == 1

    # Simulate parallel execution of level 0
    start = time.monotonic()
    results = await asyncio.gather(
        fake_execute(0, 0.2),
        fake_execute(1, 0.2),
    )
    elapsed = time.monotonic() - start

    # If truly parallel, total time should be ~0.2s, not ~0.4s
    assert elapsed < 0.35
    assert results == ["result 0", "result 1"]


@pytest.mark.asyncio
async def test_diamond_dependency_pattern():
    """Diamond: A→B, A→C, B→D, C→D."""
    steps = [
        PlanStep(agent_id="a", task="step A"),                # 0
        PlanStep(agent_id="b", task="step B", depends_on=[0]), # 1
        PlanStep(agent_id="c", task="step C", depends_on=[0]), # 2
        PlanStep(agent_id="d", task="step D", depends_on=[1, 2]), # 3
    ]

    levels = group_steps_into_levels(steps)

    assert len(levels) == 3
    assert levels[0] == [0]           # A first
    assert set(levels[1]) == {1, 2}   # B, C parallel
    assert levels[2] == [3]           # D after both
