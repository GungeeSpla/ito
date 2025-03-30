# itoレインボーオンライン

[![Vercel](https://img.shields.io/badge/-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)
[![Firebase](https://img.shields.io/badge/-Firebase-F57C00?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232a?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Twitter](https://img.shields.io/badge/Twitter-@GungeeX-1DA1F2?logo=twitter&logoColor=white)](https://twitter.com/GungeeX)
[![Made with ChatGPT](https://img.shields.io/badge/Made%20with-ChatGPT-10a37f?logo=openai)](https://chatgpt.com/)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/GungeeSpla/ito)

## デモ

[https://ito-rainbow.vercel.app/](https://ito-rainbow.vercel.app/)

## 概要

『[itoレインボー](https://arclightgames.jp/product/705rainbow/)』は、言葉で数字の大きさを伝え合い、価値観の共有に挑戦する協力型パーティゲームです。このゲームは2022年に[株式会社アークライト](https://www.arclight.co.jp/)および[326（ミツル）氏](https://x.com/nakamura326)によってデザインされました。2019年発売の『[ito](https://arclightgames.jp/product/ito/)』の続編にあたります。

『[itoレインボーオンライン](https://ito-rainbow.vercel.app/)』は、その『itoレインボー』をブラウザで手軽に遊べるようにした非公式のファン作品です。個人が趣味で制作したものであり、公式とは一切関係ありません。

**『ito』シリーズは実物を使ってリアルで遊ぶとさらに格別の楽しさがあります**。ぜひ本家の『ito』シリーズもチェックしてみてください。

日曜エンジニアがChatGPTと一緒にコツコツ作ったものなので粗い部分もあるかもしれませんが、温かい目で見ていただけましたら幸いです。

## 技術スタック

| 技術             | 用途                   |
| ---------------- | ---------------------- |
| **React**        | UI ライブラリ          |
| **TypeScript**   | 型安全なコードベース   |
| **Vite**         | 開発・ビルドツール     |
| **Tailwind CSS** | スタイリング           |
| **Firebase (Realtime Database)** | ゲームルームの状態管理・同期 |
| **Vercel**       | デプロイ／ホスティング |

## 📁 プロジェクト構成

```text
ito-rainbow/
├── public/
├── src/
│   ├── components/       # UIコンポーネント
│   ├── pages/            # 各画面
│   ├── hooks/            # カスタムフック
│   ├── utils/            # 汎用関数
│   └── ...               # その他のロジック
├── index.html
├── package.json
├── vite.config.ts
└── ...
```

## 開発環境

### セットアップ

```bash
npm install
```

### ローカル起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

## デプロイ

本プロジェクトは **Vercel** でホスティングされています。

- URL: [https://ito-rainbow.vercel.app/](https://ito-rainbow.vercel.app/)

## ライセンス

MIT License © 2025 GungeeX
