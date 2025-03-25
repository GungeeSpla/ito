import React, { useEffect, useState } from "react";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "../../firebase";

interface Props {
  roomId: string;
  nickname: string;
}

interface CardEntry {
  name: string;
  card: number;
}

const PlaceCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [myCards, setMyCards] = useState<number[]>([]);
  const [activeCard, setActiveCard] = useState<{ source: 'hand' | 'field'; value: number } | null>(null);
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [isHost, setIsHost] = useState(false);
  const [level, setLevel] = useState<number>(1);

  useEffect(() => {
    const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const values = Array.isArray(data) ? data.map((d) => d.value) : [data.value];
        setMyCards(values);
      }
    });

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    onValue(orderRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setCardOrder([...data]);
      } else {
        setCardOrder([]);
      }
    });

    const playersRef = ref(db, `rooms/${roomId}/players`);
    onValue(playersRef, (snap) => {
      const data = snap.val();
      if (typeof data === "object" && data !== null) {
        setPlayers(data);
      }
    });

    const hostRef = ref(db, `rooms/${roomId}/host`);
    get(hostRef).then((snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });

    const levelRef = ref(db, `rooms/${roomId}/level`);
    onValue(levelRef, (snap) => {
      if (snap.exists()) {
        setLevel(snap.val());
      }
    });
  }, [roomId, nickname]);

  const handlePlaceCard = async () => {
    if (!activeCard || activeCard.source !== 'hand') return;
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      const newOrder = currentOrder ? [...currentOrder] : [];
      if (!newOrder.some((c: CardEntry) => c.name === nickname && c.card === activeCard.value)) {
        newOrder.push({ name: nickname, card: activeCard.value });
      }
      return newOrder;
    });
    setMyCards(prev => prev.filter(c => c !== activeCard.value));
    setActiveCard(null);
  };

  const handleRemoveCard = async () => {
    if (!activeCard || activeCard.source !== 'field') return;
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      return currentOrder.filter((c: CardEntry) => !(c.name === nickname && c.card === activeCard.value));
    });
    setMyCards(prev => [...prev, activeCard.value]);
    setActiveCard(null);
  };

  const proceedToReveal = async () => {
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);
    await set(phaseRef, "revealCards");
    await set(updatedRef, Date.now());
  };
  
  console.log("cardOrder.length: " + cardOrder.length);
  console.log("Object.keys(players).length: " + Object.keys(players).length);
  console.log("(level - 1): " + (level - 1));
  const allPlaced = cardOrder.length >= (Object.keys(players).length + (level - 1));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">カードを伏せて置こう！</h2>

      <div>
        <h3 className="text-lg font-semibold">あなたの手札</h3>
        <div className="flex flex-wrap gap-2 my-2">
          {myCards.map((value, i) => (
            <div
              key={i}
              className={`cursor-pointer w-20 h-28 flex items-center justify-center border rounded-md text-xl font-bold bg-white text-black shadow-sm transition transform hover:scale-105 ${
                activeCard?.source === 'hand' && activeCard.value === value ? "ring-4 ring-blue-500 scale-110" : ""
              }`}
              onClick={() => setActiveCard({ source: 'hand', value })}
            >
              {value}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-x-2">
        <button
          onClick={handlePlaceCard}
          disabled={!activeCard || activeCard.source !== 'hand'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-40"
        >
          このカードを出す
        </button>
        <button
          onClick={handleRemoveCard}
          disabled={!activeCard || activeCard.source !== 'field'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-40"
        >
          このカードを引っ込める
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">場のカード</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="w-20 h-28 flex flex-col items-center justify-center border rounded-md bg-gray-200 text-center text-black">
            <p className="text-sm">基準</p>
            <strong className="text-xl">0</strong>
          </div>
          {cardOrder.map((entry, i) => (
            <div
              key={i}
              className={`w-20 h-28 flex flex-col items-center justify-center border rounded-md bg-gray-100 text-black cursor-pointer transition transform hover:scale-105 ${
                activeCard?.source === 'field' && activeCard.value === entry.card && entry.name === nickname ? "ring-4 ring-blue-500 scale-110" : ""
              }`}
              onClick={() => {
                if (entry.name === nickname) setActiveCard({ source: 'field', value: entry.card });
              }}
            >
              <p className="text-sm">{entry.name}</p>
              <strong className="text-xl">?</strong>
            </div>
          ))}
        </div>
      </div>

      {isHost && allPlaced && (
        <div className="mt-6">
          <button
            onClick={proceedToReveal}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            全員出し終わったのでめくりフェーズへ！
          </button>
        </div>
      )}
    </div>
  );
};

export default PlaceCardsPhase;
