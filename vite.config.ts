import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Exclude Python virtual environments and other large directories from file watching
      // This prevents ENOSPC errors when there are many files to watch
      ignored: [
        '**/venv/**',
        '**/node_modules/**',
        '**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/htmlcov/**',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/**',
      '**/*.spec.ts',
      '**/*.e2e.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
        'tests/',
      ],
    },
  },
})
