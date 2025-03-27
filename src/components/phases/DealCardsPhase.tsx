import React from "react";

interface Props {
  roomId: string;
  nickname: string;
}

const DealCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  return (
    <div>
      {/* <h2>カードを配っています…</h2> */}
      {/* <p>ホストがカードを配るのを待ってね！</p> */}
    </div>
  );
};

export default DealCardsPhase;
