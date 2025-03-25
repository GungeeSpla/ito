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
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [insertIndex, setInsertIndex] = useState<number>(0);
  const [isHost, setIsHost] = useState(false);

  const hasPlaced = cardOrder.includes(nickname);

  useEffect(() => {
    setInsertIndex(cardOrder.length);
  }, [cardOrder]);

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
        setCardOrder([...data]); // 再レンダーのために新しい配列で渡す
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
  }, [roomId, nickname]);

  const handlePlaceCard = async () => {
    if (hasPlaced) return;

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      const newOrder = currentOrder ? [...currentOrder] : [];
      if (!newOrder.includes(nickname)) {
        newOrder.splice(insertIndex, 0, nickname);
      }
      return newOrder;
    });

    // 再取得して即反映（保険）
    const latestSnap = await get(ref(db, `rooms/${roomId}/cardOrder`));
    const latest = latestSnap.val();
    if (Array.isArray(latest)) {
      setCardOrder([...latest]);
    }
  };

  const handleUndoPlace = async () => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      if (!Array.isArray(currentOrder)) return [];
      return currentOrder.filter((name) => name !== nickname);
    });

    // 再取得して即反映（保険）
    const latestSnap = await get(ref(db, `rooms/${roomId}/cardOrder`));
    const latest = latestSnap.val();
    if (Array.isArray(latest)) {
      setCardOrder([...latest]);
    }
  };

  const proceedToReveal = async () => {
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);
    await set(phaseRef, "revealCards");
    await set(updatedRef, Date.now());
  };

  const allPlaced =
    Object.keys(players).length > 0 &&
    cardOrder.length === Object.keys(players).length;

  return (
    <div>
      <h2>カードを伏せて置こう！</h2>

      {myCard !== null && !hasPlaced && (
        <div className="card fixed bottom-10 left-1/2 -translate-x-1/2 my-card">
          <strong>{myCard}</strong>
        </div>
      )}

      {hasPlaced ? (
        <div>
          <p>カードを置きました！</p>
          <button onClick={handleUndoPlace}>カードを引っ込める</button>
        </div>
      ) : (
        <div>
          <label>どこに置く？（0の右から）:</label>
          <select
            value={insertIndex}
            onChange={(e) => setInsertIndex(Number(e.target.value))}
          >
            {Array.from({ length: cardOrder.length + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0
                  ? "← 一番左（0のすぐ右）"
                  : i === cardOrder.length
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

      <div className="cards-container absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2">
        <div className="card">
          <p>基準</p>
          <strong>0</strong>
        </div>

        {cardOrder.map((name, i) => (
          <div key={i} className="card">
            <p>{name}</p>
            <strong>?</strong>
          </div>
        ))}
      </div>

      {isHost && allPlaced && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={proceedToReveal}>
            全員出し終わったのでめくりフェーズへ！
          </button>
        </div>
      )}
    </div>
  );
};

export default PlaceCardsPhase;
