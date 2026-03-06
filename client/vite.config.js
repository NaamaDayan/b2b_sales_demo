import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/sales-room/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/slack': 'http://localhost:3000',
      '/execute-Demi': 'http://localhost:3000',
      '/Demi-real-events': 'http://localhost:3000',
    },
  },
});
