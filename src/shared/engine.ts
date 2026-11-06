// ゲームの決まりごと。状態を変えてよいのはこのファイルの apply だけで、サーバーだけが呼ぶ。
// クライアントは操作 (Action) を送り、サーバーが返す見え方 (RoomView) を表示する。
import { AUTO_COLORS } from './colors.ts';
import { TOPICS } from './topics.ts';

export type TopicSet = 'normal' | 'rainbow' | 'classic' | 'salmon' | 'custom';
/** ホストが選べるお題セット。normal と classic はデータだけ残している */
export const SELECTABLE_TOPIC_SETS = ['rainbow', 'salmon', 'custom'] as const satisfies readonly TopicSet[];
export type SelectableTopicSet = (typeof SELECTABLE_TOPIC_SETS)[number];

export interface Topic {
  title: string;
  /** 1 のときの意味 (例: 軽い) */
  min: string;
  /** 100 のときの意味 (例: 重い) */
  max: string;
  set: TopicSet;
}

export type Phase = 'waiting' | 'chooseTopic' | 'placeCards' | 'revealCards';
export type Tiebreak = 'random' | 'host';
export type Result = 'success' | 'fail';

export const LIMITS = {
  playersMax: 20,
  nicknameMax: 20,
  hintMax: 60,
  topicTitleMax: 60,
  topicLabelMax: 20,
  customTopicsMax: 500,
  proposalsMax: 12,
  optionsCount: 3,
  cardMax: 100,
} as const;

export interface Profile {
  nickname: string;
  color: string;
  avatarUrl: string;
}

export interface Player extends Profile {
  id: string;
  joinedAt: number;
}

export interface Settings {
  topicSet: SelectableTopicSet;
  level: number;
  tiebreak: Tiebreak;
  customTopics: Topic[];
}

export interface HandCard {
  value: number;
  hint: string;
}

export interface FieldCard {
  /** 場に出すたびに振る番号。数字を伏せたままカードを見分けるのに使う */
  id: string;
  playerId: string;
  value: number;
  hint: string;
  revealed: boolean;
}

export interface Proposal extends Topic {
  by: string;
}

export interface Round {
  /** このゲームに参加している人。途中から部屋に入った人は次のゲームから */
  participants: string[];
  level: number;
  options: Topic[];
  proposals: Proposal[];
  /** 参加者ごとの投票先のお題 */
  votes: Record<string, string>;
  /** 同票で、ホストが決めるのを待っている */
  tie: boolean;
  topic: Topic | null;
  hands: Record<string, HandCard[]>;
  field: FieldCard[];
  result: Result | null;
  /** 配り直すたびに増える。クライアントは配る演出のきっかけにする */
  dealId: number;
  /** 次に場へ出すカードの番号 */
  nextCardId: number;
}

export interface RoomState {
  hostId: string;
  players: Player[];
  /** 追い出された人。このルームには入り直せない */
  kicked: string[];
  settings: Settings;
  maxClearLevel: number;
  usedTitles: string[];
  phase: Phase;
  round: Round | null;
}

export type Action =
  | { type: 'join'; profile: Profile }
  | { type: 'leave' }
  | { type: 'updateProfile'; profile: Profile }
  | { type: 'kick'; playerId: string; ban?: boolean }
  | { type: 'transferHost'; playerId: string }
  | { type: 'updateSettings'; settings: Partial<Settings> }
  | { type: 'start' }
  | { type: 'redraw' }
  | { type: 'vote'; title: string }
  | { type: 'propose'; topic: { title: string; min: string; max: string } }
  | { type: 'decide'; title: string }
  | { type: 'setHint'; value: number; hint: string }
  | { type: 'place'; value: number; index: number }
  | { type: 'takeBack'; value: number }
  | { type: 'redeal' }
  | { type: 'toReveal' }
  | { type: 'reveal'; index: number }
  | { type: 'backToPlace' }
  | { type: 'toLobby' };

export interface Env {
  now: number;
  /** 0 以上 max 未満の整数 */
  randomInt: (max: number) => number;
}

/** 利用者に見せてよい理由で操作を断る */
export class GameError extends Error {}

// ---- 入力の整え方 ----

