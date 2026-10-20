import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 让同一份 dist 可以部署在 GitHub Pages 的项目子路径下。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
