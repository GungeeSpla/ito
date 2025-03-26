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
  const [status, setStatus] = useState<"success" | "fail" | null>(null); // 成功/失敗の状態

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
  // クリア判定ロジック
  // -----------------------------
  useEffect(() => {
    const revealedSequence = cardOrder
      .map((entry) => entry.card)
      .filter((card) => revealedCards.includes(card));

    if (revealedSequence.length < 2) return;

    const isSorted = revealedSequence.every((val, i, arr) => i === 0 || arr[i - 1] <= val);

    if (!isSorted) {
      setStatus("fail");
    } else if (revealedSequence.length === cardOrder.length) {
      setStatus("success");
    }
  }, [revealedCards, cardOrder]);

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
      <h2 className="text-xl font-bold mb-4 text-center">カードをめくろう！</h2>

      {status === "success" && (
        <div className="mb-4 text-green-400 font-bold text-2xl text-center">✅ 成功！</div>
      )}
      {status === "fail" && (
        <div className="mb-4 text-red-400 font-bold text-2xl text-center">❌ 失敗！</div>
      )}

      <div className="relative min-h-[60vh]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-wrap gap-2 items-start">

          {/* 基準カード */}
          <Card value={0} name="基準" />

          {/* プレイヤーのカード（Reveal） */}
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
                    const revealedRef = ref(db, `rooms/${roomId}/revealedCards`);
                    set(revealedRef, [...revealedCards, entry.card]);
                  }
                }}
              />
            );
          })}

          {isHost && (
            <div className="absolute left-1/2 top-[calc(50%+80px)] -translate-x-1/2 mt-4">
              <button
                onClick={resetGame}
                className="px-4 py-2 w-fit whitespace-nowrap bg-green-600 text-white rounded shadow-lg"
              >
                ロビーに戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevealCardsPhase;
