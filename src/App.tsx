import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { ref, set } from "firebase/database";

const generateRoomId = () => {
  const timestamp = new Date().getTime();
  return timestamp;
};

function App() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [isFading, setIsFading] = useState(false);

  const createRoom = async () => {
    if (!nickname.trim()) {
      alert("ニックネームを入力してね！");
      return;
    }

    const roomId = generateRoomId();

    await set(ref(db, `rooms/${roomId}`), {
      host: nickname,
      players: {
        [nickname]: true,
      },
      phase: "waiting",
    });

    localStorage.setItem("nickname", nickname);

    // フェードアウトしてから画面遷移
    setIsFading(true);
    setTimeout(() => {
      navigate(`/room/${roomId}`);
    }, 300); // CSSのdurationと合わせる
  };

  return (
    <div
      className={`min-h-[70vh] flex items-center justify-center text-white transition-opacity duration-300 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="bg-gray-700 p-6 rounded-xl shadow-md w-80 text-center animate-fade-in">
        <h1 className="text-2xl font-bold mb-4">
          ニックネームを入力して、ルームを作成してください。
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRoom();
          }}
        >
          <input
            type="text"
            placeholder="ニックネームを入力"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded mb-4 text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500
              focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            ルームを作成
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
