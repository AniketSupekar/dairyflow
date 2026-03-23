import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // Increase chunk warning threshold slightly — recharts is legitimately large
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting — prevents one giant bundle
        // Each chunk loads in parallel, browser caches vendor chunks separately
        // So when you update app code, users don't re-download react/recharts
        manualChunks: {
          // React core — changes almost never
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charts — large library, separate chunk so it loads in parallel
          'vendor-charts': ['recharts'],
          // Icons — lucide is large, isolate it
          'vendor-icons': ['lucide-react'],
          // JWT decoding — small but used at boot
          'vendor-auth': ['jwt-decode'],
        },
      },
    },
  },

  // Faster dev server startup — pre-bundle heavy deps
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'lucide-react',
      'jwt-decode',
      'axios',
    ],
  },
})