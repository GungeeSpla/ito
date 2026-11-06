// ito のサーバー。画面の配信、ルームの作成、アバター画像の保存と、Socket.io によるゲームの同期を受け持つ。
// ゲームの状態はこのサーバーだけが持ち、決まりごとは shared/engine.ts に任せる。
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import {
  apply,
  createState,
  GameError,
  pickNewHost,
  sanitizeProfile,
  view,
  type Action,
  type Env,
  type RoomState,
} from '../shared/engine.ts';
import {
  AVATAR_MAX_BYTES,
  PROTOCOL_VERSION,
  ROOM_ID_PATTERN,
  SECRET_PATTERN,
  type Ack,
  type CreateRoomResponse,
  type Handshake,
  type UploadAvatarResponse,
} from '../shared/protocol.ts';
import { adjectives, animals, colors } from '../shared/roomWords.ts';

export interface ServerOptions {
  port: number;
  /** 部屋とアバター画像を置くフォルダ */
  dataDir: string;
  /** ビルドした画面 (dist/client)。無ければ API だけで動く (開発中は Vite が配信する) */
  clientDir: string;
  /** 使われないまま、この時間がたった部屋を消す */
  roomTtlMs?: number;
  /** ホストの接続が切れてから、ほかの人へホストを渡すまでの時間 */
  hostGraceMs?: number;
  /** 1 つの接続元 (IP) から 1 時間に作れる部屋の数・上げられる画像の数 */
  createLimitPerHour?: number;
  uploadLimitPerHour?: number;
  roomsMax?: number;
  log?: (message: string) => void;
}

interface Room {
  id: string;
  state: RoomState;
  createdAt: number;
  updatedAt: number;
}

interface SocketData {
  roomId: string;
  playerId: string;
}

const AVATAR_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const ACTIONS_PER_SECOND_MAX = 20;
const AVATAR_NAME = /^[A-Za-z0-9_-]{16,64}\.png$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 本人の ID は秘密の鍵から作る。ID は他の人にも見えるが、鍵は推測できない */
export const playerIdOf = (secret: string): string => createHash('sha256').update(`ito:${secret}`).digest('base64url').slice(0, 22);

const env = (): Env => ({ now: Date.now(), randomInt: (max) => randomInt(max) });

/** 1 時間ごとに数え直す、接続元ごとの回数の上限 */
function hourlyLimit(limit: number) {
  const counts = new Map<string, number>();
  const timer = setInterval(() => counts.clear(), 60 * 60 * 1000);
  timer.unref();
  return {
    allow(key: string | undefined): boolean {
      const count = counts.get(key ?? '') ?? 0;
      if (count >= limit) return false;
      counts.set(key ?? '', count + 1);
      return true;
    },
    stop: () => clearInterval(timer),
  };
}

