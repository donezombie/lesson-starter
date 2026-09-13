import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/login': 'http://localhost:4100',
      '/logout': 'http://localhost:4100',
      '/api': 'http://localhost:4100',
    },
  },
});
