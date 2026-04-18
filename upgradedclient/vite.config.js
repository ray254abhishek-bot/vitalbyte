import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(),
     babel({ presets: [reactCompilerPreset()] }),
     tailwindcss()
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://apivitalbyte.deployhub.online',
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        target: 'https://apivitalbyte.deployhub.online',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
      '/uploads': {
        target: 'https://apivitalbyte.deployhub.online',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})