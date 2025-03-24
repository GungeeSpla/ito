import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { ref, set } from "firebase/database";

const generateRoomId = () => {
  const timestamp = new Date().getTime();
  return "room-" + timestamp;
};

function App() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");

  const createRoom = async () => {
    if (!nickname.trim()) {
      alert("ニックネームを入力してね！");
      return;
    }

    const roomId = generateRoomId();

    // 🔄 Firebaseにルームを作成（プレイヤーをオブジェクトで管理）
    await set(ref(db, `rooms/${roomId}`), {
      host: nickname,
      players: {
        [nickname]: true,
      },
      phase: "waiting",
    });

    // 🧠 ローカルにニックネーム保存
    localStorage.setItem("nickname", nickname);

    // 🚪ルームへ遷移
    navigate(`/room/${roomId}`);
  };

  return (
    <div>
      <h1>ito Online</h1>
      <input
        type="text"
        placeholder="ニックネームを入力"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <button onClick={createRoom}>ルームを作成</button>
    </div>
  );
}

export default App;
