import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Repairs the storage globals, which Node 26 shadows. See the file.
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
