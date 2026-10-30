import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Runs the control panel in a normal browser without Electron. The renderer
 * falls back to a mock API when `window.chatto` is missing, so the UI can be
 * developed and screenshotted quickly.
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
  plugins: [react(), tailwindcss()],
  server: { port: 5175, strictPort: true },
});
