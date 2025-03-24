import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../../firebase";

type Props = {
  roomId: string;
  nickname: string;
};

const PlaceCardsPhase: React.FC<Props> = ({ roomId, nickname }) => {
  const [myCard, setMyCard] = useState<number | null>(null);

  useEffect(() => {
    const cardRef = ref(db, `rooms/${roomId}/cards/${nickname}`);
    get(cardRef).then((snap) => {
      if (snap.exists()) {
        setMyCard(snap.val());
      }
    });
  }, [roomId, nickname]);

  return (
    <div>
      <h2>カードを場に置いてね！（UIはこれから作るよ）</h2>
      {myCard !== null ? (
        <p>あなたのカード番号：<strong>{myCard}</strong></p>
      ) : (
        <p>カードを取得中…</p>
      )}
    </div>
  );
};

export default PlaceCardsPhase;
