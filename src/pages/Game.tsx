import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, get, set, onValue } from "firebase/database";

const topics = [
  "大きい動物ランキング",
  "人気な果物ランキング",
  "朝ごはんに食べたいものランキング",
  "強そうなポケモンランキング",
  "空を飛べそうなものランキング",
];

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [isHost, setIsHost] = useState(false);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // ルーム情報を確認してホストかどうかを判定
  useEffect(() => {
    if (!roomId || !nickname) {
      navigate("/");
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    get(roomRef).then((snap) => {
      if (!snap.exists()) {
        alert("ルームが存在しません");
        navigate("/");
        return;
      }

      const roomData = snap.val();
      setIsHost(roomData.host === nickname);

      // ホストが3つのお題をランダムに選ぶ
      if (roomData.topic == null && roomData.phase === "waiting") {
        const randomTopics = [...topics].sort(() => 0.5 - Math.random()).slice(0, 3);
        set(ref(db, `rooms/${roomId}/topicOptions`), randomTopics);
        set(ref(db, `rooms/${roomId}/phase`), "chooseTopic");
      }
    });
  }, [roomId, nickname, navigate]);

  // 選択肢をリアルタイムで取得
  useEffect(() => {
    const topicRef = ref(db, `rooms/${roomId}/topicOptions`);
    onValue(topicRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setTopicOptions(data);
      }
    });

    const selectedRef = ref(db, `rooms/${roomId}/topic`);
    onValue(selectedRef, (snap) => {
      const value = snap.val();
      if (value) {
        setSelectedTopic(value);
      }
    });
  }, [roomId]);

  // ホストがトピックを選ぶ
  const chooseTopic = (topic: string) => {
    if (!isHost) return;
    set(ref(db, `rooms/${roomId}/topic`), topic);
    set(ref(db, `rooms/${roomId}/phase`), "dealCards");
  };

  return (
    <div>
      <h1>ゲーム画面</h1>
      <p>ニックネーム: {nickname} {isHost && <span style={{ color: "red" }}>(ホスト)</span>}</p>

      {!selectedTopic ? (
        <div>
          <h2>お題を選んでね：</h2>
          <ul>
            {topicOptions.map((topic) => (
              <li key={topic}>
                {topic}{" "}
                {isHost && (
                  <button onClick={() => chooseTopic(topic)}>これにする！</button>
                )}
              </li>
            ))}
          </ul>
          {!isHost && <p>ホストが選ぶのを待ってね…</p>}
        </div>
      ) : (
        <h2>選ばれたお題：「{selectedTopic}」</h2>
      )}
    </div>
  );
};

export default Game;
