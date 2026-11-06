// 荒らし対策のテスト。部屋の総当たり、接続の張りすぎ、画像でディスクを埋めること、締め切った部屋への参加
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROTOCOL_VERSION, ROOM_ID_PATTERN } from '../src/shared/protocol.ts';
import { boot, Client, createRoom, newSecret, profile, roomWith } from './helpers.ts';

const connectAs = (origin: string, roomId: string, ip: string) => new Client(origin, roomId, newSecret(), PROTOCOL_VERSION, ip, ip);

/** つながるか、断られた理由 */
const outcome = (client: Client) =>
  new Promise<string>((resolve) => {
    client.socket.on('connect', () => resolve('connected'));
    client.socket.on('connect_error', (error) => resolve(error.message));
  });

test('部屋の ID は、3 語のあとに推測できない 4 文字が付く', async () => {
  const server = await boot();
  const ids = await Promise.all(Array.from({ length: 5 }, () => createRoom(server.origin, newSecret())));
  for (const id of ids) {
    assert.match(id, /^[a-z]+-[a-z]+-[a-z]+-[a-z0-9]{4}$/);
    assert.match(id, ROOM_ID_PATTERN);
  }
  // この形にする前の部屋 (末尾なし) にも、つなぎ直せる
  assert.match('happy-blue-fox', ROOM_ID_PATTERN);
  await server.close();
});

test('存在しない部屋への接続を繰り返した接続元は、しばらく本物の部屋にもつなげない', async () => {
  const server = await boot(undefined, undefined, { notFoundPerTenMinutes: 5 });
  const roomId = await createRoom(server.origin, newSecret());
  for (let i = 0; i < 5; i++) assert.equal(await outcome(connectAs(server.origin, `nope-nope-nope-aaa${i}`, '10.0.0.1')), 'notFound');
  assert.equal(await outcome(connectAs(server.origin, roomId, '10.0.0.1')), 'tooMany');
  // ほかの接続元には影響しない
  assert.equal(await outcome(connectAs(server.origin, roomId, '10.0.0.2')), 'connected');
  await server.close();
});

test('1 つの接続元から同時に張れる接続には上限があり、切れたら空く', async () => {
  const server = await boot(undefined, undefined, { socketsPerIpMax: 3 });
  const roomId = await createRoom(server.origin, newSecret());
  const clients = Array.from({ length: 3 }, () => connectAs(server.origin, roomId, '10.0.0.3'));
  for (const client of clients) assert.equal(await outcome(client), 'connected');
  assert.equal(await outcome(connectAs(server.origin, roomId, '10.0.0.3')), 'tooMany');
  assert.equal(await outcome(connectAs(server.origin, roomId, '10.0.0.4')), 'connected');

  clients[0].socket.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(await outcome(connectAs(server.origin, roomId, '10.0.0.3')), 'connected');
  await server.close();
});

test('X-Forwarded-For は Nginx が最後に足した値だけを使い、利用者が書いた値ではすり抜けられない', async () => {
  const server = await boot(undefined, undefined, { socketsPerIpMax: 1 });
  const roomId = await createRoom(server.origin, newSecret());
  assert.equal(await outcome(connectAs(server.origin, roomId, '10.0.0.5')), 'connected');
  // 利用者が先頭に別の IP を書いても、Nginx が足した最後の値 (本当の接続元) で数える
  assert.equal(await outcome(connectAs(server.origin, roomId, '1.2.3.4, 10.0.0.5')), 'tooMany');
  await server.close();
});

test('アバター画像の合計が上限を超えると、新しい画像を断る', async () => {
  const server = await boot(undefined, undefined, { avatarsMaxBytes: 300 });
  const png = new Uint8Array(128);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const upload = () => fetch(`${server.origin}/api/avatars`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
  assert.equal((await upload()).status, 201);
  assert.equal((await upload()).status, 201);
  const third = await upload();
  assert.equal(third.status, 507);
  assert.match(((await third.json()) as { error: string }).error, /画像なしで/);
  await server.close();
});

test('参加を締め切ると、新しい人は入れず、参加済みの人はつなぎ直しても遊べる', async () => {
  const server = await boot();
  const { roomId, clients } = await roomWith(server.origin, ['ホスト', 'あおい']);
  const [host, guest] = clients;
  assert.match((await guest.send({ type: 'setLocked', locked: true })).error ?? '', /ホストのみ/);
  await host.ok({ type: 'setLocked', locked: true });
  await guest.until((s) => s.locked);

  const stranger = new Client(server.origin, roomId, newSecret(), PROTOCOL_VERSION, '知らない人');
  const seen = await stranger.until((s) => s.locked);
  assert.equal(seen.me.joined, false);
  assert.match((await stranger.send({ type: 'join', profile: profile('荒らし') })).error ?? '', /締め切って/);

  // 参加済みの人はつなぎ直しても参加者のまま。プロフィールの更新もできる
  guest.socket.disconnect();
  const back = new Client(server.origin, roomId, guest.secret, PROTOCOL_VERSION, '戻った人');
  assert.equal((await back.until((s) => s.me.joined)).me.joined, true);
  await back.ok({ type: 'join', profile: profile('あおい2') });

  await host.ok({ type: 'setLocked', locked: false });
  await stranger.until((s) => !s.locked);
  await stranger.ok({ type: 'join', profile: profile('知らない人') });
  await host.until((s) => s.players.length === 3);
  await server.close();
});
