# itoレインボーオンライン

[![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232a?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socketdotio)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Twitter](https://img.shields.io/badge/Twitter-@GungeeX-1DA1F2?logo=twitter&logoColor=white)](https://twitter.com/GungeeX)

## 遊ぶ

[https://ito.gungee.jp/](https://ito.gungee.jp/)

## 概要

『[itoレインボー](https://arclightgames.jp/product/705rainbow/)』は、言葉で数字の大きさを伝え合い、価値観の共有に挑戦する協力型パーティゲームです。このゲームは2022年に[株式会社アークライト](https://www.arclight.co.jp/)および[326（ミツル）氏](https://x.com/nakamura326)によってデザインされました。2019年発売の『[ito](https://arclightgames.jp/product/ito/)』の続編にあたります。

『itoレインボーオンライン』は、その『itoレインボー』をブラウザで手軽に遊べるようにした非公式のファン作品です。個人が趣味で制作したものであり、公式とは一切関係ありません。

**『ito』シリーズは実物を使ってリアルで遊ぶとさらに格別の楽しさがあります**。ぜひ本家の『ito』シリーズもチェックしてみてください。

## しくみ

2025 年の版では、各ブラウザが Firebase の Realtime Database を直接書き換え、投票の集計や成功・失敗の判定もそれぞれのブラウザで行っていた。ブラウザごとに結果が食い違ったり、カードが二重に配られたりするのはこのためだった。2026 年の作り直しで、VPS 上の Node.js サーバーと Socket.io に移した。

- ゲームの状態はサーバーだけが持つ。ブラウザは操作 (「このカードをここに出す」など) を送り、サーバーが決まりごとに照らして状態を変え、全員に配り直す。
- 決まりごとは `src/shared/engine.ts` にまとめてある。状態を変えるのは `apply()` だけで、操作が決まりに合わなければ理由を付けて断る。
- サーバーは見る人ごとに中身を変えて送る (`view()`)。ほかの人の手札と、めくる前の数字は送らない。
- ログインはない。ブラウザごとに秘密の鍵を作って保存し、サーバーはそこから本人の ID を作る。同じブラウザなら、再読み込みしても同じ人として戻れる。ニックネームと色もブラウザに保存する。
- アバター画像は、ブラウザで 256px 四方の PNG に縮めてからサーバーに上げる。どの部屋でも 60 日使われなかった画像は消す。
- ホストの接続が 30 秒切れたままだと、つながっている人のうち先に入った人がホストになる。
- 部屋は `data/rooms/` に 1 部屋 1 ファイルで保存する。サーバーを再起動しても、遊んでいる途中の状態ごと残る。24 時間使われなかった部屋は消す。
- 画面を更新したあとも古い画面が開いたままだと、サーバーが接続を断り (`protocol.ts` の `PROTOCOL_VERSION`)、画面は 1 回だけ読み込み直す。

## 遊び方の流れ

1. ホストがルームを作り、URL を伝える。2 人以上で始められる。ゲームの途中に来た人は、次のゲームから参加する。
2. お題の候補 3 つに投票する。全員が投票すると多い票に決まる (同票はランダムか、ホストが決める)。お題を提案したり、ホストが一存で決めたりもできる。
3. 参加者数 + レベル - 1 枚のカードが配られる。たとえワードを書き、小さいと思う順に場へ並べる。場に出したあとも、たとえワードは書き換えられる。
4. 全員が出したらカードをめくる。めくった数字が左から小さい順に並んでいれば成功。成功したレベルの次のレベルが選べるようになる。

## コマンド

| コマンド | 作用 |
| ---- | ---- |
| `npm run dev` | サーバー (ポート 3040) と Vite の開発サーバーを起動する。http://localhost:5137/ で開く。 |
| `npm run build` | 型を確かめてから、`dist/client` に配信用のファイルを出力する。 |
| `npm start` | サーバーを起動する。`dist/client` も配信する。本番は PM2 で動かす。 |
| `npm run lint` | ESLint (`eslint.config.js`)。 |
| `npm test` | 決まりごとのテストと、本物のサーバーを起動して Socket.io で話すテスト (`test/`)。 |
| `npm run test:e2e` | ブラウザでの通しテスト (`tools/e2e/run.ts`)。ルームの作成から、参加、投票、途中の再読み込み、成功までを 2 つのブラウザで通す。事前に `npm run build` が必要。画面の写真を `tools/e2e/shots/` に残す。 |

Node.js 24 以上が要る。サーバーの TypeScript は Node.js がそのまま動かす (ビルドしない) ので、`enum` や引数プロパティのような、型を取り除くだけでは動かない書き方は使えない (`tsconfig.json` の `erasableSyntaxOnly`)。

## フォルダ

| フォルダ | 中身 |
| ---- | ---- |
| `src/client` | 画面 (React)。`pages/` が画面、`components/phases/` がゲームの段階ごとの表示、`hooks/useRoom.ts` がサーバーとの接続 |
| `src/server` | サーバー (Express + Socket.io)。`index.ts` が起動の入口 |
| `src/shared` | 画面とサーバーの両方で使うもの。決まりごと (`engine.ts`)、通信の取り決め (`protocol.ts`)、お題 (`topics.ts`)、色 |
| `public` | 画像、音、アイコン (そのまま配信する) |
| `test` | `npm test` のテスト |
| `tools/e2e` | ブラウザでの通しテスト。配信には含めない |
| `data` | 部屋とアバター画像 (git 管理外) |

## 環境変数 (サーバー)

| 名前 | 既定値 | 意味 |
| ---- | ---- | ---- |
| `PORT` | 3040 | 待ち受けるポート (127.0.0.1 のみ) |
| `DATA_DIR` | `./data` | 部屋とアバター画像を保存するフォルダ |
| `HOST_GRACE_MS` | 30000 | ホストの接続が切れてから、ほかの人へホストを渡すまで |
| `ROOM_TTL_MS` | 86400000 | 使われないまま、この時間がたった部屋を消す |
| `CREATE_LIMIT_PER_HOUR` | 30 | 1 つの接続元から 1 時間に作れる部屋の数 |
| `UPLOAD_LIMIT_PER_HOUR` | 30 | 1 つの接続元から 1 時間に上げられるアバター画像の数 |
| `ROOMS_MAX` | 5000 | 部屋の総数の上限 |

## ライセンス

MIT License © 2025 GungeeX
