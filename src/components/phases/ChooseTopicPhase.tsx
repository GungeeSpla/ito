import React, { useState, useEffect } from "react";
import { Topic } from "../../types/Topic";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, set, update } from "firebase/database";
import { db } from "../../firebase";

interface Props {
  topicOptions: Topic[];
  isHost: boolean;
  chooseTopic: (topic: Topic) => void;
  onRefreshTopics: () => void;
}

const ChooseTopicPhase: React.FC<Props> = ({
  topicOptions,
  isHost,
  chooseTopic,
  onRefreshTopics,
}) => {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [customTitle, setCustomTitle] = useState("");
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [tiebreakMethod, setTiebreakMethod] = useState<"random" | "host">("random");

  const nickname = localStorage.getItem("nickname") || "";
  const roomId = window.location.pathname.split("/").pop();

  useEffect(() => {
    if (!roomId) return;

    const votesRef = ref(db, `rooms/${roomId}/votes`);
    const playersRef = ref(db, `rooms/${roomId}/players`);
    const topicRef = ref(db, `rooms/${roomId}/selectedTopic`);
    const methodRef = ref(db, `rooms/${roomId}/tiebreakMethod`);

    onValue(votesRef, (snap) => {
      const data = snap.val();
      if (data) setVotes(data);
    });

    onValue(playersRef, (snap) => {
      const data = snap.val();
      if (data) setPlayers(data);
    });

    onValue(topicRef, (snap) => {
      const topic = snap.val();
      if (topic && !selectedTitle) {
        setSelectedTitle(topic.title);
        chooseTopic(topic);
      }
    });

    onValue(methodRef, (snap) => {
      const value = snap.val();
      if (value === "random" || value === "host") {
        setTiebreakMethod(value);
      }
    });
  }, [roomId, selectedTitle, chooseTopic]);

  const handleVote = async (title: string) => {
    if (!roomId || selectedTitle) return;
    await update(ref(db, `rooms/${roomId}/votes`), {
      [nickname]: title,
    });
  };

  const handleForceChoose = async (title: string) => {
    if (!isHost || !roomId) return;
    const topic = topicOptions.find((t) => t.title === title);
    if (topic) {
      (async () => {
        await set(ref(db, `rooms/${roomId}/selectedTopic`), topic);
        await update(ref(db, `rooms/${roomId}/usedTitles`), {
          [topic.title]: true,
        });
      })();
    }
  };

  const handleCustomSubmit = async () => {
    if (!isHost || selectedTitle || !customTitle || !roomId) return;
    const newTopic = {
      title: customTitle,
      min: customMin || "",
      max: customMax || "",
    };
    await set(ref(db, `rooms/${roomId}/selectedTopic`), newTopic);
  };

  const handleTiebreakChange = async (value: "random" | "host") => {
    setTiebreakMethod(value);
    if (isHost && roomId) {
      await set(ref(db, `rooms/${roomId}/tiebreakMethod`), value);
    }
  };

  useEffect(() => {
    if (!roomId || selectedTitle) return;
    const totalVotes = Object.values(votes);
    if (Object.keys(players).length > 0 && totalVotes.length === Object.keys(players).length) {
      const count: Record<string, number> = {};
      totalVotes.forEach((title) => {
        count[title] = (count[title] || 0) + 1;
      });
      const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
      const topVotes = sorted.filter(([_, v]) => v === sorted[0][1]);
      let chosenTitle = topVotes[0][0];

      if (topVotes.length > 1 && tiebreakMethod === "random") {
        const random = topVotes[Math.floor(Math.random() * topVotes.length)][0];
        chosenTitle = random;
      }

      if (topVotes.length === 1 || tiebreakMethod === "random") {
        const topic = topicOptions.find((t) => t.title === chosenTitle);
        if (topic) {
          (async () => {
            await set(ref(db, `rooms/${roomId}/selectedTopic`), topic);
            await update(ref(db, `rooms/${roomId}/usedTitles`), {
              [topic.title]: true,
            });
          })();
        }
      }
    }
  }, [votes, players, topicOptions, selectedTitle, tiebreakMethod, roomId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center text-white px-4">
      {/* お題再抽選ボタン：ホストだけ表示 */}
      {isHost && (
        <button
          onClick={onRefreshTopics}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          お題を再抽選
        </button>
      )}

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
              const voteCount = Object.values(votes).filter((v) => v === t.title).length;
              return (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className={`pb-8 relative bg-white text-black rounded-xl p-4 shadow-md text-center transition border border-gray-300`}
                >
                  <h3 className="text-lg font-semibold mb-2">{t.title}</h3>
                  <div className="my-4">
                    <div className="grid grid-cols-2 text-xs text-gray-800">
                      <div className="text-left">1 {t.min}</div>
                      <div className="text-right">{t.max} 100</div>
                    </div>
                    <div className="h-[2px] bg-gray-400 mt-1"></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">票: {voteCount}</p>
                  <button
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500"
                    onClick={() => handleVote(t.title)}
                  >
                    これに投票
                  </button>
                  {isHost && (
                    <button
                      className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500"
                      onClick={() => handleForceChoose(t.title)}
                    >
                      これに決定
                    </button>
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
            ? "みんなで話し合ったあと、投票してください。（ホストが強制的に選ぶこともできます）"
            : "みんなで話し合ったあと、投票してください。（ホストが強制的に選ぶこともできます）"}
        </motion.p>

        <div className="mt-4 text-white text-shadow-md text-center">
          <label className="mr-2">同票時の決定方法：</label>
          <select
            value={tiebreakMethod}
            onChange={(e) => handleTiebreakChange(e.target.value as "random" | "host")}
            className="border border-gray-300 rounded px-2 py-1 text-black bg-white"
          >
            <option value="random">ランダムに決定</option>
            <option value="host">ホストが決定</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ChooseTopicPhase;
