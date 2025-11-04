import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { builtinModules } from 'module'
import electron from 'vite-plugin-electron'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const tsconfigPaths = (await import('vite-tsconfig-paths')).default

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './shared'),
      },
      conditions: ['node', 'import', 'module', 'default'],
    },
    plugins: [
      react(),
      tsconfigPaths(),
      electron([
        {
          // Main process
          entry: 'electron/main.js',
          vite: {
            resolve: {
              alias: {
                '@shared': path.resolve(__dirname, './shared'),
              },
            },
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron', 'better-sqlite3', 'mssql', 'keytar', 'electron-window-state', 'electron-log', 'electron-rebuild'],
              },
            },
          },
        },
        {
          // Preload script
          entry: 'electron/preload.ts',
          vite: {
            resolve: {
              alias: {
                '@shared': path.resolve(__dirname, './shared'),
              },
            },
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
                output: {
                  entryFileNames: 'electron/preload.js',
                },
              },
            },
          },
        },
      ]),
    ],
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
  }
})
