import React, { useState, useEffect, useRef } from "react";
import { Crown, PlayIcon, LogOut, UserPlus, Copy } from "lucide-react";
import { Topic } from "@/types/Topic";
import { getRoomMaxClearLevel } from "@/utils/levelProgress";
import WoodyButton from "@/components/common/WoodyButton";
import { toastWithAnimation } from "@/utils/toast";
import NoticeGame from "@/components/common/NoticeGame";
import { PlayerInfo } from "@/types/Player";
import { useUser } from "@/hooks/useUser";

// -----------------------------
// Props 型定義
// -----------------------------
interface WaitingPhaseProps {
  roomId: string;
  players: Record<string, PlayerInfo>;
  nickname: string;
  host: string;
  alreadyJoined: boolean;
  newNickname: string;
  setNewNickname: (name: string) => void;
  addPlayer: (nickname: string) => void;
  selectedSet: string;
  setSelectedSet: React.Dispatch<
    React.SetStateAction<"normal" | "rainbow" | "classic" | "salmon" | "custom">
  >;
  level: number;
  setLevel: (level: number) => void;
  startGame: () => void;
  removePlayer: (playerName: string) => void;
  leaveRoom: () => void;
  setCustomTopics: (topics: Topic[]) => void;
}

// -----------------------------
// メインコンポーネント
// -----------------------------
const WaitingPhase: React.FC<WaitingPhaseProps> = ({
  roomId,
  players,
  nickname,
  host,
  alreadyJoined,
  newNickname,
  setNewNickname,
  addPlayer,
  selectedSet,
  setSelectedSet,
  level,
  setLevel,
  startGame,
  removePlayer,
  leaveRoom,
  setCustomTopics,
}) => {
  const inputRef = useRef<HTMLInputElement>(null); // ニックネーム入力にフォーカスする用
  const [customPromptText, setCustomPromptText] = useState("");
  const [maxClearLevel, setMaxClearLevel] = useState(1);
  const { userId } = useUser();
  const { userInfo, updateUserInfo } = useUser();

  // 最大クリアレベルを取得
  useEffect(() => {
    getRoomMaxClearLevel(roomId).then((level) => {
      setMaxClearLevel(level);
    });
  }, [roomId]);

  // -----------------------------
  // カスタムお題をパース
  // -----------------------------
  const parseCustomPrompts = (text: string): Topic[] => {
    const seenTitles = new Set<string>();
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim());
        const [title = "", min = "", max = ""] = parts;
        return { title, min, max, set: "custom" as const };
      })
      .filter(({ title }) => {
        if (seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
      });
  };

  // カスタムお題の保存＆Room.tsx側に反映
  useEffect(() => {
    localStorage.setItem("customPromptText", customPromptText);
    setCustomTopics(parseCustomPrompts(customPromptText));
  }, [customPromptText]);

  // 初回：ローカルストレージから復元
  useEffect(() => {
    const savedCustomPrompts = localStorage.getItem("customPromptText");
    if (savedCustomPrompts) {
      setCustomPromptText(savedCustomPrompts);
    }
  }, []);

  // -----------------------------
  // 初期処理：前回のニックネーム復元＋フォーカス
  // -----------------------------
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (userInfo?.nickname) {
      setNewNickname(userInfo.nickname);
    }
  }, [userInfo]);

  // -----------------------------
  // 現在のページURLをクリップボードにコピー
  // -----------------------------
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toastWithAnimation("ルームURLをコピーしました！", {
      type: "success",
    });
  };

  const handleJoin = async () => {
    if (!userInfo) return;
    if (!newNickname.trim()) return;
    if (userInfo.nickname !== newNickname) {
      await updateUserInfo({ nickname: newNickname });
    }
    await addPlayer(newNickname);
  };

  const isHost = userId === host; // ホスト判定

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12">
        {/* 中断ボタン */}
        {isHost && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-x-2">
            <WoodyButton onClick={handleCopyUrl}>
              <Copy className="w-3 h-3" />
              ルームURLをコピー
            </WoodyButton>
            <WoodyButton onClick={leaveRoom}>
              <LogOut className="w-3 h-3" />
              ルームから退出する
            </WoodyButton>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="relative w-full text-center px-4">
        {/*-------- 見出し --------*/}
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          itoレインボーオンライン
        </h2>
        <p className="text-center text-white text-shadow-md my-6">
          {!alreadyJoined ? (
            <span>ニックネームを入力して、ルームに参加してください。</span>
          ) : (
            <span>
              {isHost ? (
                <span>
                  フレンドにルームURLに伝えましょう。
                  <br />
                  2人以上集まったらゲームを開始できます。
                </span>
              ) : (
                <span>ホストのゲーム開始を待っています。</span>
              )}
            </span>
          )}
        </p>

        {/*-------- 設定画面 --------*/}
        <div
          className="
          bg-white/70 backdrop-blur-sm text-black p-6 my-6 rounded-xl shadow-md
          w-full max-w-md animate-fade-in relative mx-auto"
        >
          {/* プレイヤー一覧 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="bg-white text-black text-xs px-2 py-1 rounded mx-auto">
                参加者一覧
              </p>
            </div>
            <ul className="space-y-1">
              {Object.entries(players).map(([id, player]) => (
                <li key={id} className="text-sm">
                  {player.nickname}
                  {id === host && (
                    <Crown
                      size={16}
                      className="inline text-yellow-700 ml-1 relative -top-0.5"
                    />
                  )}
                  <span className="text-black text-xs">
                    {id === userId && "（You）"}
                  </span>
                  {isHost && id !== host && (
                    <span className="text-xs">
                      （
                      <button
                        onClick={() => removePlayer(id)}
                        className="text-red-600 text-xs hover:underline cursor-pointer p-0 bg-transparent border-none"
                      >
                        追放
                      </button>
                      ）
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* 参加フォーム or メッセージ */}
          {!alreadyJoined && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleJoin();
              }}
              className="mb-4"
            >
              <input
                ref={inputRef}
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="ニックネームを入力"
                className="w-full p-2 border border-gray-700 bg-white text-black rounded
                mb-2 text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <button
                type="submit"
                disabled={!newNickname.trim()}
                className="flex items-center justify-center gap-1.5
                w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition
                disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                参加する
              </button>
            </form>
          )}

          {/* ホスト用設定UI */}
          {isHost && (
            <div className="space-y-4">
              {/* お題セット選択 */}
              <div>
                <label className="block mb-1">お題セット</label>
                <select
                  value={selectedSet}
                  onChange={(e) =>
                    setSelectedSet(
                      e.target.value as
                        | "normal"
                        | "rainbow"
                        | "classic"
                        | "salmon"
                        | "custom",
                    )
                  }
                  className="w-full p-2 bg-white text-black rounded
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="rainbow">レインボー</option>
                  <option value="normal">通常</option>
                  <option value="classic">クラシック</option>
                  <option value="salmon">サーモンラン</option>
                  <option value="custom">カスタム</option>
                </select>
              </div>

              {selectedSet === "custom" && isHost && (
                <div>
                  <label className="block mb-1">
                    カスタムお題セット（カンマ区切りで記述）
                  </label>
                  <textarea
                    value={customPromptText}
                    onChange={(e) => setCustomPromptText(e.target.value)}
                    rows={6}
                    placeholder={`例：\nコンビニの商品の人気, 人気ない, 人気ある\n100円ショップの商品の人気, 人気ない, 人気ある`}
                    className="w-full p-2 bg-white text-black rounded resize-y
                      focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}

              {/* レベル選択 */}
              <div>
                <label className="block mb-1">レベル</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full p-2 bg-white text-black rounded focus:outline-none focus:ring-2
                  focus:ring-blue-400"
                >
                  {Array.from(
                    // { length: 10 }, // デバッグ用
                    { length: maxClearLevel + 1 },
                    (_, i) => i + 1,
                  ).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      レベル {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {isHost && (
          <div className="flex justify-center gap-x-2 h-12 scale-125">
            <WoodyButton
              onClick={startGame}
              disabled={Object.keys(players).length <= 1}
              className="absolute"
            >
              <PlayIcon className="w-4 h-4" />
              ゲーム開始
            </WoodyButton>
          </div>
        )}

        {/*-------- 注意書き --------*/}
        <NoticeGame />
      </div>
    </div>
  );
};

export default WaitingPhase;
