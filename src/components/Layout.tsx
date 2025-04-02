import React from "react";
import { Outlet, useLocation } from "react-router-dom"; // ページ遷移とルーティング用
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
      {/* 外側をぼんやり暗く */}
      <div className="bg-gradient"></div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        {/* 現在のページの中身を差し込む */}
        <Outlet />
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
};

export default Layout;
