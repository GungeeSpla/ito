// サーバーのテストで使う道具。本物のサーバーを起動し、Socket.io でつなぐ
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after } from 'node:test';
import { io, type Socket } from 'socket.io-client';
import type { Action, RoomView } from '../src/shared/engine.ts';
import { PROTOCOL_VERSION, type Ack } from '../src/shared/protocol.ts';
import { playerIdOf, startServer, type ServerOptions } from '../src/server/server.ts';

const dirs: string[] = [];
const sockets: Socket[] = [];
const closers: (() => Promise<void>)[] = [];
// テストが途中で失敗しても、サーバーを止めてから一時フォルダを消す
after(async () => {
  for (const socket of sockets) socket.disconnect();
  await Promise.all(closers.map((close) => close()));
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

export async function boot(dataDir = mkdtempSync(join(tmpdir(), 'ito-test-')), hostGraceMs = 300, options: Partial<ServerOptions> = {}) {
  dirs.push(dataDir);
  const server = await startServer({ port: 0, dataDir, clientDir: join(dataDir, 'none'), hostGraceMs, log: () => {}, ...options });
  const origin = `http://127.0.0.1:${server.port}`;
  // テストの中と後片付けの両方から呼ばれても、止めるのは 1 回だけ
  let closing: Promise<void> | null = null;
  const close = () => (closing ??= server.close());
  closers.push(close);
  return { port: server.port, close, origin, dataDir };
}

export const newSecret = () => randomBytes(24).toString('base64url');
export const profile = (nickname: string) => ({ nickname, color: '#EF4444', avatarUrl: '' });

export async function createRoom(origin: string, secret: string, nickname = 'ホスト'): Promise<string> {
  const res = await fetch(`${origin}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, profile: profile(nickname) }),
  });
  assert.equal(res.status, 201);
  return ((await res.json()) as { roomId: string }).roomId;
}

/** 接続して、最新の状態を持ち続ける利用者 */
export class Client {
  state: RoomView | null = null;
  readonly socket: Socket;
  readonly secret: string;
  readonly name: string;
  private waiters: (() => void)[] = [];

  /** forwardedFor: Nginx 経由の接続を装うときの接続元 IP */
  constructor(origin: string, roomId: string, secret = newSecret(), protocol = PROTOCOL_VERSION, name = '', forwardedFor?: string) {
    this.secret = secret;
    this.name = name;
    this.socket = io(origin, {
      auth: { protocol, secret, roomId },
      transports: ['websocket'],
      forceNew: true,
      // つながらなかったら、つなぎ直さずに理由を受け取る
      reconnection: false,
      extraHeaders: forwardedFor ? { 'X-Forwarded-For': forwardedFor } : undefined,
    });
    sockets.push(this.socket);
    this.socket.on('state', (state: RoomView) => {
      this.state = state;
      for (const wake of this.waiters.splice(0)) wake();
    });
  }

  get id() {
    return playerIdOf(this.secret);
  }

  /** 条件を満たす状態が届くまで待つ */
  async until(check: (state: RoomView) => boolean, timeoutMs = 3000): Promise<RoomView> {
    const deadline = Date.now() + timeoutMs;
    while (!this.state || !check(this.state)) {
      if (Date.now() > deadline) throw new Error(`${this.name}: 待っていた状態になりません: ${JSON.stringify(this.state)}`);
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
        setTimeout(resolve, 50);
      });
    }
    return this.state;
  }

  send(action: Action): Promise<Ack> {
    return this.socket.timeout(3000).emitWithAck('action', action);
  }

  async ok(action: Action): Promise<void> {
    const ack = await this.send(action);
    assert.equal(ack.error, undefined, `${this.name} ${action.type}: ${ack.error}`);
  }

  connectError(): Promise<string> {
    return new Promise((resolve) => this.socket.on('connect_error', (error) => resolve(error.message)));
  }
}

/** ホストが部屋を作り、残りの人が参加し終えるまで。clients[0] がホスト */
export async function roomWith(origin: string, names: string[]): Promise<{ roomId: string; clients: Client[] }> {
  const hostSecret = newSecret();
  const roomId = await createRoom(origin, hostSecret, names[0]);
  const clients = [new Client(origin, roomId, hostSecret, PROTOCOL_VERSION, names[0])];
  for (const name of names.slice(1)) {
    const client = new Client(origin, roomId, newSecret(), PROTOCOL_VERSION, name);
    await client.until(() => true);
    await client.ok({ type: 'join', profile: profile(name) });
    clients.push(client);
  }
  await Promise.all(clients.map((c) => c.until((s) => s.players.length === names.length && s.players.every((p) => p.online))));
  return { roomId, clients };
}
