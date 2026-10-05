import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/AssistantHub/',
  plugins: [react()],
  build: { outDir: 'build' },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    cors: false,
    headers: { 'Cross-Origin-Resource-Policy': 'same-origin' },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    cors: false,
    headers: { 'Cross-Origin-Resource-Policy': 'same-origin' },
  },
});
