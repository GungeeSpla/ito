import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, Home } from "lucide-react";

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleHomeClick = () => {
    const isInRoom = location.pathname.startsWith("/room");
    if (isInRoom) {
      const confirmLeave = window.confirm("本当にトップに戻りますか？ルームから退出します。");
      if (!confirmLeave) return;
    }
    navigate("/");
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-gray-950 shadow-md py-4 px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white text-center w-full">ito レインボー ブラウザ版（ファンメイド）</h1>
        <Home
          onClick={handleHomeClick}
          className="absolute right-4 top-4 text-white hover:text-blue-400 cursor-pointer transition"
          size={24}
          aria-label="ホームへ戻る"
        />
      </header>

      {/* メインコンテンツ（余白なしで最大限表示） */}
      <main className="bg-gray-900 flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* フッター */}
      <footer className="bg-gray-950 text-center py-2 text-sm text-white">
        『<a
          href="https://arclightgames.jp/product/705rainbow/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 underline hover:text-blue-300"
        >
          ito レインボー <ExternalLink size={12} />
        </a>
        』は2022年に株式会社アークライト・ナカムラミツル様によってデザインされたボードゲームです。
        <br />
        当サイトは個人の趣味で作ったファンメイドサイトであり、公式とは関係ありません。お問い合わせは
        <a
          href="https://x.com/gungeex"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 underline hover:text-blue-300"
        >
          こちら <ExternalLink size={12} />
        </a>
        。
      </footer>
    </div >
  );
};

export default Layout;
