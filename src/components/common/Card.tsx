import React from "react";

// -----------------------------
// Props型：カード1枚の情報
// -----------------------------
interface CardProps {
  value: number | "?";           // 表示される数字（または "?" で非公開）
  name?: string;                 // 所有者の名前（Revealフェーズなどで表示）
  revealed?: boolean;           // めくられているかどうか（背景色切り替え）
  isActive?: boolean;           // 選択中のカードかどうか（強調表示）
  onClick?: () => void;         // カードがクリックされたときのイベント
}

// -----------------------------
// カード表示コンポーネント
// -----------------------------
// - めくられていない場合は背景を灰色に
// - アクティブ状態なら青枠で強調
// - 名前が指定されていれば上部に表示
// - めくれるときに3D回転で演出を付ける
// -----------------------------
const Card: React.FC<CardProps> = ({
  value,
  name,
  revealed = true,
  isActive = false,
  onClick
}) => {
  return (
    <div
      className={`w-20 h-28 flex flex-col justify-center items-center border rounded text-black
        ${revealed ? "bg-white" : "bg-gray-200"}           // めくれているかで背景変更
        ${isActive ? "border-4 border-blue-500" : "border-gray-300"}  // 選択中の見た目
        cursor-pointer text-lg font-bold transition-transform duration-500`}
      onClick={onClick}
      // ▼ 3D回転アニメーションのためのインラインスタイル
      style={{
        transform: `rotateY(${revealed ? 0 : 180}deg)`,
        transformStyle: "preserve-3d"
      }}
    >
      {/* 所有者の名前（任意） */}
      {name && <p className="text-sm">{name}</p>}

      {/* 数字 or "?" */}
      <strong className="text-5xl">{value}</strong>
    </div>
  );
};

export default Card;
