import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Planeador de Servicios PWA',
        short_name: 'Planeador',
        description: 'Gestión y administración de órdenes de trabajo técnico y mantenimiento',
        theme_color: '#2563eb',
        background_color: '#f4f6f9',
        display: 'standalone',
        icons: [
          {
            src: 'icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ]
});
