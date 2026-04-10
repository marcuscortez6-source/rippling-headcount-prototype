import { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import SuggestedQuestions from './SuggestedQuestions'

export default function ChatArea({ messages, onSendMessage, onReset, loading, assumptions }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    onSendMessage(input.trim())
    setInput('')
  }

  function handleSuggestion(question) {
    if (loading) return
    onSendMessage(question)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-8">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-cream flex items-center justify-center">
                <span className="material-symbols-outlined text-plum text-2xl">auto_awesome</span>
              </div>
              <h2 className="text-3xl font-black text-body tracking-tight font-headline">
                What would you like to plan?
              </h2>
              <p className="text-sm text-body-muted mt-3 max-w-lg">
                Use AI to architect your support organization. Predict needs, adjust for seasonality, and optimize roster efficiency.
              </p>
            </div>
            <SuggestedQuestions onSelect={handleSuggestion} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-12 pb-12">
            <div className="flex justify-end">
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-body-muted text-xs font-bold uppercase tracking-wider hover:bg-cream transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                New Conversation
              </button>
            </div>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} assumptions={assumptions} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-outline-variant/30 shadow-md rounded-2xl rounded-tl-none p-6">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-plum/40 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-plum/40 rounded-full animate-pulse [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-plum/40 rounded-full animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-8 pt-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-plum/5 blur-xl group-focus-within:bg-plum/10 transition-all rounded-full" />
            <div className="relative bg-white/80 backdrop-blur-xl border-2 border-outline-variant/10 group-focus-within:border-plum rounded-full p-2 pl-6 flex items-center shadow-xl shadow-plum/5 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI Assistant about your headcount strategy..."
                disabled={loading}
                className="flex-1 bg-transparent border-none focus:outline-none text-body font-medium placeholder:text-outline py-3 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="ml-2 w-12 h-12 flex items-center justify-center rounded-full bg-plum text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </form>
          <div className="flex justify-center mt-4 gap-4">
            <span className="text-[10px] text-outline font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">bolt</span>
              AI Powered Insights
            </span>
            <span className="text-[10px] text-outline font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">security</span>
              Enterprise Secure
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
