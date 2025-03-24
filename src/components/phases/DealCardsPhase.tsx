import React, { useEffect } from "react";
import { db } from "../../firebase";
import { ref, set, onValue } from "firebase/database";

interface Props {
  roomId: string;
  nickname: string;
}

const DealCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  useEffect(() => {
    const playersRef = ref(db, `rooms/${roomId}/players`);
    const cardsRef = ref(db, `rooms/${roomId}/cards`);
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);

    onValue(playersRef, (snap) => {
      const players = snap.val();
      if (!Array.isArray(players) || players.length === 0) return;

      const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
      }

      const cards: Record<string, { value: number; revealed: boolean }> = {};
      players.forEach((player, index) => {
        cards[player] = {
          value: numbers[index],
          revealed: false,
        };
      });

      set(cardsRef, cards);
      set(phaseRef, "placeCards");
      set(updatedRef, Date.now()); // 追加！
    });
  }, [roomId]);

  return (
    <div>
      <h2>カードを配っています...</h2>
    </div>
  );
};

export default DealCardsPhase;
