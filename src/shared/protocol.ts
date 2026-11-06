// サーバーとクライアントの取り決め
import type { Profile } from './engine.ts';

/** 取り決めを変えたら上げる。古い画面が開いたままなら、つなぎ直す前に読み込み直させる */
export const PROTOCOL_VERSION = 1;

/** Socket.io の接続時に送る */
export interface Handshake {
  protocol: number;
  /** ブラウザごとの秘密の鍵。サーバーはここから本人の ID を作り、鍵そのものは誰にも見せない */
  secret: string;
  roomId: string;
}

/** 接続を断る理由 (connect_error の message) */
export type ConnectRefusal = 'outdated' | 'invalid' | 'notFound';

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
export const ROOM_ID_PATTERN = /^[a-z]+-[a-z]+-[a-z]+$/;
export const AVATAR_MAX_BYTES = 300 * 1024;
