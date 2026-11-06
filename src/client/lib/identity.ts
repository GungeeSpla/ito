// ブラウザに保存する、本人の鍵とプロフィール。サーバーには利用者の一覧を持たない
import type { Profile } from '@shared/engine.ts';

const SECRET_KEY = 'ito:secret';
const PROFILE_KEY = 'ito:profile';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // プライベートモードなどで保存できなくても、このタブの間は遊べる
  }
};

let memorySecret: string | null = null;

/** 本人の鍵。最初に使うときに作る。サーバーはここから ID を作るので、他の人には見せない */
export function secret(): string {
  const saved = read(SECRET_KEY) ?? memorySecret;
  if (saved) return saved;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const created = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  memorySecret = created;
  write(SECRET_KEY, created);
  return created;
}

export function loadProfile(): Profile {
  try {
    const raw = JSON.parse(read(PROFILE_KEY) ?? '{}') as Partial<Profile>;
    return {
      nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
      color: typeof raw.color === 'string' ? raw.color : '',
      avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : '',
    };
  } catch {
    return { nickname: '', color: '', avatarUrl: '' };
  }
}

export const saveProfile = (profile: Profile) => write(PROFILE_KEY, JSON.stringify(profile));

/** 画面の設定のような、なくても困らない値 */
export const preference = {
  get: (key: string) => read(`ito:${key}`),
  set: (key: string, value: string) => write(`ito:${key}`, value),
};
