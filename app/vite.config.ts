/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'modules/**/*'],
      manifest: {
        name: 'Домашние занятия',
        short_name: 'Занятия',
        description:
          'Платформа для онлайн-занятий родителя с ребёнком 3–6 лет. Работает офлайн после первой загрузки.',
        lang: 'ru',
        display: 'standalone',
        theme_color: '#E8A13C',
        background_color: '#FFF8EC',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Данные модулей (registry, манифесты, уроки) — кэшируем надолго,
            // обновляем по сети при доступности (stale-while-revalidate).
            urlPattern: /\/modules\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'module-data',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // Ассеты модулей (картинки и т.п.) — cache-first.
            urlPattern: /\/modules\/.*\/assets\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'module-assets',
              expiration: { maxEntries: 500, maxAgeSeconds: 180 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
