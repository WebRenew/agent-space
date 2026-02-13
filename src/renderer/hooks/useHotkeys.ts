import { useEffect, useRef } from 'react'

/**
 * Keyboard shortcut descriptor.
 *
 * `key` is the `KeyboardEvent.key` value (case-insensitive comparison).
 * Modifiers: `meta` = Cmd/Win, `ctrl`, `alt`, `shift`.
 * Use `metaOrCtrl` for cross-platform Cmd+key (Mac) / Ctrl+key (other).
 */
export interface Hotkey {
  key: string
  meta?: boolean
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  /** When true, uses Cmd on Mac, Ctrl on Windows/Linux */
  metaOrCtrl?: boolean
}

export interface HotkeyBinding {
  hotkey: Hotkey
  handler: () => void
  /** Human-readable label, e.g. "⌘1" — used for UI hints */
  label: string
  /** Description for accessibility / help screen */
  description?: string
}

const IS_MAC = navigator.platform.toUpperCase().includes('MAC')

function matches(e: KeyboardEvent, hk: Hotkey): boolean {
  const wantMeta = hk.meta ?? (hk.metaOrCtrl && IS_MAC) ?? false
  const wantCtrl = hk.ctrl ?? (hk.metaOrCtrl && !IS_MAC) ?? false
  const wantAlt = hk.alt ?? false
  const wantShift = hk.shift ?? false

  if (e.metaKey !== wantMeta) return false
  if (e.ctrlKey !== wantCtrl) return false
  if (e.altKey !== wantAlt) return false
  if (e.shiftKey !== wantShift) return false

  return e.key.toLowerCase() === hk.key.toLowerCase()
}

/**
 * Registers a set of keyboard shortcuts on `document`.
 * Bindings can change between renders — the latest array is always used.
 *
 * Shortcuts are NOT fired when the active element is an <input>, <textarea>,
 * or contentEditable node (unless the shortcut uses a modifier key).
 */
export function useHotkeys(bindings: HotkeyBinding[]): void {
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const active = document.activeElement
      const isEditable =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)

      for (const binding of bindingsRef.current) {
        if (matches(e, binding.hotkey)) {
          // Allow modifier shortcuts even in editable fields
          const hasModifier =
            binding.hotkey.meta ||
            binding.hotkey.ctrl ||
            binding.hotkey.alt ||
            binding.hotkey.metaOrCtrl

          if (isEditable && !hasModifier) continue

          e.preventDefault()
          e.stopPropagation()
          try {
            binding.handler()
          } catch (err) {
            console.error(`[useHotkeys] Handler for "${binding.label}" threw:`, err)
          }
          return
        }
      }
    }

    document.addEventListener('keydown', handler, true) // capture phase
    return () => document.removeEventListener('keydown', handler, true)
  }, [])
}

// ── Shortcut label helpers ─────────────────────────────────────────

const MOD = IS_MAC ? '⌘' : 'Ctrl+'
const ALT = IS_MAC ? '⌥' : 'Alt+'
const SHIFT = IS_MAC ? '⇧' : 'Shift+'

export function formatShortcut(hk: Hotkey): string {
  const parts: string[] = []
  if (hk.metaOrCtrl) parts.push(MOD)
  else if (hk.meta) parts.push(MOD)
  if (hk.ctrl && !hk.metaOrCtrl) parts.push('Ctrl+')
  if (hk.alt) parts.push(ALT)
  if (hk.shift) parts.push(SHIFT)

  const keyLabel = hk.key.length === 1 ? hk.key.toUpperCase() : hk.key
  parts.push(keyLabel)
  return parts.join('')
}

// ── Pre-built shortcut definitions ─────────────────────────────────

export const SHORTCUTS = {
  // Panel switching (Cmd+1–8)
  focusChat:        { hotkey: { key: '1', metaOrCtrl: true }, label: `${MOD}1`, description: 'Focus Chat' },
  focusTerminal:    { hotkey: { key: '2', metaOrCtrl: true }, label: `${MOD}2`, description: 'Focus Terminal' },
  focusTokens:      { hotkey: { key: '3', metaOrCtrl: true }, label: `${MOD}3`, description: 'Focus Tokens' },
  focusOffice:      { hotkey: { key: '4', metaOrCtrl: true }, label: `${MOD}4`, description: 'Focus Office' },
  focusActivity:    { hotkey: { key: '5', metaOrCtrl: true }, label: `${MOD}5`, description: 'Focus Activity' },
  focusMemoryGraph: { hotkey: { key: '6', metaOrCtrl: true }, label: `${MOD}6`, description: 'Focus Memory Graph' },
  focusAgents:      { hotkey: { key: '7', metaOrCtrl: true }, label: `${MOD}7`, description: 'Focus Agents' },
  focusRecent:      { hotkey: { key: '8', metaOrCtrl: true }, label: `${MOD}8`, description: 'Focus Recent' },

  // Actions
  newTerminal:      { hotkey: { key: 'n', metaOrCtrl: true, shift: true }, label: `${MOD}${SHIFT}N`, description: 'New Terminal' },
  openSettings:     { hotkey: { key: ',', metaOrCtrl: true }, label: `${MOD},`, description: 'Open Settings' },
  toggleSidebar:    { hotkey: { key: 'b', metaOrCtrl: true }, label: `${MOD}B`, description: 'Toggle Right Column' },
  resetLayout:      { hotkey: { key: 'r', metaOrCtrl: true, shift: true }, label: `${MOD}${SHIFT}R`, description: 'Reset Layout' },
  closePanel:       { hotkey: { key: 'w', metaOrCtrl: true }, label: `${MOD}W`, description: 'Close Active Panel' },
  toggleFullscreen: { hotkey: { key: 'Enter', metaOrCtrl: true, shift: true }, label: `${MOD}${SHIFT}Enter`, description: 'Toggle Fullscreen' },
  focusChatInput:   { hotkey: { key: '/', metaOrCtrl: true }, label: `${MOD}/`, description: 'Focus Chat Input' },
  openFolder:       { hotkey: { key: 'o', metaOrCtrl: true }, label: `${MOD}O`, description: 'Open Folder' },
  fileSearch:       { hotkey: { key: 'p', metaOrCtrl: true }, label: `${MOD}P`, description: 'Search Files' },
  fileExplorer:     { hotkey: { key: 'e', metaOrCtrl: true, shift: true }, label: `${MOD}${SHIFT}E`, description: 'File Explorer' },
  escape:           { hotkey: { key: 'Escape' }, label: 'Esc', description: 'Close Menus / Deselect' },
} as const

/** Ordered panel IDs — index maps to Cmd+1 through Cmd+7 */
export const PANEL_SHORTCUT_ORDER = [
  'chat', 'terminal', 'tokens', 'scene3d',
  'activity', 'agents', 'recentMemories',
] as const
