import { defineConfig } from '@playwright/test';

/**
 * E2E（docs/05 §12：复用后端 E1-E16 场景的 UI 侧）。
 * 本地复用已起的 dev server（5173）；CI 由 webServer 自行拉起。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_REUSE
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
