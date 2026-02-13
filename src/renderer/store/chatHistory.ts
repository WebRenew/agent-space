import { create } from 'zustand'
import type { ChatMessage } from '../types'

interface ChatHistoryStore {
  historiesByScope: Record<string, ChatMessage[]>
  loadedScopes: Set<string>
  loadingScopes: Set<string>

  loadHistory: (scopeId: string) => Promise<void>
  isLoaded: (scopeId: string) => boolean
  getHistory: (scopeId: string) => ChatMessage[]
  clearScope: (scopeId: string) => void
}

let historyMessageCounter = 0

export const useChatHistoryStore = create<ChatHistoryStore>((set, get) => ({
  historiesByScope: {},
  loadedScopes: new Set(),
  loadingScopes: new Set(),

  loadHistory: async (scopeId: string) => {
    const state = get()
    if (state.loadedScopes.has(scopeId) || state.loadingScopes.has(scopeId)) return

    set((prev) => ({ loadingScopes: new Set([...prev.loadingScopes, scopeId]) }))

    try {
      const ready = await window.electronAPI.memories.isReady()
      if (!ready) {
        set((prev) => {
          const scopes = new Set(prev.loadingScopes)
          scopes.delete(scopeId)
          return { loadingScopes: scopes }
        })
        return
      }

      const entries = await window.electronAPI.memories.getChatHistory(scopeId, 100)

      const messages: ChatMessage[] = entries.map((entry) => ({
        id: `hist-${++historyMessageCounter}`,
        role: entry.role as ChatMessage['role'],
        content: entry.content,
        timestamp: new Date(entry.timestamp).getTime(),
      }))

      set((prev) => {
        const loading = new Set(prev.loadingScopes)
        loading.delete(scopeId)
        return {
          historiesByScope: { ...prev.historiesByScope, [scopeId]: messages },
          loadedScopes: new Set([...prev.loadedScopes, scopeId]),
          loadingScopes: loading,
        }
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[chatHistory] Failed to load history for scope ${scopeId}: ${message}`)
      set((prev) => {
        const scopes = new Set(prev.loadingScopes)
        scopes.delete(scopeId)
        return { loadingScopes: scopes }
      })
    }
  },

  isLoaded: (scopeId: string) => get().loadedScopes.has(scopeId),

  getHistory: (scopeId: string) => get().historiesByScope[scopeId] ?? [],

  clearScope: (scopeId: string) => {
    set((prev) => {
      const updated = { ...prev.historiesByScope }
      delete updated[scopeId]
      const scopes = new Set(prev.loadedScopes)
      scopes.delete(scopeId)
      return { historiesByScope: updated, loadedScopes: scopes }
    })
  },
}))
