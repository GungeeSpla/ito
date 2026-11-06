import React, { useState } from 'react';

// 失敗したときに、上から降ってくる絵文字
const emojis = ['💥', '😱', '🔥', '🫨', '😵‍💫'];

const makeItems = () =>
  Array.from({ length: 30 }, () => ({
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    left: Math.random() * 100,
    duration: 1 + Math.random(),
    delay: Math.random() * 0.3,
    size: 28 + Math.random() * 16,
  }));

const FailBurst: React.FC = () => {
  const [items] = useState(makeItems);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden="true">
      {items.map((item, i) => (
        <span
          key={i}
          className="absolute top-0 animate-fail-fall"
          style={{
            left: `${item.left}%`,
            fontSize: `${item.size}px`,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
};

export default FailBurst;
