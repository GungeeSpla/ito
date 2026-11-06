// 3 人以上が本物のサーバーにつないで遊ぶテスト。同時に操作しても全員に同じ状態が見えることを確かめる
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RoomView } from '../src/shared/engine.ts';
import { PROTOCOL_VERSION } from '../src/shared/protocol.ts';
import { boot, Client, newSecret, profile, roomWith } from './helpers.ts';

const NAMES = ['ホスト', 'あおい', 'いつき', 'うみ', 'えま', 'おと'];

/** 全員の手札。数字の小さい順 */
const handsOf = (clients: Client[]) =>
  clients
    .filter((c) => c.state?.round?.participants.includes(c.id))
    .flatMap((c) => c.state!.round!.myHand.map((card) => ({ client: c, value: card.value })))
    .sort((a, b) => a.value - b.value);

/** 全員が同じ状態を受け取るまで待つ (場の並びとめくった数) */
const fieldKey = (s: RoomView) => JSON.stringify(s.round?.field.map((c) => [c.id, c.playerId, c.revealed]));
async function everyoneSees(clients: Client[], check: (s: RoomView) => boolean): Promise<RoomView[]> {
  return Promise.all(clients.map((c) => c.until(check, 5000)));
}

/** お題を決めて、カードが配られるまで。全員が 1 つ目の候補に投票する */
async function chooseFirstTopic(clients: Client[]): Promise<void> {
  const [host] = clients;
  const choosing = await host.until((s) => s.phase === 'chooseTopic');
  const title = choosing.round!.options[0].title;
  const voters = clients.filter((c) => choosing.round!.participants.includes(c.id));
  await Promise.all(voters.map((c) => c.ok({ type: 'vote', title })));
  await everyoneSees(clients, (s) => s.phase === 'placeCards' && s.round!.topic?.title === title);
}

/** 小さい順に 1 枚ずつ並べ、全員でばらばらにめくって、成功するまで */
async function placeSortedAndWin(clients: Client[]): Promise<void> {
  const [host] = clients;
  const cards = handsOf(clients);
  for (const [index, card] of cards.entries()) {
    await card.client.ok({ type: 'place', value: card.value, index });
    await card.client.until((s) => s.round!.field.length === index + 1);
  }
  await everyoneSees(clients, (s) => s.round!.allPlaced);
  await host.ok({ type: 'toReveal' });
  await everyoneSees(clients, (s) => s.phase === 'revealCards');
  // 全員が同時に、それぞれ違うカードをめくる
  const participants = clients.filter((c) => c.state!.round!.participants.includes(c.id));
  await Promise.all(cards.map((_, index) => participants[index % participants.length].ok({ type: 'reveal', index })));
  const done = await everyoneSees(clients, (s) => s.round!.result !== null);
  for (const state of done) assert.equal(state.round!.result, 'success');
}

test('5 人で同時にカードを出し入れしても、全員に同じ場が見え、数字が消えたり重なったりしない', async () => {
  const server = await boot();
  const { clients } = await roomWith(server.origin, NAMES.slice(0, 5));
  const [host] = clients;
  await host.ok({ type: 'start' });
  await chooseFirstTopic(clients);
  const dealt = handsOf(clients).map((c) => c.value);
  assert.equal(dealt.length, 5);
  assert.equal(new Set(dealt).size, 5);

  // 全員が同時に、場の左端へ出す
  await Promise.all(handsOf(clients).map((card) => card.client.ok({ type: 'place', value: card.value, index: 0 })));
  const placed = await everyoneSees(clients, (s) => s.round!.field.length === 5);
  assert.equal(new Set(placed.map(fieldKey)).size, 1, '全員に同じ並びが見える');
  // 自分のカードの数字だけが見える
  for (const [i, state] of placed.entries()) {
    const visible = state.round!.field.filter((c) => c.value !== null);
    assert.deepEqual(
      visible.map((c) => c.playerId),
      [clients[i].id],
    );
  }

  // 全員が同時に手札へ戻す
  await Promise.all(
    clients.map((c) => {
      const mine = c.state!.round!.field.find((card) => card.playerId === c.id)!;
      return c.ok({ type: 'takeBack', value: mine.value! });
    }),
  );
  await everyoneSees(clients, (s) => s.round!.field.length === 0 && s.round!.myHand.length === 1);
  assert.deepEqual(
    handsOf(clients).map((c) => c.value),
    [...dealt].sort((a, b) => a - b),
  );

  await placeSortedAndWin(clients);
  await server.close();
});

test('6 人で、同票はホストが決め、提案したお題でも遊べ、レベル 2 では 7 枚配られる', async () => {
  const server = await boot();
  const { clients } = await roomWith(server.origin, NAMES);
  const [host, ...guests] = clients;
  await host.ok({ type: 'updateSettings', settings: { tiebreak: 'host' } });
  await host.ok({ type: 'start' });
  const choosing = await host.until((s) => s.phase === 'chooseTopic');
  const [a, b] = choosing.round!.options;

  // 3 票ずつに割れると、ホストが決めるまで待つ
  await Promise.all(clients.map((c, i) => c.ok({ type: 'vote', title: (i % 2 ? a : b).title })));
  const tied = await everyoneSees(clients, (s) => s.round!.tie);
  for (const state of tied) assert.equal(state.phase, 'chooseTopic');
  // ホスト以外は決められない
  assert.match((await guests[0].send({ type: 'decide', title: a.title })).error ?? '', /ホストのみ/);

  // 提案すると票がリセットされ、そのお題に全員が投票し直せば決まる
  await guests[2].ok({ type: 'propose', topic: { title: '朝ごはんに食べたいもの', min: '食べたくない', max: '食べたい' } });
  const proposed = await everyoneSees(clients, (s) => !s.round!.tie && s.round!.proposals.length === 1);
  for (const state of proposed) assert.deepEqual(state.round!.votes, {});
  await Promise.all(clients.map((c) => c.ok({ type: 'vote', title: '朝ごはんに食べたいもの' })));
  await everyoneSees(clients, (s) => s.phase === 'placeCards' && s.round!.topic?.title === '朝ごはんに食べたいもの');
  await placeSortedAndWin(clients);

  // クリアしたので、レベル 2 で遊べる。参加者 6 人 + 1 枚
  await host.ok({ type: 'toLobby' });
  await host.ok({ type: 'updateSettings', settings: { level: 2 } });
  await host.ok({ type: 'start' });
  await chooseFirstTopic(clients);
  const counts = (await host.until((s) => s.round!.dealId > 0)).round!.handCounts;
  assert.deepEqual(Object.values(counts).sort(), [1, 1, 1, 1, 1, 2]);
  await placeSortedAndWin(clients);
  assert.equal(host.state!.maxClearLevel, 2);
  await server.close();
});

