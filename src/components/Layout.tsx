import React from "react";
import { Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-white shadow-md text-center py-4">
        <h1 className="text-2xl font-bold text-gray-800">ito Online 🎲</h1>
      </header>

      {/* メインコンテンツ（余白なしで最大限表示） */}
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>

      {/* フッター */}
      <footer className="bg-gray-100 text-center py-2 text-sm text-gray-600">
        &copy; {new Date().getFullYear()} ito Online Project
      </footer>
    </div>
  );
};

export default Layout;
