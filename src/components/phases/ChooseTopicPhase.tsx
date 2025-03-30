import React, { useState, useEffect } from "react";
import { Topic } from "../../types/Topic";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../firebase";

interface Props {
  topicOptions: Topic[];
  isHost: boolean;
  chooseTopic: (topic: Topic) => void;
}

const ChooseTopicPhase: React.FC<Props> = ({ topicOptions, isHost, chooseTopic }) => {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");

  const roomId = window.location.pathname.split("/").pop();

  const handleClick = async (title: string) => {
    if (!isHost || selectedTitle) return;
    setSelectedTitle(title);
    if (roomId) {
      await set(ref(db, `rooms/${roomId}/selectedTopic`), topicOptions.find(t => t.title === title));
    }
  };

  const handleCustomSubmit = async () => {
    if (!isHost || selectedTitle || !customTitle) return;
    setSelectedTitle(customTitle);
    if (roomId) {
      const newTopic = {
        title: customTitle,
        min: customMin || "",
        max: customMax || "",
      };
      await set(ref(db, `rooms/${roomId}/selectedTopic`), newTopic);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    const topicRef = ref(db, `rooms/${roomId}/selectedTopic`);
    return onValue(topicRef, (snap) => {
      const topic = snap.val();
      if (topic && !selectedTitle) {
        setSelectedTitle(topic.title);
        chooseTopic(topic);
      }
    });
  }, [roomId, selectedTitle, chooseTopic]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center text-blac px-4">
      <div className="max-w-3xl w-full">
        <motion.h2
          className="text-xl font-bold text-center mt-6 mb-6 text-shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedTitle ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          お題の選択
        </motion.h2>

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
                  className={`pb-8 relative bg-white text-black rounded-xl p-4 shadow-md text-center transition border border-gray-300
                    ${isHost ? "hover:bg-gray-100 hover:border-blue-400 hover:scale-[1.02] cursor-pointer" : "opacity-100 cursor-not-allowed"}`}
                  onClick={() => handleClick(t.title)}
                >
                  <h3 className="text-lg font-semibold mb-2">{t.title}</h3>
                  <div className="my-4">
                    <div className="grid grid-cols-2 text-xs text-gray-800">
                      <div className="text-left">1 {t.min}</div>
                      <div className="text-right">{t.max} 100</div>
                    </div>
                    <div className="h-[2px] bg-gray-400 mt-1"></div>
                  </div>
                  {isHost && (
                    <p className="absolute w-full left-0 text-center bottom-2 text-gray-500 text-xs">
                      クリックして選択
                    </p>
                  )}
                </motion.div>
              );
            })}

            {isHost && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={selectedTitle ? { opacity: 0, scale: 1.1 } : { opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="pb-8 relative bg-white text-black rounded-xl p-4 shadow-md text-center transition border border-gray-300"
              >
                <h3 className="text-lg font-semibold mb-2">自由入力</h3>
                <input
                  type="text"
                  placeholder="お題タイトル"
                  className="w-full mb-2 px-2 py-1 border border-gray-300 text-black bg-white rounded"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="1 の意味（省略可）"
                  className="w-full mb-2 px-2 py-1 border border-gray-300 text-black bg-white rounded"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="100 の意味（省略可）"
                  className="w-full mb-4 px-2 py-1 border border-gray-300 text-black bg-white rounded"
                  value={customMax}
                  onChange={(e) => setCustomMax(e.target.value)}
                />
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={handleCustomSubmit}
                >
                  これにする
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.p
          className="text-center text-white text-shadow-md mt-6"
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
