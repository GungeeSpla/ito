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
4. 全員が出したらカードをめくる。めくった数字が左から小さい順に並んでいれば成功。成功したレベルの次のレベルが選べるようになる。失敗したときは、並びを崩したカードに赤い枠が付く。

接続が切れたまま戻らない人がいると、カードを出し終わらない。ホストはその人をゲームから外して、残りの人で続けられる (外された人は次のゲームから戻れる)。ロビーのキックは、そのルームに入り直せなくなる。

## コマンド

| コマンド | 作用 |
| ---- | ---- |
| `npm run dev` | サーバー (ポート 3040) と Vite の開発サーバーを起動する。http://localhost:5137/ で開く。 |
| `npm run build` | 型を確かめてから、`dist/client` に配信用のファイルを出力する。 |
| `npm start` | サーバーを起動する。`dist/client` も配信する。本番は PM2 で動かす。 |
| `npm run lint` | ESLint (`eslint.config.js`)。 |
| `npm run format` | Prettier で整形する (`.prettierrc`。シングルクォート、1 行 140 文字)。`npm run format:check` は確かめるだけ。 |
| `npm test` | 決まりごとのテスト (`test/engine.test.ts`) と、本物のサーバーを起動して Socket.io で話すテスト。`test/multiplayer.test.ts` は 3〜6 人で遊び、全員が同時にカードを出し入れ・めくっても全員に同じ場が見えること、同票、お題の提案、途中の切断と途中参加、レベル 2 を確かめる。 |
| `npm run test:e2e` | ブラウザでの通しテスト (`tools/e2e/run.ts`)。3 つのブラウザ (うち 1 つはスマホの大きさ) で、ルームの作成から、参加、投票、途中の再読み込み、成功までを通す。事前に `npm run build` が必要。画面の写真を `tools/e2e/shots/` に残す。`E2E_ORIGIN=https://ito.gungee.jp` を付けると、本番に対して流す (部屋が 1 つでき、24 時間で消える)。 |
| `node tools/dev/screens.ts [場面...]` | 見た目の確認用。参加者が多い・名前やたとえワードが長い・失敗した、などの部屋を組み立て、スマホと PC の大きさで写真を `tools/dev/shots/` に撮る。事前に `npm run build` が必要。 |

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

## 本番 (さくら VPS)

サーモンタワーバトルと同じく、PM2 で常駐させ、Nginx から転送する。

| 項目 | 内容 |
| ---- | ---- |
| 置き場所 | `/var/www/ito` (GitHub の `GungeeSpla/ito` を clone) |
| プロセス | PM2 の `ito`。ポート 3040 で `127.0.0.1` のみ待ち受ける |
| データ | `/var/www/ito/data/` (部屋とアバター画像。git 管理外) |
| Nginx | `ito.gungee.jp` の `server` で、すべてのパスを 3040 へ転送する (WebSocket 対応) |

### はじめて置くとき

```bash
ssh sakura
cd /var/www
git clone https://github.com/GungeeSpla/ito.git
cd ito
npm ci
npm run build
NODE_ENV=production PORT=3040 pm2 start src/server/index.ts --name ito --interpreter node   # .ts なので node を明示する
pm2 save
```

Nginx の `ito.gungee.jp` の `server` (443) の `root` での静的配信を、次の転送に置き換える。

```nginx
client_max_body_size 1m;
location / {
    proxy_pass http://127.0.0.1:3040;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`sudo nginx -t && sudo systemctl reload nginx` で反映する。以前の静的配信のフォルダ (`/var/www/gungee.jp/subdomains/ito`) は消さずに残しておけば、Nginx の設定を戻すだけで以前の版に戻せる。

### 更新するとき

```bash
ssh sakura
cd /var/www/ito
git pull
npm ci          # 依存が変わったときだけ
npm run build
pm2 restart ito
```

部屋は `data/` に保存されているので、再起動しても遊んでいる途中の状態ごと残る。通信の取り決め (`src/shared/protocol.ts`) を変えたときは `PROTOCOL_VERSION` を上げる。開いたままの古い画面は、自動で読み込み直す。

## ライセンス

MIT License © 2025 GungeeX
