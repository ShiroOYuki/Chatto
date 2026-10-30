import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The desktop app serves this build at http://127.0.0.1:<port>/overlay and /embed.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
