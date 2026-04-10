const styles = {
  HIGH: 'bg-success-bg text-success-deep',
  MEDIUM: 'bg-warning-bg text-warning',
  LOW: 'bg-danger-bg text-danger',
  OUT_OF_SCOPE: 'bg-sand text-outline',
}

const labels = {
  HIGH: 'VERIFIED',
  MEDIUM: 'AI-ASSISTED',
  LOW: 'LOW CONFIDENCE',
  OUT_OF_SCOPE: 'OUT OF SCOPE',
}

export default function ConfidenceBadge({ level, reason }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`${styles[level] || styles.LOW} text-[10px] font-extrabold px-2 py-0.5 rounded tracking-widest w-fit`}
      >
        {labels[level] || level}
      </span>
      {level !== 'HIGH' && reason && (
        <p className="text-[11px] text-body-muted italic">{reason}</p>
      )}
    </div>
  )
}
