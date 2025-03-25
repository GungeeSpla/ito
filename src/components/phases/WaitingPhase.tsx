import React, { useState, useEffect, useRef } from "react";
import { Crown } from "lucide-react";
import cn from 'classnames';

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
  setSelectedSet: (set: string) => void;
  level: number;
  setLevel: (level: number) => void;
  startGame: () => void;
}

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
}) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("nickname");
    if (savedName) setNewNickname(savedName);
    inputRef.current?.focus();
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isHost = nickname === host;

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-md w-full max-w-md animate-fade-in relative">
        <div className="text-sm text-gray-400 text-center mb-4 flex justify-center items-center gap-2">
          <span className="bg-gray-700 text-white text-xs px-1.5 py-1 rounded">ルームID</span>
          <span className="font-mono">{roomId}</span>
        </div>

        <div className="mb-4 text-center relative">
          <button
            onClick={handleCopyUrl}
            className="focus:outline-none px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
          >
            ルームURLをコピー
          </button>
          <div
            className={cn(
              'absolute top-2 right-2 bg-black bg-opacity-75 text-sm text-white px-3 py-1 rounded animate-fade-in duration-500',
              'before:absolute before:top-1/2 before:left-[-15px] before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-black',
              copied ? 'opacity-100' : 'opacity-0 scale-95 pointer-events-none'
            )}
          >
            コピーしました！
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-gray-700 text-white text-xs px-2 py-1 rounded">参加者一覧</span>
          </div>
          <ul className="space-y-1 text-center">
            {Object.keys(players).map((player) => (
              <li key={player} className="text-sm">
                {player}
                {player === host && <Crown size={16} className="inline text-yellow-400 ml-1 relative -top-0.5" />}
                <span className="text-gray-400 text-xs">
                  {player === nickname && "（You）"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {!alreadyJoined ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addPlayer();
            }}
            className="mb-4"
          >
            <p className="mb-4 text-center text-gray-400">
              ニックネームを入力して、ルームに参加してください。
            </p>
            <input
              ref={inputRef}
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="ニックネームを入力"
              className="w-full p-2 border border-gray-700 bg-gray-700 text-white rounded
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
          <p className="mb-4 text-center text-gray-400">
            {isHost ? "ゲストを招待して、ゲームを開始してください。" : "ホストのゲーム開始を待っています。"}
          </p>
        )}

        {isHost && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1">お題セット</label>
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="rainbow">レインボー</option>
                <option value="normal">通常</option>
                <option value="classic">クラシック</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">レベル</label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full p-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2
                  focus:ring-blue-400"
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    レベル {lvl}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={startGame}
              disabled={Object.keys(players).length <= 1}
              className="w-full py-2 rounded transition
              bg-green-600 text-white hover:bg-green-500
              disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
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