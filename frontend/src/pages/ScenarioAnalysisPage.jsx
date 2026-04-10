import { useState, useEffect } from 'react'
import { runScenario, runHeadcountScenario, getCapacity } from '../api'

function MiniBarChart({ color = '#4A0039' }) {
  return (
    <svg width="64" height="56" viewBox="0 0 64 56" fill="none">
      <rect x="0" y="36" width="11" height="20" rx="2" fill={color} opacity="0.2" />
      <rect x="15" y="26" width="11" height="30" rx="2" fill={color} opacity="0.4" />
      <rect x="30" y="14" width="11" height="42" rx="2" fill={color} opacity="0.65" />
      <rect x="45" y="0" width="11" height="56" rx="2" fill={color} opacity="0.9" />
      <text x="2" y="54" fontSize="7" fill={color} opacity="0.4" fontFamily="Inter">Q1</text>
      <text x="17" y="54" fontSize="7" fill={color} opacity="0.4" fontFamily="Inter">Q2</text>
      <text x="32" y="54" fontSize="7" fill={color} opacity="0.4" fontFamily="Inter">Q3</text>
      <text x="47" y="54" fontSize="7" fill={color} opacity="0.4" fontFamily="Inter">Q4</text>
    </svg>
  )
}

function TrendIcon({ value, invertColor }) {
  if (isNaN(value)) return null
  if (value === 0) {
    return <span className="material-symbols-outlined text-[16px] text-body-muted">trending_flat</span>
  }
  // invertColor: for costs, down is green (good) instead of red
  const upColor = invertColor ? 'text-danger' : 'text-warning'
  const downColor = invertColor ? 'text-success' : 'text-danger'
  return (
    <span className={`material-symbols-outlined text-[16px] ${value > 0 ? upColor : downColor}`}>
      {value > 0 ? 'trending_up' : 'trending_down'}
    </span>
  )
}

const COST_PER_EMPLOYEE = 75000

