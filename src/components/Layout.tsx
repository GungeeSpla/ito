import React from "react";
import { Outlet } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const Layout: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-gray-950 shadow-md text-center py-4">
        <h1 className="text-2xl font-bold text-white">ito レインボー ブラウザ版（ファンメイド）</h1>
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
        当サイトは個人の趣味で作ったファンメイドサイトであり、公式様とは関係ありません。お問い合わせは
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

    </div>
  );
};

export default Layout;
