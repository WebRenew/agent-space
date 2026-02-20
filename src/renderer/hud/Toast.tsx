import { useEffect } from 'react'
import { useAgentStore, type Toast } from '../store/agents'

export function ToastStack() {
  const toasts = useAgentStore((s) => s.toasts)
  const removeToast = useAgentStore((s) => s.removeToast)

  return (
    <div style={{ position: 'absolute', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'auto' }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function borderForType(type: Toast['type']): string {
  switch (type) {
    case 'error': return '1px solid rgba(196,80,80,0.4)'
    case 'success': return '1px solid rgba(84,140,90,0.4)'
    case 'attention': return '1px solid rgba(255,180,0,0.5)'
    default: return '1px solid rgba(212,160,64,0.4)'
  }
}

function iconColorForType(type: Toast['type']): string {
  switch (type) {
    case 'error': return '#c45050'
    case 'success': return '#548C5A'
    case 'attention': return '#ffb400'
    default: return '#d4a040'
  }
}

function iconForType(type: Toast['type']): string {
  switch (type) {
    case 'error': return '!'
    case 'success': return '+'
    case 'attention': return '!'
    default: return '>'
  }
}

function ToastItem({
  toast,
  onRemove
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  useEffect(() => {
    if (toast.persistent) return
    const timer = setTimeout(() => onRemove(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.persistent, onRemove])

  return (
    <div
      className="glass-panel animate-in"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
        borderRadius: 8, border: borderForType(toast.type), fontSize: 'inherit', minWidth: 240,
      }}
    >
      <span style={{ fontSize: 12, color: iconColorForType(toast.type), fontWeight: 700 }}>
        {iconForType(toast.type)}
      </span>
      <span style={{ color: '#9A9692', flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.handler()
            onRemove(toast.id)
          }}
          style={{
            background: 'rgba(255,180,0,0.15)',
            border: '1px solid rgba(255,180,0,0.3)',
            color: '#ffb400',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.action.label}
        </button>
      )}
      {toast.persistent && (
        <span
          onClick={() => onRemove(toast.id)}
          style={{
            color: '#595653',
            cursor: 'pointer',
            fontSize: 12,
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          x
        </span>
      )}
    </div>
  )
}
