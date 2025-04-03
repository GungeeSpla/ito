import React, { useState, useEffect, useRef } from "react";
import {
  Crown,
  PlayIcon,
  LogOut,
  UserPlus,
  Copy,
  ExternalLink,
} from "lucide-react";
import cn from "classnames";
import { Topic } from "@/types/Topic";

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
  setCustomTopics: (topics: Topic[]) => void;
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
  setCustomTopics,
}) => {
  const [copied, setCopied] = useState(false); // URLコピー完了の表示用
  const inputRef = useRef<HTMLInputElement>(null); // ニックネーム入力にフォーカスする用
  const [customPromptText, setCustomPromptText] = useState("");

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
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12"></div>

      {/* コンテンツ */}
      <div className="relative w-full text-center px-4">
        {/*-------- 見出し --------*/}
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          itoレインボーオンライン
        </h2>

        {/*-------- 設定画面 --------*/}
        <div
          className="
          bg-white/70 backdrop-blur-sm text-black p-6 my-6 rounded-xl shadow-md
          w-full max-w-md animate-fade-in relative mx-auto"
        >
          {/* URLコピーUI */}
          <div className="mb-4 flex justify-center relative">
            <button
              onClick={handleCopyUrl}
              className="flex items-center justify-center gap-1.5
              focus:outline-none px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition"
            >
              <Copy className="w-3 h-3" />
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
              <p className="bg-white text-black text-xs px-2 py-1 rounded mx-auto">
                参加者一覧
              </p>
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

          {/* 退出ボタン */}
          {alreadyJoined && (
            <div className="flex justify-center mt-3 mb-4">
              <button
                onClick={leaveRoom}
                className="flex items-center justify-center gap-1.5
                text-xs bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded"
              >
                <LogOut className="w-3 h-3" />
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
                className="flex items-center justify-center gap-1.5
                w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition
                disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
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
                className="flex items-center justify-center gap-1.5
                w-full py-2 rounded transition
              bg-green-600 text-white hover:bg-green-500
              disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-4 h-4" />
                ゲーム開始
              </button>
            </div>
          )}
        </div>

        {/*-------- 注意書き --------*/}
        <div
          className="notice
            max-w-xl mx-auto text-left
          text-white text-shadow-md p-4"
        >
          <ul>
            <li>
              <a
                href="https://arclightgames.jp/product/705rainbow/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
              >
                itoレインボー <ExternalLink size={12} />
              </a>
              は2022年に株式会社アークライトおよびナカムラミツル氏によってデザインされたボードゲームです。
            </li>
            <li>
              当サイトは個人が趣味で制作したファンサイトであり、公式とは一切関係ありません。お問い合わせは
              <a
                href="https://x.com/gungeex"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
              >
                こちら <ExternalLink size={12} />
              </a>
              。
            </li>
            <li>
              Discordなどで通話しながら遊んでいただくことを前提に設計しています。
            </li>
            <li>
              itoレインボーのルールは説明しませんので、既プレイの方や実物をお持ちの方と一緒に遊んでくださいませ。
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WaitingPhase;
