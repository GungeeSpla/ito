import React, { useEffect } from "react";
import { Pencil, Eraser } from "lucide-react";

// -----------------------------
// Props型：カード1枚の情報
// -----------------------------
interface CardProps {
  value: number | "?";
  name?: string;
  revealed?: boolean;
  isActive?: boolean;
  isMine?: boolean;
  mode?: "place" | "reveal";
  onClick?: () => void;
  onFlipComplete?: (value: number) => void;
  editable?: boolean;
  onEdit?: () => void;
  onClearHint?: () => void;
  hint?: string;
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
  mode,
  revealed = true,
  isActive = false,
  isMine = false,
  onClick,
  onFlipComplete,
  editable,
  onEdit,
  onClearHint,
  hint,
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
        ito-card w-36 h-48 relative [perspective:1000px] cursor-pointer 
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
          className={`
            ito-card-fore
            absolute w-full h-full rounded border 
            ${isActive ? "border-4 border-blue-500" : "border border-gray-300"}
            bg-white text-black flex flex-col justify-center items-center
            backface-hidden`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {hint && (
            <div className="absolute w-full text-center top-6 left-1/2 -translate-x-1/2 text-[10px]
            text-black bg-opacity-50 px-1">
              {hint}
            </div>
          )}
          {name && <p className="text-sm">{name}</p>}
          {(mode === "reveal" || value === 0) && (
            <strong className="text-7xl">{value}</strong>
          )}
        </div>

        {/* 裏面 */}
        <div
          className={`
            ito-card-back
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
          {hint && (
            <div className="absolute w-full text-center top-0 left-1/2 -translate-x-1/2 text-[0.8rem]
            text-white bg-black bg-opacity-20 px-1 py-0.5">
              {hint}
            </div>
          )}
          {name && (name !== "ガンジー" && name !== "おりまー" && name !== "けんしろ" && name !== "ぽんこつ") && <p className="text-xs mb-1">{name}</p>}
          {(name !== "ガンジー" && name !== "おりまー" && name !== "けんしろ" && name !== "ぽんこつ") && <p className="text-3xl"></p>}
        </div>
      </div>

      {editable && isMine && mode === "reveal" && (
        <div>
          <div className="absolute top-1 left-1 flex gap-1">
            <button title="たとえワードを削除する" onClick={onClearHint} className="text-white hover:bg-red-300 hover:border-red-400 text-xs bg-gray-400 p-0.5">
              <Eraser size={16} />
            </button>
          </div>
          <div className="absolute top-1 right-1 flex gap-1">
            <button title="たとえワードを入力する" onClick={onEdit} className="text-white hover:bg-blue-300 hover:border-blue-400 text-xs bg-gray-400 p-0.5">
              <Pencil size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Card;
