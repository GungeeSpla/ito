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
          このWebサイトは、
          <a
            href="https://arclightgames.jp/product/705rainbow/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
          >
            itoレインボー <ExternalLink size={12} />
          </a>
          と同じルールのゲームをオンラインで遊べるようにしたサイトです。
          <a
            href="https://discord.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 inline-flex items-center gap-0.5 underline hover:text-blue-600"
          >
            Discord <ExternalLink size={12} />
          </a>
          などの外部ツールで通話しながら遊んでいただくことを前提に設計しています。
        </li>
        <li>
          itoレインボーは2022年に株式会社アークライトおよびナカムラミツル氏によってデザインされたボードゲームです。現物で遊ぶ楽しさはまた格別ですので、ぜひ現物もお買い求めくださいませ。
        </li>
        <li>
          当サイトは個人が趣味で制作したファンサイトであり、公式とは一切関係ありません。サイトに関するお問い合わせは
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
      </ul>
      <div className="text-center mt-2">
        <AppVersion />
      </div>
    </div>
  );
};

export default NoticeGame;
