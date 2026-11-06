// HTTP で呼ぶサーバーの API
import type { Profile } from '@shared/engine.ts';
import type { CreateRoomResponse, UploadAvatarResponse } from '@shared/protocol.ts';
import { secret } from './identity.ts';

async function post<T>(path: string, body: BodyInit, contentType: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  } catch {
    throw new Error('サーバーにつながりません');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました');
  return data;
}

export const createRoom = (profile: Profile) =>
  post<CreateRoomResponse>('/api/rooms', JSON.stringify({ secret: secret(), profile }), 'application/json');

const AVATAR_SIZE = 256;

/** 画像を 256px 四方の PNG に縮めてから上げる。比率は保ち、余白は透明にする */
export async function uploadAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('画像を読み込めません');
  });
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像を変換できません');
  const ratio = Math.min(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
  const width = bitmap.width * ratio;
  const height = bitmap.height * ratio;
  ctx.drawImage(bitmap, (AVATAR_SIZE - width) / 2, (AVATAR_SIZE - height) / 2, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('画像を変換できません');
  const { avatarUrl } = await post<UploadAvatarResponse>('/api/avatars', blob, 'image/png');
  return avatarUrl;
}
