// プロフィールの入力欄の状態。ルームの作成と参加で共通
import { useState } from 'react';
import type { Profile } from '@shared/engine.ts';
import { uploadAvatar } from '@/lib/api.ts';
import { loadProfile, preference, saveProfile } from '@/lib/identity.ts';
import { toastWithAnimation } from '@/lib/toast';

export function useProfileForm() {
  const [initial] = useState(loadProfile);
  const [nickname, setNickname] = useState(initial.nickname);
  const [color, setColor] = useState(initial.color);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showOptions, setShowOptionsState] = useState(() => preference.get('showOptions') === 'true');
  const [busy, setBusy] = useState(false);

  const setShowOptions = (value: boolean) => {
    setShowOptionsState(value);
    preference.set('showOptions', String(value));
  };

  /** 入力をまとめる。画像を選び直していれば先に上げる。上げられなくても画像なしで続ける */
  async function resolveProfile(): Promise<Profile> {
    let url = avatarUrl;
    if (avatarFile) {
      try {
        url = await uploadAvatar(avatarFile);
        setAvatarUrl(url);
        setAvatarFile(null);
      } catch (error) {
        toastWithAnimation(`画像を使えませんでした: ${(error as Error).message}`, { type: 'warn' });
        url = '';
      }
    }
    const profile = { nickname: nickname.trim(), color, avatarUrl: url };
    saveProfile(profile);
    return profile;
  }

  /** 入力をまとめて action に渡す。実行中はボタンを押せなくする */
  async function submit(action: (profile: Profile) => Promise<unknown>): Promise<void> {
    if (busy || !nickname.trim()) return;
    setBusy(true);
    try {
      await action(await resolveProfile());
    } finally {
      setBusy(false);
    }
  }

  return {
    nickname,
    setNickname,
    color,
    setColor,
    avatarUrl,
    setAvatarUrl,
    avatarFile,
    setAvatarFile,
    showOptions,
    setShowOptions,
    busy,
    submit,
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
