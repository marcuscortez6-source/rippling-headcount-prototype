import os
from dotenv import load_dotenv
load_dotenv()
from backend.ai_router import HeadcountAgent

agent = HeadcountAgent()

# Prompt 1
result = agent.ask("How many active agents do we currently have in EMEA, and what is our assumed shrinkage rate?")
print(f"Prompt 1: {result['response'][:200]}...")
assert "80" in result["response"], "FAIL: Missing 80 agents"
assert "20" in result["response"], "FAIL: Missing 20% shrinkage"
print("✅ Prompt 1 PASSED\n")

# Prompt 2 (fresh session)
agent.reset()
result = agent.ask("Based on our current metrics and assumptions, what is the maximum number of tickets our current NAMER team can handle next month?")
print(f"Prompt 2: {result['response'][:200]}...")
assert "43520" in result["response"].replace(",", "").replace(" ", ""), "FAIL: Missing 43,520"
print("✅ Prompt 2 PASSED\n")

# Prompt 3 (fresh session)
agent.reset()
result = agent.ask("If ticket volume in APAC increases by 30% next month compared to the current projection, and the APAC handle time increases by 2 minutes, exactly how many net-new agents do we need to hire in APAC to maintain our utilization targets?")
print(f"Prompt 3: {result['response'][:200]}...")
assert result["tool_result"].get("net_new_needed") == 10, f"FAIL: Expected 10, got {result['tool_result'].get('net_new_needed')}"
print("✅ Prompt 3 PASSED\n")

print("🎉 ALL THREE PROMPTS PASSED — Agent is working correctly")
