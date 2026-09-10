import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    // Integration files share only the disposable database created by the runner.
    fileParallelism: false,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
