# Multi-Agent Telegram Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable nanobot to route different Telegram chats to different AI agents/personas, so Daniel can have a "FreedomCare Work" agent and a "Personal Projects" agent in separate Telegram conversations.

**Architecture:** Add per-chat agent routing on top of nanobot's existing single-agent loop. Each Telegram chat maps to a named agent in config. The AgentLoop becomes "agent-aware" — it reads the agent name from message metadata and applies the correct model/config. No spawning multiple loops (complex), just dynamic config selection per message.

**Tech Stack:** Python (nanobot package), python-telegram-bot, aiohttp

---

## File Map

```
~/.nanobot/config.json                              # Add: chat_agent_map, named agents
~/.local/share/uv/tools/nanobot-ai/lib/python3.14/site-packages/nanobot/
  config/schema.py                                  # Add: AgentSpec, chat_agent_map to schema
  channels/telegram.py                              # Modify: pass agent name via metadata
  channels/base.py                                  # Modify: _handle_message accepts agent_name
  agent/loop.py                                     # Modify: AgentLoop._process_message agent-aware
  session/manager.py                                # Modify: Session dataclass add agent_name
  cli/commands.py                                   # Modify: gateway creates multi-agent config
```

---

## Task 1: Schema — Add Named Agents and Chat Routing Config

**Files:**
- Modify: `config/schema.py:62-100`

- [ ] **Step 1: Read current schema**

Read `config/schema.py` lines 1-100 to understand current AgentDefaults and AgentsConfig structure.

- [ ] **Step 2: Add AgentSpec class after AgentDefaults**

```python
class AgentSpec(Base):
    """Named agent configuration (e.g., 'ralph', 'coding', 'freedomcare')."""
    model: str = "anthropic/claude-sonnet-4-6"
    provider: str = "auto"
    max_tokens: int = 8192
    context_window_tokens: int = 65_536
    temperature: float = 0.1
    max_tool_iterations: int = 200
    max_tool_result_chars: int = 16_000
    reasoning_effort: str | None = None
    timezone: str = "Europe/Madrid"
    workspace: str = "~/.nanobot/workspace"
    mcp_servers: dict[str, MCPServerConfig] | None = None
    description: str = ""
    personality: str = ""
    system_prompt: str | None = None  # Optional system prompt override
```

- [ ] **Step 3: Add chat_agent_map to AgentsConfig**

In `AgentsConfig` class, add:
```python
chat_agent_map: dict[str, str] = Field(default_factory=dict)  # chat_id -> agent_name
named_agents: dict[str, AgentSpec] = Field(default_factory=dict)  # agent_name -> AgentSpec
```

- [ ] **Step 4: Run test to verify schema loads**

```python
# test_schema.py
from nanobot.config.schema import AgentsConfig
cfg = AgentsConfig.model_validate({
    "chat_agent_map": {"123456": "freedomcare"},
    "named_agents": {"freedomcare": {"model": "anthropic/claude-sonnet-4-6"}}
})
assert cfg.chat_agent_map["123456"] == "freedomcare"
assert cfg.named_agents["freedomcare"].model == "anthropic/claude-sonnet-4-6"
```

Run: `cd ~/.local/share/uv/tools/nanobot-ai/lib/python3.14/site-packages && python -c "from nanobot.config.schema import AgentsConfig; print('OK')"`

- [ ] **Step 5: Commit**

```bash
cd ~/.local/share/uv/tools/nanobot-ai/lib/python3.14/site-packages
git add nanobot/config/schema.py
git commit -m "feat: add named agents and chat_agent_map to schema"
```

---

## Task 2: Session — Add agent_name to Session Dataclass

**Files:**
- Modify: `session/manager.py:16-25`

- [ ] **Step 1: Read Session dataclass**

Read `session/manager.py` lines 1-50 to see the Session dataclass and understand how agent_name would be stored.

- [ ] **Step 2: Add agent_name field to Session**

```python
@dataclass
class Session:
    key: str
    agent_name: str | None = None  # Which named agent owns this session
    messages: list[dict] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict = field(default_factory=dict)
    last_consolidated: int = 0
```

- [ ] **Step 3: Update get_or_create to accept agent_name**

Modify `get_or_create()` signature to accept `agent_name: str | None = None` and set it on new sessions.

- [ ] **Step 4: Test session with agent_name**

```python
from nanobot.session.manager import Session
s = Session(key="telegram:123", agent_name="freedomcare")
assert s.agent_name == "freedomcare"
```

- [ ] **Step 5: Commit**

