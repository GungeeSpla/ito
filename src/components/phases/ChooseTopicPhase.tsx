import React, { useRef, useState, useEffect } from "react";
import { Topic } from "../../types/Topic";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, set, update, push, remove, off } from "firebase/database";
import { db } from "../../firebase";
import ProposalModal from "../ProposalModal";

interface Props {
  isHost: boolean; // 現在のプレイヤーがホストかどうか
  chooseTopic: (topic: Topic) => void; // お題が確定した時に呼ばれるコールバック
  onRefreshTopics: () => void; // お題を再抽選する処理
}

const ChooseTopicPhase: React.FC<Props> = ({
  isHost,
  chooseTopic,
  onRefreshTopics,
}) => {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null); // 選択されたお題タイトル
  const [votes, setVotes] = useState<Record<string, string>>({}); // 各プレイヤーの投票情報
  const [players, setPlayers] = useState<Record<string, boolean>>({}); // プレイヤー一覧
  const [tiebreakMethod, setTiebreakMethod] = useState<"random" | "host">("random"); // 同票時の処理
  const [showProposalModal, setShowProposalModal] = useState(false); // お題提案モーダル表示
  const [customTopics, setCustomTopics] = useState<Topic[]>([]); // カスタムお題一覧
  const nickname = localStorage.getItem("nickname") || "";
  const roomId = window.location.pathname.split("/").pop(); // ルームIDをURLから取得
  const [hasChosen, setHasChosen] = useState(false); // お題が選ばれたかどうか
  const [topicOptions, setTopicOptions] = useState<Topic[]>([]); // お題候補一覧
  const [visibleTopics, setVisibleTopics] = useState<Topic[]>([]); // 表示対象のお題（フェード用）
  const exitCalled = useRef(false); // exitComplete が複数回呼ばれないようにするフラグ
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 

  // Firebaseからのデータ購読
  useEffect(() => {
    if (!roomId) return;

    // Firebase参照定義
    const votesRef = ref(db, `rooms/${roomId}/votes`);
    const playersRef = ref(db, `rooms/${roomId}/players`);
    const topicRef = ref(db, `rooms/${roomId}/selectedTopic`);
    const methodRef = ref(db, `rooms/${roomId}/tiebreakMethod`);
    const customRef = ref(db, `rooms/${roomId}/customTopics`);
    const optionsRef = ref(db, `rooms/${roomId}/topicOptions`);

    // データ購読ハンドラ
    const handleVotes = (snap: any) => {
      const data = snap.val();
      if (data) setVotes(data);
    };

    const handlePlayers = (snap: any) => {
      const data = snap.val();
      if (data) setPlayers(data);
    };

    const handleTopic = (snap: any) => {
      const topic = snap.val();
      if (topic && !selectedTitle && !hasChosen) {
        setHasChosen(true);
        setSelectedTitle(topic.title);
        exitTimeoutRef.current = setTimeout(() => {
          console.log("安全装置によってお題を選択しました:", topic)
          chooseTopic(topic);
          exitCalled.current = true;
        }, 800);
      }
    };

    const handleMethod = (snap: any) => {
      const value = snap.val();
      if (value === "random" || value === "host") {
        setTiebreakMethod(value);
      }
    };

    const handleCustom = (snap: any) => {
      const data = snap.val() || {};
      const values = Object.values(data) as Topic[];
      setCustomTopics(values);
    };

    const handleOptions = (snap: any) => {
      const data = snap.val() || [];
      setTopicOptions(data);
    };

    // データの購読開始
    onValue(votesRef, handleVotes);
    onValue(playersRef, handlePlayers);
    onValue(topicRef, handleTopic);
    onValue(methodRef, handleMethod);
    onValue(customRef, handleCustom);
    onValue(optionsRef, handleOptions);

    // クリーンアップ: 購読解除
    return () => {
      off(votesRef, "value", handleVotes);
      off(playersRef, "value", handlePlayers);
      off(topicRef, "value", handleTopic);
      off(methodRef, "value", handleMethod);
      off(customRef, "value", handleCustom);
      off(optionsRef, "value", handleOptions);
    };
  }, [roomId, selectedTitle, chooseTopic]);

  // お題が選ばれたら表示対象から除外（フェードアウト）
  useEffect(() => {
    if (hasChosen) {
      setVisibleTopics([]);
    } else {
      setVisibleTopics([...topicOptions, ...customTopics]);
    }
  }, [topicOptions, customTopics, hasChosen]);

  // お題再抽選
  const handleRefreshTopics = async () => {
    await remove(ref(db, `rooms/${roomId}/customTopics`));
    await onRefreshTopics();
  };

  // お題に投票
  const handleVote = async (title: string) => {
    if (!roomId || selectedTitle) return;
    await update(ref(db, `rooms/${roomId}/votes`), {
      [nickname]: title,
    });
  };

  // ホストが強制決定
  const handleForceChoose = async (title: string) => {
    if (!isHost || !roomId) return;
    const topic = [...topicOptions, ...customTopics].find((t) => t.title === title);
    if (topic) {
      await set(ref(db, `rooms/${roomId}/selectedTopic`), topic);
      await update(ref(db, `rooms/${roomId}/usedTitles`), {
        [topic.title]: true,
      });
    }
  };

  // 同票時の決定ルール変更（ホストのみ）
  const handleTiebreakChange = async (value: "random" | "host") => {
    setTiebreakMethod(value);
    if (isHost && roomId) {
      await set(ref(db, `rooms/${roomId}/tiebreakMethod`), value);
    }
  };

  // お題を提案（カスタム追加）
  const handleAddTopic = async (topic: { title: string; min?: string; max?: string }) => {
    if (!roomId) return;
    const topicListRef = ref(db, `rooms/${roomId}/customTopics`);
    const newTopic: Topic = {
      title: topic.title,
      min: topic.min ?? "",
      max: topic.max ?? "",
      set: "custom",
    };
    await push(topicListRef, newTopic);
    setShowProposalModal(false);
  };

  // 全員投票完了後に自動決定
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
        const topic = [...topicOptions, ...customTopics].find((t) => t.title === chosenTitle);
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
  }, [votes, players, topicOptions, customTopics, selectedTitle, tiebreakMethod, roomId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center text-white px-4">
      <ProposalModal
        open={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        onSubmit={handleAddTopic}
      />

      <div className="max-w-3xl w-full">
        <motion.h2
          className="text-xl font-bold text-center mt-6 mb-6 text-shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedTitle ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          お題の選択
        </motion.h2>

        <motion.p
          className="text-center text-white text-shadow-md my-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedTitle ? 0 : 1 }}
          transition={hasChosen ? { delay: 0 } : { delay: 0.2 }}
          
        >
          みんなで話し合ったあと、やりたいお題カードをクリックして投票してください。<br />
          （ホスト権限で決定することもできます）
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence
            onExitComplete={() => {
              if (exitCalled.current) return;
              exitCalled.current = true;
              if (selectedTitle) {
                const selected = [...topicOptions, ...customTopics].find(t => t.title === selectedTitle);
                if (selected) {
                  console.log("お題を選択しました:", selected)
                  chooseTopic(selected);
                  if (exitTimeoutRef.current) {
                    clearTimeout(exitTimeoutRef.current);
                  }
                }
              }
            }}
          >
            {visibleTopics.map((t, index) => {
              const voteCount = Object.values(votes).filter((v) => v === t.title).length;
              const isVoted = votes[nickname] === t.title;
              const isChosen = selectedTitle !== null && selectedTitle === t.title;
              return (
                <motion.div
                  key={t.title}
                  initial={false}
                  exit={
                    hasChosen
                      ? isChosen
                        ? { opacity: 0, scale: 1.2 }
                        : { opacity: 0, scale: 0.95 }
                      : {}
                  }
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  layout
                  onClick={() => handleVote(t.title)}
                  className={`ito-topic-card
                    ${isVoted ? "bg-blue-100 border-blue-500" : "bg-white border-gray-300"} 
                    ${!hasChosen ? "ito-fadein" : "ito-fadeout"}
                    pb-8 relative bg-white text-black rounded-xl p-4 text-center transition border border-gray-300`}
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <h3 className="text-lg font-semibold mb-2">{t.title}</h3>
                  <div className="my-4">
                    <div className="grid grid-cols-2 text-xs text-gray-800">
                      <div className="text-left">1 {t.min}</div>
                      <div className="text-right">{t.max} 100</div>
                    </div>
                    <div className="h-[2px] bg-gray-900 mt-1"></div>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">票: {voteCount} {isVoted && <span>（投票済み）</span>}</p>
                  {isHost && (
                    <button
                      className="ml-2 text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-500 hover:border-orange-300"
                      onClick={() => handleForceChoose(t.title)}
                    >
                      これに決定
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <motion.div
          className="text-center text-white text-shadow-md mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedTitle ? 0 : 1 }}
          transition={hasChosen ? { delay: 0 } : { delay: 0.8 }}
        >
          <div className="text-center">
            {isHost && (
              <button
                onClick={handleRefreshTopics}
                className="w-32 text-sm m-2 p-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 hover:border-emerald-800"
              >
                お題を再抽選
              </button>
            )}
            <button
              onClick={() => setShowProposalModal(true)}
              className="w-32 text-sm m-2 p-2 bg-orange-500 text-white rounded hover:bg-orange-600 hover:border-orange-800"
            >
              お題を提案
            </button>
          </div>

          {isHost && (
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
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ChooseTopicPhase;