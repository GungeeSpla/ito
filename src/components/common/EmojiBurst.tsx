import React, { useEffect, useState } from "react";

// 表示させたい祝福系の絵文字たち
const emojis = ["🎉", "🎊", "💯", "✨", "🧠", "🍾", "🥳"];

const EmojiBurst: React.FC = () => {
  const [items, setItems] = useState<number[]>([]);

  useEffect(() => {
    // 初期化時に一斉に60個の絵文字を生成
    setItems(Array.from({ length: 60 }, (_, i) => i));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {items.map((i) => {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const left = Math.random() * 100;
        const duration = 1 + Math.random() * 0.8;
        const delay = Math.random() * 0.3;
        const size = 28 + Math.random() * 12;

        return (
          <span
            key={i}
            className="absolute bottom-0 animate-emoji-float"
            style={{
              left: `${left}%`,
              fontSize: `${size}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
};

export default EmojiBurst;
