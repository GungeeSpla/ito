import React, { useEffect, useState } from "react";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "../../firebase";
import Card from "../common/Card";
import { AnimatePresence, motion } from "framer-motion";

// -----------------------------
// 型定義
// -----------------------------
interface Props {
  roomId: string;
  nickname: string;
}

interface CardEntry {
  name: string;
  card: number;
}

const PlaceCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [myCards, setMyCards] = useState<number[]>([]);
  const [activeCard, setActiveCard] = useState<{ source: "hand" | "field"; value: number } | null>(null);
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [isHost, setIsHost] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [topic, setTopic] = useState<{ title: string; min: string; max: string } | null>(null);

  useEffect(() => {
    const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const values = Array.isArray(data) ? data.map((d) => d.value) : [data.value];
        setMyCards(values);
      }
    });

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    onValue(orderRef, (snap) => {
      const data = snap.val();
      setCardOrder(Array.isArray(data) ? [...data] : []);
    });

    const playersRef = ref(db, `rooms/${roomId}/players`);
    onValue(playersRef, (snap) => {
      const data = snap.val();
      if (typeof data === "object" && data !== null) setPlayers(data);
    });

    const hostRef = ref(db, `rooms/${roomId}/host`);
    get(hostRef).then((snap) => {
      if (snap.exists() && snap.val() === nickname) setIsHost(true);
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

  const handleInsertCard = async (insertIndex: number) => {
    if (!activeCard || activeCard.source !== "hand") return;

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      const newOrder = Array.isArray(currentOrder) ? [...currentOrder] : [];
      const filtered = newOrder.filter((c: CardEntry) => !(c.name === nickname && c.card === activeCard.value));
      filtered.splice(insertIndex, 0, { name: nickname, card: activeCard.value });
      return filtered;
    });

    setMyCards((prev) => {
      const updated = prev.filter((c) => c !== activeCard.value);
      set(ref(db, `rooms/${roomId}/cards/${nickname}`), updated.map((value) => ({ value })));
      return updated;
    });

    setActiveCard(null);
  };

  const handleRemoveCard = async (cardToRemove: number) => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      return currentOrder.filter((c: CardEntry) => !(c.name === nickname && c.card === cardToRemove));
    });

    setMyCards((prev) => {
      const updated = [...prev, cardToRemove];
      set(ref(db, `rooms/${roomId}/cards/${nickname}`), updated.map((value) => ({ value })));
      return updated;
    });
  };

  const proceedToReveal = async () => {
    await set(ref(db, `rooms/${roomId}/phase`), "revealCards");
    await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
  };

  const allPlaced = cardOrder.length >= Object.keys(players).length + (level - 1);

  return (
    <div className="relative min-h-screen bg-gray-900 text-white">
      {/* タイトル + お題 */}
      <div className="text-center pt-6">
        <h2 className="text-xl font-bold mb-2">カードを伏せて置こう！</h2>
        {topic && (
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold mb-2">お題：{topic.title}</h3>
            <div className="my-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 text-xs text-gray-400">
                <div className="text-left">1 {topic.min}</div>
                <div className="text-right">{topic.max} 100</div>
              </div>
              <div className="h-[2px] bg-gray-600 mt-1"></div>
            </div>
          </div>
        )}
      </div>

      {/* カード配置中央 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-wrap gap-2 justify-center items-start">
          {/* 基準カード */}
          <div className="flex gap-2 items-center">
            <Card value={0} name="基準" />
            {activeCard?.source === "hand" && (
              <motion.button
                layout
                className="text-xs bg-blue-600 text-white px-1 py-3 rounded hover:bg-blue-500 transition writing-vertical"
                onClick={() => handleInsertCard(0)}
              >
                ここに出す
              </motion.button>
            )}
          </div>

          {/* プレイヤーカード */}
          <AnimatePresence initial={false}>
            {cardOrder.map((entry, index) => {
              const isMine = entry.name === nickname;
              return (
                <motion.div
                  key={`${entry.name}-${entry.card}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Card
                    value="?"
                    name={entry.name}
                    onClick={isMine ? () => handleRemoveCard(entry.card) : undefined}
                  />
                  {activeCard?.source === "hand" && (
                    <motion.button
                      layout
                      className="text-xs bg-blue-600 text-white px-1 py-3 rounded hover:bg-blue-500 transition writing-vertical"
                      onClick={() => handleInsertCard(index + 1)}
                    >
                      ここに出す
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* めくりフェーズへ */}
        {isHost && allPlaced && (
          <div className="mt-6 text-center">
            <button
              onClick={proceedToReveal}
              className="px-4 py-2 w-fit whitespace-nowrap bg-green-600 text-white rounded shadow-lg"
            >
              めくりフェーズへ！
            </button>
          </div>
        )}
      </div>

      {/* 手札（固定） */}
      <div className="fixed bottom-0 w-full bg-gradient-to-t from-gray-900 to-transparent pt-8 pb-4 z-10">
        <div className="flex flex-wrap gap-2 justify-center scale-200 translate-y-10" style={{ transformOrigin: "bottom" }}>
          {myCards.map((value) => (
            <Card
              key={value}
              value={value}
              isActive={activeCard?.value === value}
              onClick={() => setActiveCard({ source: "hand", value })}
            />
          ))}
        </div>
      </div>

      {/* 中断ボタン */}
      {isHost && (
        <div className="fixed bottom-4 right-4 z-20">
          <button
            onClick={async () => {
              await set(ref(db, `rooms/${roomId}/phase`), "waiting");
              await set(ref(db, `rooms/${roomId}/lastUpdated`), Date.now());
            }}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded shadow hover:bg-red-500 transition"
          >
            ゲームを中断する
          </button>
        </div>
      )}
    </div>
  );
};

export default PlaceCardsPhase;