```bash
git add nanobot/session/manager.py
git commit -m "feat: add agent_name to Session dataclass"
```

---

## Task 3: Telegram Channel — Pass Agent Name via Metadata

**Files:**
- Modify: `channels/telegram.py:860-947` (`_on_message()`)

- [ ] **Step 1: Read _on_message method**

Read `channels/telegram.py` lines 860-960 to understand how metadata is built and passed to `_handle_message`.

- [ ] **Step 2: Add agent_name to metadata**

In `_build_message_metadata()`, add:
```python
"agent_name": None,  # Set by routing layer based on chat_id
```

- [ ] **Step 3: Update _forward_command to pass agent_name**

In `_forward_command()` at line 836-858, ensure `metadata=self._build_message_metadata(...)` includes agent_name.

- [ ] **Step 4: Test metadata has agent_name field**

Verify the metadata dict includes `agent_name` key (even if None) in all message flows.

- [ ] **Step 5: Commit**

```bash
git add nanobot/channels/telegram.py
git commit -m "feat: telegram channel passes agent_name in metadata"
```

---

## Task 4: Base Channel — Accept agent_name Parameter

**Files:**
- Modify: `channels/base.py:127-171` (`_handle_message()`)

- [ ] **Step 1: Read base.py _handle_message**

Read `channels/base.py` lines 100-200 to understand `_handle_message()` signature.

- [ ] **Step 2: Add agent_name to _handle_message signature**

```python
async def _handle_message(
    self,
    sender_id: str,
    chat_id: str,
    content: str,
    agent_name: str | None = None,  # NEW
    media: list[str] | None = None,
    metadata: dict | None = None,
    session_key: str | None = None,
) -> None:
```

- [ ] **Step 3: Build InboundMessage with agent_name**

In `_handle_message()` body, add agent_name to the `InboundMessage` created:
```python
msg = InboundMessage(
    channel=self.name,
    sender_id=sender_id,
    chat_id=chat_id,
    content=content,
    agent_name=agent_name,  # NEW
    media=media or [],
    metadata=metadata or {},
    session_key_override=session_key,
)
```

- [ ] **Step 4: Update TelegramChannel._forward_command call**

In `channels/telegram.py`, update the `_forward_command()` call to pass the resolved agent_name:
```python
await self._handle_message(
    sender_id=self._sender_id(user),
    chat_id=str(message.chat_id),
    content=content,
    agent_name=resolved_agent_name,  # NEW - resolved from config
    metadata=self._build_message_metadata(message, user),
    session_key=self._derive_topic_session_key(message),
)
```

- [ ] **Step 5: Commit**

```bash
git add nanobot/channels/base.py nanobot/channels/telegram.py
git commit -m "feat: base channel accepts agent_name parameter"
```

---

## Task 5: AgentLoop — Make Agent-Aware

**Files:**
- Modify: `agent/loop.py:530-635` (`_process_message()`)

- [ ] **Step 1: Read _process_message**

Read `agent/loop.py` lines 500-700 to understand how session selection and context building work.

- [ ] **Step 2: Add agent_name parameter to _process_message**

```python
async def _process_message(
    self,
    msg: InboundMessage,
    session_key: str,
    agent_name: str | None = None,  # NEW
) -> Response | None:
```

- [ ] **Step 3: Get session with agent_name**

Replace `session = self.sessions.get_or_create(session_key)` with:
```python
session = self.sessions.get_or_create(session_key, agent_name=agent_name)
```

- [ ] **Step 4: Resolve agent config from agent_name**

