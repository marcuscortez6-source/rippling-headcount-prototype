import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

export default function AuditTrail({ auditTrail, assumptions, variant = 'table' }) {
  const [open, setOpen] = useState(true)

  if (!auditTrail || auditTrail.length === 0) return null

  return (
    <div className="mt-6 border-t border-outline-variant/20 pt-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-4 cursor-pointer"
      >
        <span className="material-symbols-outlined text-plum text-sm">
          {variant === 'compact' ? 'analytics' : 'receipt_long'}
        </span>
        <h4 className="text-xs font-bold uppercase tracking-widest text-outline">
          Audit Trail
        </h4>
        {open ? <ChevronDown size={12} className="text-outline" /> : <ChevronRight size={12} className="text-outline" />}
      </button>

      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[800px]' : 'max-h-0'}`}>
        {/* Assumptions box */}
        {assumptions && (
          <div className="bg-sand rounded-xl p-4 mb-4">
            <p className="text-[11px] font-bold text-body-muted uppercase tracking-wider mb-2">
              Assumptions Used
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="text-body-muted">
                Working Hours{' '}
                <span className="font-mono font-semibold text-body">
                  {assumptions.working_hours_per_month} hrs/month
                </span>
              </span>
              <span className="text-body-muted">
                Shrinkage{' '}
                <span className="font-mono font-semibold text-body">
                  {(assumptions.shrinkage_rate * 100).toFixed(0)}%
                </span>
              </span>
              <span className="text-body-muted">
                Utilization{' '}
                <span className="font-mono font-semibold text-body">
                  {(assumptions.utilization_target * 100).toFixed(0)}%
                </span>
              </span>
            </div>
          </div>
        )}

        {variant === 'compact' ? (
          <div className="bg-white border border-outline-variant/10 rounded-xl p-4 font-mono text-[13px] space-y-2 leading-relaxed">
            {auditTrail.map((step, i) => {
              const isLast = i === auditTrail.length - 1
              const resultStr = typeof step.result === 'number' ? step.result.toLocaleString() : step.result
              return (
                <div
                  key={step.step}
                  className={`flex justify-between items-center ${
                    isLast ? 'pt-2 border-t border-outline-variant/10 text-plum' : ''
                  }`}
                >
                  <span className={isLast ? 'font-bold' : 'text-body-muted'}>
                    {step.step}: {step.description}
                  </span>
                  <span className={isLast ? 'font-extrabold' : 'font-bold'}>
                    {step.calculation} = {resultStr}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant/10">
            <table className="w-full text-left text-sm font-mono">
              <tbody className="divide-y divide-outline-variant/10">
                {auditTrail.map((step, i) => {
                  const isLast = i === auditTrail.length - 1
                  const resultStr = typeof step.result === 'number' ? step.result.toLocaleString() : step.result
                  return (
                    <tr
                      key={step.step}
                      className={
                        isLast
                          ? 'bg-plum/5'
                          : i % 2 === 0
                            ? 'bg-white'
                            : 'bg-sand/50'
                      }
                    >
                      <td className={`p-3 ${isLast ? 'text-plum font-bold' : 'text-body-muted'}`}>
                        Step {step.step}: {step.description}
                      </td>
                      <td className={`p-3 text-right font-bold ${isLast ? 'text-plum' : ''}`}>
                        {step.calculation} = {resultStr}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[10px] text-outline font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">calculate</span>
            Deterministic engine. No AI-generated arithmetic.
          </div>
          {variant === 'compact' && <span>Ceiling rounding applied.</span>}
        </div>
      </div>
    </div>
  )
}
