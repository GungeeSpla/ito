import React, { useEffect, useState } from "react";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "../../firebase";
import Card from "../common/Card";

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
  const [myCards, setMyCards] = useState<number[]>([]); // 自分の手札
  const [activeCard, setActiveCard] = useState<{ source: 'hand' | 'field'; value: number } | null>(null); // アクティブ状態のカード
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]); // 場に出されたカード
  const [players, setPlayers] = useState<Record<string, boolean>>({}); // プレイヤー一覧
  const [isHost, setIsHost] = useState(false); // ホスト判定
  const [level, setLevel] = useState<number>(1); // 現在のレベル

  // -----------------------------
  // Firebaseデータ取得＆購読（初期化時）
  // -----------------------------
  useEffect(() => {
    // 自分の手札を取得
    const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const values = Array.isArray(data) ? data.map((d) => d.value) : [data.value];
        setMyCards(values);
      }
    });

    // 出されたカードの順序を購読
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    onValue(orderRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setCardOrder([...data]);
      } else {
        setCardOrder([]);
      }
    });

    // 参加プレイヤー情報を購読
    const playersRef = ref(db, `rooms/${roomId}/players`);
    onValue(playersRef, (snap) => {
      const data = snap.val();
      if (typeof data === "object" && data !== null) {
        setPlayers(data);
      }
    });

    // ホストかどうか判定
    const hostRef = ref(db, `rooms/${roomId}/host`);
    get(hostRef).then((snap) => {
      if (snap.exists() && snap.val() === nickname) {
        setIsHost(true);
      }
    });

    // レベル情報を購読
    const levelRef = ref(db, `rooms/${roomId}/level`);
    onValue(levelRef, (snap) => {
      if (snap.exists()) {
        setLevel(snap.val());
      }
    });
  }, [roomId, nickname]);

  // -----------------------------
  // カードを場に出す処理
  // -----------------------------
  const handlePlaceCard = async () => {
    if (!activeCard || activeCard.source !== 'hand') return;

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      const newOrder = currentOrder ? [...currentOrder] : [];

      // 同じカードがすでに場にあるかチェック
      if (!newOrder.some((c: CardEntry) => c.name === nickname && c.card === activeCard.value)) {
        newOrder.push({ name: nickname, card: activeCard.value });
      }

      return newOrder;
    });

    // 手札からカードを削除
    setMyCards(prev => prev.filter(c => c !== activeCard.value));
    setActiveCard(null);
  };

  // -----------------------------
  // カードを場から引っ込める処理
  // -----------------------------
  const handleRemoveCard = async () => {
    if (!activeCard || activeCard.source !== 'field') return;

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      return currentOrder.filter((c: CardEntry) => !(c.name === nickname && c.card === activeCard.value));
    });

    // 手札にカードを戻す
    setMyCards(prev => [...prev, activeCard.value]);
    setActiveCard(null);
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
      <h2 className="text-xl font-bold mb-4">カードを伏せて置こう！</h2>

      {/* 自分の手札 */}
      <div>
        <h3 className="text-lg font-semibold">あなたの手札</h3>
        <div className="flex flex-wrap gap-2 my-2">
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

      {/* アクションボタン（出す / 引っ込める） */}
      <div className="mt-4 space-x-2">
        <button
          onClick={handlePlaceCard}
          disabled={!activeCard || activeCard.source !== 'hand'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-40"
        >
          このカードを出す
        </button>
        <button
          onClick={handleRemoveCard}
          disabled={!activeCard || activeCard.source !== 'field'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-40"
        >
          このカードを引っ込める
        </button>
      </div>

      {/* 場のカード表示 */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold">場のカード</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <Card value={0} name="基準" />
          {cardOrder.map((entry, i) => (
            <div
              key={i}
              className={`w-20 h-28 flex flex-col items-center justify-center border rounded-md bg-gray-100 text-black cursor-pointer transition transform hover:scale-105
              ${activeCard?.source === 'field' && activeCard.value === entry.card && entry.name === nickname
                  ? "ring-4 ring-blue-500 scale-110"
                  : ""}`}
              onClick={() => {
                if (entry.name === nickname) {
                  setActiveCard({ source: 'field', value: entry.card });
                }
              }}
            >
              <p className="text-sm">{entry.name}</p>
              <strong className="text-xl">?</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ホスト専用：全員出し終わったら進行ボタン表示 */}
      {isHost && allPlaced && (
        <div className="mt-6">
          <button
            onClick={proceedToReveal}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            全員出し終わったのでめくりフェーズへ！
          </button>
        </div>
      )}
    </div>
  );
};

export default PlaceCardsPhase;
