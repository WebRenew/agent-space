import { expect, test } from '@playwright/test'
import { ClaudeDetector, type ClaudeUpdate } from '../../src/renderer/services/claudeDetector'

// ── ClaudeDetector: needsInput pattern matching ────────────────────────

test.describe('ClaudeDetector needsInput detection', () => {
  let detector: ClaudeDetector

  test.beforeEach(() => {
    detector = new ClaudeDetector()
  })

  // ── OAuth / auth URL patterns ──────────────────────────────────────

  test('should detect GitHub OAuth device flow URL', () => {
    const update = detector.feed(
      'Please open https://github.com/login/oauth/authorize?client_id=abc123 in your browser'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    expect(update!.status).toBe('waiting')
    expect(update!.inputReason).toContain('OAuth')
  })

  test('should detect device authorization URL', () => {
    const update = detector.feed(
      'Open https://github.com/login/device and enter code: ABCD-1234'
    )
    // 'login' in the URL should match needsInputUrl
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    expect(update!.status).toBe('waiting')
  })

  test('should detect Vercel callback URL', () => {
    const update = detector.feed(
      'Visit https://vercel.com/api/callback?token=xyz to complete linking'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    expect(update!.status).toBe('waiting')
  })

  test('should detect auth/device verification URI', () => {
    const update = detector.feed(
      'verification_uri: https://microsoft.com/devicelogin'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  // ── Interactive prompt patterns ────────────────────────────────────

  test('should detect Press Enter prompt', () => {
    const update = detector.feed('Press Enter to continue...')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    expect(update!.status).toBe('waiting')
    expect(update!.inputReason).toContain('confirmation')
  })

  test('should detect Continue? [Y/n] prompt', () => {
    const update = detector.feed('Do you want to install? Continue? [Y/n]')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    expect(update!.status).toBe('waiting')
  })

  test('should detect (y/n) prompt', () => {
    const update = detector.feed('Are you sure you want to proceed? (y/n)')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect confirm? [y/N] prompt', () => {
    const update = detector.feed('Delete all files? confirm? [y/N]')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect "Do you want to continue" prompt', () => {
    const update = detector.feed('Some packages need updating. Do you want to continue')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  // ── Link instruction patterns ──────────────────────────────────────

  test('should detect "Open this link" instruction', () => {
    const update = detector.feed('Open this link to authorize: https://example.com')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    expect(update!.inputReason).toContain('link')
  })

  test('should detect "Visit the following" instruction', () => {
    const update = detector.feed('Visit the following URL to set up your account')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect "open the following URL" instruction', () => {
    const update = detector.feed('Please open the following URL in your browser')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect "Copy and paste this URL" instruction', () => {
    const update = detector.feed('Copy and paste this URL into your browser')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  // ── Auth prompt patterns ───────────────────────────────────────────

  test('should detect "Enter your password" prompt', () => {
    const update = detector.feed('Enter your password: ')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    expect(update!.status).toBe('waiting')
    expect(update!.inputReason).toContain('credentials')
  })

  test('should detect "Enter your API key" prompt', () => {
    const update = detector.feed('Enter your API key to continue:')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect "Please log in" prompt', () => {
    const update = detector.feed('Please log in to your account first')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect "Please authenticate" prompt', () => {
    const update = detector.feed('Please authenticate to proceed')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect "Paste your token" prompt', () => {
    const update = detector.feed('Paste your authentication token here:')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect "Enter your token" prompt', () => {
    const update = detector.feed('Enter your token to continue:')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect passphrase prompt', () => {
    const update = detector.feed('Enter passphrase for key "/home/user/.ssh/id_rsa":')
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  // ── Non-matching output ────────────────────────────────────────────

  test('should not flag regular URLs as needsInput', () => {
    const update = detector.feed(
      'Fetching https://registry.npmjs.org/some-package'
    )
    // Regular URL without oauth/authorize/login/callback keywords
    expect(update?.needsInput).toBeFalsy()
  })

  test('should not flag regular log output as needsInput', () => {
    const update = detector.feed('Building project... compiled 42 modules in 3.2s')
    expect(update?.needsInput).toBeFalsy()
  })

  test('should not flag "continue" in normal sentences as a prompt', () => {
    const update = detector.feed('Will continue processing the remaining files')
    expect(update?.needsInput).toBeFalsy()
  })

  // ── ANSI stripping ─────────────────────────────────────────────────

  test('should detect needsInput through ANSI escape codes', () => {
    // Simulate colored terminal output wrapping a prompt
    const ansiWrapped = '\x1b[33mPlease log in\x1b[0m to your account'
    const update = detector.feed(ansiWrapped)
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  // ── Reset clears state ─────────────────────────────────────────────

  test('should return null for empty input after reset', () => {
    detector.feed('Enter your password: ')
    detector.reset()
    // Feed something that doesn't match any pattern
    const update = detector.feed('regular output with no patterns')
    expect(update).toBeNull()
  })

  // ── Priority: needsInput overrides earlier status ──────────────────

  test('should set status to waiting even when other status patterns match first', () => {
    // Feed output that has both a thinking spinner and a login URL
    const update = detector.feed(
      '⠋ https://github.com/login/oauth/authorize?client_id=abc'
    )
    expect(update).not.toBeNull()
    // needsInput detection runs after status detection and overrides it
    expect(update!.needsInput).toBe(true)
    expect(update!.status).toBe('waiting')
  })
})

// ── Real-world scenario tests ────────────────────────────────────────

test.describe('ClaudeDetector real-world needsInput scenarios', () => {
  let detector: ClaudeDetector

  test.beforeEach(() => {
    detector = new ClaudeDetector()
  })

  test('should detect gh auth login flow', () => {
    // Simulate GitHub CLI auth prompt
    detector.feed('? What account do you want to log into? GitHub.com\n')
    const update = detector.feed(
      '! First copy your one-time code: ABCD-1234\n' +
      'Open this link in your browser: https://github.com/login/device\n'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect npx vercel link flow', () => {
    const update = detector.feed(
      'Vercel CLI 33.0.0\n' +
      '? Set up and deploy? [Y/n]'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect SSH passphrase prompt', () => {
    const update = detector.feed(
      'Cloning into \'repo\'...\n' +
      'Enter passphrase for key \'/home/user/.ssh/id_ed25519\': '
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect npm publish login prompt', () => {
    const update = detector.feed(
      'npm notice Log in on https://registry.npmjs.org/\n' +
      'Please log in or sign up\n' +
      'Enter your password: '
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })

  test('should detect Azure device code flow', () => {
    const update = detector.feed(
      'To sign in, use a web browser to open the page\n' +
      'https://microsoft.com/devicelogin and enter the code ABC123\n' +
      'verification_uri: https://microsoft.com/devicelogin'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
  })
})

// ── Pattern category coverage ────────────────────────────────────────

test.describe('ClaudeDetector needsInput inputReason categorization', () => {
  let detector: ClaudeDetector

  test.beforeEach(() => {
    detector = new ClaudeDetector()
  })

  test('should categorize OAuth URLs as browser interaction', () => {
    const update = detector.feed('https://example.com/oauth/authorize')
    expect(update!.inputReason).toBe('OAuth/auth URL needs browser interaction')
  })

  test('should categorize auth prompts as credentials', () => {
    const update = detector.feed('Enter your API key:')
    expect(update!.inputReason).toBe('Waiting for credentials or authentication')
  })

  test('should categorize link instructions as link-opening', () => {
    const update = detector.feed('Visit the following URL to continue')
    expect(update!.inputReason).toBe('A link needs to be opened')
  })

  test('should categorize interactive prompts as confirmation', () => {
    const update = detector.feed('Continue? [Y/n]')
    expect(update!.inputReason).toBe('Waiting for confirmation')
  })
})

// ── needsInput priority (URL > Auth > Link > Prompt) ─────────────────

test.describe('ClaudeDetector needsInput priority order', () => {
  test('should prefer URL detection over prompt detection when both match', () => {
    const detector = new ClaudeDetector()
    // Contains both a URL with "oauth" and a "[Y/n]" prompt
    const update = detector.feed(
      'Open https://example.com/oauth/authorize and confirm? [Y/n]'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    // URL detection has highest priority
    expect(update!.inputReason).toBe('OAuth/auth URL needs browser interaction')
  })

  test('should prefer auth detection over link detection when both match', () => {
    const detector = new ClaudeDetector()
    // Contains both "Please log in" and "Open this link"
    const update = detector.feed(
      'Please log in at Open this link: https://example.com'
    )
    expect(update).not.toBeNull()
    expect(update!.needsInput).toBe(true)
    // Auth detection should win over link detection
    expect(update!.inputReason).toBe('Waiting for credentials or authentication')
  })
})
