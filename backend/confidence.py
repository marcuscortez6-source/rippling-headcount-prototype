"""Confidence scoring based on how the answer was produced.

Levels:
  HIGH         — Deterministic computation. No AI interpretation. Math from the engine only.
  MEDIUM       — AI-assisted interpretation or suggestion. The answer involves AI reasoning
                 beyond simple tool routing (e.g., combining results, interpreting scenarios).
  OUT_OF_SCOPE — The question falls outside the model's five capabilities. Refused.
"""

# Tools that produce fully deterministic, auditable results
DETERMINISTIC_TOOLS = {
    "get_region_data",
    "get_global_assumptions",
    "calculate_max_capacity",
}

# Tools that are deterministic but involve user-supplied assumptions
PROJECTION_TOOLS = {
    "run_whatif_scenario",
    "calculate_utilization",
}

# Keywords in Claude's response that signal an out-of-scope refusal
OUT_OF_SCOPE_SIGNALS = [
    "outside",
    "beyond",
    "don't have",
    "do not have",
    "cannot",
    "can't",
    "not able to",
    "not supported",
    "not within",
    "outside the scope",
    "not one of",
    "five capabilities",
    "not something",
    "unable to",
    "no data",
    "not available",
]


def assess_confidence(tool_name: str, tool_result: dict, response_text: str = "") -> dict:
    """Score confidence in the agent's response.

    Args:
        tool_name: The last tool called (empty string if none).
        tool_result: The result dict from the tool.
        response_text: The final text response from Claude (used for out-of-scope detection).
    """

    # Error results are always low confidence
    if isinstance(tool_result, dict) and "error" in tool_result:
        return {
            "level": "MEDIUM",
            "reason": f"Tool returned an error: {tool_result.get('error', 'Unknown error')}",
        }

    # No tool called — either out-of-scope or conversational
    if not tool_name:
        lower = response_text.lower()
        if any(signal in lower for signal in OUT_OF_SCOPE_SIGNALS):
            return {
                "level": "OUT_OF_SCOPE",
                "reason": "This question falls outside the model's supported capabilities.",
            }
        # Conversational but not flagged as out of scope
        return {
            "level": "MEDIUM",
            "reason": "No deterministic tool was used. Response is AI-generated.",
        }

    # Deterministic single-tool lookups and calculations
    if tool_name in DETERMINISTIC_TOOLS:
        return {
            "level": "HIGH",
            "reason": "Deterministic calculation from the computation engine. No AI-generated arithmetic.",
        }

    # What-if projections — deterministic math but user-modified assumptions
    if tool_name in PROJECTION_TOOLS:
        return {
            "level": "HIGH",
            "reason": "Deterministic projection with audit trail. All math from the computation engine.",
        }

    return {
        "level": "MEDIUM",
        "reason": "Response involves AI interpretation beyond deterministic computation.",
    }
