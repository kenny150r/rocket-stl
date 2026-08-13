import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const pages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  plugins: [react()],
  base: pages ? '/rocket-stl/' : '/',
  optimizeDeps: {
    exclude: ['manifold-3d'],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
