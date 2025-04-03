import React from "react";
import styles from "./FallingText.module.css";

type Props = {
  text: string;
  duration?: number;
};

const FallingText: React.FC<Props> = ({ text, duration = 1.5 }) => {
  const letters = text.split("");
  const delayPerChar = duration / letters.length;

  return (
    <p className={styles.fallingText}>
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
