import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { ChatMessage, ClaudeEvent } from '../../types'
import { randomAppearance } from '../../types'
import { useAgentStore } from '../../store/agents'
import { ChatMessageBubble } from './ChatMessage'
import { ChatInput } from './ChatInput'

type SessionStatus = 'idle' | 'running' | 'done' | 'error'

let chatMessageCounter = 0
let chatAgentCounter = 0

function nextMessageId(): string {
  return `msg-${++chatMessageCounter}`
}

/** Orchid-style typing indicator with cherry blossom */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 8px 8px' }}>
      <span style={{ fontSize: 14 }}>👾</span>
      <span className="glow-amber" style={{ color: '#d4a040', fontWeight: 600, fontSize: 13 }}>
        claude
      </span>
      <div style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
        <span
          className="typing-dot"
          style={{ width: 4, height: 4, borderRadius: '50%', background: '#74747C', display: 'block' }}
        />
        <span
          className="typing-dot"
          style={{ width: 4, height: 4, borderRadius: '50%', background: '#74747C', display: 'block' }}
        />
        <span
          className="typing-dot"
          style={{ width: 4, height: 4, borderRadius: '50%', background: '#74747C', display: 'block' }}
        />
      </div>
    </div>
  )
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus>('idle')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const agentIdRef = useRef<string | null>(null)

  const addAgent = useAgentStore((s) => s.addAgent)
  const removeAgent = useAgentStore((s) => s.removeAgent)
  const updateAgent = useAgentStore((s) => s.updateAgent)
  const getNextDeskIndex = useAgentStore((s) => s.getNextDeskIndex)
  const addEvent = useAgentStore((s) => s.addEvent)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle incoming Claude events
  useEffect(() => {
    const unsub = window.electronAPI.claude.onEvent((event: ClaudeEvent) => {
      if (sessionId && event.sessionId !== sessionId) return

      const agentId = agentIdRef.current

      switch (event.type) {
        case 'init': {
          if (agentId) {
            updateAgent(agentId, { status: 'thinking' })
          }
          break
        }

        case 'text': {
          const data = event.data as { text: string }
          if (!data.text) break

          setMessages((prev) => {
            // Merge consecutive assistant text messages
            const last = prev[prev.length - 1]
            if (last && last.role === 'assistant' && !last.toolName) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + data.text },
              ]
            }
            return [
              ...prev,
              {
                id: nextMessageId(),
                role: 'assistant',
                content: data.text,
                timestamp: Date.now(),
              },
            ]
          })

          if (agentId) {
            updateAgent(agentId, { status: 'streaming' })
          }
          break
        }

        case 'thinking': {
          const data = event.data as { thinking: string }
          setMessages((prev) => {
            const withoutThinking = prev.filter((m) => m.role !== 'thinking')
            return [
              ...withoutThinking,
              {
                id: nextMessageId(),
                role: 'thinking',
                content: data.thinking?.slice(0, 200) ?? 'Thinking...',
                timestamp: Date.now(),
              },
            ]
          })

          if (agentId) {
            updateAgent(agentId, { status: 'thinking' })
          }
          break
        }

        case 'tool_use': {
          const data = event.data as { id: string; name: string; input: Record<string, unknown> }
          setMessages((prev) => [
            ...prev.filter((m) => m.role !== 'thinking'),
            {
              id: nextMessageId(),
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              toolName: data.name,
              toolInput: data.input,
              toolUseId: data.id,
            },
          ])

          if (agentId) {
            updateAgent(agentId, { status: 'tool_calling', currentTask: data.name })
            addEvent({
              agentId,
              agentName: `Chat ${chatAgentCounter}`,
              type: 'tool_call',
              description: `${data.name}`,
            })

            // Track file modifications
            const fileTools = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']
            if (fileTools.includes(data.name)) {
              const current = useAgentStore.getState().agents.find((a) => a.id === agentId)
              if (current) {
                updateAgent(agentId, { files_modified: current.files_modified + 1 })
              }
            }
          }
          break
        }

        case 'tool_result': {
          const data = event.data as { tool_use_id: string; content: string; is_error?: boolean }
          setMessages((prev) => [
            ...prev,
            {
              id: nextMessageId(),
              role: 'tool',
              content: data.content,
              timestamp: Date.now(),
              toolUseId: data.tool_use_id,
              isError: data.is_error,
            },
          ])

          if (agentId) {
            updateAgent(agentId, { status: 'streaming' })
          }
          break
        }

        case 'result': {
          const data = event.data as { result: string; is_error?: boolean; error?: string; usage?: Record<string, unknown> }

          // Remove any lingering thinking messages
          setMessages((prev) => prev.filter((m) => m.role !== 'thinking'))

          if (data.is_error && data.error) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextMessageId(),
                role: 'error',
                content: data.error ?? 'Unknown error',
                timestamp: Date.now(),
              },
            ])
            setStatus('error')
          } else {
            setStatus('done')
          }

          if (agentId) {
            updateAgent(agentId, {
              status: data.is_error ? 'error' : 'done',
              isClaudeRunning: false,
            })
          }

          setSessionId(null)
          break
        }

        case 'error': {
          const data = event.data as { message: string }
          setMessages((prev) => [
            ...prev.filter((m) => m.role !== 'thinking'),
            {
              id: nextMessageId(),
              role: 'error',
              content: data.message,
              timestamp: Date.now(),
            },
          ])
          setStatus('error')

          if (agentId) {
            updateAgent(agentId, { status: 'error', isClaudeRunning: false })
          }
          setSessionId(null)
          break
        }
      }
    })

    return unsub
  }, [sessionId, updateAgent, addEvent])

  const handleSend = useCallback(
    async (message: string, files?: File[]) => {
      // Build the prompt with file context
      let prompt = message
      if (files && files.length > 0) {
        const fileContents: string[] = []
        for (const file of files) {
          try {
            const text = await file.text()
            fileContents.push(`\n--- File: ${file.name} ---\n${text}\n--- End: ${file.name} ---`)
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error(`Failed to read file ${file.name}: ${errMsg}`)
          }
        }
        if (fileContents.length > 0) {
          prompt = `${message}\n\nAttached files:${fileContents.join('\n')}`
        }
      }

      // Add user message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: 'user',
          content: message,
          timestamp: Date.now(),
        },
      ])

      setStatus('running')

      // Spawn a 3D agent
      const agentId = `chat-agent-${++chatAgentCounter}`
      agentIdRef.current = agentId
      const deskIndex = getNextDeskIndex()

      addAgent({
        id: agentId,
        name: `Chat ${chatAgentCounter}`,
        agent_type: 'chat',
        status: 'thinking',
        currentTask: message.slice(0, 60),
        model: '',
        tokens_input: 0,
        tokens_output: 0,
        files_modified: 0,
        started_at: Date.now(),
        deskIndex,
        terminalId: agentId,
        isClaudeRunning: true,
        appearance: randomAppearance(),
        commitCount: 0,
        activeCelebration: null,
        celebrationStartedAt: null,
        sessionStats: {
          tokenHistory: [],
          peakInputRate: 0,
          peakOutputRate: 0,
          tokensByModel: {},
        },
      })

      addEvent({
        agentId,
        agentName: `Chat ${chatAgentCounter}`,
        type: 'spawn',
        description: 'Chat session started',
      })

      try {
        const result = await window.electronAPI.claude.start({ prompt })
        setSessionId(result.sessionId)
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error(`Failed to start Claude session: ${errMsg}`)
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'error',
            content: `Failed to start Claude: ${errMsg}`,
            timestamp: Date.now(),
          },
        ])
        setStatus('error')
        removeAgent(agentId)
      }
    },
    [addAgent, removeAgent, getNextDeskIndex, addEvent]
  )

  const handleStop = useCallback(async () => {
    if (!sessionId) return
    try {
      await window.electronAPI.claude.stop(sessionId)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`Failed to stop Claude session: ${errMsg}`)
    }
    setStatus('done')
    setSessionId(null)

    if (agentIdRef.current) {
      updateAgent(agentIdRef.current, { status: 'done', isClaudeRunning: false })
    }
  }, [sessionId, updateAgent])

  const isRunning = status === 'running'

  // ── Resizable input area ─────────────────────────────────────────
  const [inputHeight, setInputHeight] = useState(100)
  const isDraggingDivider = useRef(false)
  const lastPointerY = useRef(0)

  const handleDividerPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingDivider.current = true
    lastPointerY.current = e.clientY
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }, [])

  const handleDividerPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingDivider.current) return
    const delta = lastPointerY.current - e.clientY
    lastPointerY.current = e.clientY
    setInputHeight((prev) => Math.max(60, Math.min(400, prev + delta)))
  }, [])

  const handleDividerPointerUp = useCallback(() => {
    isDraggingDivider.current = false
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', minHeight: 0 }}>
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>👾</span>
            <span style={{ color: '#74747C', fontSize: 13 }}>Ask Claude anything</span>
            <span style={{ color: '#595653', fontSize: 11 }}>Powered by Claude Code CLI</span>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}
            {isRunning && messages[messages.length - 1]?.role !== 'thinking' && (
              <TypingIndicator />
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Draggable divider */}
      <div
        onPointerDown={handleDividerPointerDown}
        onPointerMove={handleDividerPointerMove}
        onPointerUp={handleDividerPointerUp}
        style={{
          height: 5,
          cursor: 'row-resize',
          flexShrink: 0,
          position: 'relative',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 0,
            right: 0,
            height: 1,
            background: 'rgba(89, 86, 83, 0.3)',
            transition: 'background 0.15s ease',
          }}
        />
      </div>

      {/* Input — resizable */}
      <div style={{ height: inputHeight, flexShrink: 0, overflow: 'hidden' }}>
        <ChatInput
          onSend={handleSend}
          isRunning={isRunning}
          onStop={handleStop}
        />
      </div>
    </div>
  )
}