const PRESET_COLOR = /^#[0-9a-fA-F]{6}$/;
const AVATAR_URL = /^\/avatars\/[A-Za-z0-9_-]{16,64}\.png$/;

const text = (value: unknown, max: number): string =>
  typeof value === 'string'
    ? value
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, max)
    : '';

export function sanitizeProfile(input: unknown): Profile {
  const raw = (input ?? {}) as Record<string, unknown>;
  const nickname = text(raw.nickname, LIMITS.nicknameMax);
  if (!nickname) throw new GameError('ニックネームを入力してください');
  const color = typeof raw.color === 'string' && PRESET_COLOR.test(raw.color) ? raw.color : '';
  const avatarUrl = typeof raw.avatarUrl === 'string' && AVATAR_URL.test(raw.avatarUrl) ? raw.avatarUrl : '';
  return { nickname, color, avatarUrl };
}

export function sanitizeTopic(input: unknown, set: TopicSet): Topic | null {
  const raw = (input ?? {}) as Record<string, unknown>;
  const title = text(raw.title, LIMITS.topicTitleMax);
  if (!title) return null;
  return { title, min: text(raw.min, LIMITS.topicLabelMax), max: text(raw.max, LIMITS.topicLabelMax), set };
}

/** カスタムお題の入力欄の文字列を読む。1 行に「タイトル, 1 の意味, 100 の意味」(カンマかタブ区切り) */
export function parseCustomTopics(source: string): Topic[] {
  const seen = new Set<string>();
  const topics: Topic[] = [];
  for (const line of source.split('\n')) {
    const [title, min, max] = line
      .replace(/\t/g, ',')
      .split(',')
      .map((part) => part.trim());
    const topic = sanitizeTopic({ title, min, max }, 'custom');
    if (!topic || seen.has(topic.title)) continue;
    seen.add(topic.title);
    topics.push(topic);
    if (topics.length >= LIMITS.customTopicsMax) break;
  }
  return topics;
}

function sanitizeSettings(input: unknown, current: Settings): Settings {
  const raw = (input ?? {}) as Record<string, unknown>;
  const next = { ...current };
  if (raw.topicSet !== undefined) {
    if (!SELECTABLE_TOPIC_SETS.includes(raw.topicSet as SelectableTopicSet)) throw new GameError('お題セットが不正です');
    next.topicSet = raw.topicSet as SelectableTopicSet;
  }
  if (raw.level !== undefined) {
    if (!Number.isInteger(raw.level) || (raw.level as number) < 1) throw new GameError('レベルが不正です');
    next.level = raw.level as number;
  }
  if (raw.tiebreak !== undefined) {
    if (raw.tiebreak !== 'random' && raw.tiebreak !== 'host') throw new GameError('同票時の決め方が不正です');
    next.tiebreak = raw.tiebreak;
  }
  if (raw.customTopics !== undefined) {
    if (!Array.isArray(raw.customTopics)) throw new GameError('カスタムお題が不正です');
    const seen = new Set<string>();
    next.customTopics = raw.customTopics
      .slice(0, LIMITS.customTopicsMax)
      .map((topic) => sanitizeTopic(topic, 'custom'))
      .filter((topic): topic is Topic => !!topic && !seen.has(topic.title) && !!seen.add(topic.title));
  }
  return next;
}

// ---- 状態を作る ----

export function createState(host: Player): RoomState {
  return {
    hostId: host.id,
    players: [host],
    kicked: [],
    settings: { topicSet: 'rainbow', level: 1, tiebreak: 'random', customTopics: [] },
    maxClearLevel: 0,
    usedTitles: [],
    phase: 'waiting',
    round: null,
  };
}

/** ホストが選べるレベルの上限。クリアしたレベルの次までで、カードが 100 枚に収まる範囲 */
export function levelMax(state: RoomState, playerCount = state.players.length): number {
  return Math.max(1, Math.min(state.maxClearLevel + 1, LIMITS.cardMax - playerCount + 1));
}

const isPlayer = (state: RoomState, id: string) => state.players.some((p) => p.id === id);
const shuffle = <T>(items: readonly T[], env: Env): T[] => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = env.randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

