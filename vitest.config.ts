import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      VITE_ANTHROPIC_API_KEY: 'test-api-key',
    },
  },
})