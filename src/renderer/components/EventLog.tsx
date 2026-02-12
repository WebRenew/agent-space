import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useAgentStore } from '../store/agents'
import type { AgentEventType } from '../types'

const EVENT_ICONS: Record<AgentEventType, { icon: string; color: string }> = {
  spawn: { icon: '→', color: '#4ade80' },
  exit: { icon: '←', color: '#6b7280' },
  status_change: { icon: '◐', color: '#60a5fa' },
  file_write: { icon: '✎', color: '#a78bfa' },
  tool_call: { icon: '⚡', color: '#fbbf24' },
  commit: { icon: '✓', color: '#4ade80' },
  push: { icon: '↑', color: '#22d3ee' },
  test_pass: { icon: '✓', color: '#4ade80' },
  test_fail: { icon: '✗', color: '#f87171' },
  build_pass: { icon: '✓', color: '#4ade80' },
  build_fail: { icon: '✗', color: '#f87171' },
  error: { icon: '!', color: '#f87171' }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function EventLog() {
  const events = useAgentStore((s) => s.events)
  const agents = useAgentStore((s) => s.agents)
  const clearEvents = useAgentStore((s) => s.clearEvents)

  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isHovering, setIsHovering] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const uniqueAgents = useMemo(() => {
    const seen = new Map<string, string>()
    for (const evt of events) {
      if (!seen.has(evt.agentId)) {
        seen.set(evt.agentId, evt.agentName)
      }
    }
    // Also include currently active agents
    for (const agent of agents) {
      if (!seen.has(agent.id)) {
        seen.set(agent.id, agent.name)
      }
    }
    return Array.from(seen.entries())
  }, [events, agents])

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (agentFilter !== 'all' && evt.agentId !== agentFilter) return false
      if (typeFilter !== 'all' && evt.type !== typeFilter) return false
      return true
    })
  }, [events, agentFilter, typeFilter])

  // Auto-scroll to bottom on new events (unless hovering)
  useEffect(() => {
    if (!isHovering && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredEvents.length, isHovering])

  const handleAgentFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setAgentFilter(e.target.value)
  }, [])

  const handleTypeFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#16162a] text-gray-300">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2a2a4a] shrink-0">
        <select
          value={agentFilter}
          onChange={handleAgentFilter}
          className="bg-[#1e1e3a] text-xs text-gray-300 border border-[#2a2a4a] rounded px-2 py-1 outline-none focus:border-purple-500"
        >
          <option value="all">All Agents</option>
          {uniqueAgents.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={handleTypeFilter}
          className="bg-[#1e1e3a] text-xs text-gray-300 border border-[#2a2a4a] rounded px-2 py-1 outline-none focus:border-purple-500"
        >
          <option value="all">All Events</option>
          <option value="spawn">Spawn</option>
          <option value="exit">Exit</option>
          <option value="status_change">Status Change</option>
          <option value="file_write">File Write</option>
          <option value="tool_call">Tool Call</option>
          <option value="commit">Commit</option>
          <option value="push">Push</option>
          <option value="test_pass">Test Pass</option>
          <option value="test_fail">Test Fail</option>
          <option value="build_pass">Build Pass</option>
          <option value="build_fail">Build Fail</option>
          <option value="error">Error</option>
        </select>

        <div className="flex-1" />

        <span className="text-xs text-gray-500">{filteredEvents.length} events</span>

        <button
          onClick={clearEvents}
          className="text-xs text-gray-500 hover:text-red-400 px-2 py-0.5 rounded hover:bg-red-400/10 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
            No events yet
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const { icon, color } = EVENT_ICONS[evt.type]
            return (
              <div
                key={evt.id}
                className="flex items-center gap-2 px-3 py-1 text-xs font-mono hover:bg-[#1e1e3a] border-b border-[#1e1e3a]"
              >
                <span className="text-gray-500 shrink-0 w-16">{formatTime(evt.timestamp)}</span>
                <span className="shrink-0 w-4 text-center" style={{ color }}>{icon}</span>
                <span className="text-gray-400 shrink-0 w-20 truncate">{evt.agentName}</span>
                <span className="text-gray-300 truncate">{evt.description}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
