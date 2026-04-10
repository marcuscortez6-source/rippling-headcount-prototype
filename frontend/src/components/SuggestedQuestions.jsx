const suggestions = [
  { label: 'Region Analysis', icon: 'search', text: 'How many agents in EMEA?' },
  { label: 'Stress Test', icon: 'trending_up', text: 'Max capacity for NAMER?' },
  { label: 'Growth Scenario', icon: 'bolt', text: 'What if APAC volume increases 30%?' },
]

export default function SuggestedQuestions({ onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-4 max-w-2xl">
      {suggestions.map(({ label, icon, text }) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          className="flex flex-col items-start gap-3 bg-white rounded-xl px-5 py-4 text-left hover:shadow-md hover:bg-cream transition-all cursor-pointer"
        >
          <span className="text-[10px] font-bold text-body-muted uppercase tracking-widest">{label}</span>
          <span className="text-sm text-body font-medium leading-snug">{text}</span>
        </button>
      ))}
    </div>
  )
}
