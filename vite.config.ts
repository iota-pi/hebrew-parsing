/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  build: {
    outDir: process.env.VITE_OUT_DIR || 'build',
  },
  plugins: [
    react(),
    viteCompression({
      algorithm: 'brotliCompress',
      filter: /\.json$/,
    }),
  ],
  server: {
    port: 3000,
  },
  test: {
    globals: true,
  },
})
