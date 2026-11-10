import { defineConfig } from 'vite';
export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/bgs-sm-playtest-7f42/' : './',
  define: { __PLATFORM__: JSON.stringify(mode.startsWith('crazygames') ? mode : 'standalone') },
  plugins:
    mode === 'github-pages'
      ? [
          {
            name: 'playtest-metadata',
            transformIndexHtml() {
              return [
                {
                  tag: 'meta',
                  attrs: { name: 'robots', content: 'noindex, nofollow, noarchive' },
                  injectTo: 'head',
                },
              ];
            },
          },
        ]
      : [],
  build: {
    outDir:
      mode === 'github-pages'
        ? 'dist'
        : mode === 'crazygames-basic'
          ? 'release/crazygames'
          : mode === 'crazygames-full'
            ? 'release/crazygames-full'
            : 'release/standalone',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
  test: { include: ['tests/unit/**/*.test.ts'] },
}));
