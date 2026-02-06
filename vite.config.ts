import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/github-repo-upvotes/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  }
})
