import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ExecutionStep {
  id: string
  title: string
  provider: string
  status: 'pending' | 'running' | 'done' | 'error'
  description: string
  duration?: number
  rowsReturned?: number
  error?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: ExecutionStep[]
  results?: Record<string, unknown>[]
  suggestions?: string[]
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async () => {
    if (!input.trim() || loading) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Call orchestration API
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      })

      if (!response.ok) throw new Error('Orchestration failed')

      const data = await response.json()

      // Add assistant message with execution steps
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.summary || 'Query executed',
        steps: data.steps,
        results: data.results,
        suggestions: data.suggestions,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Orchestration error:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error executing query. Please try again.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">YALC Skill Orchestrator</h1>
        <p className="text-sm text-gray-600 mt-1">Ask for B2B data in plain English</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Start a query</h2>
              <p className="text-gray-600 max-w-sm">
                Example: "Find 5 companies in UAE who got funding in last 2 months"
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'} rounded-lg p-4`}>
              {/* User message */}
              {msg.role === 'user' && <p className="text-sm">{msg.content}</p>}

              {/* Assistant message with execution steps */}
              {msg.role === 'assistant' && (
                <div className="space-y-4">
                  {msg.steps && msg.steps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Execution Steps</p>
                      {msg.steps.map(step => (
                        <div key={step.id} className="flex items-start gap-2 text-sm">
                          <div className="flex-shrink-0 pt-0.5">
                            {step.status === 'done' && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                            {step.status === 'running' && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                            {step.status === 'pending' && <div className="w-2 h-2 bg-gray-300 rounded-full" />}
                            {step.status === 'error' && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{step.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {step.provider}
                              </Badge>
                              <Badge variant={step.status === 'done' ? 'default' : 'secondary'} className="text-xs">
                                {step.status.toUpperCase()}
                              </Badge>
                            </div>
                            {step.rowsReturned && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {step.rowsReturned} rows returned
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Results table */}
                  {msg.results && msg.results.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Results</p>
                      <div className="bg-white rounded border border-gray-200 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              {Object.keys(msg.results[0] || {}).map(key => (
                                <th key={key} className="px-3 py-2 text-left font-semibold text-gray-700">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.results.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b hover:bg-gray-50">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-2 text-gray-900 truncate">
                                    {typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {msg.results.length > 5 && (
                        <p className="text-xs text-gray-600 mt-1">
                          ... and {msg.results.length - 5} more rows
                        </p>
                      )}
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Follow Up</p>
                      <div className="space-y-1.5">
                        {msg.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(suggestion)}
                            className="block text-left text-sm text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {i + 1}. {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!msg.steps && <p className="text-sm text-gray-700">{msg.content}</p>}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmit()
              }
            }}
            placeholder="Ask for B2B data (e.g., 'Find companies with 50-200 employees in NYC')"
            className="flex-1 resize-none rounded border border-gray-300 p-3 font-mono text-sm disabled:bg-gray-100"
            rows={3}
            disabled={loading}
          />
          <Button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="self-end"
          >
            {loading ? 'Running...' : 'Send'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Ctrl+Enter to send</p>
      </div>
    </div>
  )
}
