import React, { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/firebase";
import EmojiBurst from "@/components/common/effects/EmojiBurst";
import FailBurst from "@/components/common/effects/FailBurst";
import { CardEntry } from "@/types/CardEntry";
import { Undo2, Home } from "lucide-react";
import WoodyButton from "@/components/ui/WoodyButton";
import ClickOrTouch from "@/components/common/others/ClickOrTouch";
import { updateRoomMaxClearLevel } from "@/utils/gameLogic/levelProgress";
import { flipSound, successSound, failSound } from "@/utils/ui/sounds";
import { PlayerInfo } from "@/types/PlayerInfo";
import CardArea from "@/components/common/card/CardArea";
import styles from "./PlaceCardsPhase.module.scss";

interface Props {
  roomId: string;
  userId: string;
  nickname: string;
  cardOrder: CardEntry[];
  level: number;
  players: Record<string, PlayerInfo>;
  topic: { title: string; min: string; max: string } | null;
}

const RevealCardsPhase: React.FC<Props> = ({
  roomId,
  userId,
  nickname,
  cardOrder,
  level,
  players,
  topic,
}) => {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState<"success" | "fail" | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const prevRevealedRef = useRef<number[]>([]);

  // ゲームクリア時の処理
  const onGameClear = async () => {
    await updateRoomMaxClearLevel(roomId, level); // ←ここで更新！
  };

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
      if (snap.exists() && snap.val() === userId) {
        setIsHost(true);
      }
    });
    return () => unsub();
  }, [roomId, userId, nickname]);

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
        onGameClear();
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
      <div key="ito-header" className="relative h-12">
        {/* 中断ボタン */}
        {isHost && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-x-2">
            <WoodyButton
              onClick={async () => {
                await set(ref(db, `rooms/${roomId}/phase`), "placeCards");
                await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
              }}
            >
              <Undo2 className="w-4 h-4 translate-y-[0.1rem]" />
              プレイフェーズに戻る
            </WoodyButton>
            <WoodyButton
              onClick={async () => {
                await set(ref(db, `rooms/${roomId}/phase`), "waiting");
                await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
              }}
            >
              <Home className="w-4 h-4 translate-y-[0.1rem]" />
              ロビーに戻る
            </WoodyButton>
          </div>
        )}
      </div>

      {/* お題表示 */}
      {topic && (
        <div className="relative w-full text-center max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
            お題：{topic.title}
          </h2>
          <div
            className={`${styles.scaleDescription} ${styles.noAnim} max-w-md mx-auto`}
          >
            <div
              className={`${styles.scaleText} ${styles.noAnim} grid grid-cols-2 font-bold text-white`}
            >
              <div className="text-left text-shadow-sm">1 {topic.min}</div>
              <div className="text-right text-shadow-sm">{topic.max} 100</div>
            </div>
            <div
              className={`${styles.scaleBar} ${styles.noAnim} box-shadow-md h-[2px] bg-white mt-1`}
            ></div>
          </div>
        </div>
      )}

      {/* プレイヤーカード */}
      <CardArea
        mode="reveal"
        cardOrder={cardOrder}
        players={players}
        nickname={nickname}
        myUserId={userId}
        revealedCards={revealedCards}
        onRevealCard={(card) => {
          const revealedRef = ref(db, `rooms/${roomId}/revealedCards`);
          set(revealedRef, [...revealedCards, card]);
        }}
        onFlipComplete={handleFlipComplete}
      />

      <div className="absolute left-1/2 top-[calc(50%+40px)] -translate-x-1/2"></div>

      {/* ロビーに戻るボタン */}
      <div
        className="absolute responsive-text transition duration-200
      left-1/2 top-1/2 -translate-x-1/2 translate-y-[8em]"
      >
        {status === "success" && (
          <div className="mb-4 text-green-400 text-center font-bold text-2xl">
            成功！
          </div>
        )}
        {status === "fail" && (
          <div className="mb-4 text-red-400 text-center font-bold text-2xl">
            ❌ 失敗！
          </div>
        )}
        {status !== "success" && status !== "fail" && (
          <div className="mb-4 text-white text-center text-shadow-sm font-bold text-2xl">
            カードをめくろう！
          </div>
        )}
        {isHost && isComplete && (
          <WoodyButton onClick={resetGame}>
            <Home className="w-4 h-4 translate-y-[0.05rem]" />
            ロビーに戻る
          </WoodyButton>
        )}
      </div>

      {/* ✅ 成功演出 */}
      {status === "success" && <EmojiBurst />}
      {status === "success" && <div className="bg-gradient-success"></div>}

      {/* ❌ 失敗演出 */}
      {status === "fail" && <FailBurst />}
      {status === "fail" && <div className="bg-gradient-fail"></div>}
    </div>
  );
};

export default RevealCardsPhase;
