import { expect, test } from '@playwright/test'
import {
  __testOnlyCollectStaleRunningTodoIndices,
  __testOnlyComputeTodoRetryBackoffMs,
  __testOnlyComputeTodoRunnerAvailableSlots,
  __testOnlyFindNextRunnableTodoIndex,
  __testOnlyIsTodoJobDispatchEligible,
  __testOnlyIsTodoRetryReady,
} from '../../src/main/todo-runner'

test('slow-spawn reservation consumes slot before process bookkeeping updates', () => {
  const maxConcurrentJobs = 1

  // Initial state: no running jobs and no pending starts.
  expect(__testOnlyComputeTodoRunnerAvailableSlots(maxConcurrentJobs, 0, 0)).toBe(1)

  // Simulated slow spawn: launch is reserved but process has not reached onSpawned yet.
  expect(__testOnlyComputeTodoRunnerAvailableSlots(maxConcurrentJobs, 0, 1)).toBe(0)

  // After spawn callback moves reservation into the running map, capacity remains full.
  expect(__testOnlyComputeTodoRunnerAvailableSlots(maxConcurrentJobs, 1, 0)).toBe(0)

  // Capacity returns only after the running todo exits.
  expect(__testOnlyComputeTodoRunnerAvailableSlots(maxConcurrentJobs, 0, 0)).toBe(1)
})

test('available slots are clamped and count running plus pending starts', () => {
  expect(__testOnlyComputeTodoRunnerAvailableSlots(3, 0, 0)).toBe(3)
  expect(__testOnlyComputeTodoRunnerAvailableSlots(3, 1, 1)).toBe(1)
  expect(__testOnlyComputeTodoRunnerAvailableSlots(3, 2, 1)).toBe(0)
  expect(__testOnlyComputeTodoRunnerAvailableSlots(2, 4, 4)).toBe(0)
})

test('dispatch eligibility excludes both running and pending-start states', () => {
  expect(__testOnlyIsTodoJobDispatchEligible(false, false)).toBe(true)
  expect(__testOnlyIsTodoJobDispatchEligible(true, false)).toBe(false)
  expect(__testOnlyIsTodoJobDispatchEligible(false, true)).toBe(false)
  expect(__testOnlyIsTodoJobDispatchEligible(true, true)).toBe(false)
})

test('candidate selection is pure and does not mutate running todos', () => {
  const todos = [
    { status: 'running' as const, attempts: 0 },
    { status: 'pending' as const, attempts: 0 },
  ]
  const before = structuredClone(todos)
  const nextIndex = __testOnlyFindNextRunnableTodoIndex(todos)

  expect(nextIndex).toBe(1)
  expect(todos).toEqual(before)
})

test('stale running reconciliation targets only running statuses', () => {
  const staleIndexes = __testOnlyCollectStaleRunningTodoIndices([
    { status: 'running' as const },
    { status: 'pending' as const },
    { status: 'done' as const },
    { status: 'running' as const },
  ])
  expect(staleIndexes).toEqual([0, 3])
})

test('retry backoff is deterministic and capped', () => {
  expect(__testOnlyComputeTodoRetryBackoffMs(1)).toBe(15_000)
  expect(__testOnlyComputeTodoRetryBackoffMs(2)).toBe(30_000)
  expect(__testOnlyComputeTodoRetryBackoffMs(3)).toBe(60_000)
  expect(__testOnlyComputeTodoRetryBackoffMs(99)).toBe(5 * 60 * 1000)
})

test('retry readiness helper respects next retry timestamp', () => {
  const now = 1_700_000_000_000
  expect(__testOnlyIsTodoRetryReady(null, now)).toBe(true)
  expect(__testOnlyIsTodoRetryReady(now - 1, now)).toBe(true)
  expect(__testOnlyIsTodoRetryReady(now + 1, now)).toBe(false)
})

test('candidate selection holds job on first cooling-down todo', () => {
  const now = 1_700_000_000_000
  const todos = [
    { status: 'error' as const, attempts: 1, nextRetryAt: now + 30_000 },
    { status: 'pending' as const, attempts: 0, nextRetryAt: null },
  ]

  expect(__testOnlyFindNextRunnableTodoIndex(todos, now)).toBeNull()
  expect(__testOnlyFindNextRunnableTodoIndex(todos, now + 30_000)).toBe(0)
})
