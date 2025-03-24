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

  useEffect(() => {
    // 自分のカード取得
    const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const value = typeof data === "number" ? data : data.value;
        setMyCard(value);
      }
    });

    // 伏せたカードの順番
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    onValue(orderRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setPlacedCards(data);
        setInsertIndex(data.length); // デフォルトで一番右
      }
    });

    // プレイヤー情報（オブジェクト形式）
    const playersRef = ref(db, `rooms/${roomId}/players`);
    onValue(playersRef, (snap) => {
      const data = snap.val();
      if (typeof data === "object" && data !== null) {
        setPlayers(data);
      }
    });
  }, [roomId, nickname]);

  // カードを置く処理（トランザクションで競合防止）
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

  // 全員置いたら次フェーズへ（revealCards）
  useEffect(() => {
    const playerCount = Object.keys(players).length;
    if (playerCount > 0 && placedCards.length === playerCount) {
      const phaseRef = ref(db, `rooms/${roomId}/phase`);
      const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);

      set(phaseRef, "revealCards")
        .then(() => set(updatedRef, Date.now()))
        .catch((error) => {
          console.error("フェーズ更新に失敗しました:", error);
        });
    }
  }, [placedCards, players, roomId]);

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
    </div>
  );
};

export default PlaceCardsPhase;
