import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { askQuestion, resetSession, getRegionData, getAssumptions, generateSessionId } from './api'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import ProjectedCapacityPage from './pages/ProjectedCapacityPage'
import ScenarioAnalysisPage from './pages/ScenarioAnalysisPage'

function Layout({ assumptions, regionData }) {
  return (
    <div className="flex h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 ml-72">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState([])
  const [sessionId] = useState(generateSessionId)
  const [regionData, setRegionData] = useState(null)
  const [assumptions, setAssumptions] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRegionData().then(setRegionData).catch(console.error)
    getAssumptions().then(setAssumptions).catch(console.error)
  }, [])

  async function handleSendMessage(question) {
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const result = await askQuestion(question, sessionId)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          toolCalled: result.tool_called,
          toolResult: result.tool_result,
          confidence: result.confidence,
          latencyMs: result.latency_ms,
          traceId: result.trace_id,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.message}`,
          confidence: { level: 'LOW' },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout assumptions={assumptions} regionData={regionData} />}>
          <Route
            path="/"
            element={
              <ChatArea
                messages={messages}
                onSendMessage={handleSendMessage}
                onReset={() => {
                  setMessages([])
                  resetSession(sessionId).catch(console.error)
                }}
                loading={loading}
                assumptions={assumptions}
              />
            }
          />
          <Route
            path="/capacity"
            element={
              <ProjectedCapacityPage
                regionData={regionData}
                assumptions={assumptions}
              />
            }
          />
          <Route
            path="/scenarios"
            element={
              <ScenarioAnalysisPage
                regionData={regionData}
                assumptions={assumptions}
                sessionId={sessionId}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