export default function ScenarioAnalysisPage({ regionData, assumptions }) {
  const [mode, setMode] = useState('headcount') // 'headcount' | 'parameter'
  const [activeRegion, setActiveRegion] = useState('Global')
  const [capacity, setCapacity] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [edits, setEdits] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => { getCapacity().then(setCapacity).catch(console.error) }, [])

  // Reset when mode changes
  function switchMode(newMode) {
    setMode(newMode)
    setResults(null)
    setHasRun(false)
    setEdits({})
  }

  // --- Baseline from CSV ---
  function getBaseline() {
    if (!regionData || !assumptions || !capacity) return null
    if (activeRegion === 'Global') {
      const hc = regionData.reduce((s, r) => s + r.active_agents, 0)
      const vol = regionData.reduce((s, r) => s + r.projected_tickets, 0)
      const wtAht = regionData.reduce((s, r) => s + r.aht_minutes * r.projected_tickets, 0) / (vol || 1)
      const cap = capacity.reduce((s, c) => s + c.max_tickets, 0)
      const bufferTickets = cap - vol
      const bufferPct = cap > 0 ? (bufferTickets / cap) * 100 : 0
      return { headcount: hc, volume: vol, aht: wtAht, maxCapacity: cap, bufferPct, bufferTickets, utilTarget: assumptions.utilization_target, shrinkage: assumptions.shrinkage_rate, hours: assumptions.working_hours_per_month }
    }
    const rd = regionData.find(r => r.region === activeRegion)
    const cp = capacity.find(c => c.region === activeRegion)
    if (!rd) return null
    const bufferTickets = (cp?.max_tickets || 0) - rd.projected_tickets
    const bufferPct = (cp?.max_tickets || 0) > 0 ? (bufferTickets / cp.max_tickets) * 100 : 0
    return { headcount: rd.active_agents, volume: rd.projected_tickets, aht: rd.aht_minutes, maxCapacity: cp?.max_tickets || 0, bufferPct, bufferTickets, utilTarget: assumptions.utilization_target, shrinkage: assumptions.shrinkage_rate, hours: assumptions.working_hours_per_month }
  }

  // --- Get the fixed buffer in tickets (from baseline) ---
  function getBaselineBufferTickets() {
    if (!regionData || !capacity) return 0
    if (activeRegion === 'Global') {
      const vol = regionData.reduce((s, r) => s + r.projected_tickets, 0)
      const maxCap = capacity.reduce((s, c) => s + c.max_tickets, 0)
      return maxCap - vol
    }
    const rd = regionData.find(r => r.region === activeRegion)
    const cp = capacity.find(c => c.region === activeRegion)
    if (!rd || !cp) return 0
    return cp.max_tickets - rd.projected_tickets
  }

  // --- Adjusted from results for active region ---
  function getAdjusted() {
    if (!results) return null
    if (mode === 'headcount') {
      // Mode 1: Headcount Change
      // Volume (demand) stays fixed. Max capacity changes with headcount.
      // Buffer = gap between max capacity and volume.
      // Buffer % = (max capacity - volume) / max capacity
      // More agents → higher max capacity → bigger buffer (more headroom).
      // Projected capacity = volume (demand doesn't change).

      if (activeRegion === 'Global') {
        const hc = results.reduce((s, r) => s + r.target_agents, 0)
        const rawMaxCap = results.reduce((s, r) => s + r.max_volume, 0)
        const baseVol = regionData.reduce((s, r) => s + r.projected_tickets, 0)
        const bufferTickets = rawMaxCap - baseVol
        const newBufferPct = rawMaxCap > 0 ? (bufferTickets / rawMaxCap) * 100 : 0
        const wtAht = results.reduce((s, r) => s + r.effective_aht * r.max_volume, 0) / (rawMaxCap || 1)
        return { headcount: hc, volume: baseVol, projectedCapacity: rawMaxCap, maxCapacity: rawMaxCap, bufferPct: newBufferPct, bufferTickets, aht: wtAht, minutesPerAgent: results[0]?.minutes_per_agent || 0 }
      }
      const r = results.find(x => x.region === activeRegion)
      const rd = regionData.find(x => x.region === activeRegion)
      if (!r) return null
      const baseVol = rd?.projected_tickets || 0
      const bufferTickets = r.max_volume - baseVol
      const newBufferPct = r.max_volume > 0 ? (bufferTickets / r.max_volume) * 100 : 0
      return { headcount: r.target_agents, volume: baseVol, projectedCapacity: r.max_volume, maxCapacity: r.max_volume, bufferPct: newBufferPct, bufferTickets, aht: r.effective_aht, minutesPerAgent: r.minutes_per_agent }
    } else {
      // Mode 2: Parameter Change
      // volume = what WILL come in (demand). capacity = what agents CAN handle (supply).
      // capacity = required_agents * minutes_per_agent / effective_aht
      if (activeRegion === 'Global') {
        const hc = results.reduce((s, r) => s + r.required_agents, 0)
        const vol = results.reduce((s, r) => s + r.effective_volume, 0)
        const cap = results.reduce((s, r) => s + Math.floor(r.required_agents * r.minutes_per_agent / r.effective_aht), 0)
        const wtAht = results.reduce((s, r) => s + r.effective_aht * r.effective_volume, 0) / (vol || 1)
        return { headcount: hc, volume: vol, capacity: cap, aht: wtAht, minutesPerAgent: results[0]?.minutes_per_agent || 0 }
      }
      const r = results.find(x => x.region === activeRegion)
      if (!r) return null
      const cap = Math.floor(r.required_agents * r.minutes_per_agent / r.effective_aht)
      return { headcount: r.required_agents, volume: r.effective_volume, capacity: cap, aht: r.effective_aht, minutesPerAgent: r.minutes_per_agent }
    }
  }

  function getEdit(field) { return (edits[activeRegion] || {})[field] }
  function setEdit(field, value) {
    setEdits(prev => ({ ...prev, [activeRegion]: { ...prev[activeRegion], [field]: value } }))
  }

  // Collect global param overrides from edits
  function getOverrides(regionKey) {
    const e = edits[regionKey] || {}
    const g = edits['Global'] || {}
    const util = e.utilTarget ?? g.utilTarget
    const shrink = e.shrinkage ?? g.shrinkage
    const hrs = e.hours ?? g.hours
    return {
      override_utilization: util !== undefined && util !== '' ? parseFloat(util) / 100 : null,
      override_shrinkage: shrink !== undefined && shrink !== '' ? parseFloat(shrink) / 100 : null,
      override_hours: hrs !== undefined && hrs !== '' ? parseFloat(hrs) : null,
    }
  }

  // --- Resolve edits: region-specific first, then Global fallback ---
  // If user edited on the Global tab, those edits apply to ALL regions.
  // If user edited on a specific region tab, that takes priority for that region.
  function resolveEdit(regionKey, field) {
    const regionEdit = (edits[regionKey] || {})[field]
    if (regionEdit !== undefined && regionEdit !== '') return regionEdit
    const globalEdit = (edits['Global'] || {})[field]
    if (globalEdit !== undefined && globalEdit !== '') return globalEdit
    return undefined
  }

  // --- Distribute a Global total proportionally across regions ---
  // e.g., 190 total headcount → NAMER gets 83, EMEA gets 66, APAC gets 41
  function distributeGlobal(field, totalValue) {
    const currentTotals = {
      headcount: regionData.reduce((s, r) => s + r.active_agents, 0),
      volume: regionData.reduce((s, r) => s + r.projected_tickets, 0),
    }
    const currentTotal = currentTotals[field] || 1
    const ratio = totalValue / currentTotal

    return regionData.map(r => {
      const current = field === 'headcount' ? r.active_agents : r.projected_tickets
      return { region: r.region, value: Math.round(current * ratio) }
    })
  }

  // --- Resolve the desired buffer % for a region ---
  function resolveBufferPct(regionKey) {
    const bufEdit = resolveEdit(regionKey, 'bufferPct')
    if (bufEdit !== undefined) {
      const parsed = parseFloat(String(bufEdit).replace(/,/g, ''))
      if (!isNaN(parsed)) return parsed / 100 // convert % to decimal
    }
    // No edit — use current baseline buffer for that region
    const rd = regionData.find(r => r.region === regionKey)
    const cp = capacity?.find(c => c.region === regionKey)
    if (rd && cp && cp.max_tickets > 0) {
      return (cp.max_tickets - rd.projected_tickets) / cp.max_tickets
    }
    return 0
  }

  // --- RUN SCENARIO ---
  async function handleRun() {
    if (!regionData) return
    setLoading(true)
    try {
      const parseNum = (v) => v !== undefined ? parseFloat(String(v).replace(/,/g, '')) : NaN

      if (mode === 'headcount') {
        // Mode 1: User sets target headcount → compute max volume
        const globalHcEdit = (edits['Global'] || {}).headcount
        let distributed = null
        if (globalHcEdit !== undefined && globalHcEdit !== '') {
          const parsed = parseInt(String(globalHcEdit).replace(/,/g, ''))
          if (!isNaN(parsed)) distributed = distributeGlobal('headcount', parsed)
        }

        const rawResults = await Promise.all(
          regionData.map(r => {
            const regionHcEdit = (edits[r.region] || {}).headcount
            let targetHc
            if (regionHcEdit !== undefined && regionHcEdit !== '') {
              targetHc = parseInt(String(regionHcEdit).replace(/,/g, ''))
            } else if (distributed) {
              targetHc = distributed.find(d => d.region === r.region)?.value ?? r.active_agents
            } else {
              targetHc = r.active_agents
            }
            return runHeadcountScenario({ region: r.region, target_agents: targetHc })
          })
        )

        // Store raw results — buffer is applied in getAdjusted() using baseline %
        setResults(rawResults)

      } else {
        // Mode 2: User sets volume/AHT/params → compute required headcount
        // Buffer: staff for volume + buffer, so backend sees higher volume
        const globalVolEdit = (edits['Global'] || {}).volume
        let distributedVol = null
        if (globalVolEdit !== undefined && globalVolEdit !== '') {
          const parsed = parseInt(String(globalVolEdit).replace(/,/g, ''))
          if (!isNaN(parsed)) distributedVol = distributeGlobal('volume', parsed)
        }

        const res = await Promise.all(
          regionData.map(r => {
            // Resolve the user's desired volume
            const regionVolEdit = (edits[r.region] || {}).volume
            let userVol = null
            if (regionVolEdit !== undefined && regionVolEdit !== '') {
              userVol = parseInt(String(regionVolEdit).replace(/,/g, ''))
              if (isNaN(userVol)) userVol = null
            } else if (distributedVol) {
              userVol = distributedVol.find(d => d.region === r.region)?.value ?? null
            }

            // Apply buffer ONLY if user explicitly edited it
            const userBufferEdit = resolveEdit(r.region, 'bufferPct')
            let bufferedVol = userVol
            if (bufferedVol !== null && userBufferEdit !== undefined && userBufferEdit !== '') {
              const bufferDecimal = parseFloat(String(userBufferEdit).replace(/,/g, '')) / 100
              if (bufferDecimal > 0) {
                bufferedVol = Math.ceil(bufferedVol / (1 - bufferDecimal))
              }
            }

            const ahtEdit = resolveEdit(r.region, 'aht')
            const utilEdit = resolveEdit(r.region, 'utilTarget')
            const shrinkEdit = resolveEdit(r.region, 'shrinkage')
            const hoursEdit = resolveEdit(r.region, 'hours')

            return runScenario({
              region: r.region,
              new_volume: bufferedVol,
              new_aht: !isNaN(parseNum(ahtEdit)) ? parseNum(ahtEdit) : null,
              override_utilization: !isNaN(parseNum(utilEdit)) ? parseNum(utilEdit) / 100 : null,
              override_shrinkage: !isNaN(parseNum(shrinkEdit)) ? parseNum(shrinkEdit) / 100 : null,
              override_hours: !isNaN(parseNum(hoursEdit)) ? parseNum(hoursEdit) : null,
            })
          })
        )

        // Tag results with the user's actual desired volume (before buffer) and buffer info
        const taggedResults = res.map((r, i) => {
          const bufferDecimal = resolveBufferPct(r.region)
          const regionVolEdit = (edits[r.region] || {}).volume
          const globalVol = distributedVol?.find(d => d.region === r.region)?.value
          const userVol = regionVolEdit !== undefined && regionVolEdit !== ''
            ? parseInt(String(regionVolEdit).replace(/,/g, ''))
            : globalVol ?? regionData[i].projected_tickets
          return { ...r, user_volume: userVol, buffer_applied: bufferDecimal }
        })
        setResults(taggedResults)
      }
      setHasRun(true)
      setError(null)
    } catch (err) {
      console.error('Scenario error:', err)
      setError(err.message || 'Failed to run scenario. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const baseline = getBaseline()
  const adjusted = getAdjusted()
  const regions = ['Global', ...(regionData?.map(r => r.region) || [])]

  const adjCostPerEmployee = getEdit('costPerEmployee') ? parseInt(getEdit('costPerEmployee')) : COST_PER_EMPLOYEE
  const baseAnnualCost = baseline ? baseline.headcount * COST_PER_EMPLOYEE : 0
  const adjAnnualCost = adjusted ? adjusted.headcount * adjCostPerEmployee : null

  // Global impact
  const gBase = regionData ? regionData.reduce((s, r) => s + r.active_agents, 0) : 0
  const gBaseVol = regionData ? regionData.reduce((s, r) => s + r.projected_tickets, 0) : 0
  const gBaseMaxCap = capacity ? capacity.reduce((s, c) => s + c.max_tickets, 0) : 0
  const gAdj = results ? (mode === 'headcount' ? results.reduce((s, r) => s + r.target_agents, 0) : results.reduce((s, r) => s + r.required_agents, 0)) : 0
  // Projected capacity change — compare against same baseline as the table row
  const gAdjProjectedCap = adjusted
    ? (mode === 'headcount' ? (adjusted.projectedCapacity || 0) : (adjusted.volume || 0))
    : 0
  const netHC = gAdj - gBase
  const capChange = mode === 'headcount'
    ? gAdjProjectedCap - gBaseMaxCap   // headcount mode: new max cap vs baseline max cap
    : gAdjProjectedCap - gBaseVol      // parameter mode: new volume vs baseline volume
  const costImpact = (gAdj * adjCostPerEmployee) - (gBase * COST_PER_EMPLOYEE)

  // Input/output labels per mode
  // Headcount Change: ONLY headcount is editable. Everything else is read-only output.
  // Parameter Change: volume, AHT, utilization, shrinkage, hours, cost/employee are editable inputs.
  const isInput = (field) => {
    if (mode === 'headcount') return field === 'headcount'
    return ['volume', 'aht', 'utilTarget', 'shrinkage', 'hours', 'costPerEmployee', 'bufferPct'].includes(field)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-cream">
      <div className="h-16 bg-white border-b-2 border-sand flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <span className="text-sm text-body-muted">Scenario Planning</span>
          <span className="text-body-muted">/</span>
          <span className="text-sm font-bold text-body">Workforce Modeling</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-sand rounded-full">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold text-body-muted uppercase tracking-wider">Live Data</span>
          </div>
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-plum flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">MC</div>
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-plum text-xs font-bold ring-2 ring-white">AI</div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header area with decorative visual behind */}
          <div className="relative">
            <div className="relative z-10">
              <h1 className="text-3xl font-black font-headline text-body tracking-tight">Scenario Planning</h1>
              <p className="text-sm text-body-muted mt-1">Review workforce adjustments and scenario cost trajectories.</p>

              {/* Mode toggle */}
              <div className="mt-6 inline-flex bg-white rounded-full p-1 gap-1 shadow-sm">
                <button onClick={() => switchMode('headcount')}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors cursor-pointer ${mode === 'headcount' ? 'bg-gold text-plum' : 'text-body-muted hover:bg-sand'}`}>
                  <span className="material-symbols-outlined text-[16px] align-middle mr-1.5">group</span>
                  Headcount Change
                </button>
                <button onClick={() => switchMode('parameter')}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors cursor-pointer ${mode === 'parameter' ? 'bg-gold text-plum' : 'text-body-muted hover:bg-sand'}`}>
                  <span className="material-symbols-outlined text-[16px] align-middle mr-1.5">tune</span>
                  Parameter Change
                </button>
              </div>

              <p className="mt-3 text-xs text-body-muted">
                {mode === 'headcount'
                  ? 'Set a target headcount and see the impact on ticket volume, capacity, and cost.'
                  : 'Change volume, AHT, or operational parameters to see the required headcount.'}
              </p>
            </div>

            {/* Large decorative chart — positioned right, spanning full header height */}
            <div className="absolute top-0 right-0 z-0 pointer-events-none" style={{ width: '55%' }}>
              <svg width="100%" height="180" viewBox="0 0 480 180" preserveAspectRatio="xMaxYMax meet" fill="none">
                <rect x="0" y="120" width="32" height="60" rx="5" fill="#4A0039" opacity="0.07" />
                <rect x="40" y="100" width="32" height="80" rx="5" fill="#4A0039" opacity="0.09" />
                <rect x="80" y="108" width="32" height="72" rx="5" fill="#4A0039" opacity="0.12" />
                <rect x="120" y="80" width="32" height="100" rx="5" fill="#4A0039" opacity="0.16" />
                <rect x="160" y="60" width="32" height="120" rx="5" fill="#4A0039" opacity="0.20" />
                <rect x="200" y="70" width="32" height="110" rx="5" fill="#4A0039" opacity="0.25" />
                <rect x="240" y="45" width="32" height="135" rx="5" fill="#4A0039" opacity="0.30" />
                <rect x="280" y="30" width="32" height="150" rx="5" fill="#FDB71C" opacity="0.18" />
                <rect x="320" y="40" width="32" height="140" rx="5" fill="#FDB71C" opacity="0.25" />
                <rect x="360" y="18" width="32" height="162" rx="5" fill="#FDB71C" opacity="0.32" />
                <rect x="400" y="8" width="32" height="172" rx="5" fill="#FDB71C" opacity="0.40" />
                <rect x="440" y="0" width="32" height="180" rx="5" fill="#FDB71C" opacity="0.50" />
                <path d="M16 118 L56 98 L96 105 L136 78 L176 58 L216 67 L256 43 L296 28 L336 38 L376 16 L416 6 L456 0" stroke="#4A0039" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" opacity="0.2" />
                <circle cx="456" cy="0" r="4" fill="#FDB71C" opacity="0.6" />
              </svg>
            </div>
          </div>

          {/* Region tabs */}
          <div className="mt-6 flex gap-4 border-b border-sand-hover">
            {regions.map(r => (
              <button key={r} onClick={() => setActiveRegion(r)}
                className={`px-1 pb-3 text-sm font-semibold transition-colors cursor-pointer ${activeRegion === r ? 'text-body border-b-2 border-gold' : 'text-body-muted hover:text-body'}`}>
                {r === 'NAMER' ? 'North America' : r}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-body-muted uppercase tracking-widest mb-1">Baseline Scenario</p>
                  <h3 className="text-lg font-black font-headline text-body">Current Operations</h3>
                </div>
                <MiniBarChart color="#4A0039" />
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-body-muted uppercase tracking-widest">Total Headcount</p>
                <p className="text-4xl font-black font-mono text-body mt-1">{baseline ? baseline.headcount.toLocaleString() : '...'}</p>
              </div>
            </div>
            <div className="bg-[#FFFBEB] border-2 border-gold/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-body-muted uppercase tracking-widest mb-1">Adjusted Scenario</p>
                  <h3 className="text-lg font-black font-headline text-body">Optimized Q3 Model</h3>
                </div>
                <MiniBarChart color="#066d38" />
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-body-muted uppercase tracking-widest">Total Headcount</p>
                <p className={`text-4xl font-black font-mono mt-1 ${hasRun ? 'text-body' : 'text-body-muted/40'}`}>
                  {loading ? '...' : hasRun && adjusted ? adjusted.headcount.toLocaleString() : baseline ? baseline.headcount.toLocaleString() : '—'}
                </p>
                {!hasRun && <p className="text-[10px] text-body-muted mt-1 italic">Edit values below, then Run Scenario</p>}
              </div>
            </div>
          </div>

          {/* Comparison table */}
          {baseline && (
            <div className="mt-8 bg-white rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cream">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest w-[30%]">Metric Name</th>
                    <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest w-[20%]">Baseline Scenario</th>
                    <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest bg-[#FFF8E1] border-t-2 border-gold w-[20%]">Adjusted Scenario</th>
                    <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest w-[15%]">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={4} className="px-6 py-3 text-[10px] font-black text-plum-primary uppercase tracking-[0.2em]">Workforce & Volume</td></tr>
                  <Row label="Headcount" baseline={baseline.headcount} computed={hasRun ? adjusted?.headcount : null} edit={getEdit('headcount')} onEdit={v => setEdit('headcount', v)} isInput={isInput('headcount')} loading={loading} />
                  <Row label="Monthly Ticket Volume" baseline={baseline.volume} computed={mode === 'parameter' && hasRun ? adjusted?.volume : null} edit={getEdit('volume')} onEdit={v => setEdit('volume', v)} isInput={isInput('volume')} loading={loading} />
                  <Row label="Capacity Buffer" baseline={`${baseline.bufferPct.toFixed(1)}%`} computed={hasRun && adjusted?.bufferPct !== undefined ? adjusted.bufferPct.toFixed(1) : null} edit={getEdit('bufferPct')} onEdit={v => setEdit('bufferPct', v)} isInput={isInput('bufferPct')} suffix="%" loading={false} invertColor />
                  <Row label="Annual Cost" baseline={baseAnnualCost} computed={hasRun ? adjAnnualCost : null} edit={getEdit('annualCost')} onEdit={v => setEdit('annualCost', v)} isInput={false} loading={loading} format="currency" invertColor />

                  <tr><td colSpan={4} className="px-6 py-3 text-[10px] font-black text-plum-primary uppercase tracking-[0.2em]">Operational Parameters</td></tr>
                  <Row label="Utilization Target" baseline={`${(baseline.utilTarget * 100).toFixed(1)}%`} computed={null} edit={getEdit('utilTarget')} onEdit={v => setEdit('utilTarget', v)} isInput={isInput('utilTarget')} suffix="%" loading={false} />
                  <Row label="Shrinkage" baseline={`${(baseline.shrinkage * 100).toFixed(1)}%`} computed={null} edit={getEdit('shrinkage')} onEdit={v => setEdit('shrinkage', v)} isInput={isInput('shrinkage')} suffix="%" loading={false} />
                  <Row label="Expected Hours/Month" baseline={baseline.hours} computed={null} edit={getEdit('hours')} onEdit={v => setEdit('hours', v)} isInput={isInput('hours')} loading={false} />

                  <tr><td colSpan={4} className="px-6 py-3 text-[10px] font-black text-plum-primary uppercase tracking-[0.2em]">Efficiency & Cost</td></tr>
                  <Row label="AHT (minutes)" baseline={parseFloat(baseline.aht.toFixed(1))} computed={mode === 'parameter' && hasRun && adjusted ? parseFloat(adjusted.aht.toFixed(1)) : null} edit={getEdit('aht')} onEdit={v => setEdit('aht', v)} isInput={isInput('aht')} loading={false} />
                  <Row label="Projected Monthly Capacity" baseline={baseline.maxCapacity} computed={hasRun ? (mode === 'headcount' ? adjusted?.projectedCapacity : adjusted?.volume) : null} edit={getEdit('capacity')} onEdit={v => setEdit('capacity', v)} isInput={false} loading={loading} />
                  <Row label="Cost Per Employee" baseline={COST_PER_EMPLOYEE} computed={null} edit={getEdit('costPerEmployee')} onEdit={v => setEdit('costPerEmployee', v)} isInput={isInput('costPerEmployee')} loading={false} format="currency" invertColor />
                </tbody>
              </table>

              <div className="px-6 py-5 bg-cream/50 border-t border-sand flex items-center justify-between">
                <div className="text-xs text-body-muted">
                  <span className="font-bold">
                    {mode === 'headcount' ? 'Set target headcount' : 'Adjust parameters'}
                  </span>
                  {' '}in the highlighted fields, then run to see impact.
                </div>
                <button onClick={handleRun} disabled={loading}
                  className="px-8 py-3 rounded-full bg-gold text-plum text-sm font-black hover:bg-gold-hover transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-gold/20">
                  {loading ? 'Running...' : 'Run Scenario'}
                </button>
              </div>
              {error && (
                <div className="px-6 py-3 bg-danger-bg text-danger text-sm font-medium">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Computation Flow */}
          {hasRun && adjusted && (
            <div className="mt-6 bg-white rounded-xl p-6 border border-outline-variant/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-plum text-lg">account_tree</span>
                <h4 className="text-xs font-black text-body uppercase tracking-widest">Computation Flow — Python Engine (CSV Read-Only)</h4>
              </div>
              {mode === 'headcount' ? (
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-[#FFFBEB] rounded-lg p-3 border border-gold/20">
                    <p className="text-body-muted font-sans font-bold mb-1">Your Input: Target Headcount</p>
                    <p className="text-body font-bold text-plum text-lg">{adjusted.headcount}</p>
                  </div>
                  <div className="bg-sand rounded-lg p-3">
                    <p className="text-body-muted font-sans font-bold mb-1">Minutes/Agent</p>
                    <p className="text-body">{baseline.hours}h x 60 x (1-{baseline.shrinkage.toFixed(2)}) x {baseline.utilTarget} = <span className="font-bold text-plum">{adjusted.minutesPerAgent?.toFixed(0)}</span></p>
                  </div>
                  <div className="bg-sand rounded-lg p-3">
                    <p className="text-body-muted font-sans font-bold mb-1">Projected Monthly Capacity</p>
                    <p className="text-body">({adjusted.headcount} x {adjusted.minutesPerAgent?.toFixed(0)}) / {adjusted.aht?.toFixed(1)} = <span className="font-bold text-plum">{adjusted.projectedCapacity?.toLocaleString()}</span></p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-[#FFFBEB] rounded-lg p-3 border border-gold/20">
                    <p className="text-body-muted font-sans font-bold mb-1">Your Input: Volume & AHT</p>
                    <p className="text-body"><span className="font-bold text-plum">{adjusted.volume?.toLocaleString()}</span> tickets x <span className="font-bold text-plum">{adjusted.aht?.toFixed(1)}</span> min</p>
                  </div>
                  <div className="bg-sand rounded-lg p-3">
                    <p className="text-body-muted font-sans font-bold mb-1">Minutes/Agent</p>
                    <p className="text-body">{baseline.hours}h x 60 x (1-{baseline.shrinkage.toFixed(2)}) x {baseline.utilTarget} = <span className="font-bold text-plum">{adjusted.minutesPerAgent?.toFixed(0)}</span></p>
                  </div>
                  <div className="bg-sand rounded-lg p-3">
                    <p className="text-body-muted font-sans font-bold mb-1">Computed: Headcount</p>
                    <p className="text-body">ceil({(adjusted.volume * adjusted.aht).toLocaleString()} / {adjusted.minutesPerAgent?.toFixed(0)}) = <span className="font-bold text-plum">{adjusted.headcount}</span></p>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-outline font-bold uppercase tracking-wider mt-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">calculate</span>
                All math by Python deterministic engine. CSV data is never modified.
              </p>
            </div>
          )}

          {/* Impact Summary */}
          {hasRun && (
            <div className="mt-8 bg-white rounded-xl p-8">
              <h3 className="text-lg font-black font-headline text-body mb-6">Scenario Impact Summary</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className={`rounded-xl p-6 border ${netHC < 0 ? 'bg-danger-bg border-danger/20' : 'bg-[#FFFBEB] border-gold/20'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center ${netHC < 0 ? 'bg-danger/20' : 'bg-warning/20'}`}>
                      <span className={`material-symbols-outlined text-xl ${netHC < 0 ? 'text-danger' : 'text-warning'}`}>{netHC < 0 ? 'group_remove' : 'group_add'}</span>
                    </span>
                    <span className="text-xs font-bold text-body-muted uppercase tracking-wider">Net Headcount Change</span>
                  </div>
                  <p className={`text-4xl font-black font-mono ${netHC > 0 ? 'text-warning' : netHC < 0 ? 'text-danger' : 'text-body'}`}>
                    {netHC > 0 ? '+' : ''}{netHC}
                  </p>
                  <p className="text-xs text-body-muted mt-2">{netHC > 0 ? 'Increase across regions' : netHC < 0 ? 'Reduction in workforce' : 'No change'}</p>
                  <div className="mt-3 flex items-center gap-1">
                    <TrendIcon value={netHC} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${netHC >= 0 ? 'text-warning' : 'text-danger'}`}>
                      {gBase > 0 ? ((Math.abs(netHC) / gBase) * 100).toFixed(1) : 0}% change
                    </span>
                  </div>
                </div>
                <div className={`rounded-xl p-6 border ${costImpact <= 0 ? 'bg-success-bg border-success/20' : 'bg-[#FFFBEB] border-gold/20'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center ${costImpact <= 0 ? 'bg-success/20' : 'bg-warning/20'}`}>
                      <span className={`material-symbols-outlined text-xl ${costImpact <= 0 ? 'text-success' : 'text-warning'}`}>savings</span>
                    </span>
                    <span className="text-xs font-bold text-body-muted uppercase tracking-wider">Net Cost Impact</span>
                  </div>
                  <p className={`text-4xl font-black font-mono ${costImpact <= 0 ? 'text-success' : 'text-warning'}`}>
                    {costImpact !== 0 ? `${costImpact > 0 ? '+' : '-'}$${Math.abs(costImpact / 1000000).toFixed(1)}M` : '$0'}
                  </p>
                  <p className="text-xs text-body-muted mt-2">Annual compensation estimate</p>
                  <div className="mt-3 flex items-center gap-1">
                    <TrendIcon value={costImpact} invertColor />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${costImpact <= 0 ? 'text-success' : 'text-danger'}`}>
                      Based on ${(adjCostPerEmployee / 1000).toFixed(0)}k/employee
                    </span>
                  </div>
                </div>
                <div className={`rounded-xl p-6 border ${capChange >= 0 ? 'bg-success-bg border-success/20' : 'bg-danger-bg border-danger/20'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center ${capChange >= 0 ? 'bg-success/20' : 'bg-danger/20'}`}>
                      <span className={`material-symbols-outlined text-xl ${capChange >= 0 ? 'text-success' : 'text-danger'}`}>
                        {capChange >= 0 ? 'trending_up' : 'trending_down'}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-body-muted uppercase tracking-wider">Capacity Change</span>
                  </div>
                  <p className={`text-4xl font-black font-mono ${capChange >= 0 ? 'text-success' : 'text-danger'}`}>
                    {capChange >= 0 ? '+' : ''}{capChange.toLocaleString()}
                  </p>
                  <p className="text-xs text-body-muted mt-2">Monthly ticket throughput</p>
                  <div className="mt-3 flex items-center gap-1">
                    <TrendIcon value={capChange} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${capChange >= 0 ? 'text-success' : 'text-danger'}`}>
                      {gBaseVol > 0 ? ((Math.abs(capChange) / gBaseVol) * 100).toFixed(1) : 0}% {capChange >= 0 ? 'increase' : 'decrease'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-sand rounded-xl flex items-start gap-3">
                <span className="text-xs font-bold text-gold bg-plum px-2 py-0.5 rounded mt-0.5">Takeaway</span>
                <div className="flex-1">
                  <p className="text-sm text-body">
                    {mode === 'headcount'
                      ? (netHC < 0
                        ? `Reducing by ${Math.abs(netHC)} agents saves $${Math.abs(costImpact / 1000000).toFixed(1)}M/year but reduces capacity by ${Math.abs(capChange).toLocaleString()} tickets/month.`
                        : netHC > 0
                          ? `Adding ${netHC} agents costs $${(costImpact / 1000000).toFixed(1)}M/year and adds ${capChange.toLocaleString()} tickets/month capacity.`
                          : 'No staffing changes — current operations match scenario.')
                      : (netHC > 0
                        ? `Meeting new demand requires ${netHC} additional agents at $${(costImpact / 1000000).toFixed(1)}M/year additional cost.`
                        : netHC < 0
                          ? `Efficiency gains reduce headcount by ${Math.abs(netHC)}, saving $${Math.abs(costImpact / 1000000).toFixed(1)}M/year.`
                          : 'Current staffing meets the adjusted parameters.')
                    }
                  </p>
                </div>
                <button className="text-xs font-bold text-plum hover:text-plum-primary whitespace-nowrap cursor-pointer">Export PDF Report</button>
              </div>
            </div>
          )}

          {!hasRun && (
            <div className="mt-8 bg-white rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-body-muted/30 text-5xl mb-3">science</span>
              <h3 className="text-lg font-black font-headline text-body">Ready to Analyze</h3>
              <p className="text-sm text-body-muted mt-1 max-w-md mx-auto">
                {mode === 'headcount'
                  ? <>Edit <span className="font-bold text-gold">Headcount</span> to set your target staffing level, then click <span className="font-bold">Run Scenario</span>.</>
                  : <>Edit <span className="font-bold text-gold">Volume</span>, <span className="font-bold text-gold">AHT</span>, or operational parameters, then click <span className="font-bold">Run Scenario</span>.</>
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, baseline, computed, edit, onEdit, isInput, suffix = '', loading, format, invertColor }) {
  const fmt = (v) => {
    if (format === 'currency' && typeof v === 'number') return `$${v.toLocaleString()}`
    if (typeof v === 'number') return v.toLocaleString()
    return v
  }
  const baseDisplay = fmt(baseline)
  const hasEdit = edit !== undefined && edit !== null && edit !== ''
  const isComputed = computed !== null && computed !== undefined

  let displayValue, isPlaceholder = false, textStyle = 'text-body'
  if (hasEdit) {
    displayValue = edit
  } else if (isComputed) {
    displayValue = typeof computed === 'number' ? computed.toLocaleString() : computed
    textStyle = 'text-plum font-extrabold'
  } else {
    displayValue = typeof baseline === 'number' ? baseline.toLocaleString() : String(baseline).replace(/[$%]/g, '')
    isPlaceholder = true
    textStyle = 'text-body-muted/40'
  }

  const baseNum = typeof baseline === 'number' ? baseline : parseFloat(String(baseline).replace(/[$%,]/g, ''))
  const adjRaw = hasEdit ? edit : computed
  const adjNum = typeof adjRaw === 'number' ? adjRaw : parseFloat(String(adjRaw).replace(/[$%,]/g, ''))
  let diff = 0, hasDelta = false
  if (!loading && !isNaN(baseNum) && !isNaN(adjNum) && !isPlaceholder) {
    diff = adjNum - baseNum
    hasDelta = Math.abs(diff) > 0.01
  }
  const deltaStr = hasDelta
    ? (diff > 0 ? `+${format === 'currency' ? '$' : ''}${suffix ? diff.toFixed(1) : Math.round(diff).toLocaleString()}` : `${format === 'currency' ? '-$' : ''}${suffix ? Math.abs(diff).toFixed(1) : Math.abs(Math.round(diff)).toLocaleString()}`)
    : ''

  // Color logic: invertColor means down=green (good for costs), otherwise down=red
  const upColor = invertColor ? 'text-danger' : 'text-warning'
  const downColor = invertColor ? 'text-success' : 'text-danger'
  const deltaColor = diff > 0 ? upColor : downColor

  return (
    <tr className="border-t border-sand">
      <td className="px-6 py-3 text-body font-medium">
        {label}
        {isInput && <span className="ml-1.5 text-[9px] text-gold font-bold uppercase">input</span>}
        {!isInput && isComputed && <span className="ml-1.5 text-[9px] text-plum font-bold uppercase">computed</span>}
      </td>
      <td className="px-6 py-3 text-right font-mono font-bold text-body">{baseDisplay}</td>
      <td className="px-6 py-3 text-right bg-[#FFF8E1]">
        {isInput ? (
          <input type="text" value={loading ? '...' : displayValue}
            onChange={e => onEdit(e.target.value)}
            onFocus={e => { if (isPlaceholder) { onEdit(''); e.target.value = '' } }}
            className={`w-full text-right font-mono font-bold bg-transparent border-b-2 border-gold/30 focus:border-gold focus:outline-none py-1 transition-colors ${textStyle}`} />
        ) : (
          <span className={`font-mono font-bold ${textStyle}`}>{loading ? '...' : displayValue}</span>
        )}
      </td>
      <td className="px-6 py-3 text-right font-mono font-bold">
        {(hasDelta || (!isPlaceholder && !loading && diff === 0 && isComputed)) && (
          <span className={`inline-flex items-center gap-1 ${hasDelta ? deltaColor : 'text-body-muted'}`}>
            <TrendIcon value={diff} invertColor={invertColor} />
            {deltaStr}{suffix}
          </span>
        )}
      </td>
    </tr>
  )
}
