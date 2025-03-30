import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom"; // ページ遷移とルーティング用
import { ExternalLink, Home } from "lucide-react"; // アイコン
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { Toaster } from "sonner";

// ------------------------------------------------
// アプリ全体の共通レイアウトコンポーネント
// - ヘッダー、メイン、フッターで構成
// - <Outlet /> に現在のページをレンダリング
// ------------------------------------------------
const Layout: React.FC = () => {
  const location = useLocation();   // 現在のURLパスを取得
  const navigate = useNavigate();
  const [phase, setPhase] = useState<string | null>(null);

  // Firebaseから現在のフェーズを取得・監視
  useEffect(() => {
    const roomId = location.pathname.split("/").pop();
    if (!roomId || !location.pathname.startsWith("/room")) return;
    const phaseRef = ref(db, `rooms/${roomId}/phase`);
    const unsub = onValue(phaseRef, (snap) => {
      if (snap.exists()) {
        setPhase(snap.val());
      }
    });
    return () => unsub();
  }, [location]);
  // ページ遷移ナビゲーション関数

  // ホームアイコンが押されたときの処理
  const handleHomeClick = () => {
    const isInRoom = location.pathname.startsWith("/room");

    // ルーム中なら確認ダイアログを表示
    if (isInRoom) {
      const confirmLeave = window.confirm("本当にトップに戻りますか？ルームから退出します。");
      if (!confirmLeave) return;
    }

    navigate("/"); // トップへ遷移
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {/* ------------------ ヘッダー ------------------ */}
      {phase === "waiting" || phase === null ? <header className="bg-white/70 backdrop-blur-sm text-black shadow-md py-4 px-4 flex justify-between items-center">
        {/* 中央タイトル */}
        <h1 className="text-2xl font-bold  text-center w-full">
          ito レインボー ブラウザ版（ファンメイド）
        </h1>

        {/* ホームボタン（右上） */}
        <Home
          onClick={handleHomeClick}
          className="absolute right-4 top-4.5 text-white hover:text-blue-400 cursor-pointer transition"
          size={24}
          aria-label="ホームへ戻る"
        />
      </header> : null}

      {/* ------------------ メインコンテンツ ------------------ */}
      <main className="flex-1 overflow-auto">
        {/* 現在のページの中身を差し込む */}
        <Outlet />
      </main>

      {/* ------------------ フッター ------------------ */}
      {phase === "waiting" || phase === null ? <footer className="bg-white/70 backdrop-blur-sm text-black text-center py-2 ">
        『
        <a
          href="https://arclightgames.jp/product/705rainbow/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 inline-flex items-center gap-0.5 underline hover:text-blue-600"
        >
          ito レインボー <ExternalLink size={12} />
        </a>
        』は2022年に株式会社アークライト・ナカムラミツル様によってデザインされたボードゲームです。
        <br />
        当サイトは個人の趣味で作ったファンメイドサイトであり、公式とは関係ありません。
        お問い合わせは
        <a
          href="https://x.com/gungeex"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 inline-flex items-center gap-0.5 underline hover:text-blue-600"
        >
          こちら <ExternalLink size={12} />
        </a>
        。
      </footer> : null}
      <Toaster richColors position="bottom-right" />
    </div>
  );
};

export default Layout;
