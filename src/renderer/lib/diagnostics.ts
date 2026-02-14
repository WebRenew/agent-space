type RendererLogLevel = 'info' | 'warn' | 'error'

function toSerializable(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value, (_key, inner) => {
      if (inner instanceof Error) {
        return {
          name: inner.name,
          message: inner.message,
          stack: inner.stack ?? null,
        }
      }
      return inner
    }))
  } catch (err) {
    return {
      serializationError: err instanceof Error ? err.message : String(err),
    }
  }
}

export function logRendererEvent(
  level: RendererLogLevel,
  event: string,
  payload?: Record<string, unknown>
): void {
  const diagnostics = window.electronAPI?.diagnostics
  if (!diagnostics) return
  void diagnostics.logRenderer(
    level,
    event,
    payload ? (toSerializable(payload) as Record<string, unknown>) : undefined
  ).catch(() => {
    // Ignore logging failures to avoid recursive errors.
  })
}

export function setupGlobalRendererDiagnostics(source: string): void {
  window.addEventListener('error', (event) => {
    logRendererEvent('error', 'renderer.window_error', {
      source,
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack ?? null,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    logRendererEvent('error', 'renderer.unhandled_rejection', {
      source,
      reason:
        reason instanceof Error
          ? { name: reason.name, message: reason.message, stack: reason.stack ?? null }
          : String(reason),
    })
  })
}
