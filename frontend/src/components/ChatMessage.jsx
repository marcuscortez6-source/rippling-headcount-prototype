import ReactMarkdown from 'react-markdown'
import ConfidenceBadge from './ConfidenceBadge'
import AuditTrail from './AuditTrail'
import WhatIfComparison from './WhatIfComparison'

export default function ChatMessage({ message, assumptions }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-plum text-white p-4 rounded-2xl rounded-tr-none shadow-lg">
          <p className="font-medium">{message.content}</p>
        </div>
      </div>
    )
  }

  const { content, toolCalled, toolResult, confidence, latencyMs, traceId } = message
  const isWhatIf = toolResult?.net_new_needed !== undefined

  // Strip calculation breakdown from response when audit trail handles it
  let displayContent = content
  if (toolResult?.audit_trail) {
    displayContent = content
      .replace(/\*?\*?Calculation steps:?\*?\*?\n([\s\S]*?)(?=\n\n[^0-9\s*-]|\n*$)/gi, '')
      .replace(/\*?\*?Here'?s the step-by-step calculation:?\*?\*?\n([\s\S]*?)(?=\n\n[^0-9\s*-]|\n*$)/gi, '')
      .replace(/\*?\*?Audit trail:?\*?\*?\n([\s\S]*?)(?=\n\n[^0-9\s*-]|\n*$)/gi, '')
      .replace(/^\d+\.\s+\*\*[^*]+\*\*:?\s*.*$/gm, '')
      .replace(/This calculation accounts for[\s\S]*$/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] bg-white border border-outline-variant/30 p-6 rounded-2xl rounded-tl-none shadow-md space-y-4">
        {confidence && (
          <ConfidenceBadge level={confidence.level} reason={confidence.reason} />
        )}

        <div className="chat-markdown">
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>

        {isWhatIf && <WhatIfComparison toolResult={toolResult} />}

        {toolResult?.audit_trail && (
          <AuditTrail
            auditTrail={toolResult.audit_trail}
            assumptions={assumptions}
            variant={isWhatIf ? 'compact' : 'table'}
          />
        )}

        {toolCalled && (
          <div className="mt-3 pt-3 border-t border-outline-variant/15 flex gap-4 text-[10px] text-outline font-bold uppercase tracking-wider">
            <span>tool: {toolCalled}</span>
            {latencyMs && <span>{latencyMs.toFixed(0)}ms</span>}
            {traceId && <span className="truncate max-w-32">trace: {traceId}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
