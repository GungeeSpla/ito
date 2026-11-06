import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

const SERVER = `http://127.0.0.1:${process.env.PORT ?? 3040}`;

export default defineConfig({
  root: resolve(import.meta.dirname, 'src/client'),
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // サーバーが答える URL は Service Worker で HTML に差し替えない
        navigateFallbackDenylist: [/^\/api\//, /^\/avatars\//, /^\/socket\.io\//],
        globIgnores: ['**/ogp.png', '**/images/ogp.png'],
      },
      manifest: {
        name: '数字の大きさを感覚でたとえて言葉にするゲーム',
        short_name: '価値観比較ゲーム',
        description:
          'itoレインボーと同じルールのゲームがオンラインで遊べる非公式サイトです。数字の大きさを言葉でたとえて価値観を比べよう！あなたの「大きい」は、わたしの「小さい」かも？',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#121212',
        orientation: 'any',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@shared': resolve(import.meta.dirname, 'src/shared'),
      '@': resolve(import.meta.dirname, 'src/client'),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist/client'),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5137,
    proxy: {
      '/api': SERVER,
      '/avatars': SERVER,
      '/socket.io': { target: SERVER, ws: true },
    },
  },
});
