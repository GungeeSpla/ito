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
// カード表示コンポーネント（表と裏の両面を作成）
// -----------------------------
// - `.card-inner` を回転させてめくる
// - `.card-front` と `.card-back` を重ねて配置
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
      className="w-20 h-28 [perspective:1000px] cursor-pointer hover:scale-105 hover:shadow-xl transition-transform duration-200"
      onClick={onClick}
    >
      <div
        className={`
          relative w-full h-full transition-transform duration-500
          ${revealed ? "rotate-y-0" : "rotate-y-180"}
        `}
        style={{
          transform: `rotateY(${revealed ? 0 : 180}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* 表面 */}
        <div
          className={`absolute w-full h-full rounded border 
            ${isActive ? "border-4 border-blue-500" : "border border-gray-300"}
            bg-white text-black flex flex-col justify-center items-center
            backface-hidden`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {name && <p className="text-sm">{name}</p>}
          <strong className="text-5xl">{value}</strong>
        </div>

        {/* 裏面 */}
        <div
          className="absolute w-full h-full rounded border border-gray-300
            bg-gray-400 flex justify-center items-center
            backface-hidden rotate-y-180"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="text-3xl">？</p>
        </div>
      </div>
    </div>
  );
};

export default Card;
