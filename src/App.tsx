import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase";
import { ref, set, get } from "firebase/database";
import { generateUniqueRoomId } from "@/utils/generateRoomId";
import { Rocket } from "lucide-react";
import { toastWithAnimation } from "@/utils/toast";
import NoticeGame from "@/components/common/NoticeGame";
import { useUser } from "@/hooks/useUser";

// ----------------------------------------
// トップページコンポーネント：ルーム作成画面
// ----------------------------------------
function App() {
  const navigate = useNavigate(); // 画面遷移用フック（React Router）
  const { userId, userInfo, updateUserInfo, ensureUserExists } = useUser();

  // -----------------------------
  // 状態管理
  // -----------------------------
  const [nickname, setNickname] = useState(""); // 入力されたニックネーム
  const inputRef = useRef<HTMLInputElement>(null); // 初期フォーカス用の参照

  // userInfo が取得できたら nickname を初期化
  useEffect(() => {
    if (userInfo?.nickname) {
      setNickname(userInfo.nickname);
    }
  }, [userInfo]);

  // -----------------------------
  // ルーム作成処理
  // -----------------------------
  const createRoom = async () => {
    try {
      console.log("🏁 createRoom: start");

      if (!nickname.trim()) {
        toastWithAnimation("ニックネームを入力してください。", {
          type: "error",
        });
        return;
      }

      if (!userId) {
        toastWithAnimation("ユーザーIDが取得できませんでした。", {
          type: "error",
        });
        return;
      }

      // 必要なときだけユーザーを登録
      await ensureUserExists();

      // nickname 更新
      await updateUserInfo({ nickname });

      // 再取得（userInfo は非同期更新されるので注意）
      const snap = await get(ref(db, `users/${userId}`));
      const info = snap.val();

      if (!info) {
        toastWithAnimation("ユーザー情報が取得できませんでした。", {
          type: "error",
        });
        return;
      }

      // 重複しないランダムなルームIDを生成
      const roomId = await generateUniqueRoomId();

      const newPlayer = {
        nickname: info.nickname,
        color: info.color,
        avatarUrl: info.avatarUrl,
        joinedAt: Date.now(),
      };

      // Firebase Realtime Database にルーム情報を登録
      await set(ref(db, `rooms/${roomId}`), {
        host: userId,
        players: {
          [userId]: newPlayer,
        },
        phase: "waiting",
      });

      setTimeout(() => {
        toastWithAnimation("ルームを作成しました！", { type: "success" });
        navigate(`/room/${roomId}`);
        console.log("✅ createRoom: success", {
          nickname: info.nickname,
          roomId,
        });
      }, 300);
    } catch (err) {
      console.error("❌ createRoom error", err);
      toastWithAnimation("ルームの作成に失敗しました。", { type: "error" });
    }
  };

  // -----------------------------
  // 初期処理：前回のニックネーム復元＋フォーカス
  // -----------------------------
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    if (userInfo?.nickname) {
      setNickname(userInfo.nickname);
    }
  }, [userInfo]);

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12"></div>

      {/* コンテンツ */}
      <div className="relative w-full text-center px-4">
        {/*-------- 見出し --------*/}
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          itoレインボーオンライン
        </h2>
        <p className="text-center text-white text-shadow-md my-6">
          <span>ニックネームを入力して、ルームを作成してください。</span>
        </p>

        {/*-------- 設定画面 --------*/}
        <div
          className="
          bg-white/70 backdrop-blur-sm text-black p-6 my-6 rounded-xl shadow-md
          w-full max-w-md animate-fade-in relative mx-auto"
        >
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
              disabled:cursor-not-allowed disabled:opacity-50
              flex items-center justify-center gap-1.5"
            >
              <Rocket className="w-4 h-4 translate-y-[0.1rem]" />
              ルームを作成
            </button>
          </form>
        </div>

        {/*-------- 注意書き --------*/}
        <NoticeGame />
      </div>
    </div>
  );
}

export default App;
