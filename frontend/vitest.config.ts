import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './setupTests.ts'
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname) },
      { find: '@/app', replacement: path.resolve(__dirname, 'app') },
      { find: '@/components', replacement: path.resolve(__dirname, 'components') },
      { find: '@/lib', replacement: path.resolve(__dirname, 'lib') },
      { find: '@/state', replacement: path.resolve(__dirname, 'state') },
      { find: '@/plugins', replacement: path.resolve(__dirname, 'plugins') }
    ]
  }
});
