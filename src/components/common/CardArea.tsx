import React from "react";
import Card from "@/components/common/Card";
import { CardEntry } from "@/types/CardEntry";
import { PlayerInfo } from "@/types/PlayerInfo";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownCircle } from "lucide-react";

interface Props {
  mode: "place" | "reveal";
  cardOrder: CardEntry[];
  players: Record<string, PlayerInfo>;
  nickname: string;
  activeCard?: { source: "hand" | "field"; value: number } | null;
  revealedCards?: number[];
  onInsertCard?: (index: number) => void;
  onRemoveCard?: (value: number) => void;
  onRevealCard?: (value: number) => void;
  onFlipComplete?: (value: number) => void;
}

const CardArea: React.FC<Props> = ({
  mode,
  cardOrder,
  players,
  nickname,
  activeCard,
  revealedCards = [],
  onInsertCard,
  onRemoveCard,
  onRevealCard,
  onFlipComplete,
}) => {
  return (
    <div className="flex flex-wrap gap-2 items-start justify-center">
      {/* 出されたカード */}
      <AnimatePresence initial={false}>
        {cardOrder.map((entry, index) => {
          const player = players[entry.userId];
          const isMine = player?.nickname === nickname;
          const isRevealed = revealedCards.includes(entry.card);

          return (
            <motion.div
              key={`card-container-${entry.userId}-${entry.card}`}
              initial={{ opacity: 0, translateY: isMine ? "2em" : "-2em" }}
              animate={{ opacity: 1, translateY: "0em" }}
              exit={{ opacity: 0, translateY: isMine ? "2em" : "-2em" }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <Card
                value={mode === "reveal" && !isRevealed ? "?" : entry.card}
                name={player?.nickname}
                color={player?.color}
                avatarUrl={player?.avatarUrl}
                revealed={mode === "reveal" && isRevealed}
                isMine={isMine}
                hint={entry.hint}
                mode={mode}
                location="field"
                onClick={
                  mode === "place" && isMine && onRemoveCard
                    ? undefined
                    : mode === "reveal" && !isRevealed && onRevealCard
                      ? () => onRevealCard(entry.card)
                      : undefined
                }
                onReturnToHand={
                  mode === "place" && isMine && onRemoveCard
                    ? () => onRemoveCard(entry.card)
                    : undefined
                }
                onFlipComplete={onFlipComplete}
              />
              {mode === "place" &&
                activeCard?.source === "hand" &&
                onInsertCard && (
                  <button
                    className="
                      flex items-center justify-center gap-0.5
                      text-xs bg-blue-600 text-white px-1 py-3 rounded 
                      hover:bg-blue-500 transition writing-vertical"
                    onClick={() => onInsertCard(index + 1)}
                  >
                    <ArrowDownCircle className="w-3 h-3 translate-x-[0.05rem]" />
                    ここに出す
                  </button>
                )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default CardArea;
