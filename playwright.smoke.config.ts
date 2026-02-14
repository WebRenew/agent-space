import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/smoke',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
  },
})
