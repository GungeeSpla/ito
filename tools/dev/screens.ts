// 画面の見た目を確かめるための写真を撮る。いろいろな段階の部屋を engine で組み立てて保存し、
// サーバーを起動して、スマホと PC の大きさで開く。事前に npm run build が必要。
// 使い方: node tools/dev/screens.ts [撮る部屋の名前...]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { apply, createState, type Action, type Env, type RoomState } from '../../src/shared/engine.ts';
import { playerIdOf } from '../../src/server/server.ts';

const PORT = 3951;
const OUT = 'tools/dev/shots';
mkdirSync(OUT, { recursive: true });

let seed = 7;
const env: Env = { now: Date.now(), randomInt: (max) => (seed = (seed * 48271) % 2147483647) % max };
const secret = 'viewer-secret-viewer-secret-viewer-secret';
const me = playerIdOf(secret);
const profile = (nickname: string, color = '') => ({ nickname, color, avatarUrl: '' });
const names = ['ホスト', 'とても長い名前のプレイヤーさん', 'ぽんこつ', 'おりまー', 'けんしろ'];

function room(viewerIsHost: boolean, players = 6): RoomState {
  const ids = names.slice(0, players - 1).map((_, i) => `bot${i}`);
  const hostId = viewerIsHost ? me : ids[0];
  let state = createState({ id: hostId, ...profile(viewerIsHost ? 'わたし' : names[0]), joinedAt: 0 });
  for (const [i, id] of ids.entries()) if (id !== hostId) state = apply(state, id, { type: 'join', profile: profile(names[i]) }, env);
  if (!viewerIsHost) state = apply(state, me, { type: 'join', profile: profile('わたし') }, env);
  return state;
}
const act = (state: RoomState, actor: string, action: Action) => apply(state, actor, action, env);
const hostOf = (state: RoomState) => state.hostId;

function toPlace(state: RoomState, level: number): RoomState {
  state.maxClearLevel = level - 1;
  state = act(state, hostOf(state), { type: 'updateSettings', settings: { level } });
  state = act(state, hostOf(state), { type: 'start' });
  return act(state, hostOf(state), { type: 'decide', title: state.round!.options[0].title });
}

/** 自分以外の手札を、ほぼ小さい順に場へ出す */
function placeOthers(state: RoomState, hints = true): RoomState {
  const cards = Object.entries(state.round!.hands)
    .filter(([id]) => id !== me)
    .flatMap(([id, hand]) => hand.map((c) => ({ id, value: c.value })))
    .sort((a, b) => a.value - b.value);
  const words = ['お父さんの靴下', 'コンビニのおにぎり', '', '夏休みの最終日にまとめてやる宿題くらい', '電車', ''];
  cards.forEach((card, i) => {
    if (hints && words[i % words.length]) state = act(state, card.id, { type: 'setHint', value: card.value, hint: words[i % words.length] });
    state = act(state, card.id, { type: 'place', value: card.value, index: i });
  });
  return state;
}

function placeMine(state: RoomState): RoomState {
  for (const card of [...state.round!.hands[me]]) {
    const index = state.round!.field.filter((c) => c.value < card.value).length;
    state = act(state, me, { type: 'place', value: card.value, index });
  }
  return state;
}

const scenes: Record<string, () => RoomState> = {
  lobby: () => room(false),
  'lobby-host': () => {
    const s = room(true);
    return act(s, me, { type: 'updateSettings', settings: { topicSet: 'salmon' } });
  },
  choose: () => {
    let s = act(room(false), 'bot0', { type: 'start' });
    s = act(s, 'bot1', { type: 'propose', topic: { title: '朝ごはんに食べたいもの', min: '食べたくない', max: '食べたい' } });
    return act(s, 'bot2', { type: 'vote', title: s.round!.options[1].title });
  },
  'choose-host': () => {
    let s = act(room(true), me, { type: 'start' });
    s = act(s, 'bot2', { type: 'vote', title: s.round!.options[1].title });
    return s;
  },
  place: () => placeOthers(toPlace(room(false), 6)),
  'place-empty': () => toPlace(room(false, 3), 3),
  'place-host-done': () => placeMine(placeOthers(toPlace(room(true), 2))),
  reveal: () => {
    let s = placeMine(placeOthers(toPlace(room(true), 4)));
    s = act(s, me, { type: 'toReveal' });
    for (const index of [0, 1, 2]) s = act(s, me, { type: 'reveal', index });
    return s;
  },
  fail: () => {
    let s = placeMine(placeOthers(toPlace(room(false), 2)));
    const first = s.round!.field[0];
    // わざと並びを崩してからめくる
    s = act(s, first.playerId, { type: 'takeBack', value: first.value });
    s = act(s, first.playerId, { type: 'place', value: first.value, index: s.round!.field.length });
    s = act(s, 'bot0', { type: 'toReveal' });
    for (let i = 0; i < s.round!.field.length; i++) s = act(s, me, { type: 'reveal', index: i });
    return s;
  },
};

const only = process.argv.slice(2);
const dataDir = mkdtempSync(join(tmpdir(), 'ito-screens-'));
mkdirSync(join(dataDir, 'rooms'), { recursive: true });
const ids: Record<string, string> = {};
for (const [name, build] of Object.entries(scenes)) {
  if (only.length && !only.includes(name)) continue;
  // ルーム ID は「英小文字-英小文字-英小文字」の形でなければつながらない
  const roomId = `scene-${name.replace(/[^a-z]/g, '')}-room`;
  ids[name] = roomId;
  writeFileSync(join(dataDir, 'rooms', `${roomId}.json`), JSON.stringify({ id: roomId, state: build(), createdAt: Date.now(), updatedAt: Date.now() }));
}

const server = spawn(process.execPath, ['src/server/index.ts'], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, HOST_GRACE_MS: '600000' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout!.on('data', (chunk) => String(chunk).includes('ito:') && resolve());
    server.on('exit', () => reject(new Error('サーバーが起動しません')));
  });
  const browser = await chromium.launch();
  const sizes = { phone: { width: 390, height: 844 }, pc: { width: 1280, height: 800 } };
  for (const [size, viewport] of Object.entries(sizes)) {
    const context = await browser.newContext({ viewport, hasTouch: size === 'phone', isMobile: size === 'phone' });
    await context.addInitScript((value) => localStorage.setItem('ito:secret', value), secret);
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error(`pageerror: ${e.message}`));
    for (const [name, roomId] of Object.entries(ids)) {
      await page.goto(`http://127.0.0.1:${PORT}/room/${roomId}`);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: join(OUT, `${name}-${size}.png`) });
      // 手札を選んだところ (「ここに出す」が並ぶ)
      const handCard = page.getByRole('button', { name: /^手札 \d+$/ }).first();
      if (await handCard.count()) {
        await handCard.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(OUT, `${name}-selected-${size}.png`) });
      }
    }
    if (!only.length || only.includes('home')) {
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: join(OUT, `home-${size}.png`) });
    }
    await context.close();
  }
  await browser.close();
  console.log(`screens: ${OUT}`);
} finally {
  server.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
