import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'live' ? '/vitrine/' : './',
  ...(mode === 'live' ? { input: 'live.html' } : {}),
  plugins: [react(), tailwindcss()],
}));
