// サーバーとクライアントの取り決め
import type { Profile } from './engine.ts';

/** 取り決めを変えたら上げる。古い画面が開いたままなら、つなぎ直す前に読み込み直させる */
export const PROTOCOL_VERSION = 2;

/** Socket.io の接続時に送る */
export interface Handshake {
  protocol: number;
  /** ブラウザごとの秘密の鍵。サーバーはここから本人の ID を作り、鍵そのものは誰にも見せない */
  secret: string;
  roomId: string;
}

/** 接続を断る理由 (connect_error の message) */
/** tooMany: 同じ接続元からの接続が多すぎる、または存在しない部屋への接続を繰り返した */
export type ConnectRefusal = 'outdated' | 'invalid' | 'notFound' | 'tooMany';

export interface Ack {
  error?: string;
}

export interface CreateRoomRequest {
  secret: string;
  profile: Profile;
}

export interface CreateRoomResponse {
  roomId: string;
}

export interface UploadAvatarResponse {
  avatarUrl: string;
}

export const SECRET_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
/**
 * 部屋の ID。「形容詞-色-動物-ランダムな 4 文字」。末尾の 4 文字で、総当たりで部屋を探し当てられないようにする。
 * 末尾の無い ID は、この形にする前に作られた部屋
 */
export const ROOM_ID_PATTERN = /^[a-z]+-[a-z]+-[a-z]+(-[a-z0-9]{4})?$/;
export const ROOM_ID_SUFFIX_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';
export const AVATAR_MAX_BYTES = 300 * 1024;
