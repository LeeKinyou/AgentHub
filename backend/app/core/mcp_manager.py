"""MCP (Model Context Protocol) client manager.

Manages stdio-based MCP server subprocesses, discovers their exposed tools,
and routes tool-call requests to the correct server connection.

Uses the official ``mcp`` Python SDK for protocol handling rather than
hand-rolled JSON-RPC.

Lifecycle
---------
1. ``connect_all(server_configs)`` — spawns one subprocess per config,
   performs the MCP handshake, and discovers tools.
2. ``call_tool(name, args)`` — routes a tool call to the owning server.
3. ``disconnect_all()`` — tears down every connection and kills subprocesses.

Each ``MCPServerConnection`` keeps its subprocess alive via a background task
that holds the ``stdio_client`` / ``ClientSession`` context managers open
until ``disconnect()`` is called.
"""

import asyncio
import logging
from dataclasses import dataclass, field

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS: int = 10


# ---------------------------------------------------------------------------
# Tool descriptor
# ---------------------------------------------------------------------------


@dataclass
class MCPTool:
    """Metadata for a single tool exposed by an MCP server."""

    name: str
    description: str
    input_schema: dict = field(default_factory=dict)
    server_name: str = ""

    def to_anthropic_tool(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

    def to_openai_tool(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema,
            },
        }


# ---------------------------------------------------------------------------
# Single-server connection (using official mcp SDK)
# ---------------------------------------------------------------------------


