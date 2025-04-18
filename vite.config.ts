import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import pkg from "./package.json";
import { VitePWA } from "vite-plugin-pwa";
const buildDate = new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "数字の大きさを言葉でたとえて価値観を比べるゲーム",
        short_name: "価値観比較ゲーム",
        description:
          "itoレインボーと同じルールのゲームがオンラインで遊べる非公式サイトです。数字の大きさを言葉でたとえて価値観を比べよう！あなたの「大きい」は、わたしの「小さい」かも？",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#121212",
        orientation: "any",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    port: 5137,
  },
});
