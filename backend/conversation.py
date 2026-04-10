import json
from datetime import datetime


class ConversationState:
    """Track conversation history and context for multi-turn disambiguation."""

    def __init__(self):
        self.messages = []        # Anthropic API message format
        self.last_region = None   # Most recently discussed region
        self.last_tool = None     # Most recently called tool
        self.scenario = {}        # Active scenario state per region

    def add_user_message(self, content: str):
        self.messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content):
        """Content can be a string or list of content blocks from the API response."""
        if isinstance(content, str):
            self.messages.append({"role": "assistant", "content": content})
        else:
            # Convert API response content blocks to serializable format
            serialized = []
            for block in content:
                if hasattr(block, 'to_dict'):
                    serialized.append(block.to_dict())
                elif hasattr(block, 'model_dump'):
                    serialized.append(block.model_dump())
                else:
                    serialized.append(block)
            self.messages.append({"role": "assistant", "content": serialized})

    def add_tool_result(self, tool_use_id: str, result: str):
        self.messages.append({
            "role": "user",
            "content": [{"type": "tool_result", "tool_use_id": tool_use_id, "content": result}]
        })

    def update_context(self, region=None, tool=None, tool_result=None):
        if region:
            self.last_region = region
        if tool:
            self.last_tool = tool

        # Track scenario state from what-if results
        if tool_result and region:
            if tool in ("run_whatif_scenario", "calculate_max_capacity", "calculate_utilization"):
                self.scenario[region] = {
                    "volume": tool_result.get("effective_volume", tool_result.get("ticket_volume")),
                    "aht": tool_result.get("effective_aht", tool_result.get("aht_minutes")),
                    "agents": tool_result.get("required_agents", tool_result.get("agents")),
                    "tool": tool,
                }

    def get_messages(self):
        return self.messages

    def get_context_hint(self):
        hints = []
        if self.last_region:
            hints.append(f"Last discussed region: {self.last_region}")
        if self.last_tool:
            hints.append(f"Last tool used: {self.last_tool}")

        # Include active scenario values so Claude can chain them
        for region, state in self.scenario.items():
            parts = []
            if state.get("volume") is not None:
                parts.append(f"volume={state['volume']}")
            if state.get("aht") is not None:
                parts.append(f"AHT={state['aht']}min")
            if state.get("agents") is not None:
                parts.append(f"agents={state['agents']}")
            if parts:
                hints.append(f"Active scenario for {region}: {', '.join(parts)}")

        return " | ".join(hints) if hints else ""