function topicPool(state: RoomState): Topic[] {
  const { topicSet, customTopics } = state.settings;
  return topicSet === 'custom' ? customTopics : TOPICS.filter((topic) => topic.set === topicSet);
}

/** お題の候補を引く。使ったお題は避け、足りなくなったらそのセットの使用済みを忘れる */
function drawOptions(state: RoomState, env: Env, avoid: readonly Topic[] = []): Topic[] {
  const pool = topicPool(state);
  if (pool.length === 0) throw new GameError('お題がありません。カスタムお題を入力してください');
  const avoidTitles = new Set(avoid.map((topic) => topic.title));
  let fresh = pool.filter((topic) => !state.usedTitles.includes(topic.title));
  if (fresh.length < LIMITS.optionsCount) {
    const titles = new Set(pool.map((topic) => topic.title));
    state.usedTitles = state.usedTitles.filter((title) => !titles.has(title));
    fresh = pool;
  }
  // 再抽選では、出ていた候補をなるべく避ける
  const preferred = fresh.filter((topic) => !avoidTitles.has(topic.title));
  const source = preferred.length >= LIMITS.optionsCount ? preferred : fresh;
  return shuffle(source, env).slice(0, LIMITS.optionsCount);
}

function deal(round: Round, env: Env): void {
  const { participants, level } = round;
  const total = participants.length + level - 1;
  const numbers = shuffle(
    Array.from({ length: LIMITS.cardMax }, (_, i) => i + 1),
    env,
  ).slice(0, total);
  const hands: Record<string, HandCard[]> = {};
  participants.forEach((id, i) => (hands[id] = [{ value: numbers[i], hint: '' }]));
  // 残りは、並びを混ぜた参加者に順に 1 枚ずつ配る
  const receivers = shuffle(participants, env);
  numbers.slice(participants.length).forEach((value, i) => {
    hands[receivers[i % receivers.length]].push({ value, hint: '' });
  });
  for (const hand of Object.values(hands)) hand.sort((a, b) => a.value - b.value);
  round.hands = hands;
  round.field = [];
  round.result = null;
  round.dealId++;
}

/** 色を選んでいない人に、ほかの人と重ならない色を割り当てる */
function assignColors(state: RoomState): void {
  const used = new Set(state.players.map((p) => p.color).filter(Boolean));
  const free = AUTO_COLORS.filter((color) => !used.has(color));
  let next = 0;
  for (const player of state.players) {
    if (!player.color) player.color = free[next++ % free.length] ?? AUTO_COLORS[0];
  }
}

function startRound(state: RoomState, env: Env): void {
  if (state.players.length < 2) throw new GameError('2 人以上で始められます');
  assignColors(state);
  const level = Math.min(state.settings.level, levelMax(state));
  state.settings.level = level;
  state.round = {
    participants: state.players.map((p) => p.id),
    level,
    options: drawOptions(state, env),
    proposals: [],
    votes: {},
    tie: false,
    topic: null,
    hands: {},
    field: [],
    result: null,
    dealId: 0,
    nextCardId: 1,
  };
  state.phase = 'chooseTopic';
}

function chooseTopic(state: RoomState, round: Round, title: string, env: Env): void {
  const topic = [...round.options, ...round.proposals].find((t) => t.title === title);
  if (!topic) throw new GameError('そのお題は候補にありません');
  round.topic = { title: topic.title, min: topic.min, max: topic.max, set: topic.set };
  round.tie = false;
  if (!state.usedTitles.includes(topic.title)) state.usedTitles.push(topic.title);
  deal(round, env);
  state.phase = 'placeCards';
}

/** 参加者全員が投票したら決める。同票はランダムか、ホストに任せる */
function settleVotes(state: RoomState, round: Round, env: Env): void {
  round.tie = false;
  if (round.participants.length === 0) return;
  if (!round.participants.every((id) => round.votes[id])) return;
  const counts = new Map<string, number>();
  for (const id of round.participants) counts.set(round.votes[id], (counts.get(round.votes[id]) ?? 0) + 1);
  const top = Math.max(...counts.values());
  const leaders = [...counts].filter(([, count]) => count === top).map(([title]) => title);
  if (leaders.length > 1 && state.settings.tiebreak === 'host') {
    round.tie = true;
    return;
  }
  chooseTopic(state, round, leaders[env.randomInt(leaders.length)], env);
}

