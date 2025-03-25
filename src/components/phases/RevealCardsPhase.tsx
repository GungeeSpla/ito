import React, { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../firebase";

interface CardEntry {
  name: string;
  card: number;
}

interface Props {
  roomId: string;
  nickname: string;
}

const RevealCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    const unsub = onValue(orderRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setCardOrder(data);
      }
    });

    const hostRef = ref(db, `rooms/${roomId}/host`);
    onValue(hostRef, (snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });

    return () => unsub();
  }, [roomId, nickname]);

  const revealNext = () => {
    if (revealedCards.length < cardOrder.length) {
      setRevealedCards((prev) => [...prev, cardOrder[prev.length].card]);
    }
  };

  const resetGame = async () => {
    await set(ref(db, `rooms/${roomId}/phase`), "waiting");
    await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">カードをめくろう！</h2>

      <div className="flex flex-wrap gap-2">
        <div className="w-20 h-28 flex flex-col items-center justify-center border rounded-md bg-gray-200 text-center text-black">
          <p className="text-sm">基準</p>
          <strong className="text-xl">0</strong>
        </div>
        {cardOrder.map((entry, index) => (
          <div
            key={index}
            className="w-20 h-28 flex flex-col items-center justify-center border rounded-md bg-white text-black shadow-sm"
          >
            <p className="text-sm">{entry.name}</p>
            <strong className="text-xl">
              {index < revealedCards.length ? entry.card : "?"}
            </strong>
          </div>
        ))}
      </div>

      {isHost && (
        <div className="mt-4 space-x-2">
          <button
            onClick={revealNext}
            disabled={revealedCards.length >= cardOrder.length}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-40"
          >
            次をめくる
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            ゲームを終了する
          </button>
        </div>
      )}
    </div>
  );
};

export default RevealCardsPhase;