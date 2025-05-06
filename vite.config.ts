import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { builtinModules } from 'module'


// https://vitejs.dev/config/
export default defineConfig(async () => {
  const tsconfigPaths = (await import('vite-tsconfig-paths')).default

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      conditions: ['node', 'import', 'module', 'default'],
    },
  plugins: [react(), tsconfigPaths()],
  base: './', // Important for Electron file loading
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  clearScreen: false,
    optimizeDeps: {
      include: ['@supabase/postgrest-js'],
      exclude: ['electron']
    },
  }})
