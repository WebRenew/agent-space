import { useEffect, type ReactNode } from 'react'
import { useSettingsStore } from '../store/settings'
import { SHORTCUTS } from '../hooks/useHotkeys'

interface ShortcutRow {
  label: string
  keys: string
}

interface LegendRow {
  token: string
  meaning: string
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: '#74747C', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function ShortcutList({ rows }: { rows: ShortcutRow[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px' }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'contents' }}>
          <span style={{ color: '#9A9692', fontSize: 12 }}>{row.label}</span>
          <code style={{ color: '#548C5A', fontSize: 12, fontFamily: 'inherit' }}>{row.keys}</code>
        </div>
      ))}
    </div>
  )
}

function LegendList({ rows }: { rows: LegendRow[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px' }}>
      {rows.map((row) => (
        <div key={`${row.token}:${row.meaning}`} style={{ display: 'contents' }}>
          <code style={{ color: '#9A9692', fontSize: 12, fontFamily: 'inherit' }}>{row.token}</code>
          <span style={{ color: '#9A9692', fontSize: 12 }}>{row.meaning}</span>
        </div>
      ))}
    </div>
  )
}

export function HelpPanel() {
  const isHelpOpen = useSettingsStore((s) => s.isHelpOpen)
  const closeHelp = useSettingsStore((s) => s.closeHelp)

  useEffect(() => {
    if (!isHelpOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHelp()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeHelp, isHelpOpen])

  if (!isHelpOpen) return null

  const panelShortcuts: ShortcutRow[] = [
    { label: 'Focus Chat', keys: SHORTCUTS.focusChat.label },
    { label: 'Focus Terminal', keys: SHORTCUTS.focusTerminal.label },
    { label: 'Focus Tokens', keys: SHORTCUTS.focusTokens.label },
    { label: 'Focus Office', keys: SHORTCUTS.focusOffice.label },
    { label: 'Focus Activity', keys: SHORTCUTS.focusActivity.label },
    { label: 'Focus Agents', keys: SHORTCUTS.focusAgents.label },
    { label: 'Focus Recent', keys: SHORTCUTS.focusRecent.label },
    { label: 'Search Files', keys: SHORTCUTS.fileSearch.label },
    { label: 'File Explorer', keys: SHORTCUTS.fileExplorer.label },
  ]

  const actionShortcuts: ShortcutRow[] = [
    { label: 'Open Folder', keys: SHORTCUTS.openFolder.label },
    { label: 'New Terminal', keys: SHORTCUTS.newTerminal.label },
    { label: 'Focus Chat Input', keys: SHORTCUTS.focusChatInput.label },
    { label: 'Open Settings', keys: SHORTCUTS.openSettings.label },
    { label: 'Open Help', keys: SHORTCUTS.openHelp.label },
    { label: 'Reset Layout', keys: SHORTCUTS.resetLayout.label },
    { label: 'Close Active Panel', keys: SHORTCUTS.closePanel.label },
    { label: 'Close Menus / Deselect', keys: SHORTCUTS.escape.label },
  ]

  const chatLegend: LegendRow[] = [
    { token: 'W', meaning: 'Chat tab is using workspace directory mode.' },
    { token: 'C', meaning: 'Chat tab is using a custom directory.' },
    { token: 'W+', meaning: 'Create a new chat scoped to current workspace.' },
    { token: '+', meaning: 'Create a new chat inheriting the active tab scope.' },
    { token: '↗', meaning: 'Pop the chat out into a separate window.' },
    { token: 'x', meaning: 'Close that chat tab.' },
  ]

  const terminalLegend: LegendRow[] = [
    { token: 'green dot', meaning: 'Claude is currently running in that terminal.' },
    { token: 'gray dot', meaning: 'Terminal is idle (no active Claude run).' },
    { token: 'left color bar', meaning: 'Terminal scope color.' },
    { token: 'x', meaning: 'Close that terminal tab.' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={closeHelp}
      />

      <div
        className="glass-panel"
        style={{
          position: 'relative',
          width: 640,
          maxWidth: '92vw',
          maxHeight: '80vh',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#9A9692', margin: 0 }}>Help</h2>
          <button
            onClick={closeHelp}
            style={{ background: 'transparent', border: 'none', color: '#595653', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit' }}
            title={`Close (${SHORTCUTS.escape.label})`}
          >
            &times;
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', minHeight: 0 }}>
          <Section title="KEYBOARD SHORTCUTS">
            <ShortcutList rows={actionShortcuts} />
          </Section>

          <Section title="PANEL SHORTCUTS">
            <ShortcutList rows={panelShortcuts} />
          </Section>

          <Section title="CHAT LEGEND">
            <LegendList rows={chatLegend} />
          </Section>

          <Section title="TERMINAL LEGEND">
            <LegendList rows={terminalLegend} />
          </Section>
        </div>
      </div>
    </div>
  )
}
