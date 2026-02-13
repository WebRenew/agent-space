import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import os from 'os'
import path from 'path'
import fs from 'fs'

/**
 * Background agent that generates creative names and task descriptions
 * for chat agents using a lightweight Claude CLI call.
 *
 * Uses the same binary resolution as claude-session.ts but runs a quick
 * one-shot prompt to haiku for speed and cost efficiency.
 */

let handlersRegistered = false
let resolvedBinary: string | null = null

function resolveClaudeBinary(): string {
  if (resolvedBinary) return resolvedBinary

  const home = os.homedir()
  const candidates = [
    path.join(home, '.local', 'bin', 'claude'),
    path.join(home, '.bun', 'bin', 'claude'),
    path.join(home, '.npm-global', 'bin', 'claude'),
    path.join(home, 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ]

  const nvmDir = path.join(home, '.nvm', 'versions', 'node')
  try {
    if (fs.existsSync(nvmDir)) {
      for (const v of fs.readdirSync(nvmDir)) {
        candidates.push(path.join(nvmDir, v, 'bin', 'claude'))
      }
    }
  } catch { /* nvm not present */ }

  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK)
      resolvedBinary = c
      return c
    } catch { /* continue */ }
  }

  resolvedBinary = 'claude'
  return 'claude'
}

function getEnhancedEnv(): NodeJS.ProcessEnv {
  const home = os.homedir()
  const extraPaths = [
    path.join(home, '.local', 'bin'),
    path.join(home, '.bun', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, 'bin'),
    '/usr/local/bin',
    '/opt/homebrew/bin',
  ]
  const currentPath = process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin'
  return { ...process.env, PATH: [...extraPaths, ...currentPath.split(':')].join(':') }
}

interface NamingResult {
  name: string
  taskDescription: string
}

const FALLBACK_NAMES = [
  'Pixel', 'Byte', 'Nova', 'Flux', 'Spark',
  'Echo', 'Drift', 'Pulse', 'Glyph', 'Zephyr',
  'Nimbus', 'Blitz', 'Orbit', 'Sage', 'Onyx',
  'Ember', 'Quill', 'Helix', 'Prism', 'Atlas',
]

function fallbackResult(prompt: string): NamingResult {
  const name = FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)]
  const taskDescription = prompt.slice(0, 80).trim() || 'Working on a task'
  return { name, taskDescription }
}

async function generateAgentMeta(prompt: string): Promise<NamingResult> {
  const binary = resolveClaudeBinary()

  const systemPrompt = `You are a naming agent. Given a user's task prompt, respond with ONLY a JSON object (no markdown, no code blocks) with two fields:
- "name": a creative, fun single-word agent name (like a developer codename — think: Pixel, Nova, Zephyr, Ember, Quill)
- "taskDescription": a concise 3-8 word description of what the agent will do

Example: {"name":"Prism","taskDescription":"Building responsive dashboard layout"}`

  const safePrompt = prompt.replace(/\0/g, '').slice(0, 500)

  return new Promise<NamingResult>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(fallbackResult(prompt))
    }, 8000)

    try {
      const proc = spawn(binary, [
        '-p',
        '--output-format', 'text',
        '--model', 'claude-haiku-4-5-20251001',
        '--max-turns', '1',
        '--append-system-prompt', systemPrompt,
        '--dangerously-skip-permissions',
        '--', `Task: ${safePrompt}`,
      ], {
        env: getEnhancedEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stdout = ''
      proc.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
      })

      proc.on('error', () => {
        clearTimeout(timeout)
        resolve(fallbackResult(prompt))
      })

      proc.on('exit', () => {
        clearTimeout(timeout)
        try {
          // Try to extract JSON from the response (may have surrounding text)
          const jsonMatch = stdout.match(/\{[^}]*"name"[^}]*"taskDescription"[^}]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
            if (typeof parsed.name === 'string' && typeof parsed.taskDescription === 'string') {
              resolve({
                name: parsed.name.slice(0, 20),
                taskDescription: parsed.taskDescription.slice(0, 80),
              })
              return
            }
          }
        } catch { /* parse failed */ }
        resolve(fallbackResult(prompt))
      })
    } catch {
      clearTimeout(timeout)
      resolve(fallbackResult(prompt))
    }
  })
}

export function setupAgentNamerHandlers(_mainWindow: BrowserWindow): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle('agent:generateMeta', async (_event, prompt: unknown) => {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return fallbackResult('')
    }
    return generateAgentMeta(prompt)
  })
}
