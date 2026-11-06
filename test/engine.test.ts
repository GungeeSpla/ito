import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  apply,
  createState,
  GameError,
  judge,
  levelMax,
  parseCustomTopics,
  pickNewHost,
  view,
  type Action,
  type Env,
  type RoomState,
} from '../src/shared/engine.ts';

// 乱数を固定した環境。randomInt は常に 0 を返す
const env: Env = { now: 1000, randomInt: () => 0 };
const profile = (nickname: string) => ({ nickname, color: '', avatarUrl: '' });
const host = { id: 'A', ...profile('あ'), joinedAt: 0 };

function room(...others: string[]): RoomState {
  let state = createState(host);
  for (const id of others) state = apply(state, id, { type: 'join', profile: profile(id) }, env);
  return state;
}

const run = (state: RoomState, steps: [string, Action][]) => steps.reduce((s, [actor, action]) => apply(s, actor, action, env), state);
const rejects = (state: RoomState, actor: string, action: Action, message?: RegExp) =>
  assert.throws(() => apply(state, actor, action, env), (error: unknown) => error instanceof GameError && (!message || message.test(error.message)));

/** 全員の手札を、数字の小さい順に場へ並べる */
function placeAllSorted(state: RoomState): RoomState {
  const cards = Object.entries(state.round!.hands).flatMap(([id, hand]) => hand.map((card) => ({ id, value: card.value })));
  cards.sort((a, b) => a.value - b.value);
  return cards.reduce((s, card, index) => apply(s, card.id, { type: 'place', value: card.value, index }, env), state);
}

function toPlaceCards(state: RoomState): RoomState {
  state = apply(state, 'A', { type: 'start' }, env);
  return apply(state, 'A', { type: 'decide', title: state.round!.options[0].title }, env);
}

test('2 人そろうまで始められず、ホストだけが始められる', () => {
  rejects(room(), 'A', { type: 'start' }, /2 人以上/);
  const state = room('B');
  rejects(state, 'B', { type: 'start' }, /ホストのみ/);
  const started = apply(state, 'A', { type: 'start' }, env);
  assert.equal(started.phase, 'chooseTopic');
  assert.equal(started.round!.options.length, 3);
  assert.deepEqual(started.round!.participants, ['A', 'B']);
  // 色を選んでいない人には、重ならない色が付く
  const colors = started.players.map((p) => p.color);
  assert.ok(colors.every(Boolean));
  assert.equal(new Set(colors).size, 2);
});

test('操作を断っても元の状態は変わらない', () => {
  const state = room('B');
  const before = structuredClone(state);
  rejects(state, 'B', { type: 'kick', playerId: 'A' });
  assert.deepEqual(state, before);
});

test('全員が投票すると、票の多いお題に決まってカードが配られる', () => {
  let state = apply(room('B', 'C'), 'A', { type: 'start' }, env);
  const [first, second] = state.round!.options;
  state = run(state, [
    ['A', { type: 'vote', title: second.title }],
    ['B', { type: 'vote', title: first.title }],
  ]);
  assert.equal(state.phase, 'chooseTopic');
  // 投票は変えられる
  state = run(state, [
    ['B', { type: 'vote', title: second.title }],
    ['C', { type: 'vote', title: first.title }],
  ]);
  assert.equal(state.phase, 'placeCards');
  assert.equal(state.round!.topic!.title, second.title);
  assert.ok(state.usedTitles.includes(second.title));
});

test('同票でホストが決める設定なら、ホストの決定を待つ', () => {
  let state = run(room('B'), [
    ['A', { type: 'updateSettings', settings: { tiebreak: 'host' } }],
    ['A', { type: 'start' }],
  ]);
  const [first, second] = state.round!.options;
  state = run(state, [
    ['A', { type: 'vote', title: first.title }],
    ['B', { type: 'vote', title: second.title }],
  ]);
  assert.equal(state.phase, 'chooseTopic');
  assert.equal(state.round!.tie, true);
  rejects(state, 'B', { type: 'decide', title: second.title }, /ホストのみ/);
  state = apply(state, 'A', { type: 'decide', title: second.title }, env);
  assert.equal(state.round!.topic!.title, second.title);
});

