import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vigil Test Laboratory — Multi-Origin Vite Server
 *
 * This config serves multiple test "apps" as separate entry points.
 * Each app simulates a different kind of website that Vigil might encounter.
 *
 * For true cross-origin testing, run multiple instances on different ports:
 *
 *   npx vite --port 4173              # clean site  (127.0.0.1:4173)
 *   npx vite --port 4174              # tracker     (127.0.0.1:4174)
 *   npx vite --port 4175              # analytics   (127.0.0.1:4175)
 *   npx vite --port 4176              # attacker    (127.0.0.1:4176)
 *
 * Or use the lab runner script (server/lab.ts) which launches all origins.
 */
export default defineConfig({
  root: '.',
  server: {
    port: 4173,
    host: '127.0.0.1',
    cors: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        clean: resolve(__dirname, 'apps/clean/index.html'),
        tracker: resolve(__dirname, 'apps/tracker/index.html'),
        identifier: resolve(__dirname, 'apps/identifier/index.html'),
        darkPattern: resolve(__dirname, 'apps/dark-pattern/index.html'),
        privacyPolicy: resolve(__dirname, 'apps/privacy-policy/index.html'),
      },
    },
  },
});
