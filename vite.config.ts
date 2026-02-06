import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Use '/' for custom domain, '/github-repo-upvotes/' for github.io subdirectory
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  }
})
