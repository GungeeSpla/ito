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
    navigate(`/room/${roomId}`);W
  };

  return (
    <div>
      <h1>ito Online</h1>
      <div className="text-center mt-10">
        <h1 className="text-3xl font-bold text-purple-600">Hello Tailwind!</h1>
        <button className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          おにいちゃん押して～♡
        </button>
      </div>
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
