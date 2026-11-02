import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'out', assetsInlineLimit: 2000000 },
  server: { host: 'localhost', port: 3000, strictPort: true },
});
