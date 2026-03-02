import { expect, test } from '@playwright/test'
import { __testOnlyIsRenameTargetValid } from '../../src/main/filesystem'

test('rename target validation blocks path traversal and empty names', () => {
  expect(__testOnlyIsRenameTargetValid('new-name.txt')).toBe(true)
  expect(__testOnlyIsRenameTargetValid('.')).toBe(false)
  expect(__testOnlyIsRenameTargetValid('..')).toBe(false)
  expect(__testOnlyIsRenameTargetValid('')).toBe(false)
  expect(__testOnlyIsRenameTargetValid('   ')).toBe(false)
  expect(__testOnlyIsRenameTargetValid('../escape.txt')).toBe(false)
  expect(__testOnlyIsRenameTargetValid('nested/name.txt')).toBe(false)
  expect(__testOnlyIsRenameTargetValid('nested\\name.txt')).toBe(false)
})
