import React, { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../firebase";
import Card from "../common/Card";

// -----------------------------
// 型定義
// -----------------------------
interface CardEntry {
  name: string;
  card: number;
}

interface Props {
  roomId: string;
  nickname: string;
}

const RevealCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  // -----------------------------
  // ステート管理
  // -----------------------------
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]); // 全カードの順序
  const [revealedCards, setRevealedCards] = useState<number[]>([]); // めくられたカード番号
  const [isHost, setIsHost] = useState(false); // ホストかどうか

  // -----------------------------
  // カード順序を取得・監視
  // -----------------------------
  useEffect(() => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    const unsub = onValue(orderRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setCardOrder(data);
      }
    });

    return () => unsub();
  }, [roomId]);

  // -----------------------------
  // ホスト判定を取得
  // -----------------------------
  useEffect(() => {
    const hostRef = ref(db, `rooms/${roomId}/host`);
    const unsub = onValue(hostRef, (snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });

    return () => unsub();
  }, [roomId, nickname]);

  // -----------------------------
  // めくられたカード一覧を監視
  // -----------------------------
  useEffect(() => {
    const revealedRef = ref(db, `rooms/${roomId}/revealedCards`);
    const unsub = onValue(revealedRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setRevealedCards(data);
      }
    });

    return () => unsub();
  }, [roomId]);

  // -----------------------------
  // ゲームをリセットする（ホストのみ）
  // -----------------------------
  const resetGame = async () => {
    await set(ref(db, `rooms/${roomId}/phase`), "waiting");
    await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
  };

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">カードをめくろう！</h2>

      <div className="flex flex-wrap gap-2">
        {/* 基準カード */}
        <Card value={0} name="基準" />

        {/* プレイヤーのカード */}
        {cardOrder.map((entry, index) => {
          const isRevealed = revealedCards.includes(entry.card);

          return (
            <Card
              key={index}
              value={isRevealed ? entry.card : "?"}
              name={entry.name}
              revealed={isRevealed}
              onClick={() => {
                if (!isRevealed) {
                  // めくられていなければDBに追加
                  const revealedRef = ref(db, `rooms/${roomId}/revealedCards`);
                  set(revealedRef, [...revealedCards, entry.card]);
                }
              }}
            />
          );
        })}
      </div>

      {/* ホストのみ操作可能なボタン群 */}
      {isHost && (
        <div className="mt-4 space-x-2">
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
