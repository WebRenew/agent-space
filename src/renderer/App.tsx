import { useEffect } from 'react'
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout'
import { SettingsPanel } from './components/SettingsPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useSettingsStore, loadSettings } from './store/settings'

export function App() {
  const openSettings = useSettingsStore((s) => s.openSettings)

  useEffect(() => {
    loadSettings()
    const unsub = window.electronAPI.settings.onOpenSettings(() => {
      openSettings()
    })
    return unsub
  }, [openSettings])

  return (
    <div className="w-full h-full">
      <ErrorBoundary fallbackLabel="WorkspaceLayout">
        <WorkspaceLayout />
      </ErrorBoundary>
      <SettingsPanel />
    </div>
  )
}
