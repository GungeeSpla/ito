import React from "react";
import { Howl } from "howler";

// 効果音：カードを配る音
const dealSound = new Howl({
  src: ["/sounds/card-deal.mp3"],
  volume: 1,
});

interface Props {
  roomId: string;
  nickname: string;
}

const DealCardsPhase: React.FC<Props> = () => {
  dealSound.play();

  return (
    <div>
      {/* <h2>カードを配っています…</h2> */}
      {/* <p>ホストがカードを配るのを待ってね！</p> */}
    </div>
  );
};

export default DealCardsPhase;
