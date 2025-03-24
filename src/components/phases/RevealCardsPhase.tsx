import React, { useEffect, useState } from "react";
import { ref, onValue, set, get } from "firebase/database";
import { db } from "../../firebase";

interface Props {
  roomId: string;
  nickname: string;
}

interface CardInfo {
  nickname: string;
  value: number;
  revealed: boolean;
}

const RevealCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [allRevealed, setAllRevealed] = useState(false);
  const [isAscending, setIsAscending] = useState<boolean | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    get(roomRef).then((snap) => {
      const data = snap.val();
      if (data && data.host === nickname) {
        setIsHost(true);
      }
    });
  }, [roomId, nickname]);

  useEffect(() => {
    const cardsRef = ref(db, `rooms/${roomId}/cards`);
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);

    onValue(cardsRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      const formatted: Record<string, CardInfo> = {};
      Object.entries(data).forEach(([name, value]: [string, any]) => {
        if (typeof value === "number") {
          formatted[name] = { nickname: name, value, revealed: false };
        } else {
          formatted[name] = {
            nickname: name,
            value: value.value,
            revealed: value.revealed === true,
          };
        }
      });

      onValue(orderRef, (orderSnap) => {
        const orderList: string[] = orderSnap.val() || [];
        setOrder(orderList);
        const orderedCards = orderList.map((name) => formatted[name]).filter(Boolean);
        setCards(orderedCards);

        const allRevealedNow = orderedCards.every((card) => card.revealed);
        setAllRevealed(allRevealedNow);

        if (allRevealedNow) {
          const values = orderedCards.map((card) => card.value);
          const sorted = [...values].sort((a, b) => a - b);
          const success = JSON.stringify(values) === JSON.stringify(sorted);
          setIsAscending(success);
        } else {
          setIsAscending(null);
        }
      });
    });
  }, [roomId]);

  const revealCard = async (name: string) => {
    const cardRef = ref(db, `rooms/${roomId}/cards/${name}`);
    const snap = await get(cardRef);
    if (snap.exists()) {
      const prev = snap.val();
      const newData = typeof prev === "number" ? { value: prev, revealed: true } : { ...prev, revealed: true };
      await set(cardRef, newData);
    }
  };

  const resetGame = async () => {
    const roomRef = ref(db, `rooms/${roomId}`);
    await set(ref(db, `rooms/${roomId}/phase`), "waiting");
    await set(ref(db, `rooms/${roomId}/cards`), {});
    await set(ref(db, `rooms/${roomId}/placedCards`), []);
    await set(ref(db, `rooms/${roomId}/cardOrder`), []);
    await set(ref(db, `rooms/${roomId}/topic`), null);
    await set(ref(db, `rooms/${roomId}/topicOptions`), []);
  };

  return (
    <div>
      <h2>カードをめくってね！（0の右から順に）</h2>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ border: "2px dashed gray", padding: "12px" }}>
          <p>基準</p>
          <strong>0</strong>
        </div>
        {cards.map((card, i) => (
          <div key={i} style={{ border: "1px solid gray", padding: "12px" }}>
            <p>{card.nickname}</p>
            {card.revealed ? (
              <strong>{String(card.value)}</strong>
            ) : (
              <button onClick={() => revealCard(card.nickname)}>めくる</button>
            )}
          </div>
        ))}
      </div>

      {allRevealed && (
        <div style={{ marginTop: "20px" }}>
          {isAscending ? (
            <h3 style={{ color: "green" }}>✨ 昇順成功！おめでとう！</h3>
          ) : (
            <h3 style={{ color: "red" }}>💥 昇順じゃなかった…！ざんねん！</h3>
          )}

          {isHost && (
            <button onClick={resetGame} style={{ marginTop: "10px" }}>
              次のゲームへ進む
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RevealCardsPhase;