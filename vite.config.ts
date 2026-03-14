import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import electron from 'vite-plugin-electron'

const sharedAlias = { '@shared': path.resolve(__dirname, './shared') }
const electronConditions = ['node', 'import', 'module', 'default']

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...sharedAlias,
    },
    dedupe: ['react', 'react-dom', '@tanstack/react-router'],
  },
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          resolve: { alias: sharedAlias, conditions: electronConditions },
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'mssql', 'keytar', 'electron-window-state', 'electron-log', 'electron-rebuild'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          resolve: { alias: sharedAlias, conditions: electronConditions },
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: { entryFileNames: 'electron/preload.js' },
            },
          },
        },
      },
    ]),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: './index.html' },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  clearScreen: false,
  optimizeDeps: {
    include: ['@supabase/postgrest-js'],
    exclude: ['electron'],
  },
})
