import React from "react";
import { Howl } from "howler";
import { Home } from "lucide-react";
import WoodyButton from "@/components/common/WoodyButton";

// 効果音：カードを配る音
const dealSound = new Howl({
  src: ["/sounds/card-deal.mp3"],
  volume: 1,
});

interface Props {
  isHost: boolean;
}

const DealCardsPhase: React.FC<Props> = (isHost) => {
  dealSound.play();

  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12">
        {/* 中断ボタン */}
        {isHost && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <WoodyButton>
              <Home className="w-4 h-4 translate-y-[0.1rem]" />
              ロビーに戻る
            </WoodyButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealCardsPhase;
