import { useEffect } from "react";
import { ref, set, child } from "firebase/database";
import { db } from "../firebase";

interface UseDealCardsProps {
  phase: string;
  isHost: boolean;
  players: Record<string, boolean>;
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

      const shuffledPlayers = [...playerNames].sort(() => 0.5 - Math.random());
      const bonusReceivers = shuffledPlayers.slice(0, level - 1);

      const cards: Record<string, { value: number; revealed: boolean }[]> = {};
      let cardIndex = 0;

      playerNames.forEach((name) => {
        const numCards = bonusReceivers.includes(name) ? 2 : 1;
        cards[name] = [];

        for (let i = 0; i < numCards; i++) {
          cards[name].push({
            value: shuffledNumbers[cardIndex++],
            revealed: false,
          });
        }
      });

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
