import React, { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../firebase";
import Card from "../common/Card";
import EmojiBurst from "../common/EmojiBurst";
import FailBurst from "../common/FailBurst";

// 効果音：カードをめくる音
const flipSound = new Howl({
  src: ["/sounds/card-flip.mp3"],
  volume: 1,
});

// 効果音：成功した
const successSound = new Howl({
  src: ["/sounds/success.mp3"],
  volume: 1,
});

// 効果音：成功した
const failSound = new Howl({
  src: ["/sounds/fail.mp3"],
  volume: 1,
});

interface CardEntry {
  name: string;
  card: number;
}

interface Props {
  roomId: string;
  nickname: string;
}

const RevealCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState<"success" | "fail" | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const prevRevealedRef = useRef<number[]>([]);

  // ✅ 成功時の効果音（1回だけ）
  useEffect(() => {
    if (status === "success") {
      successSound.play();
    }
  }, [status]);

  // 失敗時の効果音
  useEffect(() => {
    if (status === "fail") {
      failSound.play();
    }
  }, [status]);

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

  useEffect(() => {
    const hostRef = ref(db, `rooms/${roomId}/host`);
    const unsub = onValue(hostRef, (snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });
    return () => unsub();
  }, [roomId, nickname]);

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

  // 🎵 カードが新しくめくられたときに音を鳴らす
  useEffect(() => {
    const prev = prevRevealedRef.current;
    const newlyRevealed = revealedCards.filter((card) => !prev.includes(card));

    if (newlyRevealed.length > 0) {
      flipSound.play();
    }

    prevRevealedRef.current = revealedCards;
  }, [revealedCards]);

  // ✅ アニメーション完了後に判定を実行
  useEffect(() => {
    const revealedSequence = cardOrder
      .map((entry) => entry.card)
      .filter((card) => revealedCards.includes(card));

    if (
      revealedSequence.length >= 2 &&
      flippedCards.length === revealedSequence.length
    ) {
      const isSorted = revealedSequence.every(
        (val, i, arr) => i === 0 || arr[i - 1] <= val
      );

      if (!isSorted) {
        setStatus("fail");
        setIsComplete(true);
      } else if (revealedSequence.length === cardOrder.length) {
        setStatus("success");
        setIsComplete(true);
      }
    }
  }, [flippedCards, revealedCards, cardOrder]);

  // 🔁 カードからアニメーション完了通知を受け取る
  const handleFlipComplete = (cardValue: number) => {
    setFlippedCards((prev) =>
      prev.includes(cardValue) ? prev : [...prev, cardValue]
    );
  };

  const resetGame = async () => {
    await set(ref(db, `rooms/${roomId}/phase`), "waiting");
    await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
  };

  return (
    <div className="relative min-h-screen text-white">
      {/* タイトルとステータス */}
      <div className="text-center pt-6">
        <h2 className="text-3xl font-bold text-shadow-md mt-6 mb-4">カードをめくろう！</h2>
        {status === "success" && (
          <div className="mb-4 text-green-400 font-bold text-2xl">✅ 成功！</div>
        )}
        {status === "fail" && (
          <div className="mb-4 text-red-400 font-bold text-2xl">❌ 失敗！</div>
        )}
      </div>

      {/* カード配置 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-wrap gap-2 justify-center items-start">
          {/* 基準カード */}
          <Card value={0} name="" />

          {/* プレイヤーカード */}
          {cardOrder.map((entry, index) => {
            const isRevealed = revealedCards.includes(entry.card);

            return (
              <Card
                key={index}
                value={isRevealed ? entry.card : "?"}
                name={entry.name}
                mode="reveal"
                revealed={isRevealed}
                onClick={() => {
                  if (!isRevealed) {
                    const revealedRef = ref(db, `rooms/${roomId}/revealedCards`);
                    set(revealedRef, [...revealedCards, entry.card]);
                  }
                }}
                onFlipComplete={handleFlipComplete}
              />
            );
          })}
        </div>

        {/* ロビーに戻るボタン */}
        {isHost && isComplete && (
          <div className="absolute left-1/2 top-[calc(100%+40px)] -translate-x-1/2">
            <button
              onClick={resetGame}
              className="px-4 py-2 w-fit whitespace-nowrap bg-green-600 text-white rounded shadow-lg"
            >
              ロビーに戻る
            </button>
          </div>
        )}
      </div>

      {/* ✅ 成功演出 */}
      {status === "success" && <EmojiBurst />}

      {/* ❌ 失敗演出 */}
      {status === "fail" && <FailBurst />}
    </div>
  );
};

export default RevealCardsPhase;
