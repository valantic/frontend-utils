import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('src/', import.meta.url))),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