test('提案したお題に投票でき、再抽選すると提案と票が消える', () => {
  let state = apply(room('B'), 'A', { type: 'start' }, env);
  state = apply(state, 'B', { type: 'propose', topic: { title: '投げたいもの', min: '', max: '' } }, env);
  rejects(state, 'A', { type: 'propose', topic: { title: '投げたいもの', min: '', max: '' } }, /すでに/);
  state = apply(state, 'A', { type: 'vote', title: '投げたいもの' }, env);
  const before = state.round!.options.map((t) => t.title);
  state = apply(state, 'A', { type: 'redraw' }, env);
  assert.deepEqual(state.round!.proposals, []);
  assert.deepEqual(state.round!.votes, {});
  // 再抽選では前の候補をなるべく避ける
  assert.ok(state.round!.options.every((t) => !before.includes(t.title)));
});

test('使ったお題は次から出ない。使い切ると使用済みを忘れる', () => {
  let state = run(room('B'), [
    ['A', { type: 'updateSettings', settings: { topicSet: 'custom', customTopics: parseCustomTopics('甲\n乙\n丙\n丁') } }],
  ]);
  state = toPlaceCards(state);
  const used = state.round!.topic!.title;
  state = apply(state, 'A', { type: 'toLobby' }, env);
  state = apply(state, 'A', { type: 'start' }, env);
  assert.ok(state.round!.options.every((t) => t.title !== used));
  // 残りが 3 つしかないので、次は使用済みを忘れて 4 つ全部から引く
  state = apply(state, 'A', { type: 'decide', title: state.round!.options[0].title }, env);
  state = run(state, [
    ['A', { type: 'toLobby' }],
    ['A', { type: 'start' }],
  ]);
  assert.equal(state.round!.options.length, 3);
});

test('カードは参加者数 + レベル - 1 枚で、数字は重ならない', () => {
  let state = run(room('B', 'C'), [['A', { type: 'start' }]]);
  state = apply(state, 'A', { type: 'decide', title: state.round!.options[0].title }, env);
  const values = Object.values(state.round!.hands).flat().map((c) => c.value);
  assert.equal(values.length, 3);
  assert.equal(new Set(values).size, 3);
  for (const id of ['A', 'B', 'C']) assert.ok(state.round!.hands[id].length >= 1);
});

test('自分のカードしか出し入れできず、たとえワードは場に出ても書き換えられる', () => {
  let state = toPlaceCards(room('B'));
  const a = state.round!.hands.A[0].value;
  const b = state.round!.hands.B[0].value;
  rejects(state, 'B', { type: 'place', value: a, index: 0 }, /持っていません/);
  state = run(state, [
    ['A', { type: 'setHint', value: a, hint: 'お父さんの靴下' }],
    ['A', { type: 'place', value: a, index: 0 }],
  ]);
  assert.equal(state.round!.field[0].hint, 'お父さんの靴下');
  state = apply(state, 'A', { type: 'setHint', value: a, hint: '新しい靴下' }, env);
  assert.equal(state.round!.field[0].hint, '新しい靴下');
  rejects(state, 'A', { type: 'toReveal' }, /まだ全員/);
  state = run(state, [
    ['B', { type: 'place', value: b, index: 1 }],
    ['A', { type: 'takeBack', value: a }],
  ]);
  assert.deepEqual(state.round!.hands.A, [{ value: a, hint: '新しい靴下' }]);
  assert.equal(state.round!.field.length, 1);
});

test('めくった順に関係なく、場の並びが崩れていたら失敗、全部そろえば成功', () => {
  const card = (value: number, revealed = true) => ({ id: String(value), playerId: 'A', value, hint: '', revealed });
  assert.equal(judge([card(10), card(5, false), card(30)]), null);
  assert.equal(judge([card(10), card(50, false), card(5)]), 'fail');
  assert.equal(judge([card(10), card(20), card(30)]), 'success');
  assert.equal(judge([]), null);
});

test('成功するとクリアしたレベルが記録され、次のレベルが選べるようになる', () => {
  let state = placeAllSorted(toPlaceCards(room('B')));
  state = apply(state, 'A', { type: 'toReveal' }, env);
  rejects(state, 'A', { type: 'reveal', index: 5 });
  state = run(state, [
    ['A', { type: 'reveal', index: 1 }],
    ['B', { type: 'reveal', index: 0 }],
  ]);
  assert.equal(state.round!.result, 'success');
  assert.equal(state.maxClearLevel, 1);
  assert.equal(levelMax(state), 2);
  // 結果が出たら、ロビーへ戻らずに次のゲームを始められる
  // ゲーム中はレベルを変えられない
  rejects(state, 'A', { type: 'updateSettings', settings: { level: 2 } }, /今は実行できません/);
  state = apply(state, 'A', { type: 'start' }, env);
  assert.equal(state.phase, 'chooseTopic');
  state = run(state, [
    ['A', { type: 'toLobby' }],
    ['A', { type: 'updateSettings', settings: { level: 2 } }],
  ]);
  assert.equal(state.settings.level, 2);
  rejects(state, 'A', { type: 'updateSettings', settings: { level: 3 } }, /まだ選べない/);
});

