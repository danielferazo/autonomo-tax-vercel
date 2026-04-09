import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: ['**/e2e/**', '**/node_modules/**'],
    env: {
      VITE_ANTHROPIC_API_KEY: 'test-api-key',
    },
  },
})