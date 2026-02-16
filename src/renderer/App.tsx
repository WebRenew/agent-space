import { useEffect, lazy, Suspense, useMemo, useState } from 'react'
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FirstRunOnboarding } from './components/FirstRunOnboarding'
import { useSettingsStore, loadSettings } from './store/settings'
import { useWorkspaceStore } from './store/workspace'
import { syncPluginCatalogFromProfiles } from './plugins/runtime'
import type { AppUpdateStatusResult } from '../shared/electron-api'

const LazySettingsPanel = lazy(async () => {
  const mod = await import('./components/SettingsPanel')
  return { default: mod.SettingsPanel }
})

const LazyHelpPanel = lazy(async () => {
  const mod = await import('./components/HelpPanel')
  return { default: mod.HelpPanel }
})

const UPDATE_DISMISS_KEY_PREFIX = 'agent-observer:update-dismissed:'

function dismissKeyFor(latestVersion: string): string {
  return `${UPDATE_DISMISS_KEY_PREFIX}${latestVersion}`
}

export function App() {
  const openSettings = useSettingsStore((s) => s.openSettings)
  const openHelp = useSettingsStore((s) => s.openHelp)
  const isSettingsOpen = useSettingsStore((s) => s.isOpen)
  const isHelpOpen = useSettingsStore((s) => s.isHelpOpen)
  const fontFamily = useSettingsStore((s) => s.settings.appearance.fontFamily)
  const fontSize = useSettingsStore((s) => s.settings.appearance.fontSize)
  const claudeProfiles = useSettingsStore((s) => s.settings.claudeProfiles)
  const [updateNotice, setUpdateNotice] = useState<AppUpdateStatusResult | null>(null)

  useEffect(() => {
    void (async () => {
      await loadSettings()
      await useWorkspaceStore.getState().initializeStartupWorkspace()
    })()
    const unsubs: Array<() => void> = []
    unsubs.push(window.electronAPI.settings.onOpenSettings(() => {
      openSettings()
    }))
    unsubs.push(window.electronAPI.settings.onOpenHelp(() => {
      openHelp()
    }))
    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [openHelp, openSettings])

  // Sync appearance settings to CSS custom properties so all UI inherits them
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--app-font-family', fontFamily)
    root.style.setProperty('--app-font-size', `${fontSize}px`)
  }, [fontFamily, fontSize])

  // Keep plugin catalog in sync with profile plugin directories.
  useEffect(() => {
    void syncPluginCatalogFromProfiles(claudeProfiles)
  }, [claudeProfiles])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const status = await window.electronAPI.updates.getStatus()
        if (cancelled || !status.updateAvailable || !status.latestVersion) return

        const dismissed = localStorage.getItem(dismissKeyFor(status.latestVersion)) === 'dismissed'
        if (dismissed) return

        setUpdateNotice(status)
      } catch (err) {
        console.warn('[App] update status check failed:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const updateDownloadUrl = useMemo(() => (
    updateNotice?.releaseUrl || 'https://github.com/webrenew/agent-observer/releases/latest'
  ), [updateNotice?.releaseUrl])

  const dismissUpdateNotice = () => {
    if (updateNotice?.latestVersion) {
      localStorage.setItem(dismissKeyFor(updateNotice.latestVersion), 'dismissed')
    }
    setUpdateNotice(null)
  }

  return (
    <div className="w-full h-full" style={{ display: 'flex', flexDirection: 'column' }}>
      {updateNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 12px',
            borderBottom: '1px solid rgba(84, 140, 90, 0.35)',
            background: 'linear-gradient(90deg, #121613 0%, #141B16 100%)',
            color: '#d8dfd3',
            fontSize: 12,
            lineHeight: 1.4,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 600 }}>Update available</span>
          <span style={{ color: '#aeb7a6' }}>
            v{(updateNotice.latestVersion ?? '').replace(/^v/i, '')}
            {' '}is available (current v{updateNotice.currentVersion.replace(/^v/i, '')}).
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => window.open(updateDownloadUrl, '_blank', 'noopener,noreferrer')}
            style={{
              border: '1px solid rgba(84, 140, 90, 0.5)',
              background: '#1E2920',
              color: '#d8dfd3',
              borderRadius: 5,
              fontSize: 11,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            Update
          </button>
          <button
            type="button"
            onClick={dismissUpdateNotice}
            style={{
              border: '1px solid rgba(89, 86, 83, 0.4)',
              background: '#121211',
              color: '#9A9692',
              borderRadius: 5,
              fontSize: 11,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <ErrorBoundary fallbackLabel="WorkspaceLayout">
          <WorkspaceLayout />
        </ErrorBoundary>
      </div>
      {isSettingsOpen ? (
        <Suspense fallback={null}>
          <LazySettingsPanel />
        </Suspense>
      ) : null}
      {isHelpOpen ? (
        <Suspense fallback={null}>
          <LazyHelpPanel />
        </Suspense>
      ) : null}
      <FirstRunOnboarding />
    </div>
  )
}
