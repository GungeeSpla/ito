// src/hooks/useDealCards.ts
import { useEffect } from "react";
import { ref, set, child } from "firebase/database";
import { db } from "../firebase";

interface UseDealCardsProps {
  phase: string;
  isHost: boolean;
  players: Record<string, boolean>;
  roomId: string;
}

export const useDealCards = ({ phase, isHost, players, roomId }: UseDealCardsProps) => {
  useEffect(() => {
    if (phase === "dealCards" && isHost && Object.keys(players).length > 0) {
      const playerNames = Object.keys(players);

      // 数字をシャッフルしてプレイヤー数ぶん切り出す
      const availableNumbers = Array.from({ length: 100 }, (_, i) => i + 1)
        .sort(() => 0.5 - Math.random())
        .slice(0, playerNames.length);

      const cards: Record<string, { value: number; revealed: boolean }> = {};
      playerNames.forEach((name, idx) => {
        cards[name] = { value: availableNumbers[idx], revealed: false };
      });

      const roomRef = ref(db, `rooms/${roomId}`);
      set(child(roomRef, "cards"), cards);
      set(child(roomRef, "phase"), "placeCards");
      set(child(roomRef, "lastUpdated"), Date.now());
    }
  }, [phase, isHost, players, roomId]);
};