test('4 人のうち 1 人の接続が切れても、ホストが外せば残りで続けられ、戻ったら次のゲームから遊べる', async () => {
  const server = await boot(undefined, 60_000);
  const { roomId, clients } = await roomWith(server.origin, NAMES.slice(0, 4));
  const [host, , , leaver] = clients;
  await host.ok({ type: 'start' });
  await chooseFirstTopic(clients);
  leaver.socket.disconnect();
  const rest = clients.slice(0, 3);
  await everyoneSees(rest, (s) => s.players.find((p) => p.id === leaver.id)?.online === false);

  // 残りの 3 人が出し終えても、切れた人の手札が残っているので進めない
  for (const card of handsOf(rest)) {
    const index = card.client.state!.round!.field.filter((c) => (c.value ?? 0) < card.value).length;
    await card.client.ok({ type: 'place', value: card.value, index: Math.min(index, card.client.state!.round!.field.length) });
  }
  await everyoneSees(rest, (s) => s.round!.field.length === 3);
  assert.match((await host.send({ type: 'toReveal' })).error ?? '', /まだ全員/);

  // ホストが外すと、残りの 3 人で続けられる
  await host.ok({ type: 'kick', playerId: leaver.id, ban: false });
  await everyoneSees(rest, (s) => s.round!.allPlaced && s.round!.participants.length === 3);

  // 戻ってきた人は参加し直せ、次のゲームから遊べる
  const back = new Client(server.origin, roomId, leaver.secret, PROTOCOL_VERSION, '戻った人');
  const seen = await back.until((s) => s.phase === 'placeCards');
  assert.equal(seen.me.joined, false);
  await back.ok({ type: 'join', profile: profile('うみ') });
  const joined = await back.until((s) => s.me.joined);
  assert.equal(joined.me.participant, false);
  await host.ok({ type: 'toLobby' });
  await host.ok({ type: 'start' });
  const next = await back.until((s) => s.phase === 'chooseTopic');
  assert.equal(next.round!.participants.length, 4);
  assert.equal(next.me.participant, true);
  await server.close();
});

test('ゲームの途中に来た人は見ているだけで、手札も伏せた数字も見えず、次のゲームから加わる', async () => {
  const server = await boot();
  const { roomId, clients } = await roomWith(server.origin, NAMES.slice(0, 3));
  const [host] = clients;
  await host.ok({ type: 'start' });
  await chooseFirstTopic(clients);
  const first = handsOf(clients)[0];
  await first.client.ok({ type: 'place', value: first.value, index: 0 });

  const late = new Client(server.origin, roomId, newSecret(), PROTOCOL_VERSION, '途中の人');
  await late.until((s) => s.round?.field.length === 1);
  await late.ok({ type: 'join', profile: profile('かい') });
  const watching = await late.until((s) => s.me.joined);
  assert.equal(watching.me.participant, false);
  assert.deepEqual(watching.round!.myHand, []);
  assert.equal(watching.round!.field[0].value, null);
  // 投票やカードを出す操作はできない
  assert.match((await late.send({ type: 'place', value: first.value, index: 0 })).error ?? '', /参加していません/);
  assert.equal(watching.round!.handCounts[late.id], undefined);

  // 今のゲームは 3 人のまま成功し、次のゲームは 4 人になる
  const players = [...clients, late];
  await placeSortedAndWinFrom(players, 1, first.value);
  await host.ok({ type: 'start' });
  const next = await late.until((s) => s.phase === 'chooseTopic' && s.me.participant);
  assert.equal(next.round!.participants.length, 4);
  await chooseFirstTopic(players);
  assert.equal(handsOf(players).length, 4);
  await server.close();
});

/** すでに 1 枚 (value) が場の左端にある状態から、残りを小さい順に並べて成功させる */
async function placeSortedAndWinFrom(clients: Client[], placedCount: number, placedValue: number): Promise<void> {
  const [host] = clients;
  const rest = handsOf(clients);
  assert.ok(rest.every((card) => card.value > placedValue));
  for (const [i, card] of rest.entries()) {
    await card.client.ok({ type: 'place', value: card.value, index: placedCount + i });
    await card.client.until((s) => s.round!.field.length === placedCount + i + 1);
  }
  await host.ok({ type: 'toReveal' });
  const total = placedCount + rest.length;
  for (let index = 0; index < total; index++) await host.ok({ type: 'reveal', index });
  const done = await everyoneSees(clients, (s) => s.round!.result !== null);
  for (const state of done) assert.equal(state.round!.result, 'success');
}
