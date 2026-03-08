import { expect, test } from '@playwright/test'
import {
  __testOnlyFindActiveConversationSessionId,
  __testOnlyResolveClaudeEventTargetIds,
} from '../../src/main/claude-session'

test('routes claude events to owning window when no extra observers are registered', () => {
  const targets = __testOnlyResolveClaudeEventTargetIds(42, [])
  expect(targets).toEqual([42])
})

test('routes claude events to owner plus observers without duplicate ids', () => {
  const targets = __testOnlyResolveClaudeEventTargetIds(42, [42, 43, 44, 43])
  expect(targets).toEqual([42, 43, 44])
})

test('supports observer-only delivery for externally observed sessions', () => {
  const targets = __testOnlyResolveClaudeEventTargetIds(null, [77, 78])
  expect(targets).toEqual([77, 78])
})

test('finds the live session that still owns a conversation id', () => {
  const sessionId = __testOnlyFindActiveConversationSessionId([
    {
      sessionId: 'session-exited',
      conversationId: 'conv-1',
      process: { exitCode: 0, signalCode: null },
    },
    {
      sessionId: 'session-live',
      conversationId: 'conv-1',
      process: { exitCode: null, signalCode: null },
    },
  ], 'conv-1')

  expect(sessionId).toBe('session-live')
})

test('ignores sessions for other conversations or already-terminated processes', () => {
  const sessionId = __testOnlyFindActiveConversationSessionId([
    {
      sessionId: 'session-other',
      conversationId: 'conv-2',
      process: { exitCode: null, signalCode: null },
    },
    {
      sessionId: 'session-signaled',
      conversationId: 'conv-1',
      process: { exitCode: null, signalCode: 'SIGTERM' },
    },
  ], 'conv-1')

  expect(sessionId).toBeNull()
})
