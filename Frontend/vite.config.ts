import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@content': resolve(__dirname, 'src/content-scripts'),
      '@background': resolve(__dirname, 'src/background'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        defender: resolve(__dirname, 'src/content-scripts/inject-defender.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'defender') return 'defender.js';
          return 'assets/[name]-[hash].js';
        }
      }
    },
  },
});
