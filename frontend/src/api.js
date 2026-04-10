const BASE_URL = import.meta.env.VITE_API_BASE || 'https://rippling-headcount-prototype-production.up.railway.app'

export function generateSessionId() {
  return crypto.randomUUID()
}

export async function askQuestion(question, sessionId) {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function resetSession(sessionId) {
  const res = await fetch(`${BASE_URL}/api/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getRegionData() {
  const res = await fetch(`${BASE_URL}/api/data/regions`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getAssumptions() {
  const res = await fetch(`${BASE_URL}/api/data/assumptions`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getCapacity() {
  const res = await fetch(`${BASE_URL}/api/compute/capacity`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getUtilization() {
  const res = await fetch(`${BASE_URL}/api/compute/utilization`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function runScenario({ region, volume_change_pct, new_volume, aht_change_minutes, new_aht, override_utilization, override_shrinkage, override_hours }) {
  const res = await fetch(`${BASE_URL}/api/compute/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ region, volume_change_pct, new_volume, aht_change_minutes, new_aht, override_utilization, override_shrinkage, override_hours }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function runHeadcountScenario({ region, target_agents, new_aht, override_utilization, override_shrinkage, override_hours }) {
  const res = await fetch(`${BASE_URL}/api/compute/capacity-from-headcount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ region, target_agents, new_aht, override_utilization, override_shrinkage, override_hours }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
