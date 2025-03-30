import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { ref, set } from "firebase/database";
import { generateUniqueRoomId } from "./utils/generateRoomId";

// ----------------------------------------
// トップページコンポーネント：ルーム作成画面
// ----------------------------------------
function App() {
  const navigate = useNavigate(); // 画面遷移用フック（React Router）

  // -----------------------------
  // 状態管理
  // -----------------------------
  const [nickname, setNickname] = useState(""); // 入力されたニックネーム
  const [isFading, setIsFading] = useState(false); // フェードアウト用の状態フラグ
  const inputRef = useRef<HTMLInputElement>(null); // 初期フォーカス用の参照

  // -----------------------------
  // ルーム作成処理
  // -----------------------------
  const createRoom = async () => {
    if (!nickname.trim()) {
      alert("ニックネームを入力してね！");
      return;
    }

    // 重複しないランダムなルームIDを生成
    const roomId = await generateUniqueRoomId();

    // Firebase Realtime Database にルーム情報を登録
    await set(ref(db, `rooms/${roomId}`), {
      host: nickname,
      players: {
        [nickname]: true,
      },
      phase: "waiting", // ゲームフェーズ初期値
    });

    // ローカルストレージにニックネーム保存（次回の自動入力用）
    localStorage.setItem("nickname", nickname);

    // フェードアウト → 画面遷移（アニメーションと同期）
    setIsFading(true);
    setTimeout(() => {
      navigate(`/room/${roomId}`);
    }, 300); // CSS側のdurationに合わせてる
  };

  // -----------------------------
  // 初期処理：前回のニックネーム復元＋フォーカス
  // -----------------------------
  useEffect(() => {
    const savedName = localStorage.getItem("nickname");
    if (savedName) setNickname(savedName); // 初期値としてセット
    inputRef.current?.focus(); // 入力欄にフォーカス
  }, []);

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div
      className={`min-h-[70vh] flex items-center justify-center transition-opacity duration-300
        ${isFading ? "opacity-0" : "opacity-100"}`}
    >
      <div className="bg-white/70 backdrop-blur-sm text-black p-6 rounded-xl shadow-md w-80 text-center animate-fade-in">
        <h1 className="text-xl font-bold mb-4">
          ニックネームを入力して、ルームを作成してください。
        </h1>

        {/* 入力フォーム（ニックネーム + 送信ボタン） */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRoom();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="ここにニックネームを入力"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-2 border border-gray-600 bg-white text-black rounded mb-4 text-center
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
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
