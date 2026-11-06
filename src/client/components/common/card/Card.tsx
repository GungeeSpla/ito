import React, { useEffect } from "react";
import { Pencil, Eraser, ArrowDownLeft } from "lucide-react";
import NameSVG from "@/components/common/effects/NameSVG";
import HintSVG from "@/components/common/effects/HintSVG";
import NumberSVG from "@/components/common/effects/NumberSVG";
import styles from "./Card.module.scss";

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
  location?: "hand" | "field";
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onFlipComplete?: (value: number) => void;
  onEdit?: () => void;
  onClearHint?: () => void;
  hint?: string;
  className?: string;
  avatarUrl?: string;
  color?: string;
  onReturnToHand?: () => void;
}

const Card: React.FC<CardProps> = ({
  value,
  name,
  mode,
  location = "field",
  revealed = true,
  isActive = false,
  isMine = false,
  onClick,
  onFlipComplete,
  onEdit,
  onClearHint,
  hint,
  className,
  avatarUrl,
  color,
  onReturnToHand,
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
      className={`${styles.card} ${playerClass} ${className} ${isActive ? styles.active : ""}
        ${mode === "place" ? styles.placeCard : styles.revealCard}
        ${location === "hand" ? styles.handCard : ""}`}
      onClick={onClick}
    >
      {/*--- カードの表面と裏面を包括 ---*/}
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
        {/*--- カードの表面 ---*/}
        <div
          className={`${styles.cardFore}
            ${location === "hand" ? styles.handCard : ""}
            ${isActive ? styles.activeHandCard : ""}
            absolute w-full h-full rounded 
            flex flex-col justify-center items-center
            backface-hidden`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className={styles.dot} />
          {(mode === "reveal" || value === 0 || location === "hand") && (
            <NumberSVG className={styles.numberSvg} value={value} />
          )}
          {location === "hand" && hint && (
            <div
              className="absolute w-full text-center top-6 left-1/2 -translate-x-1/2 text-sm
            text-black bg-opacity-50 px-1 break-all"
            >
              {hint}
            </div>
          )}
          <p className={`${styles.name} text-shadow-sm`}>{name}</p>
        </div>

        {/*--- カードの裏面 ---*/}
        <div
          className={`${styles.cardBack} ito-card-back
            absolute w-full h-full rounded 
            text-black flex flex-col justify-center items-center
            backface-hidden rotate-y-180
          `}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor:
              color && color !== "transparent" ? color : "#EF4444",
          }}
          title={isMine && typeof value === "number" ? `${value}` : ""}
        >
          <div className={styles.dot} />
          {avatarUrl ? (
            <div
              className={styles.face}
              style={{ backgroundImage: `url(${avatarUrl})` }}
            />
          ) : (
            <HintSVG
              className={styles.hintSvg}
              text={hint || ""}
              // text="あああああああああああああああああああああああああああああああ！！！！！！！！！！！（ﾌﾞﾘﾌﾞﾘﾌﾞﾘﾌﾞﾘｭﾘｭﾘｭﾘｭﾘｭﾘｭ！！！！！！ﾌﾞﾂﾁﾁﾌﾞﾌﾞﾌﾞﾁﾁﾁﾁﾌﾞﾘﾘｲﾘﾌﾞﾌﾞﾌﾞﾌﾞｩｩｩｩｯｯｯ！！！！！！！ ）"
            />
          )}
          <NameSVG className={styles.nameSvg} text={name || ""} />
        </div>
      </div>

      {/*--- たとえワードのフキダシ ---*/}
      {location === "field" &&
        hint &&
        ((avatarUrl && mode === "place") ||
          (mode === "reveal" && revealed)) && (
          <div className={styles.speechBubble}>
            {hint}
            <div className={styles.tail} />
          </div>
        )}

      {/*--- 手札なら ---*/}
      {location === "hand" && (
        // たとえワードの編集ボタン表示
        <div>
          {/* 削除ボタン */}
          <div className="absolute top-1 left-1 flex gap-1">
            <button
              title="たとえワードを削除する"
              onClick={onClearHint}
              className="text-white hover:bg-red-300 hover:border-red-400 text-xs bg-gray-400 p-0.5"
            >
              <Eraser size={16} />
            </button>
          </div>
          {/* 入力・編集ボタン */}
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              title="たとえワードを入力する"
              onClick={onEdit}
              className="text-white hover:bg-blue-300 hover:border-blue-400 text-xs bg-gray-400 p-0.5"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      )}

      {/*--- 手札に戻すボタン ---*/}
      {location === "field" && mode === "place" && isMine && (
        <div className="absolute bottom-[-1.7rem] left-1 flex gap-1">
          <button
            title="手札に戻す"
            onClick={onReturnToHand}
            className="text-white hover:bg-yellow-500 hover:border-yellow-600 text-xs bg-zinc-700 p-0.5 rounded-md"
          >
            <ArrowDownLeft size={16} />
          </button>
        </div>
      )}

      {/*--- 下に数字を表示 ---*/}
      {location === "field" &&
        mode === "place" &&
        isMine &&
        typeof value === "number" && (
          <div
            className="absolute bottom-[-1.6rem] left-1/2 -translate-x-1/2 text-white text-sm font-bold
            text-center w-12"
            style={{
              background:
                "linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.5), rgba(0,0,0,0.1))",
              borderRadius: "4px",
            }}
          >
            {value}
          </div>
        )}
    </div>
  );
};

export default React.memo(Card);
