import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { ref, get, set, onValue } from "firebase/database";
import "../Cards.scss";

interface Props {
  roomId: string;
  nickname: string;
}

interface CardData {
  value: number;
  revealed: boolean;
}

const RevealCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [cards, setCards] = useState<Record<string, CardData>>({});
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [result, setResult] = useState<"success" | "fail" | null>(null);

  // データ読み込み
  useEffect(() => {
    const cardsRef = ref(db, `rooms/${roomId}/cards`);
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    const hostRef = ref(db, `rooms/${roomId}/host`);

    const unsubCards = onValue(cardsRef, (snap) => {
      const data = snap.val();
      if (data) setCards(data);
    });

    const unsubOrder = onValue(orderRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) setCardOrder(data);
    });

    get(hostRef).then((snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });

    return () => {
      unsubCards();
      unsubOrder();
    };
  }, [roomId, nickname]);

  // 昇順判定
  useEffect(() => {
    if (cardOrder.length === 0) return;

    const allRevealed = cardOrder.every((name) => cards[name]?.revealed);
    if (!allRevealed) {
      setResult(null);
      return;
    }

    const values = cardOrder.map((name) => cards[name]?.value ?? 0);
    const isSorted = values.every((v, i, arr) => i === 0 || arr[i - 1] <= v);
    setResult(isSorted ? "success" : "fail");
  }, [cardOrder, cards]);

  const revealCard = async (name: string) => {
    const cardRef = ref(db, `rooms/${roomId}/cards/${name}`);
    const snap = await get(cardRef);
    if (snap.exists()) {
      const prev = snap.val();
      await set(cardRef, { ...prev, revealed: true });
    }
  };

  const nextGame = async () => {
    const roomRef = ref(db, `rooms/${roomId}`);
    await set(roomRef, {
      host: nickname,
      players: Object.keys(cards),
      phase: "waiting",
    });
    await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
  };

  return (
    <div>
      <h2>カードをめくろう！</h2>

      <div className="cards-container">
        {/* 基準カード（0） */}
        <div className="card">
          <p>基準</p>
          <strong>0</strong>
        </div>

        {/* プレイヤーのカード */}
        {cardOrder.map((name, i) => (
          <div key={i} className={`card ${!cards[name]?.revealed ? "hidden" : ""}`}>
            <p>{name}</p>
            {cards[name]?.revealed ? (
              <strong>{cards[name]?.value ?? "?"}</strong>
            ) : (
              <button onClick={() => revealCard(name)}>めくる</button>
            )}
          </div>
        ))}
      </div>

      {result && (
        <div style={{ marginTop: "20px" }}>
          {result === "success" ? (
            <h3 style={{ color: "green" }}>✨ 昇順成功！</h3>
          ) : (
            <h3 style={{ color: "red" }}>💥 昇順じゃなかった…！</h3>
          )}
          {isHost && (
            <button onClick={nextGame} style={{ marginTop: "10px" }}>
              次のゲームへ
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RevealCardsPhase;