test('めくる段階から出す段階へ戻ると、めくったカードが伏せ直される', () => {
  let state = placeAllSorted(toPlaceCards(room('B')));
  state = run(state, [
    ['A', { type: 'toReveal' }],
    ['A', { type: 'reveal', index: 0 }],
    ['A', { type: 'backToPlace' }],
  ]);
  assert.equal(state.phase, 'placeCards');
  assert.ok(state.round!.field.every((c) => !c.revealed));
});

test('途中で入った人は次のゲームから。抜けた人のカードは場から消える', () => {
  let state = toPlaceCards(room('B', 'C'));
  state = apply(state, 'D', { type: 'join', profile: profile('D') }, env);
  assert.ok(!state.round!.participants.includes('D'));
  rejects(state, 'D', { type: 'place', value: 1, index: 0 }, /参加していません/);
  const c = state.round!.hands.C[0].value;
  state = run(state, [
    ['C', { type: 'place', value: c, index: 0 }],
    ['C', { type: 'leave' }],
  ]);
  assert.equal(state.round!.field.length, 0);
  assert.deepEqual(state.round!.participants, ['A', 'B']);
  // 2 人を下回るとロビーに戻る
  state = apply(state, 'B', { type: 'leave' }, env);
  assert.equal(state.phase, 'waiting');
});

test('追い出された人は入り直せない。ホストが抜けると次の人がホストになる', () => {
  let state = apply(room('B', 'C'), 'A', { type: 'kick', playerId: 'B' }, env);
  rejects(state, 'B', { type: 'join', profile: profile('B') }, /参加できません/);
  state = apply(state, 'A', { type: 'leave' }, env);
  assert.equal(state.hostId, 'C');
});

test('つながっていないホストの代わりは、つながっている先に入った人', () => {
  const state = room('B', 'C');
  assert.equal(pickNewHost(state, new Set(['A', 'C'])), null);
  assert.equal(pickNewHost(state, new Set(['C', 'B'])), 'B');
  assert.equal(pickNewHost(state, new Set()), null);
});

test('ほかの人の手札と、めくる前の数字は見えない', () => {
  let state = placeAllSorted(toPlaceCards(room('B')));
  const forB = view('r', state, 'B', new Set());
  assert.equal(forB.round!.field.filter((c) => c.value !== null).length, 1);
  assert.ok(forB.round!.field.find((c) => c.playerId === 'A')!.value === null);
  state = run(state, [
    ['A', { type: 'toReveal' }],
    ['A', { type: 'reveal', index: 0 }],
  ]);
  const forC = view('r', state, 'C', new Set());
  assert.notEqual(forC.round!.field[0].value, null);
  assert.equal(forC.round!.field[1].value, null);
  assert.equal(forC.me.joined, false);
  assert.ok(!('customTopics' in forC.settings));
});

test('入力は長さを切り詰め、不正なアバター URL と色は外す', () => {
  const state = apply(
    room(),
    'B',
    { type: 'join', profile: { nickname: `  ${'あ'.repeat(40)}  `, color: 'red', avatarUrl: 'https://evil.example/a.png' } },
    env,
  );
  const b = state.players[1];
  assert.equal(b.nickname.length, 20);
  assert.equal(b.color, '');
  assert.equal(b.avatarUrl, '');
  rejects(room(), 'B', { type: 'join', profile: profile('   ') }, /ニックネーム/);
});

test('カスタムお題はカンマかタブ区切りで、重複と空行を除く', () => {
  assert.deepEqual(parseCustomTopics('コンビニの商品の人気, 人気ない, 人気ある\n\n100円ショップ\t安い\t高い\nコンビニの商品の人気'), [
    { title: 'コンビニの商品の人気', min: '人気ない', max: '人気ある', set: 'custom' },
    { title: '100円ショップ', min: '安い', max: '高い', set: 'custom' },
  ]);
});
