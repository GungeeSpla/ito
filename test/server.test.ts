// 本物のサーバーを起動し、HTTP と Socket.io で話すテスト
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PROTOCOL_VERSION } from '../src/shared/protocol.ts';
import { boot, Client, createRoom, newSecret, profile } from './helpers.ts';

test('2 人で最初から最後まで遊べる。数字はめくるまで相手に見えない', async () => {
  const server = await boot();
  const hostSecret = newSecret();
  const roomId = await createRoom(server.origin, hostSecret);
  const host = new Client(server.origin, roomId, hostSecret);
  const guest = new Client(server.origin, roomId);
  await guest.until((s) => s.players.length === 1);
  await guest.ok({ type: 'join', profile: profile('ゲスト') });
  await host.until((s) => s.players.length === 2 && s.players.every((p) => p.online));

  // ホスト以外は始められない
  assert.match((await guest.send({ type: 'start' })).error ?? '', /ホストのみ/);
  await host.ok({ type: 'start' });
  const choosing = await guest.until((s) => s.phase === 'chooseTopic');
  const title = choosing.round!.options[0].title;
  await host.ok({ type: 'vote', title });
  await guest.ok({ type: 'vote', title });
  const placing = await guest.until((s) => s.phase === 'placeCards');
  assert.equal(placing.round!.topic!.title, title);

  // 小さい数字を持っている人から出す
  const hostCard = (await host.until((s) => s.round!.myHand.length === 1)).round!.myHand[0].value;
  const guestCard = placing.round!.myHand[0].value;
  const [first, second] = hostCard < guestCard ? [host, guest] : [guest, host];
  await first.ok({ type: 'place', value: first.state!.round!.myHand[0].value, index: 0 });
  await second.ok({ type: 'place', value: second.state!.round!.myHand[0].value, index: 1 });
  const placed = await guest.until((s) => s.round!.allPlaced);
  const hostOnField = placed.round!.field.find((c) => c.playerId === host.id)!;
  assert.equal(hostOnField.value, null);

  await host.ok({ type: 'toReveal' });
  await guest.until((s) => s.phase === 'revealCards');
  await guest.ok({ type: 'reveal', index: 0 });
  await host.ok({ type: 'reveal', index: 1 });
  const done = await guest.until((s) => s.round!.result !== null);
  assert.equal(done.round!.result, 'success');
  assert.equal(done.maxClearLevel, 1);
  await server.close();
});

test('つなぎ直しても同じ人として戻り、手札もそのまま', async () => {
  const server = await boot();
  const hostSecret = newSecret();
  const roomId = await createRoom(server.origin, hostSecret);
  const host = new Client(server.origin, roomId, hostSecret);
  const guest = new Client(server.origin, roomId);
  await guest.until(() => true);
  await guest.ok({ type: 'join', profile: profile('ゲスト') });
  await host.until((s) => s.players.length === 2);
  await host.ok({ type: 'start' });
  const options = (await host.until((s) => s.phase === 'chooseTopic')).round!.options;
  await host.ok({ type: 'decide', title: options[1].title });
  const hand = (await guest.until((s) => s.phase === 'placeCards')).round!.myHand;
  await guest.ok({ type: 'setHint', value: hand[0].value, hint: '冷蔵庫' });
  guest.socket.disconnect();
  await host.until((s) => s.players.find((p) => p.id === guest.id)!.online === false);

  const again = new Client(server.origin, roomId, guest.secret);
  const restored = await again.until((s) => s.phase === 'placeCards');
  assert.deepEqual(restored.round!.myHand, [{ value: hand[0].value, hint: '冷蔵庫' }]);
  assert.equal(restored.me.participant, true);
  await server.close();
});

test('ホストの接続が切れたままだと、つながっている人がホストになる', async () => {
  const server = await boot();
  const hostSecret = newSecret();
  const roomId = await createRoom(server.origin, hostSecret);
  const host = new Client(server.origin, roomId, hostSecret);
  const guest = new Client(server.origin, roomId);
  await guest.until(() => true);
  await guest.ok({ type: 'join', profile: profile('ゲスト') });
  await host.until((s) => s.players.length === 2);
  host.socket.disconnect();
  const handed = await guest.until((s) => s.hostId === guest.id, 5000);
  assert.equal(handed.me.isHost, true);
  await server.close();
});

test('再起動しても部屋と進行が残る', async () => {
  const first = await boot();
  const hostSecret = newSecret();
  const roomId = await createRoom(first.origin, hostSecret);
  const host = new Client(first.origin, roomId, hostSecret);
  const guest = new Client(first.origin, roomId);
  await guest.until(() => true);
  await guest.ok({ type: 'join', profile: profile('ゲスト') });
  await host.ok({ type: 'start' });
  await host.until((s) => s.phase === 'chooseTopic');
  host.socket.disconnect();
  guest.socket.disconnect();
  await first.close();

  const second = await boot(first.dataDir);
  const back = new Client(second.origin, roomId, hostSecret);
  const state = await back.until((s) => s.phase === 'chooseTopic');
  assert.equal(state.players.length, 2);
  await second.close();
});

test('古い画面と、無い部屋への接続は理由を付けて断る', async () => {
  const server = await boot();
  const roomId = await createRoom(server.origin, newSecret());
  assert.equal(await new Client(server.origin, roomId, newSecret(), PROTOCOL_VERSION - 1).connectError(), 'outdated');
  assert.equal(await new Client(server.origin, 'no-such-room').connectError(), 'notFound');
  assert.equal(await new Client(server.origin, roomId, 'short').connectError(), 'invalid');
  await server.close();
});

test('アバターは PNG だけを受け付け、部屋で使える', async () => {
  const server = await boot();
  const upload = (body: Uint8Array<ArrayBuffer>, type = 'image/png') =>
    fetch(`${server.origin}/api/avatars`, { method: 'POST', headers: { 'Content-Type': type }, body });
  assert.equal((await upload(new TextEncoder().encode('<svg onload=alert(1)>'.padEnd(100)))).status, 400);
  assert.equal((await upload(new Uint8Array(400 * 1024))).status, 413);

  const png = new Uint8Array(128);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const res = await upload(png);
  assert.equal(res.status, 201);
  const { avatarUrl } = (await res.json()) as { avatarUrl: string };
  assert.ok(existsSync(join(server.dataDir, 'avatars', avatarUrl.split('/').pop()!)));
  const served = await fetch(`${server.origin}${avatarUrl}`);
  assert.equal(served.headers.get('content-type'), 'image/png');

  const roomId = await createRoom(server.origin, newSecret());
  const guest = new Client(server.origin, roomId);
  await guest.until(() => true);
  await guest.ok({ type: 'join', profile: { ...profile('ゲスト'), avatarUrl } });
  // 存在しない画像は外れる
  const other = new Client(server.origin, roomId);
  await other.until(() => true);
  await other.ok({ type: 'join', profile: { ...profile('他'), avatarUrl: '/avatars/aaaaaaaaaaaaaaaaaaaa.png' } });
  const state = await other.until((s) => s.players.length === 3);
  assert.equal(state.players.find((p) => p.id === guest.id)!.avatarUrl, avatarUrl);
  assert.equal(state.players.find((p) => p.id === other.id)!.avatarUrl, '');
  await server.close();
});

test('ニックネームが空なら部屋を作れない', async () => {
  const server = await boot();
  const res = await fetch(`${server.origin}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: newSecret(), profile: profile(' ') }),
  });
  assert.equal(res.status, 400);
  await server.close();
});
