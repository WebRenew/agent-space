import { app, ipcMain } from 'electron'
import { IPC_CHANNELS, type AppUpdateStatusResult } from '../shared/electron-api'

const RELEASE_API_URL = 'https://api.github.com/repos/webrenew/agent-observer/releases/latest'
const RELEASE_FALLBACK_URL = 'https://github.com/webrenew/agent-observer/releases/latest'
const UPDATE_CHECK_TIMEOUT_MS = 7_000
const UPDATE_CHECK_CACHE_MS = 30 * 60 * 1_000

let handlersRegistered = false
let cachedStatus: AppUpdateStatusResult | null = null
let cacheTimestampMs = 0
let pendingStatusPromise: Promise<AppUpdateStatusResult> | null = null

function parseSemverTriplet(version: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/i.exec(version.trim())
  if (!match) return null

  const major = Number.parseInt(match[1] ?? '', 10)
  const minor = Number.parseInt(match[2] ?? '', 10)
  const patch = Number.parseInt(match[3] ?? '', 10)
  if (![major, minor, patch].every((value) => Number.isFinite(value))) return null
  return [major, minor, patch]
}

export function __testOnlyCompareSemver(left: string, right: string): number {
  const leftParts = parseSemverTriplet(left)
  const rightParts = parseSemverTriplet(right)
  if (!leftParts || !rightParts) return 0

  if (leftParts[0] !== rightParts[0]) return leftParts[0] - rightParts[0]
  if (leftParts[1] !== rightParts[1]) return leftParts[1] - rightParts[1]
  return leftParts[2] - rightParts[2]
}

export function __testOnlyIsUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  return __testOnlyCompareSemver(latestVersion, currentVersion) > 0
}

function baseStatus(currentVersion: string): AppUpdateStatusResult {
  return {
    currentVersion,
    latestVersion: null,
    updateAvailable: false,
    releaseUrl: RELEASE_FALLBACK_URL,
    checkedAt: Date.now(),
    error: null,
  }
}

async function fetchLatestRelease(): Promise<{ latestVersion: string; releaseUrl: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPDATE_CHECK_TIMEOUT_MS)

  try {
    const response = await fetch(RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `agent-observer/${app.getVersion()}`,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Update check failed with status ${response.status}`)
    }

    const payload = (await response.json()) as { tag_name?: unknown; html_url?: unknown }
    if (typeof payload.tag_name !== 'string' || payload.tag_name.trim().length === 0) {
      throw new Error('Release payload missing tag_name')
    }

    const releaseUrl = typeof payload.html_url === 'string' && payload.html_url.startsWith('http')
      ? payload.html_url
      : RELEASE_FALLBACK_URL

    return {
      latestVersion: payload.tag_name.trim(),
      releaseUrl,
    }
  } finally {
    clearTimeout(timer)
  }
}

function normalizeUpdateError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Update check timed out'
  }
  if (err instanceof Error) return err.message
  return String(err)
}

async function checkForUpdates(): Promise<AppUpdateStatusResult> {
  const currentVersion = app.getVersion()
  const fallback = baseStatus(currentVersion)

  try {
    const latest = await fetchLatestRelease()
    return {
      ...fallback,
      latestVersion: latest.latestVersion,
      releaseUrl: latest.releaseUrl,
      updateAvailable: __testOnlyIsUpdateAvailable(currentVersion, latest.latestVersion),
      checkedAt: Date.now(),
    }
  } catch (err) {
    return {
      ...fallback,
      error: normalizeUpdateError(err),
      checkedAt: Date.now(),
    }
  }
}

async function resolveUpdateStatus(): Promise<AppUpdateStatusResult> {
  const now = Date.now()
  if (cachedStatus && (now - cacheTimestampMs) < UPDATE_CHECK_CACHE_MS) {
    return cachedStatus
  }

  if (pendingStatusPromise) return pendingStatusPromise

  pendingStatusPromise = checkForUpdates()
    .then((status) => {
      cachedStatus = status
      cacheTimestampMs = Date.now()
      return status
    })
    .finally(() => {
      pendingStatusPromise = null
    })

  return pendingStatusPromise
}

export function setupUpdateHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(IPC_CHANNELS.updates.getStatus, async () => {
    return resolveUpdateStatus()
  })
}
