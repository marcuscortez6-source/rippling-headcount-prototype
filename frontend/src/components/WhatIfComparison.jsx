export default function WhatIfComparison({ toolResult }) {
  const {
    current_agents,
    required_agents,
    net_new_needed,
    effective_volume,
    effective_aht,
    current_volume,
    current_aht,
  } = toolResult

  const volumeChanged = effective_volume !== current_volume
  const ahtChanged = effective_aht !== current_aht
  const agentsChanged = net_new_needed > 0

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Current */}
      <div className="bg-sand p-4 rounded-xl">
        <h5 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-3">
          Current
        </h5>
        <div className="space-y-1.5">
          <p className="text-xs text-body-muted">
            Agents: <span className="font-mono font-bold text-body">{current_agents}</span>
          </p>
          <p className="text-xs text-body-muted">
            Volume: <span className="font-mono font-bold text-body">{current_volume?.toLocaleString()}</span>
          </p>
          <p className="text-xs text-body-muted">
            AHT: <span className="font-mono font-bold text-body">{current_aht}m</span>
          </p>
        </div>
      </div>

      {/* Projected */}
      <div className="bg-sand p-4 rounded-xl">
        <h5 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-3">
          Projected
        </h5>
        <div className="space-y-1.5">
          <p className="text-xs text-body-muted">
            Agents:{' '}
            <span className={`font-mono font-bold ${agentsChanged ? 'text-plum' : 'text-body'}`}>
              {required_agents}
            </span>
          </p>
          <p className="text-xs text-body-muted">
            Volume:{' '}
            <span className={`font-mono font-bold ${volumeChanged ? 'text-plum' : 'text-body'}`}>
              {effective_volume?.toLocaleString()}
            </span>
          </p>
          <p className="text-xs text-body-muted">
            AHT:{' '}
            <span className={`font-mono font-bold ${ahtChanged ? 'text-plum' : 'text-body'}`}>
              {effective_aht}m
            </span>
          </p>
        </div>
      </div>

      {/* Delta */}
      <div className={`p-4 rounded-xl flex flex-col justify-center items-center text-center ${
        agentsChanged
          ? 'bg-plum/5 border border-plum/20'
          : 'bg-success-bg border border-success-deep/20'
      }`}>
        <h5 className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
          agentsChanged ? 'text-plum' : 'text-success-deep'
        }`}>
          Delta
        </h5>
        <p className={`text-xl font-extrabold tracking-tight ${
          agentsChanged ? 'text-plum' : 'text-success-deep'
        }`}>
          {net_new_needed > 0 ? `+${net_new_needed}` : '0'}
        </p>
        <p className={`text-[9px] font-bold uppercase ${
          agentsChanged ? 'text-plum/70' : 'text-success-deep/70'
        }`}>
          {net_new_needed > 0 ? 'net-new needed' : 'no new hires'}
        </p>
        <div className="mt-2 space-y-0.5 text-[10px] font-mono">
          {volumeChanged && (
            <p className={agentsChanged ? 'text-plum/60' : 'text-success-deep/60'}>
              vol {effective_volume > current_volume ? '+' : ''}{((effective_volume - current_volume) / current_volume * 100).toFixed(0)}%
            </p>
          )}
          {ahtChanged && (
            <p className={agentsChanged ? 'text-plum/60' : 'text-success-deep/60'}>
              AHT {effective_aht > current_aht ? '+' : ''}{(effective_aht - current_aht).toFixed(1)}m
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
