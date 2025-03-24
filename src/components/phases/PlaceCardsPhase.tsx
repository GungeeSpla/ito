import React, { useEffect, useState } from "react";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "../../firebase";
import "../Cards.scss";

interface Props {
  roomId: string;
  nickname: string;
}

const PlaceCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [myCard, setMyCard] = useState<number | null>(null);
  const [placedCards, setPlacedCards] = useState<string[]>([]);
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [hasPlaced, setHasPlaced] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number>(0);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const value = typeof data === "number" ? data : data.value;
        setMyCard(value);
      }
    });

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    onValue(orderRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setPlacedCards(data);
        setInsertIndex(data.length); // デフォルトは一番右
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
  }, [roomId, nickname]);

  const handlePlaceCard = async () => {
    if (placedCards.includes(nickname)) return;

    const cardRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(cardRef, (currentOrder) => {
      const newOrder = currentOrder ? [...currentOrder] : [];
      newOrder.splice(insertIndex, 0, nickname);
      return newOrder;
    });

    setHasPlaced(true);
  };

  const proceedToReveal = async () => {
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);
    await set(phaseRef, "revealCards");
    await set(updatedRef, Date.now());
  };

  const allPlaced = Object.keys(players).length > 0 &&
    placedCards.length === Object.keys(players).length;

  return (
    <div>
      <h2>カードを伏せて置こう！</h2>

      {myCard !== null ? (
        <div className="card">
          <p>あなたのカード番号：</p>
          <strong>{myCard}</strong>
        </div>
      ) : (
        <p>カード取得中...</p>
      )}

      {!hasPlaced && (
        <div>
          <label>どこに置く？（0の右から）:</label>
          <select
            value={insertIndex}
            onChange={(e) => setInsertIndex(Number(e.target.value))}
          >
            {Array.from({ length: placedCards.length + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0
                  ? "← 一番左（0のすぐ右）"
                  : i === placedCards.length
                    ? "→ 一番右"
                    : `${i} 番目に置く`}
              </option>
            ))}
          </select>
          <button onClick={handlePlaceCard} style={{ marginLeft: "10px" }}>
            ここに置く！
          </button>
        </div>
      )}

      {hasPlaced && <p>カードを置きました！他の人の操作を待ってね。</p>}

      <div className="cards-container" style={{ marginTop: "20px" }}>
        <div className="card">
          <p>基準</p>
          <strong>0</strong>
        </div>

        {placedCards.map((name, i) => (
          <div key={i} className="card hidden">
            <p>{name}</p>
            <strong>?</strong>
          </div>
        ))}
      </div>

      {isHost && allPlaced && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={proceedToReveal}>全員出し終わったのでめくりフェーズへ！</button>
        </div>
      )}
    </div>
  );
};

export default PlaceCardsPhase;
