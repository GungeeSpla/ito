import React, { useEffect, useState } from "react";
import { ref, get, set, onValue } from "firebase/database";
import { db } from "../../firebase";

interface Props {
  roomId: string;
  nickname: string;
}

const PlaceCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [myCard, setMyCard] = useState<number | null>(null);
  const [placedCards, setPlacedCards] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [hasPlaced, setHasPlaced] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number>(0);

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
      if (Array.isArray(data)) setPlayers(data);
    });
  }, [roomId, nickname]);

  const handlePlaceCard = async () => {
    if (placedCards.includes(nickname)) return;

    const cardRef = ref(db, `rooms/${roomId}/cardOrder`);
    const newOrder = [...placedCards];
    newOrder.splice(insertIndex, 0, nickname);
    await set(cardRef, newOrder);
    setHasPlaced(true);
  };

  useEffect(() => {
    if (players.length > 0 && placedCards.length === players.length) {
      const phaseRef = ref(db, `rooms/${roomId}/phase`);
      set(phaseRef, "revealCards");
    }
  }, [placedCards, players, roomId]);

  return (
    <div>
      <h2>カードを伏せて置こう！</h2>
      {myCard !== null ? (
        <p>あなたのカード番号：<strong>{myCard}</strong></p>
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
                {i === 0 ? "←一番左（0のすぐ右）" : i === placedCards.length ? "→一番右" : `${i}番目に置く`}
              </option>
            ))}
          </select>
          <button onClick={handlePlaceCard} style={{ marginLeft: "10px" }}>
            ここに置く！
          </button>
        </div>
      )}

      {hasPlaced && <p>カードを置きました！他の人の操作を待ってね。</p>}
    </div>
  );
};

export default PlaceCardsPhase;
