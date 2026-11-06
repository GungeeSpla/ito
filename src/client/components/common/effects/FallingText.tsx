import React, { useEffect, useRef, useState } from "react";
import styles from "./FallingText.module.css";

type Props = {
  text: string;
  duration?: number;
};

const FallingText: React.FC<Props> = ({ text, duration = 1.5 }) => {
  const letters = text.split("");
  const delayPerChar = duration / letters.length;

  const containerRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(32); // 初期フォントサイズ

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let size = 32;
    const maxHeightPx = window.innerHeight * 0.15; // ← 画面高さの15%

    const shrinkToFit = () => {
      el.style.fontSize = `${size}px`;
      el.style.lineHeight = "1.2";

      while (el.scrollHeight > maxHeightPx && size > 10) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    };

    shrinkToFit();
  }, [text]);

  return (
    <p
      ref={containerRef}
      className={styles.fallingText}
      style={{
        fontSize: `${fontSize}px`,
        maxHeight: "15vh", // CSS的にも指定
        overflow: "hidden",
        lineHeight: "1.2",
      }}
    >
      {letters.map((char, index) => {
        const isSpace = char === " ";
        return (
          <span
            key={index}
            className={isSpace ? styles.space : undefined}
            style={
              !isSpace ? { animationDelay: `${index * delayPerChar}s` } : {}
            }
          >
            {isSpace ? "\u00A0" : char}
          </span>
        );
      })}
    </p>
  );
};

export default FallingText;
