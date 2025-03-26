import React, { useEffect, useState } from "react";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "../../firebase";
import Card from "../common/Card";
import { AnimatePresence, motion } from "framer-motion"; // ← 追加

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
  // -----------------------------
  // ステート定義
  // -----------------------------
  const [myCards, setMyCards] = useState<number[]>([]);
  const [activeCard, setActiveCard] = useState<{ source: 'hand' | 'field'; value: number } | null>(null);
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [isHost, setIsHost] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [topic, setTopic] = useState<{ title: string; min: string; max: string } | null>(null);


  // -----------------------------
  // Firebaseデータ取得＆購読（初期化時）
  // -----------------------------
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
      if (Array.isArray(data)) {
        setCardOrder([...data]);
      } else {
        setCardOrder([]);
      }
    });

    const playersRef = ref(db, `rooms/${roomId}/players`);
    onValue(playersRef, (snap) => {
      const data = snap.val();
      if (typeof data === "object" && data !== null) {
        setPlayers(data);
      }
    });

    const hostRef = ref(db, `rooms/${roomId}/host`);
    get(hostRef).then((snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });

    const levelRef = ref(db, `rooms/${roomId}/level`);
    onValue(levelRef, (snap) => {
      if (snap.exists()) {
        setLevel(snap.val());
      }
    });

    const topicRef = ref(db, `rooms/${roomId}/topic`);
    onValue(topicRef, (snap) => {
      if (snap.exists()) {
        setTopic(snap.val());
      }
    });
  }, [roomId, nickname]);

  // -----------------------------
  // カードを場に出す処理
  // -----------------------------
  const handleInsertCard = async (insertIndex: number) => {
    if (!activeCard || activeCard.source !== "hand") return;

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      const newOrder = Array.isArray(currentOrder) ? [...currentOrder] : [];
      const filtered = newOrder.filter((c: CardEntry) => !(c.name === nickname && c.card === activeCard.value));
      filtered.splice(insertIndex, 0, { name: nickname, card: activeCard.value });
      return filtered;
    });

    setMyCards(prev => prev.filter(c => c !== activeCard.value));
    setActiveCard(null);

    setMyCards(prev => {
      const updated = prev.filter(c => c !== activeCard.value);

      const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
      set(cardRef, updated.map(value => ({ value })));

      return updated;
    });
  };

  // -----------------------------
  // カードを場から引っ込める処理
  // -----------------------------
  const handleRemoveCard = async (cardToRemove: number) => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      return currentOrder.filter((c: CardEntry) => !(c.name === nickname && c.card === cardToRemove));
    });

    setMyCards(prev => [...prev, cardToRemove]);
  };

  // -----------------------------
  // フェーズを「めくり」へ進める（ホストのみ）
  // -----------------------------
  const proceedToReveal = async () => {
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);
    await set(phaseRef, "revealCards");
    await set(updatedRef, Date.now());
  };

  // -----------------------------
  // 全プレイヤーが出し終えたかを判定
  // -----------------------------
  const allPlaced = cardOrder.length >= (Object.keys(players).length + (level - 1));

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-center">カードを伏せて置こう！</h2>

      {/* お題情報の表示 */}
      {topic && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold mb-1">{topic.title}</h3>
          <p className="text-sm text-gray-400">
            1：{topic.min}　〜　100：{topic.max}
          </p>
        </div>
      )}

      {/* 自分の手札 */}
      <div className="fixed bottom-0 w-full bg-gradient-to-t from-gray-900 to-transparent pt-8 pb-4 z-10">
        <div className="flex flex-wrap gap-2 justify-center scale-200 translate-y-10 transform" style={{ transformOrigin: "bottom" }}>
          {myCards.map((value) => (
            <Card
              key={value}
              value={value}
              isActive={activeCard?.value === value}
              onClick={() => setActiveCard({ source: 'hand', value })}
            />
          ))}
        </div>
      </div>

      {/* 場のカード表示 */}
      <div className="relative min-h-[60vh]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-wrap gap-2 items-start">
          <div className="flex flex-wrap gap-2 mt-2 items-start">
            <div className="flex gap-2 items-center">
              <Card value={0} name="基準" />
              {activeCard && activeCard.source === "hand" && (
                <motion.button
                  layout
                  className="text-xs bg-blue-600 text-white px-1 py-3 rounded hover:bg-blue-500 transition writing-vertical"
                  onClick={() => handleInsertCard(0)}
                >
                  ここに出す
                </motion.button>

              )}
            </div>

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
                      onClick={
                        isMine
                          ? () => handleRemoveCard(entry.card)
                          : undefined
                      }
                    />
                    {activeCard && activeCard.source === "hand" && (
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

          {/* 🆕 「めくりへ」ボタンを場の中央下に表示 */}
          {isHost && allPlaced && (
            <div className="absolute left-1/2 top-[calc(50%+80px)] -translate-x-1/2 mt-4">
              <button
                onClick={proceedToReveal}
                className="px-4 py-2 w-fit whitespace-nowrap bg-green-600 text-white rounded shadow-lg"
              >
                めくりフェーズへ！
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceCardsPhase;
