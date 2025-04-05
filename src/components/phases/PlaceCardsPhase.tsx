import React, { useEffect, useRef, useState } from "react";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "@/firebase";
import { AnimatePresence, motion } from "framer-motion";
import Card from "@/components/common/Card";
import EditHintModal from "@/components/common/EditHintModal";
import { CardEntry } from "@/types/CardEntry";
import { ArrowDownCircle, Eye, Home, RefreshCcw } from "lucide-react";
import WoodyButton from "@/components/common/WoodyButton";
import FallingText from "@/components/common/FallingText";
import styles from "./PlaceCardsPhase.module.scss";
import { placeSound } from "@/utils/sounds";

// -----------------------------
// 型定義
// -----------------------------
interface Props {
  roomId: string;
  nickname: string;
  cardOrder: CardEntry[];
  setCardOrder: (v: CardEntry[]) => void;
}

const PlaceCardsPhase: React.FC<Props> = ({
  roomId,
  nickname,
  cardOrder,
  setCardOrder,
}) => {
  const [myCards, setMyCards] = useState<{ value: number; hint?: string }[]>(
    [],
  );
  const [activeCard, setActiveCard] = useState<{
    source: "hand" | "field";
    value: number;
  } | null>(null);
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [isHost, setIsHost] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [topic, setTopic] = useState<{
    title: string;
    min: string;
    max: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<number | null>(null);
  const prevCardCountRef = useRef(0);
  const [initialRender, setInitialRender] = useState(true);

  // 初回マウント時にだけ true にする
  useEffect(() => {
    const timeout = setTimeout(() => {
      setInitialRender(false);
    }, 2500);
    return () => clearTimeout(timeout);
  }, []);

  // -----------------------------
  // Firebase購読系（初期化時）
  // -----------------------------
  useEffect(() => {
    const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const values = Array.isArray(data)
          ? data.map((d) => ({ value: d.value, hint: d.hint || "" }))
          : [{ value: data.value, hint: data.hint || "" }];
        setMyCards(values);
      }
    });

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    onValue(orderRef, (snap) => {
      const data = snap.val();
      const newOrder = Array.isArray(data) ? [...data] : [];
      if (newOrder.length > prevCardCountRef.current) {
        placeSound.play();
      }
      prevCardCountRef.current = newOrder.length;
      setCardOrder(newOrder);
    });

    const playersRef = ref(db, `rooms/${roomId}/players`);
    onValue(playersRef, (snap) => {
      const data = snap.val();
      if (data && typeof data === "object") setPlayers(data);
    });

    const hostRef = ref(db, `rooms/${roomId}/host`);
    get(hostRef).then((snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });

    const levelRef = ref(db, `rooms/${roomId}/level`);
    onValue(levelRef, (snap) => {
      if (snap.exists()) setLevel(snap.val());
    });

    const topicRef = ref(db, `rooms/${roomId}/topic`);
    onValue(topicRef, (snap) => {
      if (snap.exists()) setTopic(snap.val());
    });
  }, [roomId, nickname]);

  // -----------------------------
  // 手札を配り直す
  // -----------------------------
  const handleRedistribute = async () => {
    // 全カード削除
    await set(ref(db, `rooms/${roomId}/cardOrder`), []);
    await set(ref(db, `rooms/${roomId}/cards`), {});

    // フェーズを強制的に "dealCards" に戻す
    await set(ref(db, `rooms/${roomId}/phase`), "dealCards");
    await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
  };

  // -----------------------------
  // たとえワードを編集する
  // -----------------------------
  const handleHintSubmit = (value: number, newHint: string) => {
    setMyCards((prev) =>
      prev.map((card) =>
        card.value === value ? { ...card, hint: newHint } : card,
      ),
    );
    setEditingValue(null);
  };

  // -----------------------------
  // カードを場に出す
  // -----------------------------
  const handleInsertCard = async (insertIndex: number) => {
    if (!activeCard || activeCard.source !== "hand") return;

    const cardData = myCards.find((c) => c.value === activeCard.value);
    if (!cardData) return;

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      const newOrder = Array.isArray(currentOrder) ? [...currentOrder] : [];
      const filtered = newOrder.filter(
        (c: CardEntry) => !(c.name === nickname && c.card === activeCard.value),
      );
      filtered.splice(insertIndex, 0, {
        name: nickname,
        card: activeCard.value,
        hint: cardData.hint || "",
      });
      return filtered;
    });

    setMyCards((prev) => {
      const updated = prev.filter((c) => c.value !== activeCard.value);
      const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
      set(
        cardRef,
        updated.map((v) => ({ value: v.value, hint: v.hint || "" })),
      );
      return updated;
    });

    setActiveCard(null);
  };

  // -----------------------------
  // カードを場から引っ込める
  // -----------------------------
  const handleRemoveCard = async (cardToRemove: number) => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);

    let hintToRestore = "";
    const found = cardOrder.find(
      (c) => c.name === nickname && c.card === cardToRemove,
    );
    if (found?.hint) {
      hintToRestore = found.hint;
    }

    await runTransaction(orderRef, (currentOrder) =>
      currentOrder.filter(
        (c: CardEntry) => !(c.name === nickname && c.card === cardToRemove),
      ),
    );

    setMyCards((prev) => {
      const updated = [...prev, { value: cardToRemove, hint: hintToRestore }];
      const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
      set(
        cardRef,
        updated.map((v) => ({ value: v.value, hint: v.hint || "" })),
      );
      return updated;
    });
  };

  const proceedToReveal = async () => {
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);
    await set(phaseRef, "revealCards");
    await set(updatedRef, Date.now());
  };

  const allPlaced =
    cardOrder.length >= Object.keys(players).length + (level - 1);

  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12">
        {/* 中断ボタン */}
        {isHost && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-x-2">
            <WoodyButton onClick={handleRedistribute}>
              <RefreshCcw className="w-4 h-4 translate-y-[0.1rem]" />
              手札を配り直す
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
            <FallingText text={`お題：${topic.title}`} duration={0.8} />
          </h2>
          <div className={`${styles.scaleDescription} max-w-md mx-auto`}>
            <div
              className={`${styles.scaleText} grid grid-cols-2 font-bold text-white`}
            >
              <div className="text-left text-shadow-sm">1 {topic.min}</div>
              <div className="text-right text-shadow-sm">{topic.max} 100</div>
            </div>
            <div
              className={`${styles.scaleBar} box-shadow-md h-[2px] bg-white mt-1`}
            ></div>
          </div>
        </div>
      )}

      {/* 場のカード */}
      <div
        className={`${styles.playedCardsArea}
          absolute inset-x-0 top-1/2 -translate-y-1/2 flex gap-2 justify-center px-4`}
        style={{ top: "calc(50% - 4em)" }}
      >
        <div className="flex items-center gap-2">
          <Card value={0} name="" />
          {activeCard?.source === "hand" &&
            !cardOrder.some((c) => c.card === activeCard.value) && (
              <button
                className="
                  flex items-center justify-center gap-0.5
                  text-xs bg-blue-600 text-white px-1 py-3 rounded 
                  hover:bg-blue-500 transition writing-vertical"
                onClick={() => handleInsertCard(0)}
              >
                <ArrowDownCircle className="w-3 h-3 translate-x-[0.05rem]" />
                ここに出す
              </button>
            )}
        </div>

        <AnimatePresence initial={false}>
          {cardOrder.map((entry, index) => {
            const isMine = entry.name === nickname;
            return (
              <motion.div
                key={`${entry.name}-${entry.card}`}
                initial={{
                  opacity: 0,
                  translateY: isMine ? "2rem" : "-2rem",
                }}
                animate={{
                  opacity: 1,
                  translateY: "0rem",
                }}
                exit={{
                  opacity: 0,
                  translateY: isMine ? "2rem" : "-2rem",
                }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <Card
                  value={entry.card}
                  name={entry.name}
                  revealed={false}
                  isMine={entry.name === nickname}
                  mode="place"
                  onClick={
                    isMine ? () => handleRemoveCard(entry.card) : undefined
                  }
                  hint={entry.hint}
                />
                {activeCard?.source === "hand" && (
                  <button
                    className="
                      flex items-center justify-center gap-0.5  
                      text-xs bg-blue-600 text-white px-1 py-3 rounded
                      hover:bg-blue-500 transition writing-vertical"
                    onClick={() => handleInsertCard(index + 1)}
                  >
                    <ArrowDownCircle className="w-3 h-3 translate-x-[0.05rem]" />
                    ここに出す
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isHost && allPlaced && (
          <div className="absolute left-1/2 top-[calc(100%+40px)] -translate-x-1/2">
            <WoodyButton onClick={proceedToReveal}>
              <Eye className="w-4 h-4 translate-y-[0.1rem]" />
              めくりフェーズへ！
            </WoodyButton>
          </div>
        )}
      </div>

      {/* 自分の手札 */}
      <div
        className={`${styles.handCardsArea}
        fixed bottom-0 w-full bg-gradient-to-t from-gray-900 to-transparent pt-8 pb-4 z-10`}
      >
        <div
          className="flex flex-wrap gap-2 justify-center scale-150 translate-y-20 transform"
          style={{ transformOrigin: "bottom" }}
        >
          <AnimatePresence>
            {myCards.map((card) => (
              <motion.div
                key={`hand-motion-${card.value}`}
                layout
                initial={{
                  translateY: "-2rem",
                  opacity: 0,
                }}
                animate={{
                  translateY: "0rem",
                  opacity: 1,
                }}
                exit={{
                  translateY: "-2rem",
                  opacity: 0,
                }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  key={`hand-${card.value}`}
                  value={card.value}
                  mode="reveal"
                  isActive={activeCard?.value === card.value}
                  onClick={() =>
                    setActiveCard({ source: "hand", value: card.value })
                  }
                  editable={true}
                  onEdit={() => setEditingValue(card.value)}
                  onClearHint={() => handleHintSubmit(card.value, "")}
                  hint={card.hint}
                  isMine={true}
                  className={initialRender ? styles.handCard : ""}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* たとえワード編集用のモーダルウィンドウ */}
      {editingValue !== null && (
        <EditHintModal
          open={true}
          initialValue={
            myCards.find((c) => c.value === editingValue)?.hint || ""
          }
          onSubmit={(newHint) => handleHintSubmit(editingValue, newHint)}
          onClose={() => setEditingValue(null)}
        />
      )}
    </div>
  );
};

export default PlaceCardsPhase;