Add a method `def _resolve_agent_config(self, agent_name: str | None) -> AgentDefaults:` that:
- If agent_name is None → return `self.config.agents.defaults`
- If agent_name is a named agent → return that agent's config
- Merge named agent settings over defaults (so you only override what's specified)

- [ ] **Step 5: Use resolved config in _run_agent_loop**

In `_run_agent_loop()`, use the resolved agent config instead of `self.config.agents.defaults` for model, temperature, max_tokens, etc.

- [ ] **Step 6: Commit**

```bash
git add nanobot/agent/loop.py
git commit -m "feat: agent loop is agent-name aware with dynamic config resolution"
```

---

## Task 6: Gateway — Resolve Agent per Message

**Files:**
- Modify: `cli/commands.py:820-842` (async def run())

- [ ] **Step 1: Read gateway run function**

Read `cli/commands.py` lines 820-900 to understand how agent and channels are started.

- [ ] **Step 2: Add agent resolution helper to AgentLoop**

In `agent/loop.py`, add a method:
```python
def resolve_agent_for_chat(self, chat_id: str) -> str | None:
    """Look up which agent should handle a given chat_id."""
    return self.config.agents.chat_agent_map.get(chat_id)
```

- [ ] **Step 3: Modify _dispatch to resolve agent before processing**

In `agent/loop.py:_dispatch()`, at line 442, resolve agent before calling `_process_message`:
```python
agent_name = self.resolve_agent_for_chat(msg.chat_id)
await self._process_message(msg, session_key, agent_name=agent_name)
```

- [ ] **Step 4: Test agent resolution**

Verify that a message from chat_id "123456" gets agent "freedomcare" when chat_agent_map is configured.

- [ ] **Step 5: Commit**

```bash
git add nanobot/agent/loop.py nanobot/cli/commands.py
git commit -m "feat: gateway resolves agent per chat via chat_agent_map"
```

---

## Task 7: Config — Update config.json with Example

**Files:**
- Modify: `~/.nanobot/config.json`

- [ ] **Step 1: Add example agents to config.json**

Add to the `agents` section:
```json
"chat_agent_map": {
  "8486591233": "ralph",
  "REPLACE_WITH_YOUR_FREEDOMCARE_CHAT_ID": "freedomcare",
  "REPLACE_WITH_ANOTHER_CHAT_ID": "personal"
},
"named_agents": {
  "ralph": {
    "model": "anthropic/claude-sonnet-4-6",
    "description": "General purpose assistant - Ralph",
    "personality": "Helpful, thorough, and skilled agent"
  },
  "freedomcare": {
    "model": "anthropic/claude-opus-4-5",
    "description": "FreedomCare work agent",
    "personality": "Professional, efficient, healthcare domain aware",
    "workspace": "~/.nanobot/workspace/freedomcare"
  },
  "personal": {
    "model": "anthropic/claude-sonnet-4-6",
    "description": "Personal projects agent",
    "personality": "Creative, exploratory, hobby-friendly"
  }
}
```

- [ ] **Step 2: Document the config change**

Note: Daniel needs to replace the placeholder chat IDs with actual Telegram chat IDs he gets from @userinfobot or the debug logs.

---

## Task 8: Test — Integration Test for Multi-Agent Routing

**Files:**
- Create: `tests/test_multi_agent_routing.py`

- [ ] **Step 1: Write integration test**

```python
"""Test that different Telegram chats route to different agents."""

def test_chat_agent_map_routing():
    """Verify chat_id maps to correct agent_name."""
    from nanobot.config.schema import Config
    cfg = Config.model_validate({
        "agents": {
            "chat_agent_map": {"123": "freedomcare", "456": "personal"},
            "named_agents": {
                "freedomcare": {"model": "claude-sonnet"},
                "personal": {"model": "claude-opus"}
            }
        }
    })
    assert cfg.agents.chat_agent_map["123"] == "freedomcare"
    assert cfg.agents.chat_agent_map["456"] == "personal"

def test_agent_spec_defaults():
    """Verify AgentSpec has sensible defaults."""
    from nanobot.config.schema import AgentSpec
    spec = AgentSpec.model_validate({"name": "test"})
    assert spec.model == "anthropic/claude-sonnet-4-6"
    assert spec.temperature == 0.1
```

- [ ] **Step 2: Run test**

```bash
cd ~/.local/share/uv/tools/nanobot-ai/lib/python3.14/site-packages
python -m pytest tests/test_multi_agent_routing.py -v
```

- [ ] **Step 3: Commit**

```bash
git add tests/test_multi_agent_routing.py
git commit -m "test: add multi-agent routing tests"
```

---

## Self-Review Checklist

- [ ] All 8 tasks have complete code (no TODOs, no placeholders)
- [ ] Schema supports named agents with per-chat routing map
- [ ] Session carries agent_name through the message flow
- [ ] AgentLoop resolves correct agent config per message
- [ ] No type inconsistencies across tasks
- [ ] Test coverage for config loading and agent resolution

---

## What This Enables

After implementation, Daniel can:
1. Add a new Telegram chat ID to `chat_agent_map` in config.json
2. Assign it to "freedomcare", "personal", or create a new named agent
3. Each chat maintains its own conversation history with its own agent persona
4. Each agent can have different model, workspace, system prompt, and MCP tools

**Example config outcome:**
```
Chat 111111 → ralph (general purpose)
Chat 222222 → freedomcare (work, healthcare domain)
Chat 333333 → personal (hobbies, creative projects)
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-11-multi-agent-telegram-routing.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**