/** 場のカードを左から見て、めくった数字が小さい順に並んでいるかで結果を決める */
export function judge(field: readonly FieldCard[]): Result | null {
  const shown = field.filter((card) => card.revealed).map((card) => card.value);
  if (shown.some((value, i) => i > 0 && shown[i - 1] > value)) return 'fail';
  return field.length > 0 && shown.length === field.length ? 'success' : null;
}

function updateResult(state: RoomState, round: Round): void {
  if (round.result) return;
  round.result = judge(round.field);
  if (round.result === 'success') state.maxClearLevel = Math.max(state.maxClearLevel, round.level);
}

/** 抜けた人のカードとお題の票を、進行中のゲームから取り除く */
function dropFromRound(state: RoomState, playerId: string, env: Env): void {
  const round = state.round;
  if (!round || !round.participants.includes(playerId)) return;
  round.participants = round.participants.filter((id) => id !== playerId);
  delete round.votes[playerId];
  delete round.hands[playerId];
  round.field = round.field.filter((card) => card.playerId !== playerId);
  if (round.participants.length < 2) {
    state.phase = 'waiting';
    state.round = null;
    return;
  }
  if (state.phase === 'chooseTopic') settleVotes(state, round, env);
  if (state.phase === 'revealCards') updateResult(state, round);
}

function removePlayer(state: RoomState, playerId: string, env: Env): void {
  state.players = state.players.filter((p) => p.id !== playerId);
  dropFromRound(state, playerId, env);
  if (state.hostId === playerId) state.hostId = state.players[0]?.id ?? '';
}

export const allPlaced = (round: Round): boolean => round.participants.every((id) => (round.hands[id] ?? []).length === 0);

const sameState = (state: RoomState): RoomState => structuredClone(state);

/**
 * 操作を当てはめた新しい状態を返す。断るときは GameError を投げ、元の状態は変えない。
 * actorId はサーバーが接続から決めた本人の ID で、クライアントの申告は使わない。
 */
