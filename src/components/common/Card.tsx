import React, { useEffect } from "react";

// -----------------------------
// Props型：カード1枚の情報
// -----------------------------
interface CardProps {
  value: number | "?";
  name?: string;
  revealed?: boolean;
  isActive?: boolean;
  isMine?: boolean;
  onClick?: () => void;
  onFlipComplete?: (value: number) => void;
}

// -----------------------------
// プレイヤー名から背景色クラスを決定するユーティリティ
// -----------------------------
const getPlayerColorClass = (name: string | undefined): string => {
  if (!name) return "bg-gray-400";
  const colors = [
    "bg-red-400",
    "bg-blue-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-purple-400",
    "bg-pink-400",
    "bg-teal-400",
    "bg-orange-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const Card: React.FC<CardProps> = ({
  value,
  name,
  revealed = true,
  isActive = false,
  isMine = false,
  onClick,
  onFlipComplete
}) => {
  useEffect(() => {
    if (revealed && typeof value === "number" && onFlipComplete) {
      const timer = setTimeout(() => {
        onFlipComplete(value);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [revealed, value, onFlipComplete]);

  const playerClass = name ? `player-${name}` : "";

  return (
    <div
      className={`
        ito-card w-28 h-36 relative [perspective:1000px] cursor-pointer 
        transition hover:scale-105 duration-200 
        ${playerClass}
      `}
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
          className={`
            absolute w-full h-full rounded border border-gray-300
            text-black flex flex-col justify-center items-center
            backface-hidden rotate-y-180 ${getPlayerColorClass(name)}
          `}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          title={isMine && typeof value === "number" ? `${value}` : ""}
        >
          {name && <p className="text-xs mb-1">{name}</p>}
          <p className="text-3xl">？</p>

          {/* 🟨 チップ（自分のカード＆裏向き時のみ） */}
          {isMine && !revealed && typeof value === "number" && (
            <div className="absolute bottom-full mb-1 text-xs bg-black text-white px-2 py-0.5 rounded shadow opacity-0 hover:opacity-100 transition-opacity">
              {value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Card;
