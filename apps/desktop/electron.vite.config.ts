import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';

// Workspace packages ship TypeScript sources, so they are bundled instead of externalized.
const workspacePackages = ['@chatto/core', '@chatto/provider-twitch', '@chatto/chat-ui', '@chatto/share'];

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
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          // Plays the quiet-spell reminder while the control panel window is released to the tray.
          sound: resolve(__dirname, 'src/renderer/sound.html'),
        },
      },
    },
  },
});
