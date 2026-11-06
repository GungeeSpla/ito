import React, { useEffect, useState } from "react";

// 💥 表示される失敗系の絵文字たち
const emojis = ["💥", "😱", "🔥", "🫨", "😵‍💫"];

const FailBurst: React.FC = () => {
  const [items, setItems] = useState<number[]>([]);

  useEffect(() => {
    // 🔻 初期化時に絵文字を一気に生成（派手に30個）
    setItems(Array.from({ length: 30 }, (_, i) => i));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {items.map((i) => {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const left = Math.random() * 100;
        const duration = 1 + Math.random(); // 🎬 落下速度
        const delay = Math.random() * 0.3;
        const size = 28 + Math.random() * 16;

        return (
          <span
            key={i}
            className="absolute top-0 animate-fail-fall"
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

export default FailBurst;
