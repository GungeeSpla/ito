import React from "react";
import { Topic } from "../../types/Topic";

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
// -----------------------------
// - ホストだけがクリックで選択できる
// - ゲストは選択不可＆説明だけ表示
// -----------------------------
const ChooseTopicPhase: React.FC<Props> = ({
  topicOptions,
  isHost,
  chooseTopic,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="max-w-3xl w-full animate-fade-in">

        {/* タイトル */}
        <h2 className="text-xl font-bold text-center mb-6">お題の選択</h2>

        {/* お題一覧（ホストのみクリック可能） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topicOptions.map((t) => (
            <div
              key={t.title}
              className={`
                pb-8 relative bg-gray-800 rounded-xl p-4 shadow-md text-center 
                hover:bg-gray-700 transition border border-transparent 
                ${isHost ? "hover:border-blue-400 hover:scale-[1.02] cursor-pointer" : "opacity-100 cursor-not-allowed"}
              `}
              onClick={() => isHost && chooseTopic(t)} // ホストだけ選択可能
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
            </div>
          ))}
        </div>

        {/* 補足メッセージ（ホスト用・ゲスト用） */}
        {isHost ? (
          <p className="text-center text-gray-400 mt-6">
            みんなで話し合ったあと、あなたが選択してください。
          </p>
        ) : (
          <p className="text-center text-gray-400 mt-6">
            みんなで話し合ったあと、ホストに選択してもらいます。
          </p>
        )}
      </div>
    </div>
  );
};

export default ChooseTopicPhase;
