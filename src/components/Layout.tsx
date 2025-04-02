import React from "react";
import { Outlet, useLocation } from "react-router-dom"; // ページ遷移とルーティング用
import { ExternalLink } from "lucide-react"; // アイコン
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
  const location = useLocation(); // 現在のURLパスを取得
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

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <div className="bg-gradient"></div>
      {/* ------------------ ヘッダー ------------------ */}
      {phase === "waiting" || phase === null ? (
        <header className="bg-black/30 text-white text-shadow-md shadow-md py-4 px-4 flex justify-between items-center">
          {/* 中央タイトル */}
          <h1 className="text-2xl font-bold  text-center w-full">
            itoレインボーオンライン
          </h1>
        </header>
      ) : null}

      {/* ------------------ メインコンテンツ ------------------ */}
      <main className="flex-1 overflow-auto">
        {/* 現在のページの中身を差し込む */}
        <Outlet />
      </main>

      {/* ------------------ フッター ------------------ */}
      {phase === "waiting" || phase === null ? (
        <footer className="bg-black/30 text-white text-shadow-md text-center p-4">
          『
          <a
            href="https://arclightgames.jp/product/705rainbow/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
          >
            ito レインボー <ExternalLink size={12} />
          </a>
          』は2022年に株式会社アークライトおよびナカムラミツル氏によってデザインされたボードゲームです。
          当サイトは個人が趣味で制作したファンサイトであり、公式とは一切関係ありません。
          お問い合わせは
          <a
            href="https://x.com/gungeex"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
          >
            こちら <ExternalLink size={12} />
          </a>
          。
        </footer>
      ) : null}
      <Toaster richColors position="bottom-right" />
    </div>
  );
};

export default Layout;
