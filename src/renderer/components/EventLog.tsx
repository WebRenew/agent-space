import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useAgentStore } from '../store/agents'
import type { AgentEventType } from '../types'

const EVENT_ICONS: Record<AgentEventType, { icon: string; color: string }> = {
  spawn: { icon: '→', color: '#548C5A' },
  exit: { icon: '←', color: '#595653' },
  status_change: { icon: '◐', color: '#d4a040' },
  file_write: { icon: '✎', color: '#c87830' },
  tool_call: { icon: '⚡', color: '#d4a040' },
  commit: { icon: '✓', color: '#548C5A' },
  push: { icon: '↑', color: '#548C5A' },
  test_pass: { icon: '✓', color: '#548C5A' },
  test_fail: { icon: '✗', color: '#c45050' },
  build_pass: { icon: '✓', color: '#548C5A' },
  build_fail: { icon: '✗', color: '#c45050' },
  error: { icon: '!', color: '#c45050' }
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

  const selectStyle: React.CSSProperties = {
    background: 'rgba(89,86,83,0.15)', fontSize: 12, color: '#9A9692',
    border: '1px solid rgba(89,86,83,0.3)', borderRadius: 4,
    padding: '3px 6px', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0E0E0D', color: '#9A9692' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid rgba(89,86,83,0.2)', flexShrink: 0 }}>
        <select value={agentFilter} onChange={handleAgentFilter} style={selectStyle}>
          <option value="all" style={{ background: '#0E0E0D' }}>All Agents</option>
          {uniqueAgents.map(([id, name]) => (
            <option key={id} value={id} style={{ background: '#0E0E0D' }}>{name}</option>
          ))}
        </select>

        <select value={typeFilter} onChange={handleTypeFilter} style={selectStyle}>
          <option value="all" style={{ background: '#0E0E0D' }}>All Events</option>
          <option value="spawn" style={{ background: '#0E0E0D' }}>Spawn</option>
          <option value="exit" style={{ background: '#0E0E0D' }}>Exit</option>
          <option value="status_change" style={{ background: '#0E0E0D' }}>Status Change</option>
          <option value="file_write" style={{ background: '#0E0E0D' }}>File Write</option>
          <option value="tool_call" style={{ background: '#0E0E0D' }}>Tool Call</option>
          <option value="commit" style={{ background: '#0E0E0D' }}>Commit</option>
          <option value="push" style={{ background: '#0E0E0D' }}>Push</option>
          <option value="test_pass" style={{ background: '#0E0E0D' }}>Test Pass</option>
          <option value="test_fail" style={{ background: '#0E0E0D' }}>Test Fail</option>
          <option value="build_pass" style={{ background: '#0E0E0D' }}>Build Pass</option>
          <option value="build_fail" style={{ background: '#0E0E0D' }}>Build Fail</option>
          <option value="error" style={{ background: '#0E0E0D' }}>Error</option>
        </select>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#595653' }}>{filteredEvents.length} events</span>

        <button
          onClick={clearEvents}
          style={{ background: 'transparent', border: 'none', color: '#595653', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Clear
        </button>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {filteredEvents.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#595653', fontSize: 12 }}>
            No events yet
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const { icon, color } = EVENT_ICONS[evt.type]
            return (
              <div
                key={evt.id}
                className="hover-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '3px 12px',
                  fontSize: 12, fontFamily: 'inherit', borderBottom: '1px solid rgba(89,86,83,0.1)',
                }}
              >
                <span style={{ color: '#595653', flexShrink: 0, width: 58 }}>{formatTime(evt.timestamp)}</span>
                <span style={{ flexShrink: 0, width: 16, textAlign: 'center', color }}>{icon}</span>
                <span style={{ color: '#74747C', flexShrink: 0, width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.agentName}</span>
                <span style={{ color: '#9A9692', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.description}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
