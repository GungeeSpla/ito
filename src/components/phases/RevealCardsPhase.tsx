import React, { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../firebase";
import Card from "../common/Card";

// 効果音：カードをめくる音
const flipSound = new Howl({
  src: ["/sounds/card-flip.mp3"],
  volume: 1,
});

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
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState<"success" | "fail" | null>(null);

  // 前回のめくられたカード状態を記憶（効果音判定用）
  const prevRevealedRef = useRef<number[]>([]);

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
  // 効果音を再生（revealedCards の更新を検知）
  // -----------------------------
  useEffect(() => {
    const prev = prevRevealedRef.current;
    const newlyRevealed = revealedCards.filter((card) => !prev.includes(card));

    if (newlyRevealed.length > 0) {
      flipSound.play();
    }

    prevRevealedRef.current = revealedCards;
  }, [revealedCards]);

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
    <div className="relative min-h-screen bg-gray-900 text-white">
      {/* タイトルとステータス */}
      <div className="text-center pt-6">
        <h2 className="text-xl font-bold mb-2">カードをめくろう！</h2>
        {status === "success" && (
          <div className="mb-4 text-green-400 font-bold text-2xl">✅ 成功！</div>
        )}
        {status === "fail" && (
          <div className="mb-4 text-red-400 font-bold text-2xl">❌ 失敗！</div>
        )}
      </div>

      {/* カードを中央に固定 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-wrap gap-2 justify-center items-start">
          {/* 基準カード */}
          <Card value={0} name="基準" />

          {/* プレイヤーカード */}
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
        </div>

        {/* ロビーに戻るボタン */}
        {isHost && (
          <div className="mt-6 text-center">
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
  );
};

export default RevealCardsPhase;