export function apply(current: RoomState, actorId: string, action: Action, env: Env): RoomState {
  const state = sameState(current);
  const isHost = state.hostId === actorId;
  const round = state.round;
  const requireHost = () => {
    if (!isHost) throw new GameError('ホストのみ実行できます');
  };
  const requirePhase = (...phases: Phase[]) => {
    if (!phases.includes(state.phase)) throw new GameError('今は実行できません');
  };
  const requireRound = (): Round => {
    if (!round) throw new GameError('今は実行できません');
    return round;
  };
  const requireParticipant = (): Round => {
    const r = requireRound();
    if (!r.participants.includes(actorId)) throw new GameError('このゲームには参加していません');
    return r;
  };
  const ownCard = (r: Round, value: unknown) => {
    if (!Number.isInteger(value)) throw new GameError('カードが不正です');
    const hand = r.hands[actorId] ?? [];
    const inHand = hand.find((card) => card.value === value);
    const onField = r.field.find((card) => card.playerId === actorId && card.value === value);
    if (!inHand && !onField) throw new GameError('そのカードは持っていません');
    return { hand, inHand, onField };
  };

  switch (action.type) {
    case 'join': {
      if (state.kicked.includes(actorId)) throw new GameError('このルームには参加できません');
      const profile = sanitizeProfile(action.profile);
      const existing = state.players.find((p) => p.id === actorId);
      if (existing) {
        Object.assign(existing, profile);
        break;
      }
      if (state.players.length >= LIMITS.playersMax) throw new GameError('ルームが満員です');
      state.players.push({ id: actorId, ...profile, joinedAt: env.now });
      if (!state.hostId) state.hostId = actorId;
      break;
    }
    case 'leave': {
      if (!isPlayer(state, actorId)) throw new GameError('参加していません');
      removePlayer(state, actorId, env);
      break;
    }
    case 'updateProfile': {
      const player = state.players.find((p) => p.id === actorId);
      if (!player) throw new GameError('参加していません');
      Object.assign(player, sanitizeProfile(action.profile));
      break;
    }
    case 'kick': {
      requireHost();
      if (action.playerId === actorId || !isPlayer(state, action.playerId)) throw new GameError('その人は追い出せません');
      removePlayer(state, action.playerId, env);
      // 接続が切れた人を外すだけのときは、戻ってきたら入り直せる
      if (action.ban !== false) state.kicked.push(action.playerId);
      break;
    }
    case 'transferHost': {
      requireHost();
      if (action.playerId === actorId || !isPlayer(state, action.playerId)) throw new GameError('その人にはホストを渡せません');
      state.hostId = action.playerId;
      break;
    }
    case 'updateSettings': {
      requireHost();
      const settings = sanitizeSettings(action.settings, state.settings);
      // ゲーム中に変えられるのは同票時の決め方だけ
      if (state.phase !== 'waiting') {
        if (settings.topicSet !== state.settings.topicSet || settings.level !== state.settings.level) requirePhase('waiting');
        state.settings.tiebreak = settings.tiebreak;
        if (round && state.phase === 'chooseTopic') settleVotes(state, round, env);
        break;
      }
      if (settings.level > levelMax(state)) throw new GameError('まだ選べないレベルです');
      state.settings = settings;
      break;
    }
    case 'start': {
      requireHost();
      // 結果が出たあとは、ロビーへ戻らずに次のゲームを始められる
      if (!(state.phase === 'waiting' || (state.phase === 'revealCards' && round?.result))) requirePhase('waiting');
      startRound(state, env);
      break;
    }
    case 'redraw': {
      requireHost();
      requirePhase('chooseTopic');
      const r = requireRound();
      r.options = drawOptions(state, env, r.options);
      r.proposals = [];
      r.votes = {};
      r.tie = false;
      break;
    }
    case 'vote': {
      requirePhase('chooseTopic');
      const r = requireParticipant();
      if (![...r.options, ...r.proposals].some((t) => t.title === action.title)) throw new GameError('そのお題は候補にありません');
      r.votes[actorId] = action.title;
      settleVotes(state, r, env);
      break;
    }
    case 'propose': {
      requirePhase('chooseTopic');
      const r = requireParticipant();
      const topic = sanitizeTopic(action.topic, 'custom');
      if (!topic) throw new GameError('お題のタイトルを入力してください');
      if ([...r.options, ...r.proposals].some((t) => t.title === topic.title)) throw new GameError('同じお題がすでにあります');
      if (r.proposals.length >= LIMITS.proposalsMax) throw new GameError('これ以上お題を提案できません');
      r.proposals.push({ ...topic, by: actorId });
      // 候補が増えたので投票し直す。古い票を残すと、最初に入れ直した 1 票と古い票の組み合わせで、
      // 提案したお題とは別のお題に決まってしまう
      r.votes = {};
      r.tie = false;
      break;
    }
    case 'decide': {
      requireHost();
      requirePhase('chooseTopic');
      chooseTopic(state, requireRound(), action.title, env);
      break;
    }
    case 'setHint': {
      requirePhase('placeCards');
      const r = requireParticipant();
      const { inHand, onField } = ownCard(r, action.value);
      const hint = text(action.hint, LIMITS.hintMax);
      if (inHand) inHand.hint = hint;
      if (onField) onField.hint = hint;
      break;
    }
    case 'place': {
      requirePhase('placeCards');
      const r = requireParticipant();
      const { hand, inHand } = ownCard(r, action.value);
      if (!inHand) throw new GameError('そのカードはもう出しています');
      if (!Number.isInteger(action.index) || action.index < 0 || action.index > r.field.length) {
        throw new GameError('出す場所が不正です');
      }
      r.hands[actorId] = hand.filter((card) => card !== inHand);
      r.field.splice(action.index, 0, {
        id: String(r.nextCardId++),
        playerId: actorId,
        value: inHand.value,
        hint: inHand.hint,
        revealed: false,
      });
      break;
    }
    case 'takeBack': {
      requirePhase('placeCards');
      const r = requireParticipant();
      const { hand, onField } = ownCard(r, action.value);
      if (!onField) throw new GameError('そのカードは場にありません');
      r.field = r.field.filter((card) => card !== onField);
      r.hands[actorId] = [...hand, { value: onField.value, hint: onField.hint }].sort((a, b) => a.value - b.value);
      break;
    }
    case 'redeal': {
      requireHost();
      requirePhase('placeCards');
      deal(requireRound(), env);
      break;
    }
    case 'toReveal': {
      requireHost();
      requirePhase('placeCards');
      if (!allPlaced(requireRound())) throw new GameError('まだ全員のカードが出ていません');
      state.phase = 'revealCards';
      break;
    }
    case 'reveal': {
      requirePhase('revealCards');
      const r = requireParticipant();
      const card = r.field[action.index];
      if (!Number.isInteger(action.index) || !card) throw new GameError('そのカードはありません');
      if (card.revealed) break;
      card.revealed = true;
      updateResult(state, r);
      break;
    }
    case 'backToPlace': {
      requireHost();
      requirePhase('revealCards');
      const r = requireRound();
      for (const card of r.field) card.revealed = false;
      r.result = null;
      state.phase = 'placeCards';
      break;
    }
    case 'toLobby': {
      requireHost();
      requirePhase('chooseTopic', 'placeCards', 'revealCards');
      state.phase = 'waiting';
      state.round = null;
      break;
    }
    default:
      throw new GameError('不明な操作です');
  }
  return state;
}

