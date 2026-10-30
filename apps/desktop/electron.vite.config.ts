import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';

// Workspace packages ship TypeScript sources, so they are bundled instead of externalized.
const workspacePackages = ['@chatto/core', '@chatto/provider-twitch', '@chatto/chat-ui'];

export default defineConfig({
  main: {
    build: { externalizeDeps: { exclude: workspacePackages } },
  },
  preload: {
    build: { externalizeDeps: { exclude: workspacePackages } },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') },
    },
  },
});
