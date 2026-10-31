import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { relationalDbPlugin } from './src/server/relationalDbBridge';

export default defineConfig({
  plugins: [react(), relationalDbPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@duckdb') || id.includes('apache-arrow')) {
              return 'vendor-duckdb';
            }
            if (id.includes('xlsx')) {
              return 'vendor-sheetjs';
            }
            if (id.includes('sql.js')) {
              return 'vendor-sqljs';
            }
            if (id.includes('@observablehq/plot') || id.includes('/d3') || id.includes('d3-')) {
              return 'vendor-plot';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('react') || id.includes('zustand')) {
              return 'vendor-react-core';
            }
          }
        },
      },
    },
  },
});
