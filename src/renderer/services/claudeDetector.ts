import type { AgentStatus } from '../types'

export interface ClaudeUpdate {
  status?: AgentStatus
  currentTask?: string
  model?: string
  tokensInput?: number
  tokensOutput?: number
  fileModified?: string
  commitDetected?: boolean
  pushDetected?: boolean
  testPassed?: boolean
  testFailed?: boolean
  buildSucceeded?: boolean
  buildFailed?: boolean
}

const BUFFER_MAX = 4000

/** Strip all ANSI escape sequences (colors, cursor moves, etc.) */
function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nq-uy=><~]/g,
    ''
  )
}

// Patterns to detect Claude CLI output states
const PATTERNS = {
  thinking: /(?:Thinking|⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏)/,
  streaming: /[│┃┆┇┊┋╎╏║▎▏]/,
  toolCall: /(?:Read|Write|Edit|Bash|Grep|Glob|WebFetch|WebSearch|Task)\s*[:(]/,
  error: /(?:Error:|ERROR:|Failed:|✗|✘)/i,
  done: /(?:Task completed|✓ Done|✔|completed successfully)/i,
  model: /(?:claude-[\w.-]+|gpt-[\w.-]+)/,
  taskLine: /(?:>[→>]?\s*(.{5,80})$)/m,
  // Activity tracking patterns
  tokens: /(\d[\d,.]*k?)\s*input.*?(\d[\d,.]*k?)\s*output/i,
  tokensAlt: /input[:\s]+(\d[\d,.]*k?).*?output[:\s]+(\d[\d,.]*k?)/i,
  tokensCost: /\$[\d.]+\s*[│|]\s*(\d[\d,.]*k?)\s*input\s*[│|]\s*(\d[\d,.]*k?)\s*output/i,
  fileModified: /(?:Wrote|Created|Updated|Edited)\s+.*?([^\s"']+\.\w+)/i,
  commitSuccess: /\[(?:main|master|[\w/-]+)\s+[\da-f]{7,}\]/,
  pushSuccess: /(?:To\s+(?:git@|https:\/\/)|->.*remote|pushed\s+to)/i,
  testPass: /(?:Tests?\s+passed|PASS\s|✓\s*\d+\s*tests?|All\s+tests?\s+passed)/i,
  testFail: /(?:Tests?\s+failed|FAIL\s|✗\s*\d+\s*tests?|failures?:\s*[1-9])/i,
  buildSuccess: /(?:Build\s+succeeded|Successfully\s+compiled|built\s+in\s+\d)/i,
  buildFail: /(?:Build\s+failed|Failed\s+to\s+compile|error\s+TS\d)/i
} as const

function parseTokenCount(raw: string): number {
  const cleaned = raw.replace(/,/g, '')
  if (cleaned.endsWith('k') || cleaned.endsWith('K')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000)
  }
  return parseInt(cleaned, 10) || 0
}

export class ClaudeDetector {
  private buffer = ''

  /** Feed new terminal output into the detector */
  feed(data: string): ClaudeUpdate | null {
    // Strip ANSI codes before buffering for pattern matching
    const clean = stripAnsi(data)

    this.buffer += clean
    if (this.buffer.length > BUFFER_MAX) {
      this.buffer = this.buffer.slice(-BUFFER_MAX)
    }

    // Check recent chunk for patterns (last ~500 chars is enough for per-frame detection)
    const recent = clean.length > 500 ? clean.slice(-500) : clean

    const update: ClaudeUpdate = {}
    let hasUpdate = false

    // Priority order: error > done > tool_calling > streaming > thinking
    if (PATTERNS.error.test(recent)) {
      update.status = 'error'
      hasUpdate = true
    } else if (PATTERNS.done.test(recent)) {
      update.status = 'done'
      hasUpdate = true
    } else if (PATTERNS.toolCall.test(recent)) {
      update.status = 'tool_calling'
      hasUpdate = true
    } else if (PATTERNS.streaming.test(recent)) {
      update.status = 'streaming'
      hasUpdate = true
    } else if (PATTERNS.thinking.test(recent)) {
      update.status = 'thinking'
      hasUpdate = true
    }

    // Try to extract model name from buffer
    const modelMatch = this.buffer.match(PATTERNS.model)
    if (modelMatch) {
      update.model = modelMatch[0]
      hasUpdate = true
    }

    // Try to extract current task from recent output
    const taskMatch = recent.match(PATTERNS.taskLine)
    if (taskMatch?.[1]) {
      const task = taskMatch[1].trim()
      if (task.length > 5 && !/^[─━═┈┄]+$/.test(task)) {
        update.currentTask = task
        hasUpdate = true
      }
    }

    // Token usage detection — check recent first, then buffer as fallback
    const tokenMatch =
      recent.match(PATTERNS.tokens) ||
      recent.match(PATTERNS.tokensAlt) ||
      recent.match(PATTERNS.tokensCost) ||
      this.buffer.match(PATTERNS.tokens) ||
      this.buffer.match(PATTERNS.tokensAlt) ||
      this.buffer.match(PATTERNS.tokensCost)
    if (tokenMatch) {
      update.tokensInput = parseTokenCount(tokenMatch[1])
      update.tokensOutput = parseTokenCount(tokenMatch[2])
      hasUpdate = true
    }

    // File modification detection
    const fileMatch = recent.match(PATTERNS.fileModified)
    if (fileMatch?.[1]) {
      update.fileModified = fileMatch[1]
      hasUpdate = true
    }

    // Git commit detection
    if (PATTERNS.commitSuccess.test(recent)) {
      update.commitDetected = true
      hasUpdate = true
    }

    // Git push detection
    if (PATTERNS.pushSuccess.test(recent)) {
      update.pushDetected = true
      hasUpdate = true
    }

    // Test result detection
    if (PATTERNS.testPass.test(recent)) {
      update.testPassed = true
      hasUpdate = true
    }
    if (PATTERNS.testFail.test(recent)) {
      update.testFailed = true
      hasUpdate = true
    }

    // Build result detection
    if (PATTERNS.buildSuccess.test(recent)) {
      update.buildSucceeded = true
      hasUpdate = true
    }
    if (PATTERNS.buildFail.test(recent)) {
      update.buildFailed = true
      hasUpdate = true
    }

    return hasUpdate ? update : null
  }

  /** Reset buffer when Claude exits */
  reset(): void {
    this.buffer = ''
  }
}