/** 接続が切れたホストの代わりを決める。つながっている参加者のうち、先に入った人 */
export function pickNewHost(state: RoomState, online: ReadonlySet<string>): string | null {
  if (online.has(state.hostId)) return null;
  return state.players.find((p) => online.has(p.id))?.id ?? null;
}

// ---- 見え方 ----

export interface PlayerView extends Player {
  online: boolean;
}

export interface FieldCardView {
  id: string;
  playerId: string;
  hint: string;
  /** めくられたカードと、自分のカードだけ数字が見える */
  value: number | null;
  revealed: boolean;
}

export interface RoundView {
  participants: string[];
  level: number;
  options: Topic[];
  proposals: Proposal[];
  votes: Record<string, string>;
  tie: boolean;
  topic: Topic | null;
  myHand: HandCard[];
  handCounts: Record<string, number>;
  field: FieldCardView[];
  result: Result | null;
  dealId: number;
  allPlaced: boolean;
}

export interface RoomView {
  id: string;
  phase: Phase;
  hostId: string;
  players: PlayerView[];
  settings: Omit<Settings, 'customTopics'> & { customTopicCount: number };
  maxClearLevel: number;
  levelMax: number;
  round: RoundView | null;
  me: { id: string; joined: boolean; kicked: boolean; isHost: boolean; participant: boolean };
}

export function view(roomId: string, state: RoomState, viewerId: string, online: ReadonlySet<string>): RoomView {
  const round = state.round;
  const { customTopics, ...settings } = state.settings;
  return {
    id: roomId,
    phase: state.phase,
    hostId: state.hostId,
    players: state.players.map((p) => ({ ...p, online: online.has(p.id) })),
    settings: { ...settings, customTopicCount: customTopics.length },
    maxClearLevel: state.maxClearLevel,
    levelMax: levelMax(state),
    round: round && {
      participants: round.participants,
      level: round.level,
      options: round.options,
      proposals: round.proposals,
      votes: round.votes,
      tie: round.tie,
      topic: round.topic,
      myHand: round.hands[viewerId] ?? [],
      handCounts: Object.fromEntries(round.participants.map((id) => [id, (round.hands[id] ?? []).length])),
      field: round.field.map((card) => ({
        id: card.id,
        playerId: card.playerId,
        hint: card.hint,
        value: card.revealed || card.playerId === viewerId ? card.value : null,
        revealed: card.revealed,
      })),
      result: round.result,
      dealId: round.dealId,
      allPlaced: allPlaced(round),
    },
    me: {
      id: viewerId,
      joined: isPlayer(state, viewerId),
      kicked: state.kicked.includes(viewerId),
      isHost: state.hostId === viewerId,
      participant: !!round?.participants.includes(viewerId),
    },
  };
}
