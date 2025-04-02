import React, { useState, useEffect, useRef } from "react";
import { Crown } from "lucide-react";
import cn from "classnames";

// -----------------------------
// Props 型定義
// -----------------------------
interface WaitingPhaseProps {
  roomId: string;
  players: Record<string, boolean>;
  nickname: string;
  host: string;
  alreadyJoined: boolean;
  newNickname: string;
  setNewNickname: (name: string) => void;
  addPlayer: () => void;
  selectedSet: string;
  setSelectedSet: React.Dispatch<
    React.SetStateAction<"normal" | "rainbow" | "classic" | "salmon" | "custom">
  >;
  level: number;
  setLevel: (level: number) => void;
  startGame: () => void;
  removePlayer: (playerName: string) => void;
  leaveRoom: () => void;
}

// -----------------------------
// メインコンポーネント
// -----------------------------
const WaitingPhase: React.FC<WaitingPhaseProps> = ({
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
}) => {
  const [copied, setCopied] = useState(false); // URLコピー完了の表示用
  const inputRef = useRef<HTMLInputElement>(null); // ニックネーム入力にフォーカスする用

  // -----------------------------
  // 初回マウント時にローカルのニックネームを自動復元
  // -----------------------------
  useEffect(() => {
    const savedName = localStorage.getItem("nickname");
    if (savedName) setNewNickname(savedName);
    inputRef.current?.focus();
  }, []);

  // -----------------------------
  // 現在のページURLをクリップボードにコピー
  // -----------------------------
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後にフェードアウト
    });
  };

  const isHost = nickname === host; // ホスト判定

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div className="min-h-[80vh] flex items-center justify-center  text-white px-4">
      <div className="bg-white/70 backdrop-blur-sm text-black p-6 rounded-xl shadow-md w-full max-w-md animate-fade-in relative">
        {/* URLコピーUI */}
        <div className="mb-4 text-center relative">
          <button
            onClick={handleCopyUrl}
            className="focus:outline-none px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
          >
            ルームURLをコピー
          </button>

          {/* コピー完了の吹き出し */}
          <div
            className={cn(
              "absolute top-2 right-2 text-sm text-white px-3 py-1 rounded bg-black bg-opacity-75",
              "before:absolute before:top-1/2 before:left-[-15px] before:-translate-y-1/2",
              "before:border-8 before:border-transparent before:border-r-black",
              "transition-opacity duration-500",
              copied ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            コピーしました！
          </div>
        </div>

        {/* プレイヤー一覧 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white text-black text-xs px-2 py-1 rounded">
              参加者一覧
            </span>
          </div>
          <ul className="space-y-1">
            {Object.keys(players).map((player) => (
              <li key={player} className="text-sm">
                {player}
                {player === host && (
                  <Crown
                    size={16}
                    className="inline text-yellow-700 ml-1 relative -top-0.5"
                  />
                )}
                <span className="text-black text-xs">
                  {player === nickname && "（You）"}
                </span>
                {isHost && player !== host && (
                  <span className="text-xs">
                    （
                    <button
                      onClick={() => removePlayer(player)}
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

        {alreadyJoined && (
          <div className="text-center mt-3 mb-4">
            <button
              onClick={leaveRoom}
              className="text-xs bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded"
            >
              ルームから退出する
            </button>
          </div>
        )}

        {/* 参加フォーム or メッセージ */}
        {!alreadyJoined ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addPlayer();
            }}
            className="mb-4"
          >
            <p className="mb-4 text-center text-black">
              ニックネームを入力して、ルームに参加してください。
            </p>
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
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              参加する
            </button>
          </form>
        ) : (
          <p className="mb-4 text-center text-black">
            {isHost
              ? "ゲストを招待して、ゲームを開始してください。"
              : "ホストのゲーム開始を待っています。"}
          </p>
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
              </select>
            </div>

            {/* レベル選択 */}
            <div>
              <label className="block mb-1">レベル</label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full p-2 bg-white text-black rounded focus:outline-none focus:ring-2
                  focus:ring-blue-400"
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    レベル {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* ゲーム開始ボタン */}
            <button
              onClick={startGame}
              disabled={Object.keys(players).length <= 1}
              className="w-full py-2 rounded transition
              bg-green-600 text-white hover:bg-green-500
              disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              ゲーム開始
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingPhase;
