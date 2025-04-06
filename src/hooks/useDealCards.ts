import { useEffect } from "react";
import { ref, set, child } from "firebase/database";
import { db } from "../firebase";
import { PlayerInfo } from "@/types/Player";

interface UseDealCardsProps {
  phase: string;
  isHost: boolean;
  players: Record<string, PlayerInfo>;
  roomId: string;
  level: number;
}

export const useDealCards = ({
  phase,
  isHost,
  players,
  roomId,
  level,
}: UseDealCardsProps) => {
  useEffect(() => {
    const deal = async () => {
      const playerNames = Object.keys(players);
      const totalCards = playerNames.length + (level - 1);

      const numberPool = Array.from({ length: 100 }, (_, i) => i + 1);
      const shuffledNumbers = numberPool
        .sort(() => 0.5 - Math.random())
        .slice(0, totalCards);

      if (shuffledNumbers.length < totalCards) {
        console.error("カードが足りません！");
        return;
      }

      // シャッフルして配布順決定
      const shuffledPlayers = [...playerNames].sort(() => 0.5 - Math.random());

      // 初期化
      const cards: Record<string, { value: number; revealed: boolean }[]> = {};
      playerNames.forEach((name) => {
        cards[name] = [];
      });

      // 各プレイヤーに1枚ずつ配布
      let cardIndex = 0;
      playerNames.forEach((name) => {
        cards[name].push({
          value: shuffledNumbers[cardIndex++],
          revealed: false,
        });
      });

      // 残りのカードをランダムに1枚ずつ配布
      const remaining = totalCards - playerNames.length;
      for (let i = 0; i < remaining; i++) {
        const receiver = shuffledPlayers[i % shuffledPlayers.length];
        cards[receiver].push({
          value: shuffledNumbers[cardIndex++],
          revealed: false,
        });
      }

      const roomRef = ref(db, `rooms/${roomId}`);
      await set(child(roomRef, "cards"), cards);
      await set(child(roomRef, "phase"), "placeCards");
      await set(child(roomRef, "lastUpdated"), Date.now());
    };

    if (phase === "dealCards" && isHost && Object.keys(players).length > 0) {
      deal();
    }
  }, [phase, isHost, players, roomId, level]);
};
