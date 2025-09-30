import path from 'path';
import { defineConfig } from 'vitest/config';

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
      { find: '@/src/components', replacement: path.resolve(__dirname, 'src/components') },
      { find: '@/lib', replacement: path.resolve(__dirname, 'lib') },
      { find: '@/src/lib', replacement: path.resolve(__dirname, 'src/lib') },
      { find: '@/state', replacement: path.resolve(__dirname, 'state') },
      { find: '@/src/state', replacement: path.resolve(__dirname, 'src/state') },
      { find: '@/plugins', replacement: path.resolve(__dirname, 'plugins') },
      { find: '@/types', replacement: path.resolve(__dirname, 'src/types') }
    ]
  }
});
