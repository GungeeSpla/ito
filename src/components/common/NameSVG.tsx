import React, { useEffect, useState, useRef } from "react";

interface NameSVGProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

const MAX_WIDTH = 100;
const MAX_HEIGHT = 40;
const MAX_FONT_SIZE = 10;
const MIN_FONT_SIZE = 1;

// テキスト → フォントサイズ のキャッシュ
const fontSizeCache = new Map<string, number>();

const NameSVG: React.FC<NameSVGProps> = ({ text, className, style }) => {
  const [fontSize, setFontSize] = useState<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (!text) return;

    // キャッシュがあれば即反映
    if (fontSizeCache.has(text)) {
      setFontSize(fontSizeCache.get(text)!);
      return;
    }

    // なければ測定
    const tempSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    tempSvg.setAttribute("width", "0");
    tempSvg.setAttribute("height", "0");
    tempSvg.style.position = "absolute";
    tempSvg.style.visibility = "hidden";

    const tempText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    tempText.setAttribute("font-weight", "bold");
    tempText.setAttribute("font-family", "sans-serif");
    tempSvg.appendChild(tempText);
    document.body.appendChild(tempSvg);

    let bestSize = MIN_FONT_SIZE;

    for (let size = MAX_FONT_SIZE; size >= MIN_FONT_SIZE; size--) {
      tempText.setAttribute("font-size", size.toString());
      tempText.textContent = text;
      const width = tempText.getBBox().width;
      const height = tempText.getBBox().height;

      if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
        bestSize = size;
        break;
      }
    }

    document.body.removeChild(tempSvg);
    console.log(bestSize);
    fontSizeCache.set(text, bestSize);

    if (isMounted.current) {
      setFontSize(bestSize);
    }

    return () => {
      isMounted.current = false;
    };
  }, [text]);

  return (
    <svg className={className} width="100%" style={style} viewBox="0 0 100 41">
      <text
        x="50"
        y={MAX_HEIGHT}
        fontSize={fontSize ?? 10}
        fontWeight="bold"
        fill="white"
        stroke="black"
        strokeWidth="0.2em"
        paintOrder="stroke"
        textAnchor="middle"
        dominantBaseline="text-after-edge"
      >
        {text}
      </text>
    </svg>
  );
};

export default NameSVG;
