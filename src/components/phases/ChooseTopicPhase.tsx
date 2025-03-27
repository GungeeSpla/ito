import React, { useState, useEffect } from "react";
import { Topic } from "../../types/Topic";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../firebase";

// -----------------------------
// Props 型定義
// -----------------------------
interface Props {
  topicOptions: Topic[];               // 選択肢となるお題一覧（3件など）
  isHost: boolean;                     // 現在のユーザーがホストかどうか
  chooseTopic: (topic: Topic) => void; // お題選択時のコールバック
}

// -----------------------------
// お題選択フェーズ用コンポーネント
// - ホストだけがクリックで選択できる
// - ゲストは選択不可＆説明だけ表示
// - フェードアウト演出つき（全員で共有）
// -----------------------------
const ChooseTopicPhase: React.FC<Props> = ({
  topicOptions,
  isHost,
  chooseTopic,
}) => {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [fadeOutComplete, setFadeOutComplete] = useState(false);

  // 自分のルームIDを取得（Firebase用）
  const roomId = window.location.pathname.split("/").pop();

  // 🔥 ホストは選択時に Firebase にお題タイトルを保存
  const handleClick = async (title: string) => {
    if (!isHost || selectedTitle) return;
    setSelectedTitle(title);
    if (roomId) {
      await set(ref(db, `rooms/${roomId}/selectedTopicTitle`), title);
    }
  };

  // 🧠 ゲストは Firebase から選ばれたお題タイトルを購読して追従
  useEffect(() => {
    if (!roomId) return;
    const titleRef = ref(db, `rooms/${roomId}/selectedTopicTitle`);
    return onValue(titleRef, (snap) => {
      const title = snap.val();
      if (title && !selectedTitle) {
        setSelectedTitle(title);
      }
    });
  }, [roomId, selectedTitle]);

  // ⏳ フェードアウトの完了を待ってから chooseTopic を呼ぶ
  useEffect(() => {
    if (selectedTitle) {
      const timer = setTimeout(() => {
        setFadeOutComplete(true);
      }, 600); // フェードアウト後に進む
      return () => clearTimeout(timer);
    }
  }, [selectedTitle]);

  // ✅ フェードアウト後に選ばれたお題を確定して進行
  useEffect(() => {
    if (fadeOutComplete && selectedTitle) {
      const topic = topicOptions.find((t) => t.title === selectedTitle);
      if (topic) chooseTopic(topic);
    }
  }, [fadeOutComplete, selectedTitle, topicOptions, chooseTopic]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="max-w-3xl w-full">

        {/* タイトル */}
        <motion.h2
          className="text-xl font-bold text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedTitle ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          お題の選択
        </motion.h2>

        {/* お題一覧（ホストのみクリック可能） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {topicOptions.map((t) => {
              const isSelected = selectedTitle === t.title;

              return (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={
                    selectedTitle
                      ? isSelected
                        ? { opacity: 0, scale: 1.2 }
                        : { opacity: 0, scale: 0.95 }
                      : { opacity: 1, scale: 1 }
                  }
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className={`pb-8 relative bg-gray-800 rounded-xl p-4 shadow-md text-center transition border border-transparent
                    ${isHost ? "hover:bg-gray-700 hover:border-blue-400 hover:scale-[1.02] cursor-pointer" : "opacity-100 cursor-not-allowed"}
                  `}
                  onClick={() => handleClick(t.title)}
                >
                  {/* お題タイトル */}
                  <h3 className="text-lg font-semibold mb-2">{t.title}</h3>

                  {/* スケール範囲の視覚表示（1〜100の目安） */}
                  <div className="my-4">
                    <div className="grid grid-cols-2 text-xs text-gray-400">
                      <div className="text-left">1 {t.min}</div>
                      <div className="text-right">{t.max} 100</div>
                    </div>
                    <div className="h-[2px] bg-gray-600 mt-1"></div>
                  </div>

                  {/* ホスト向けヒントラベル */}
                  {isHost && (
                    <p className="absolute w-full left-0 text-center bottom-2 text-gray-400 text-xs">
                      クリックして選択
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 補足メッセージ（ホスト用・ゲスト用） */}
        <motion.p
          className="text-center text-gray-400 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedTitle ? 0 : 1 }}
          transition={{ delay: 0.2 }}
        >
          {isHost
            ? "みんなで話し合ったあと、あなたが選択してください。"
            : "みんなで話し合ったあと、ホストに選択してもらいます。"}
        </motion.p>
      </div>
    </div>
  );
};

export default ChooseTopicPhase;
