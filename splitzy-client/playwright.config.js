import { defineConfig, devices } from '@playwright/test'

/**
 * E2E: start Vite first (`npm run dev`) and optionally set E2E_BASE_URL.
 * First time: `npm run test:e2e:install` to download Chromium.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