class MCPServerConnection:
    """Manages one MCP server subprocess and its discovered tools.

    The subprocess lifecycle is managed by the ``mcp`` SDK's ``stdio_client``
    context manager, which is kept alive in a background task until
    ``disconnect()`` is called.
    """

    def __init__(
        self,
        name: str,
        command: str,
        args: list[str],
        env: dict | None = None,
    ) -> None:
        self.name = name
        self._command = command
        self._args = args
        self._env = env

        self._session: ClientSession | None = None
        self._tools: list[MCPTool] = []
        self._tool_map: dict[str, MCPTool] = {}
        self._connected: bool = False

        # Signalled when disconnect() is requested; the background task awaits
        # this to know when to exit the context managers.
        self._disconnect_event: asyncio.Event = asyncio.Event()
        # Signalled when handshake completes successfully.
        self._ready_event: asyncio.Event = asyncio.Event()
        self._bg_task: asyncio.Task | None = None

    # -- public properties ----------------------------------------------------

    @property
    def tools(self) -> list[MCPTool]:
        return list(self._tools)

    @property
    def is_connected(self) -> bool:
        return self._connected

    # -- lifecycle ------------------------------------------------------------

    async def connect(self) -> list[MCPTool]:
        """Spawn the server process, perform the MCP handshake, and discover tools.

        Returns the list of tools the server exposes.
        """
        server_params = StdioServerParameters(
            command=self._command,
            args=self._args,
            env=self._env,
        )

        logger.info(
            "Starting MCP server '%s': %s %s",
            self.name,
            self._command,
            " ".join(str(a) for a in self._args),
        )

        self._disconnect_event.clear()
        self._ready_event.clear()
        self._bg_task = asyncio.create_task(
            self._run_context_manager(server_params),
            name=f"mcp-{self.name}",
        )

        # Wait until handshake completes or the task fails (20s timeout).
        done, _ = await asyncio.wait(
            [asyncio.create_task(self._ready_event.wait())],
            timeout=20.0,
            return_when=asyncio.FIRST_COMPLETED,
        )

        if not self._connected:
            if self._bg_task.done() and self._bg_task.exception():
                raise self._bg_task.exception()  # type: ignore[misc]
            raise RuntimeError(
                f"MCP server '{self.name}' failed to connect within 20s "
                f"({self._command} {' '.join(str(a) for a in self._args)})"
            )

        return list(self._tools)

    async def _run_context_manager(self, server_params: StdioServerParameters) -> None:
        """Keep the stdio transport and session alive in a background task.

        This is the *only* place we enter ``stdio_client`` and ``ClientSession``
        context managers, which guarantees clean teardown of pipes and subprocess.
        """
        try:
            async with stdio_client(server_params) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    self._session = session

                    # MCP handshake
                    await session.initialize()

                    # Discover tools
                    result = await session.list_tools()
                    self._tools = [
                        MCPTool(
                            name=t.name,
                            description=t.description or "",
                            input_schema=t.inputSchema if hasattr(t, "inputSchema") else {},
                            server_name=self.name,
                        )
                        for t in result.tools
                    ]
                    self._tool_map = {t.name: t for t in self._tools}

                    logger.info(
                        "MCP server '%s' ready — %d tool(s): [%s]",
                        self.name,
                        len(self._tools),
                        ", ".join(t.name for t in self._tools),
                    )
                    self._connected = True
                    self._ready_event.set()

                    # Block until disconnect() signals us to shut down
                    await self._disconnect_event.wait()

        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("MCP server '%s' connection error: %s", self.name, exc)
            self._ready_event.set()  # 唤醒 connect() 避免死等
        finally:
            self._connected = False
            self._session = None
            self._tool_map.clear()

    async def disconnect(self) -> None:
        """Gracefully shut down the connection and terminate the subprocess."""
        if not self._connected and self._disconnect_event.is_set():
            return

        self._disconnect_event.set()

        if self._bg_task and not self._bg_task.done():
            try:
                await asyncio.wait_for(self._bg_task, timeout=5.0)
            except (asyncio.TimeoutError, Exception):
                self._bg_task.cancel()
                try:
                    await self._bg_task
                except asyncio.CancelledError:
                    pass

        self._connected = False
        logger.info("MCP server '%s' disconnected", self.name)

    # -- tool operations ------------------------------------------------------

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Execute a tool on this server.

        Always returns ``{"content": [...], "isError": bool}``.
        """
        if not self._session or not self._connected:
            return {
                "content": [{"type": "text", "text": f"MCP server '{self.name}' is not connected"}],
                "isError": True,
            }

        if tool_name not in self._tool_map:
            return {
                "content": [{"type": "text", "text": f"Tool '{tool_name}' not found on server '{self.name}'"}],
                "isError": True,
            }

        try:
            result = await self._session.call_tool(tool_name, arguments)

            if result.isError:
                error_text = (
                    result.content[0].text
                    if result.content and hasattr(result.content[0], "text")
                    else "Unknown MCP error"
                )
                return {"content": [{"type": "text", "text": error_text}], "isError": True}

            content = []
            for item in result.content:
                if hasattr(item, "text"):
                    content.append({"type": "text", "text": item.text})
                else:
                    content.append({"type": "text", "text": str(item)})
            return {"content": content, "isError": False}

        except Exception as exc:
            logger.exception("MCP tool call failed: %s.%s(%s)", self.name, tool_name, arguments)
            return {"content": [{"type": "text", "text": f"Tool execution failed: {exc}"}], "isError": True}


# ---------------------------------------------------------------------------
# Multi-server manager
# ---------------------------------------------------------------------------


class MCPClientManager:
    """Manages connections to multiple MCP servers for a single agent.

    Provides a unified interface for tool discovery and execution across
    all connected servers.

    Usage::

        manager = MCPClientManager()
        await manager.connect_all(mcp_server_configs)
        tools = manager.get_all_tools()
        result = await manager.call_tool("tool_name", {"arg": "val"})
        await manager.disconnect_all()
    """

    def __init__(self) -> None:
        self._connections: dict[str, MCPServerConnection] = {}
        self._tool_map: dict[str, MCPServerConnection] = {}

    # -- bulk lifecycle -------------------------------------------------------

    async def connect_all(self, server_configs: list[dict]) -> list[MCPTool]:
        """Connect to all configured MCP servers concurrently.

        Each config dict should contain:
            - ``name`` (str): server identifier
            - ``command`` (str): executable (e.g. ``"npx"``, ``"node"``, ``"python"``)
            - ``args`` (list[str]): command arguments
            - ``env`` (dict[str, str], optional): environment variables

        Returns an aggregated list of all discovered tools.
        """
        if not server_configs:
            return []

        connections: list[MCPServerConnection] = []
        for cfg in server_configs:
            name = cfg.get("name", "")
            command = cfg.get("command", "")
            args = cfg.get("args", [])
            env = cfg.get("env")
            if not name or not command:
                logger.warning("Skipping MCP server with missing name or command: %s", cfg)
                continue
            if name in self._connections:
                logger.warning("MCP server '%s' already connected, skipping duplicate", name)
                continue
            connections.append(MCPServerConnection(name=name, command=command, args=args, env=env))

        # Connect concurrently — each spawns its own subprocess.
        results = await asyncio.gather(
            *(conn.connect() for conn in connections),
            return_exceptions=True,
        )

        all_tools: list[MCPTool] = []
        for conn, result in zip(connections, results):
            if isinstance(result, Exception):
                logger.error("Failed to connect MCP server '%s': %s", conn.name, result)
                continue
            self._connections[conn.name] = conn
            for tool in result:
                self._tool_map[tool.name] = conn
            all_tools.extend(result)

        logger.info(
            "MCP manager: %d/%d servers connected, %d tool(s) available",
            sum(1 for c in self._connections.values() if c.is_connected),
            len(server_configs),
            len(all_tools),
        )
        return all_tools

    async def disconnect_all(self) -> None:
        """Gracefully shut down all server subprocesses."""
        for conn in self._connections.values():
            try:
                await conn.disconnect()
            except Exception as exc:
                logger.warning("Error disconnecting MCP server '%s': %s", conn.name, exc)
        self._connections.clear()
        self._tool_map.clear()

    # -- tool operations ------------------------------------------------------

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Route a tool call to the appropriate MCP server.

        Always returns ``{"content": [...], "isError": bool}``.
        """
        conn = self._tool_map.get(tool_name)
        if not conn:
            return {
                "content": [{"type": "text", "text": f"Unknown MCP tool: {tool_name}"}],
                "isError": True,
            }
        return await conn.call_tool(tool_name, arguments)

    # -- queries --------------------------------------------------------------

    def has_tool(self, tool_name: str) -> bool:
        """Check if a tool name is served by any connected MCP server."""
        return tool_name in self._tool_map

    def get_all_tools(self) -> list[MCPTool]:
        """Return all discovered tools across all connected servers."""
        return [tool for conn in self._connections.values() for tool in conn.tools]
