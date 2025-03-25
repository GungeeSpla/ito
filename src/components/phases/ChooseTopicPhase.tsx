import React from "react";
import { Topic } from "../../types/Topic";

interface Props {
  topicOptions: Topic[];
  isHost: boolean;
  chooseTopic: (topic: Topic) => void;
}

const ChooseTopicPhase: React.FC<Props> = ({ topicOptions, isHost, chooseTopic }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="max-w-3xl w-full animate-fade-in">
        <h2 className="text-xl font-bold text-center mb-6">お題の選択</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topicOptions.map((t) => (
            <div
              key={t.title}
              className={`pb-8 relative bg-gray-800 rounded-xl p-4 shadow-md text-center hover:bg-gray-700 transition cursor-pointer border border-transparent hover:border-blue-400 ${isHost ? "hover:scale-[1.02]" : "opacity-100 cursor-not-allowed"
                }`}
              onClick={() => isHost && chooseTopic(t)}
            >
              <h3 className="text-lg font-semibold mb-2">{t.title}</h3>

              {/* 1〜100スケールのビジュアル表示 */}
              <div className="my-4">
                <div className="grid grid-cols-2 text-xs text-gray-400">
                  <div className="text-left">1 {t.min}</div>
                  <div className="text-right">{t.max} 100</div>
                </div>
                <div className="h-[2px] bg-gray-600 mt-1"></div>
              </div>

              {isHost && <p className="absolute w-full left-0 text-center bottom-2 text-gray-400 text-xs">クリックして選択</p>}
            </div>
          ))}
        </div>

        {isHost && (
          <p className="text-center text-gray-400 mt-6">みんなで話し合ったあと、あなたが選択してください。</p>
        )}

        {!isHost && (
          <p className="text-center text-gray-400 mt-6">みんなで話し合ったあと、ホストに選択してもらいます。</p>
        )}
      </div>
    </div>
  );
};

export default ChooseTopicPhase;
