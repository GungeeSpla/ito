import React, { useRef, useState, useEffect } from "react";
import SectionTitle from "./SectionTitle";
import { Rocket } from "lucide-react";

interface Props {
  mode: "create" | "join";
  nickname: string;
  setNickname: (name: string) => void;
  color: string;
  setColor: (color: string) => void;
  avatarFile: File | null;
  setAvatarFile: (file: File | null) => void;
  onSubmit: () => void;
  loading?: boolean;
  showOptions: boolean;
  setShowOptions: (v: boolean) => void;
  presetColors?: string[];
  userAvatarUrl: string;
  setUserAvatarUrl: (url: string) => void;
}

const PlayerSetupForm: React.FC<Props> = ({
  mode,
  nickname,
  setNickname,
  color,
  setColor,
  avatarFile,
  setAvatarFile,
  onSubmit,
  loading = false,
  showOptions,
  setShowOptions,
  presetColors = [],
  userAvatarUrl,
  setUserAvatarUrl,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [customColor, setCustomColor] = useState("#1F1F1F");
  const actionLabel = mode === "create" ? "ルームを作成" : "ルームに参加";
  useEffect(() => {
    if (!presetColors.includes(color) && color !== "transparent") {
      setCustomColor(color);
    }
  }, [color, presetColors]);

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
          onChange={(e) => setNickname(e.target.value)}
          className="w-full p-2.5 rounded-md border border-gray-400 bg-white text-black text-center
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* 詳細設定切り替え */}
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="text-sm text-blue-300 focus:outline-none"
      >
        {showOptions ? "▲ 詳細設定を閉じる" : "▼ 詳細設定を開く（任意）"}
      </button>

      {/* 詳細設定エリア */}
      {showOptions && (
        <div className="animate-fade-in-down transition-opacity duration-300 opacity-100">
          {/* ---プレイヤーカラー--- */}
          <SectionTitle>プレイヤーカラー（任意）</SectionTitle>
          {presetColors.length > 0 && (
            <div>
              {/* カラーパレット */}
              <div className="flex flex-wrap gap-2">
                {/* プリセットカラー */}
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === c
                        ? "border-white scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    aria-label={`色 ${c}`}
                  />
                ))}

                {/* カスタムカラー */}
                <label className="relative cursor-pointer">
                  <input
                    type="color"
                    value={customColor}
                    onClick={() => {
                      setCustomColor(customColor);
                      setColor(customColor);
                    }}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setColor(e.target.value);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className={`w-[2.65rem] h-8 rounded-full border-2 flex items-center justify-center transition-all
                      ${color === customColor ? "border-white scale-110" : "border-dashed border-gray-400"}
                    `}
                    style={{ backgroundColor: customColor }}
                    aria-label="カスタムカラー"
                    title="カスタムカラーを選択"
                  >
                    <span className="text-white text-xs font-bold">＋</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ---アバター画像--- */}
          <div>
            <SectionTitle>プレイヤー画像（任意）</SectionTitle>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />

            <button
              type="button"
              className="px-3 py-1 bg-gray-200 text-black text-sm rounded hover:bg-gray-300 transition"
              onClick={() => document.getElementById("avatar-upload")?.click()}
            >
              画像を選ぶ
            </button>

            {(avatarFile || userAvatarUrl) && (
              <div className="mt-3">
                <img
                  src={
                    avatarFile
                      ? URL.createObjectURL(avatarFile)
                      : userAvatarUrl || ""
                  }
                  alt="プロフィール画像プレビュー"
                  className="w-16 h-16 object-cover rounded border border-gray-300 mx-auto"
                />

                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setUserAvatarUrl("");
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
        disabled={!nickname.trim() || loading}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition
        disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <Rocket className="w-4 h-4" />
        {actionLabel}
      </button>
    </form>
  );
};

export default PlayerSetupForm;
