import React, { useEffect, useRef, useState } from "react";
import { ref, get, set, onValue, runTransaction } from "firebase/database";
import { db } from "@/firebase";
import { AnimatePresence, motion } from "framer-motion";
import Card from "@/components/common/card/Card";
import EditHintModal from "@/components/ui/EditHintModal";
import { CardEntry } from "@/types/CardEntry";
import { Eye, Home, RefreshCcw } from "lucide-react";
import WoodyButton from "@/components/ui/WoodyButton";
import FallingText from "@/components/common/effects/FallingText";
import styles from "./PlaceCardsPhase.module.scss";
import { placeSound, returnSound } from "@/utils/ui/sounds";
import cardStyles from "@/components/common/card/Card.module.scss";
import { PlayerInfo } from "@/types/PlayerInfo";
import CardArea from "@/components/common/card/CardArea";
import { logInfo } from "@/utils/core/logger";

// -----------------------------
// 型定義
// -----------------------------
interface Props {
  roomId: string;
  userId: string;
  nickname: string;
  cardOrder: CardEntry[];
  setCardOrder: (v: CardEntry[]) => void;
  players: Record<string, PlayerInfo>;
  topic: { title: string; min: string; max: string } | null;
}

const PlaceCardsPhase: React.FC<Props> = ({
  roomId,
  userId,
  nickname,
  cardOrder,
  setCardOrder,
  players,
  topic,
}) => {
  const [myCards, setMyCards] = useState<{ value: number; hint?: string }[]>(
    [],
  );
  const [activeCard, setActiveCard] = useState<{
    source: "hand" | "field";
    value: number;
  } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [editingValue, setEditingValue] = useState<number | null>(null);
  const prevCardCountRef = useRef(0);
  const [initialRender, setInitialRender] = useState(true);
  const prevOrderRef = useRef<CardEntry[]>([]);

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
    // カード情報
    const cardRef = ref(db, `rooms/${roomId}/cards/${userId}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const values = Array.isArray(data)
          ? data.map((d) => ({ value: d.value, hint: d.hint || "" }))
          : [{ value: data.value, hint: data.hint || "" }];
        setMyCards(values);
      }
    });

    // 場のカードの監視
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    const unsubscribe = onValue(orderRef, (snap) => {
      // 場のカードの配列
      const data = snap.val();
      const newOrder = Array.isArray(data) ? [...data] : [];
      const prevOrder = prevOrderRef.current;

      //
      const added = newOrder.filter(
        (n) =>
          !prevOrder.some((p) => p.userId === n.userId && p.card === n.card),
      );
      const removed = prevOrder.filter(
        (p) =>
          !newOrder.some((n) => n.userId === p.userId && n.card === p.card),
      );

      for (const a of added) {
        const name = players[a.userId]?.nickname || a.userId;
        logInfo(`${name} がカードを出しました。`);
      }

      for (const r of removed) {
        const name = players[r.userId]?.nickname || r.userId;
        logInfo(`${name} がカードを取り下げました。`);
      }

      // 前回の値よりもカードが増えているならカード配置サウンドを鳴らす
      if (newOrder.length > prevCardCountRef.current) {
        placeSound.play();
      }

      // 前回の値よりもカードが増えているならカード配置サウンドを鳴らす
      if (newOrder.length < prevCardCountRef.current) {
        returnSound.play();
      }

      // 前回の値として記憶
      prevCardCountRef.current = newOrder.length;
      prevOrderRef.current = newOrder;

      // cardOrderに代入
      setCardOrder(newOrder);
    });

    // ホスト
    const hostRef = ref(db, `rooms/${roomId}/host`);
    get(hostRef).then((snap) => {
      if (snap.exists() && snap.val() === userId) {
        setIsHost(true);
      }
    });

    // レベル
    const levelRef = ref(db, `rooms/${roomId}/level`);
    onValue(levelRef, (snap) => {
      if (snap.exists()) setLevel(snap.val());
    });

    return () => unsubscribe();
  }, [roomId, nickname]);

  // -----------------------------
  // カード以外をクリックしたら選択解除
  // -----------------------------
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.closest("." + cardStyles.handCard)) {
        return;
      }
      if (activeCard) {
        logInfo("カードの選択を解除しました。");
      }
      setActiveCard(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeCard]);

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

    setActiveCard(null);

    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);
    await runTransaction(orderRef, (currentOrder) => {
      const newOrder = Array.isArray(currentOrder) ? [...currentOrder] : [];
      const filtered = newOrder.filter(
        (c: CardEntry) =>
          !(
            players[c.userId]?.nickname === nickname &&
            c.card === activeCard.value
          ),
      );
      filtered.splice(insertIndex, 0, {
        userId,
        card: activeCard.value,
        hint: cardData.hint || "",
      });
      return filtered;
    });

    setMyCards((prev) => {
      const updated = prev.filter((c) => c.value !== activeCard.value);
      const cardRef = ref(db, `rooms/${roomId}/cards/${userId}`);
      set(
        cardRef,
        updated.map((v) => ({ value: v.value, hint: v.hint || "" })),
      );
      return updated;
    });
  };

  // -----------------------------
  // カードを場から引っ込める
  // -----------------------------
  const handleRemoveCard = async (cardToRemove: number) => {
    const orderRef = ref(db, `rooms/${roomId}/cardOrder`);

    let hintToRestore = "";
    const found = cardOrder.find(
      (c) =>
        players[c.userId]?.nickname === nickname && c.card === cardToRemove,
    );
    if (found?.hint) {
      hintToRestore = found.hint;
    }

    await runTransaction(orderRef, (currentOrder) =>
      currentOrder.filter(
        (c: CardEntry) =>
          !(
            players[c.userId]?.nickname === nickname && c.card === cardToRemove
          ),
      ),
    );

    setMyCards((prev) => {
      const updated = [...prev, { value: cardToRemove, hint: hintToRestore }];
      const cardRef = ref(db, `rooms/${roomId}/cards/${userId}`);
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
      <CardArea
        mode="place"
        cardOrder={cardOrder}
        players={players}
        myUserId={userId}
        nickname={nickname}
        activeCard={activeCard}
        onInsertCard={handleInsertCard}
        onRemoveCard={handleRemoveCard}
      />

      {isHost && allPlaced && (
        <div
          className="absolute responsive-text transition duration-200
            left-1/2 top-1/2 -translate-x-1/2 translate-y-[10em]"
        >
          <WoodyButton onClick={proceedToReveal}>
            <Eye className="w-4 h-4 translate-y-[0.1rem]" />
            めくりフェーズへ！
          </WoodyButton>
        </div>
      )}

      {/* 自分の手札 */}
      <div
        className={`${styles.handCardsArea} responsive-text w-full overflow-x-auto pointer-events-none px-4 pt-28 pb-2 fixed bottom-0 z-10`}
      >
        <div className="h-[14em] w-full absolute left-0 bottom-0 bg-gradient-to-t from-gray-900 to-transparent" />
        <div className="w-max mx-auto flex gap-2 responsive-text-hand-card">
          <AnimatePresence>
            {myCards.map((card) => (
              <motion.div
                key={`hand-motion-${card.value}`}
                className="pointer-events-auto"
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
                  mode="place"
                  location="hand"
                  isActive={activeCard?.value === card.value}
                  onClick={(e) => {
                    logInfo(`カードを選択しました: ${card.value}`);
                    e.stopPropagation();
                    setActiveCard({ source: "hand", value: card.value });
                  }}
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
