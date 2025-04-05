import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase";
import { ref, set } from "firebase/database";
import { generateUniqueRoomId } from "@/utils/generateRoomId";
import { Rocket, ExternalLink } from "lucide-react";
import { toastWithAnimation } from "@/utils/toast";

// ----------------------------------------
// トップページコンポーネント：ルーム作成画面
// ----------------------------------------
function App() {
  const navigate = useNavigate(); // 画面遷移用フック（React Router）

  // -----------------------------
  // 状態管理
  // -----------------------------
  const [nickname, setNickname] = useState(""); // 入力されたニックネーム
  const inputRef = useRef<HTMLInputElement>(null); // 初期フォーカス用の参照

  // -----------------------------
  // ルーム作成処理
  // -----------------------------
  const createRoom = async () => {
    if (!nickname.trim()) {
      toastWithAnimation("ニックネームを入力してください。", {
        type: "error",
      });
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
    setTimeout(() => {
      toastWithAnimation("ルームを作成しました！", {
        type: "success",
      });
      console.log("ルームを作成しました。");
      console.log("ニックネーム:", nickname);
      console.log("ルームID:", roomId);
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
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12"></div>

      {/* コンテンツ */}
      <div className="relative w-full text-center px-4">
        {/*-------- 見出し --------*/}
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          itoレインボーオンライン
        </h2>

        {/*-------- 設定画面 --------*/}
        <div
          className="
          bg-white/70 backdrop-blur-sm text-black p-6 my-6 rounded-xl shadow-md
          w-full max-w-md animate-fade-in relative mx-auto"
        >
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
              disabled:cursor-not-allowed disabled:opacity-50
              flex items-center justify-center gap-1.5"
            >
              <Rocket className="w-4 h-4 translate-y-[0.1rem]" />
              ルームを作成
            </button>
          </form>
        </div>

        {/*-------- 注意書き --------*/}
        <div
          className="notice
            max-w-xl mx-auto text-left
          text-white text-shadow-md p-4"
        >
          <ul>
            <li>
              <a
                href="https://arclightgames.jp/product/705rainbow/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
              >
                itoレインボー <ExternalLink size={12} />
              </a>
              は2022年に株式会社アークライトおよびナカムラミツル氏によってデザインされたボードゲームです。
            </li>
            <li>
              当サイトは個人が趣味で制作したファンサイトであり、公式とは一切関係ありません。お問い合わせは
              <a
                href="https://x.com/gungeex"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
              >
                こちら <ExternalLink size={12} />
              </a>
              。
            </li>
            <li>
              Discordなどで通話しながら遊んでいただくことを前提に設計しています。
            </li>
            <li>
              itoレインボーのルールは説明しませんので、既プレイの方や実物をお持ちの方と一緒に遊んでくださいませ。
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
