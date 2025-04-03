import React, { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/firebase";
import Card from "@/components/common/Card";
import EmojiBurst from "@/components/common/EmojiBurst";
import FailBurst from "@/components/common/FailBurst";
import { CardEntry } from "@/types/CardEntry";
import { Home } from "lucide-react";
import WoodyButton from "@/components/common/WoodyButton";

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

interface Props {
  roomId: string;
  nickname: string;
  cardOrder: CardEntry[];
}

const RevealCardsPhase: React.FC<Props> = ({ roomId, nickname, cardOrder }) => {
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
        (val, i, arr) => i === 0 || arr[i - 1] <= val,
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
      prev.includes(cardValue) ? prev : [...prev, cardValue],
    );
  };

  const resetGame = async () => {
    await set(ref(db, `rooms/${roomId}/phase`), "waiting");
    await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
  };

  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12"></div>

      {/* タイトルとステータス */}
      <div className="relative w-full text-center max-w-xl mx-auto">
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          カードをめくろう！
        </h2>
        <p className="text-center text-white text-shadow-md my-6">
          カードを好きな順番でクリックしてめくりましょう。
          <br />
          （誰でも可能）
        </p>
      </div>

      {/* カード配置 */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex gap-2 justify-center px-4"
        style={{ top: "calc(50% - 4em)" }}
      >
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
                    const revealedRef = ref(
                      db,
                      `rooms/${roomId}/revealedCards`,
                    );
                    set(revealedRef, [...revealedCards, entry.card]);
                  }
                }}
                hint={entry.hint}
                onFlipComplete={handleFlipComplete}
              />
            );
          })}
        </div>

        <div className="absolute left-1/2 top-[calc(100%+40px)] -translate-x-1/2">
          {status === "success" && (
            <div className="mb-4 text-green-400 font-bold text-2xl">
              ✅ 成功！
            </div>
          )}
          {status === "fail" && (
            <div className="mb-4 text-red-400 font-bold text-2xl">
              ❌ 失敗！
            </div>
          )}
        </div>

        {/* ロビーに戻るボタン */}
        {isHost && isComplete && (
          <div className="absolute left-1/2 top-[calc(100%+7rem)] -translate-x-1/2">
            <WoodyButton onClick={resetGame}>
              <Home className="w-4 h-4 translate-y-[0.05rem]" />
              ロビーに戻る
            </WoodyButton>
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