export async function startServer(options: ServerOptions): Promise<{ port: number; close: () => Promise<void> }> {
  const {
    dataDir,
    clientDir,
    roomTtlMs = 24 * 60 * 60 * 1000,
    hostGraceMs = 30 * 1000,
    createLimitPerHour = 30,
    uploadLimitPerHour = 30,
    roomsMax = 5000,
    log = console.log,
  } = options;
  const roomsDir = join(dataDir, 'rooms');
  const avatarsDir = join(dataDir, 'avatars');
  mkdirSync(roomsDir, { recursive: true });
  mkdirSync(avatarsDir, { recursive: true });

  const rooms = new Map<string, Room>();
  const dirty = new Set<string>();

  // ---- 保存 ----

  const roomFile = (id: string) => join(roomsDir, `${id}.json`);

  function flush(): void {
    for (const id of dirty) {
      const room = rooms.get(id);
      dirty.delete(id);
      if (!room) continue;
      const tmp = `${roomFile(id)}.tmp`;
      try {
        writeFileSync(tmp, JSON.stringify(room));
        renameSync(tmp, roomFile(id));
      } catch (error) {
        // ディスク不足などでも止まらず、次の機会に書き直す
        dirty.add(id);
        console.error(`ルームを保存できません room=${id}`, error);
      }
    }
  }

  function touch(room: Room): void {
    room.updatedAt = Date.now();
    dirty.add(room.id);
  }

  for (const file of readdirSync(roomsDir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const room = JSON.parse(readFileSync(join(roomsDir, file), 'utf8')) as Room;
      rooms.set(room.id, room);
    } catch (error) {
      // 壊れたファイルが 1 つあっても、ほかのルームは動かす。調べられるようファイルは残す
      console.error(`ルームを読み込めません file=${file}`, error);
    }
  }

  function removeRoom(room: Room): void {
    for (const socket of socketsOf(room.id)) socket.disconnect(true);
    rooms.delete(room.id);
    dirty.delete(room.id);
    rmSync(roomFile(room.id), { force: true });
  }

  function removeExpired(): void {
    const limit = Date.now() - roomTtlMs;
    for (const room of rooms.values()) {
      if (room.updatedAt < limit && socketsOf(room.id).length === 0) removeRoom(room);
    }
  }

  function newRoomId(): string {
    const pick = (list: readonly string[]) => list[randomInt(list.length)];
    for (let i = 0; i < 100; i++) {
      const id = `${pick(adjectives)}-${pick(colors)}-${pick(animals)}`;
      if (!rooms.has(id)) return id;
    }
    throw new Error('ルーム ID を作れません');
  }

  // ---- アバター画像 ----

  const avatarPath = (url: string) => join(avatarsDir, url.slice('/avatars/'.length));

  /** 存在しない画像は外す。使っている画像は、消されないよう日付を新しくする */
  function checkAvatar(profile: unknown): unknown {
    if (!profile || typeof profile !== 'object') return profile;
    const url = (profile as { avatarUrl?: unknown }).avatarUrl;
    if (typeof url !== 'string' || !url) return profile;
    const name = url.slice('/avatars/'.length);
    if (!url.startsWith('/avatars/') || !AVATAR_NAME.test(name) || !existsSync(avatarPath(url))) {
      return { ...profile, avatarUrl: '' };
    }
    try {
      const now = new Date();
      utimesSync(avatarPath(url), now, now);
    } catch {
      // 確かめた直後に消された場合など。画像を外して続ける
      return { ...profile, avatarUrl: '' };
    }
    return profile;
  }

  function removeOldAvatars(): void {
    const used = new Set<string>();
    for (const room of rooms.values()) for (const p of room.state.players) if (p.avatarUrl) used.add(p.avatarUrl);
    const limit = Date.now() - AVATAR_TTL_MS;
    for (const file of readdirSync(avatarsDir)) {
      const path = join(avatarsDir, file);
      if (used.has(`/avatars/${file}`) || statSync(path).mtimeMs > limit) continue;
      rmSync(path, { force: true });
    }
  }

  // ---- HTTP ----

  const createLimit = hourlyLimit(createLimitPerHour);
  const uploadLimit = hourlyLimit(uploadLimitPerHour);
  const app = express();
  app.disable('x-powered-by');
  // Nginx 経由の接続元 IP を使う
  app.set('trust proxy', 'loopback');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    next();
  });

  app.post('/api/rooms', express.json({ limit: '4kb' }), (req, res) => {
    const { secret, profile } = (req.body ?? {}) as { secret?: unknown; profile?: unknown };
    if (typeof secret !== 'string' || !SECRET_PATTERN.test(secret)) {
      res.status(400).json({ error: '本人を確かめられません。ページを読み込み直してください' });
      return;
    }
    if (rooms.size >= roomsMax) {
      res.status(503).json({ error: '現在ルームを新しく作れません。時間をおいてお試しください' });
      return;
    }
    let player;
    try {
      player = { id: playerIdOf(secret), ...sanitizeProfile(checkAvatar(profile)), joinedAt: Date.now() };
    } catch (error) {
      res.status(400).json({ error: error instanceof GameError ? error.message : '入力が不正です' });
      return;
    }
    if (!createLimit.allow(req.ip)) {
      res.status(429).json({ error: 'ルームを作りすぎています。時間をおいてお試しください' });
      return;
    }
    const room: Room = { id: newRoomId(), state: createState(player), createdAt: Date.now(), updatedAt: Date.now() };
    rooms.set(room.id, room);
    touch(room);
    log(`ルームを作成 room=${room.id}`);
    res.status(201).json({ roomId: room.id } satisfies CreateRoomResponse);
  });

  app.post('/api/avatars', express.raw({ type: 'image/png', limit: AVATAR_MAX_BYTES }), (req, res) => {
    const body = req.body as unknown;
    if (!Buffer.isBuffer(body) || body.length < 64 || !body.subarray(0, 8).equals(PNG_SIGNATURE)) {
      res.status(400).json({ error: '画像の形式が不正です' });
      return;
    }
    if (!uploadLimit.allow(req.ip)) {
      res.status(429).json({ error: '画像を上げすぎています。時間をおいてお試しください' });
      return;
    }
    const name = `${randomBytes(16).toString('base64url')}.png`;
    writeFileSync(join(avatarsDir, name), body);
    res.status(201).json({ avatarUrl: `/avatars/${name}` } satisfies UploadAvatarResponse);
  });

  app.use('/avatars', express.static(avatarsDir, { maxAge: '365d', immutable: true, fallthrough: false }));
  if (existsSync(clientDir)) {
    app.use('/assets', express.static(join(clientDir, 'assets'), { maxAge: '365d', immutable: true }));
    app.use(
      express.static(clientDir, {
        index: false,
        maxAge: '7d',
        // 更新がすぐ届くよう、Service Worker と HTML は毎回確かめさせる
        setHeaders: (res, path) => {
          if (/(sw\.js|registerSW\.js|workbox-[^/]*\.js|\.html|\.webmanifest)$/.test(path)) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    // 画面の URL (/ と /room/:id) は同じ HTML を返す
    app.get(/^\/(room\/[^/]+)?$/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(clientDir, 'index.html'));
    });
  }
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });
  app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status === 413 ? '画像が大きすぎます' : status === 404 ? 'Not Found' : 'エラーが発生しました' });
  });

  // ---- リアルタイム同期 ----

  const httpServer: HttpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: 64 * 1024, serveClient: false });

  function socketsOf(roomId: string): Socket[] {
    const ids = io.sockets.adapter.rooms.get(roomId);
    return ids ? [...ids].flatMap((id) => io.sockets.sockets.get(id) ?? []) : [];
  }

  const onlineOf = (roomId: string) => new Set(socketsOf(roomId).map((s) => (s.data as SocketData).playerId));

  function broadcast(room: Room): void {
    const online = onlineOf(room.id);
    for (const socket of socketsOf(room.id)) {
      socket.emit('state', view(room.id, room.state, (socket.data as SocketData).playerId, online));
    }
  }

  io.use((socket, next) => {
    const auth = (socket.handshake.auth ?? {}) as Partial<Handshake>;
    if (auth.protocol !== PROTOCOL_VERSION) return next(new Error('outdated'));
    if (typeof auth.secret !== 'string' || !SECRET_PATTERN.test(auth.secret)) return next(new Error('invalid'));
    if (typeof auth.roomId !== 'string' || !ROOM_ID_PATTERN.test(auth.roomId) || !rooms.has(auth.roomId)) {
      return next(new Error('notFound'));
    }
    socket.data = { roomId: auth.roomId, playerId: playerIdOf(auth.secret) } satisfies SocketData;
    next();
  });

  io.on('connection', (socket) => {
    const { roomId, playerId } = socket.data as SocketData;
    socket.join(roomId);
    const initial = rooms.get(roomId);
    if (initial) broadcast(initial);

    let actionWindow = 0;
    let count = 0;
    socket.on('action', (action: Action, ack?: (result: Ack) => void) => {
      const room = rooms.get(roomId);
      try {
        const second = Math.floor(Date.now() / 1000);
        if (second !== actionWindow) [actionWindow, count] = [second, 0];
        if (++count > ACTIONS_PER_SECOND_MAX) throw new GameError('操作が多すぎます。少し待ってからお試しください');
        if (!room) throw new GameError('ルームが見つかりません');
        if (!action || typeof action !== 'object' || typeof action.type !== 'string') throw new GameError('不明な操作です');
        if (action.type === 'join' || action.type === 'updateProfile')
          action = { ...action, profile: checkAvatar(action.profile) as never };
        room.state = apply(room.state, playerId, action, env());
        touch(room);
        broadcast(room);
        ack?.({});
      } catch (error) {
        if (!(error instanceof GameError)) console.error(error);
        ack?.({ error: error instanceof GameError ? error.message : 'エラーが発生しました' });
      }
    });

    socket.on('disconnect', () => {
      const room = rooms.get(roomId);
      if (room) broadcast(room);
    });
  });

  // ホストの接続が切れたままなら、つながっている人へホストを渡す
  const hostAwaySince = new Map<string, number>();
  function handOverHosts(): void {
    const now = Date.now();
    for (const roomId of io.sockets.adapter.rooms.keys()) {
      const room = rooms.get(roomId);
      if (!room) continue;
      const online = onlineOf(roomId);
      const next = pickNewHost(room.state, online);
      if (!next) {
        hostAwaySince.delete(roomId);
        continue;
      }
      const since = hostAwaySince.get(roomId) ?? now;
      hostAwaySince.set(roomId, since);
      if (now - since < hostGraceMs) continue;
      room.state = { ...room.state, hostId: next };
      hostAwaySince.delete(roomId);
      touch(room);
      broadcast(room);
    }
  }

  // ---- 起動 ----

  removeExpired();
  removeOldAvatars();
  const timers = [
    setInterval(flush, 1000),
    setInterval(handOverHosts, Math.min(5000, Math.max(200, hostGraceMs / 4))),
    setInterval(removeExpired, 60 * 60 * 1000),
    setInterval(removeOldAvatars, 24 * 60 * 60 * 1000),
  ];
  for (const timer of timers) timer.unref();

  await new Promise<void>((resolve) => httpServer.listen(options.port, '127.0.0.1', resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : options.port;

  return {
    port,
    close: async () => {
      for (const timer of timers) clearInterval(timer);
      createLimit.stop();
      uploadLimit.stop();
      flush();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}
