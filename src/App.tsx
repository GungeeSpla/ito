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

    // ① Firebaseにルームを作成（ホストをプレイヤーとして含める）
    await set(ref(db, `rooms/${roomId}`), {
      host: nickname,
      players: [nickname],
    });

    // ② ニックネームを localStorage に保存（Room.tsx 側で取り出す）
    localStorage.setItem("nickname", nickname);

    // ③ ルームページへ遷移（state ではなく URL だけ渡す）
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
