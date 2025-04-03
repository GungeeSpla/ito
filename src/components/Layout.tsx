import React from "react";
import { Outlet } from "react-router-dom"; // ページ遷移とルーティング用
import { Toaster } from "sonner";

// ------------------------------------------------
// アプリ全体の共通レイアウトコンポーネント
// - ヘッダー、メイン、フッターで構成
// - <Outlet /> に現在のページをレンダリング
// ------------------------------------------------
const Layout: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {/* 外側をぼんやり暗く */}
      <div className="bg-gradient"></div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        {/* 現在のページの中身を差し込む */}
        <Outlet />
      </main>

      <Toaster richColors position="bottom-right" expand />
    </div>
  );
};

export default Layout;
