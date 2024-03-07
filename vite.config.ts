import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'

export default defineConfig({
  build: {
    outDir: 'build',
  },
  plugins: [
    react(),
    viteCommonjs(),
  ],
  server: {
    port: 3000,
  },
})
