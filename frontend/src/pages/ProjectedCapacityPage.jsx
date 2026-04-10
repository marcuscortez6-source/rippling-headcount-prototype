import { useState, useEffect } from 'react'
import { getCapacity, getUtilization } from '../api'

function StatusBadge({ utilization }) {
  if (utilization >= 1.0) return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-danger-bg text-danger">Over Capacity</span>
  if (utilization >= 0.85) return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-warning-bg text-warning">At Risk</span>
  return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-success-bg text-success">On Track</span>
}

function utilizationColor(u) {
  if (u >= 1.0) return 'text-danger'
  if (u >= 0.85) return 'text-warning'
  return 'text-success'
}

function utilizationBg(u) {
  if (u >= 1.0) return 'bg-danger-bg'
  if (u >= 0.85) return 'bg-warning-bg'
  return 'bg-success-bg'
}

export default function ProjectedCapacityPage({ regionData, assumptions }) {
  const [capacity, setCapacity] = useState(null)
  const [utilization, setUtilization] = useState(null)

  useEffect(() => {
    getCapacity().then(setCapacity).catch(console.error)
    getUtilization().then(setUtilization).catch(console.error)
  }, [])

  const totalAgents = regionData?.reduce((sum, r) => sum + r.active_agents, 0) || 0
  const totalVolume = regionData?.reduce((sum, r) => sum + r.projected_tickets, 0) || 0
  const totalMaxCap = capacity?.reduce((sum, c) => sum + c.max_tickets, 0) || 0
  const globalUtil = utilization
    ? totalVolume > 0
      ? utilization.reduce((sum, u) => sum + u.projected_utilization * u.ticket_volume, 0) / totalVolume
      : 0
    : null

  return (
    <div className="flex-1 overflow-y-auto bg-sand">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <p className="text-[10px] font-bold text-body-muted uppercase tracking-widest mb-1">
            Operational Dashboard
          </p>
          <h1 className="text-3xl font-black font-headline text-body tracking-tight">
            Global Overview
          </h1>

          {/* Section 1: Global summary — matching region card structure */}
          <div className="grid grid-cols-4 gap-6 mt-8">
            {/* Utilization Score */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-body-muted text-lg">speed</span>
                <span className="text-[10px] font-bold text-body-muted uppercase tracking-widest">Utilization Score</span>
              </div>
              {globalUtil !== null ? (
                <p className="text-4xl font-black font-mono tracking-tight text-body">
                  {(globalUtil * 100).toFixed(1)}%
                </p>
              ) : (
                <p className="text-body-muted text-sm">Loading...</p>
              )}
            </div>

            {/* Agents */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-body-muted text-lg">group</span>
                <span className="text-[10px] font-bold text-body-muted uppercase tracking-widest">Agents</span>
              </div>
              <p className="text-4xl font-black font-mono text-body">{totalAgents}</p>
              <p className="text-xs text-body-muted mt-2">Across {regionData?.length || 0} regions</p>
            </div>

            {/* Projected Capacity (= projected volume) */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-body-muted text-lg">confirmation_number</span>
                <span className="text-[10px] font-bold text-body-muted uppercase tracking-widest">Projected Capacity</span>
              </div>
              <p className="text-4xl font-black font-mono text-body">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-body-muted mt-2">Forecasted tickets next month</p>
            </div>

            {/* Max Capacity */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-body-muted text-lg">moving</span>
                <span className="text-[10px] font-bold text-body-muted uppercase tracking-widest">Max Capacity</span>
              </div>
              <p className="text-4xl font-black font-mono text-body">{totalMaxCap.toLocaleString()}</p>
              <p className="text-xs text-body-muted mt-2">Tickets team can handle</p>
            </div>
          </div>

          {/* Section 2: Projected Capacity by Region */}
          <div className="mt-12">
            <h2 className="text-xl font-black font-headline text-body tracking-tight">
              Projected Capacity — Next Month
            </h2>
            <p className="text-sm text-body-muted mt-1 mb-6">
              Headcount utilization based on forecasted volume
            </p>

            {utilization && capacity ? (
              <div className="grid grid-cols-3 gap-6">
                {utilization.map((u) => {
                  const cap = capacity.find(c => c.region === u.region)
                  const pct = (u.projected_utilization * 100).toFixed(1)
                  return (
                    <div
                      key={u.region}
                      className={`rounded-xl p-8 min-h-[320px] flex flex-col ${utilizationBg(u.projected_utilization)}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black font-headline text-body uppercase tracking-wide">
                          {u.region === 'NAMER' ? 'North America' : u.region}
                        </h3>
                        <StatusBadge utilization={u.projected_utilization} />
                      </div>

                      <p className={`text-5xl font-black font-mono tracking-tight ${utilizationColor(u.projected_utilization)}`}>
                        {pct}%
                      </p>
                      <p className="text-[10px] font-bold text-body-muted uppercase tracking-widest mt-1 mb-8">
                        Utilization
                      </p>

                      <dl className="space-y-3 text-sm mt-auto">
                        <div className="flex justify-between">
                          <dt className="text-body-muted">Agents</dt>
                          <dd className="font-mono font-bold text-body">{cap?.agents}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-body-muted">Projected Capacity</dt>
                          <dd className="font-mono font-bold text-body">{u.ticket_volume?.toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-body-muted">Max Capacity</dt>
                          <dd className="font-mono font-bold text-body">{cap?.max_tickets?.toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-body-muted">Available Headroom</dt>
                          <dd className="font-mono font-bold text-body">{u.headroom_tickets?.toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 flex items-center justify-center">
                <p className="text-body-muted text-sm">Loading capacity data...</p>
              </div>
            )}

            {/* Legend */}
            <div className="flex justify-center gap-8 mt-6 text-xs text-body-muted font-medium">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success" />
                On Track &lt; 85%
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                At Risk 85–100%
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-danger" />
                Over Capacity &gt; 100%
              </span>
            </div>
          </div>

          {/* Section 3: Regional Efficiency Breakdown */}
          {utilization && capacity && regionData && assumptions && (
            <div className="mt-12">
              <h2 className="text-xl font-black font-headline text-body tracking-tight">
                Regional Efficiency Breakdown
              </h2>
              <p className="text-sm text-body-muted mt-1 mb-6">
                Per-agent productivity and cost efficiency across regions
              </p>

              <div className="bg-white rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-cream">
                      <th className="text-left px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest">Region</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest">Agents</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest">AHT</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest">Tickets/Agent</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest">Capacity/Agent</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest">Buffer</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-body-muted uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionData.map((rd) => {
                      const u = utilization.find(x => x.region === rd.region)
                      const cap = capacity.find(x => x.region === rd.region)
                      const ticketsPerAgent = rd.active_agents > 0 ? Math.round(rd.projected_tickets / rd.active_agents) : 0
                      const capPerAgent = rd.active_agents > 0 && cap ? Math.round(cap.max_tickets / rd.active_agents) : 0
                      const bufferPct = cap && cap.max_tickets > 0 ? ((cap.max_tickets - rd.projected_tickets) / cap.max_tickets * 100) : 0

                      return (
                        <tr key={rd.region} className="border-t border-sand">
                          <td className="px-6 py-4 font-black font-headline text-body">
                            {rd.region === 'NAMER' ? 'North America' : rd.region}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-body">{rd.active_agents}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-body">{rd.aht_minutes}m</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-body">{ticketsPerAgent.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-body">{capPerAgent.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-mono font-bold ${bufferPct < 10 ? 'text-danger' : bufferPct < 20 ? 'text-warning' : 'text-success'}`}>
                              {bufferPct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u && <StatusBadge utilization={u.projected_utilization} />}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Totals row */}
                    <tr className="border-t-2 border-sand-hover bg-cream/50">
                      <td className="px-6 py-4 font-black font-headline text-body">Global</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-body">{totalAgents}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-body-muted">—</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-body">{totalAgents > 0 ? Math.round(totalVolume / totalAgents).toLocaleString() : 0}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-body">{totalAgents > 0 ? Math.round(totalMaxCap / totalAgents).toLocaleString() : 0}</td>
                      <td className="px-6 py-4 text-right">
                        {totalMaxCap > 0 && (
                          <span className={`font-mono font-bold ${((totalMaxCap - totalVolume) / totalMaxCap * 100) < 10 ? 'text-danger' : ((totalMaxCap - totalVolume) / totalMaxCap * 100) < 20 ? 'text-warning' : 'text-success'}`}>
                            {((totalMaxCap - totalVolume) / totalMaxCap * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {globalUtil !== null && <StatusBadge utilization={globalUtil} />}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Insight cards */}
              <div className="grid grid-cols-3 gap-6 mt-6">
                {utilization.map((u) => {
                  const cap = capacity.find(c => c.region === u.region)
                  const rd = regionData.find(r => r.region === u.region)
                  if (!cap || !rd) return null
                  const bufferPct = (cap.max_tickets - rd.projected_tickets) / cap.max_tickets * 100
                  const productiveHrs = assumptions.working_hours_per_month * (1 - assumptions.shrinkage_rate) * assumptions.utilization_target

                  let insight, insightColor
                  if (bufferPct < 10) {
                    insight = `Only ${bufferPct.toFixed(0)}% headroom. Consider adding agents or reducing volume before next month.`
                    insightColor = 'border-danger/20 bg-danger-bg'
                  } else if (bufferPct > 25) {
                    insight = `${bufferPct.toFixed(0)}% buffer may indicate overstaffing. ${Math.floor(u.headroom_tickets / (productiveHrs * 60 / rd.aht_minutes))} agents could be reallocated.`
                    insightColor = 'border-warning/20 bg-warning-bg'
                  } else {
                    insight = `Healthy ${bufferPct.toFixed(0)}% buffer. Current staffing matches projected demand well.`
                    insightColor = 'border-success/20 bg-success-bg'
                  }

                  return (
                    <div key={u.region} className={`rounded-xl p-5 border ${insightColor}`}>
                      <h4 className="text-xs font-black font-headline text-body uppercase tracking-wide mb-2">
                        {u.region === 'NAMER' ? 'North America' : u.region}
                      </h4>
                      <p className="text-sm text-body-muted leading-relaxed">{insight}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
