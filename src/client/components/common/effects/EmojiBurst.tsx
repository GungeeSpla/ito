import React, { useState } from 'react';

// 成功したときに、下から湧き上がる絵文字
const emojis = ['🎉', '🎊', '💯', '✨', '🧠', '🍾', '🥳'];

const makeItems = () =>
  Array.from({ length: 60 }, () => ({
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    left: Math.random() * 100,
    duration: 1 + Math.random() * 0.8,
    delay: Math.random() * 0.3,
    size: 28 + Math.random() * 12,
  }));

const EmojiBurst: React.FC = () => {
  const [items] = useState(makeItems);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden="true">
      {items.map((item, i) => (
        <span
          key={i}
          className="absolute bottom-0 animate-emoji-float"
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

export default EmojiBurst;
