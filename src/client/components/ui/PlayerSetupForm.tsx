import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Rocket } from 'lucide-react';
import { PRESET_COLORS } from '@shared/colors.ts';
import { LIMITS } from '@shared/engine.ts';
import type { ProfileForm } from '@/hooks/useProfileForm.ts';
import SectionTitle from './SectionTitle';

interface Props {
  form: ProfileForm;
  submitLabel: string;
  onSubmit: () => void;
}

const isPreset = (color: string) => (PRESET_COLORS as readonly string[]).includes(color);

const PlayerSetupForm: React.FC<Props> = ({ form, submitLabel, onSubmit }) => {
  const { nickname, setNickname, color, setColor, avatarFile, setAvatarFile, avatarUrl, setAvatarUrl, showOptions, setShowOptions, busy } =
    form;
  const [customColor, setCustomColor] = useState(() => (color && !isPreset(color) ? color : '#1F1F1F'));
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  // 選んだ画像の見本。作り直すたびに前の URL を手放す
  const preview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl), [avatarFile, avatarUrl]);
  useEffect(() => () => (avatarFile ? URL.revokeObjectURL(preview) : undefined), [avatarFile, preview]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6 z-10"
    >
      {/* ---ニックネーム--- */}
      <div>
        <SectionTitle className="mt-0">ニックネーム</SectionTitle>
        <input
          ref={inputRef}
          type="text"
          placeholder="ここにニックネームを入力"
          value={nickname}
          maxLength={LIMITS.nicknameMax}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full p-2.5 rounded-md border border-gray-400 bg-white text-black text-center
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* 詳細設定切り替え */}
      <button type="button" onClick={() => setShowOptions(!showOptions)} className="text-sm text-blue-300 focus:outline-none">
        {showOptions ? '▲ 詳細設定を閉じる' : '▼ 詳細設定を開く（任意）'}
      </button>

      {/* 詳細設定エリア */}
      {showOptions && (
        <div className="animate-fade-in-down transition-opacity duration-300 opacity-100">
          {/* ---プレイヤーカラー--- */}
          <SectionTitle>プレイヤーカラー（任意）</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(color === c ? '' : c)}
                aria-label={`色 ${c}`}
                aria-pressed={color === c}
              />
            ))}

            {/* カスタムカラー */}
            <label className="relative cursor-pointer">
              <input
                type="color"
                value={customColor}
                onClick={() => setColor(customColor)}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setColor(e.target.value);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="カスタムカラー"
              />
              <div
                className={`w-[2.65rem] h-8 rounded-full border-2 flex items-center justify-center transition-all
                  ${color === customColor ? 'border-white scale-110' : 'border-dashed border-gray-400'}`}
                style={{ backgroundColor: customColor }}
              >
                <span className="text-white text-xs font-bold">＋</span>
              </div>
            </label>
          </div>

          {/* ---アバター画像--- */}
          <div>
            <SectionTitle>プレイヤー画像（任意）</SectionTitle>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="プレイヤー画像"
              onChange={(e) => {
                setAvatarFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="px-3 py-1 bg-gray-200 text-black text-sm rounded hover:bg-gray-300 transition"
              onClick={() => fileRef.current?.click()}
            >
              画像を選ぶ
            </button>

            {preview && (
              <div className="mt-3">
                <img
                  src={preview}
                  alt="プロフィール画像プレビュー"
                  className="w-16 h-16 object-cover rounded border border-gray-300 mx-auto"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarUrl('');
                  }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  画像を削除
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={!nickname.trim() || busy}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition
        disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <Rocket className="w-4 h-4" />
        {submitLabel}
      </button>
    </form>
  );
};

export default PlayerSetupForm;
