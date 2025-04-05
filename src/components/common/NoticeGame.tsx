import React from "react";
import { ExternalLink } from "lucide-react";
import AppVersion from "@/components/common/AppVersion";

const NoticeGame: React.FC = () => {
  return (
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
      <div className="text-center">
        <AppVersion />
      </div>
    </div>
  );
};

export default NoticeGame;
