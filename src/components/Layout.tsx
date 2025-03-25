import React from "react";
import { Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-gray-900 shadow-md text-center py-4">
        <h1 className="text-2xl font-bold text-white">ito Online 🎲</h1>
      </header>

      {/* メインコンテンツ（余白なしで最大限表示） */}
      <main className="bg-gray-800 flex-1 overflow-auto p-4">
        <Outlet />
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-center py-2 text-sm text-white">
        &copy; {new Date().getFullYear()} ito Online Project
      </footer>
    </div>
  );
};

export default Layout;
