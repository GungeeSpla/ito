import React, { useEffect, useState } from "react";
import { Howl } from "howler";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "../../firebase";
import Card from "../common/Card";
import { AnimatePresence, motion } from "framer-motion";

// 効果音：カードを出す音
const placeSound = new Howl({
  src: ["/sounds/card-place.mp3"],
  volume: 0.5,
});

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
  const [activeCard, setActiveCard] = useState<{ source: 'hand' | 'field'; value: number } | null>(null);
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [isHost, setIsHost] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [topic, setTopic] = useState<{ title: string; min: string; max: string } | null>(null);

  // -----------------------------
  // Firebase購読系（初期化時）
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
      setCardOrder(Array.isArray(data) ? [...data] : []);
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

    setMyCards((prev) => {
      const updated = prev.filter(c => c !== activeCard.value);
      const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
      set(cardRef, updated.map(v => ({ value: v })));
      return updated;
    });

    setActiveCard(null);
  };

  // -----------------------------
  // カードを場から引っ込める処理
  // -----------------------------
  const handleRemoveCard = async (cardToRemove: number) => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) =>
      currentOrder.filter((c: CardEntry) => !(c.name === nickname && c.card === cardToRemove))
    );

    setMyCards((prev) => {
      const updated = [...prev, cardToRemove];
      const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
      set(cardRef, updated.map(v => ({ value: v })));
      return updated;
    });
  };

  // -----------------------------
  // ホスト：めくりフェーズへ進行
  // -----------------------------
  const proceedToReveal = async () => {
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const updatedRef = ref(db, `rooms/${roomId}/lastUpdated`);
    await set(phaseRef, "revealCards");
    await set(updatedRef, Date.now());
  };

  const allPlaced = cardOrder.length >= Object.keys(players).length + (level - 1);

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen bg-gray-900 text-white"
    >
      {/* お題表示（上部に絶対配置） */}
      {topic && (
        <div className="absolute top-4 w-full text-center px-4">
          <h3 className="text-lg font-semibold mb-2">お題：{topic.title}</h3>
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-2 text-xs text-gray-400">
              <div className="text-left">1 {topic.min}</div>
              <div className="text-right">{topic.max} 100</div>
            </div>
            <div className="h-[2px] bg-gray-600 mt-1"></div>
          </div>
        </div>
      )}

      {/* 場のカード（中央に絶対配置） */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-wrap gap-2 items-start">
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

        {/* めくりへ進行ボタン（中央下に固定） */}
        {isHost && allPlaced && (
          <div className="absolute left-1/2 top-[calc(100%+40px)] -translate-x-1/2">
            <button
              onClick={proceedToReveal}
              className="px-4 py-2 w-fit whitespace-nowrap bg-green-600 text-white rounded shadow-lg"
            >
              めくりフェーズへ！
            </button>
          </div>
        )}
      </div>

      {/* 自分の手札（下固定） */}
      <div className="fixed bottom-0 w-full bg-gradient-to-t from-gray-900 to-transparent pt-8 pb-4 z-10">
        <div
          className="flex flex-wrap gap-2 justify-center scale-200 translate-y-10 transform"
          style={{ transformOrigin: "bottom" }}
        >
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

      {/* 中断ボタン（右下固定） */}
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
    </motion.div>
  );
};

export default PlaceCardsPhase;
