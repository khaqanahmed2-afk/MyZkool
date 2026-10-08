import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    define: {
      'process.env': {},
      global: 'globalThis',
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Raise warning limit to avoid noise on legitimately large route chunks
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // React + React-DOM: foundational — always needed
            if (id.includes('/react-dom/') || id.includes('/react/')) {
              return 'vendor-react';
            }
            // React Router: loaded as part of app shell
            if (id.includes('react-router')) {
              return 'vendor-router';
            }

            // Supabase: only loaded in AppRoutes (auth/admin path)
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Lucide: tree-shaken at import level but still grouped here
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Leaflet: transport map
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
            // Google GenAI: AI advisor only
            if (id.includes('@google/genai')) {
              return 'vendor-genai';
            }
          },
        },
      },
    },
  };
});
