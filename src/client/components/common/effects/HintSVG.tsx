import React, { useEffect, useState } from "react";

interface HintSVGProps {
  text: string;
  className?: string;
}

const MAX_WIDTH = 100;
const MAX_HEIGHT = 110;
const LINE_HEIGHT = 1.2;
const MAX_FONT_SIZE = 20;
const MIN_FONT_SIZE = 1;

const HintSVG: React.FC<HintSVGProps> = ({ text, className }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(16);
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    if (!text) {
      setLines([]);
      return;
    }

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

    let chosenFontSize = MIN_FONT_SIZE;
    let chosenLines: string[] = [];
    let chosenHeight = MAX_HEIGHT;

    for (let size = MAX_FONT_SIZE; size >= MIN_FONT_SIZE; size--) {
      tempText.setAttribute("font-size", size.toString());
      const broken = breakLinesByMeasurement(tempText, text, MAX_WIDTH);
      const totalHeight = broken.length * size * LINE_HEIGHT;

      if (totalHeight <= MAX_HEIGHT) {
        chosenFontSize = size;
        chosenLines = broken;
        chosenHeight = totalHeight;
        break;
      }
    }

    const startY = (MAX_HEIGHT - chosenHeight + chosenFontSize / 2) / 2;

    setLines(chosenLines);
    setFontSize(chosenFontSize);
    setStartY(startY);
    document.body.removeChild(tempSvg);
  }, [text]);

  return (
    <svg className={className} width="100%" viewBox="-5 -5 110 130">
      <defs>
        <filter id="hintShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx={fontSize / 40}
            dy={fontSize / 40}
            stdDeviation="0"
            floodColor="black"
          />
          <feDropShadow
            dx={fontSize / 20}
            dy={fontSize / 20}
            stdDeviation="0"
            floodColor="black"
          />
        </filter>
      </defs>
      <text
        x="0"
        y={startY}
        fontSize={fontSize}
        fontWeight="bold"
        fill="white"
        stroke="black"
        strokeWidth="0.1em"
        filter="url(#hintShadow)"
        paintOrder="stroke"
        textAnchor="middle"
        dominantBaseline="hanging"
      >
        {lines.map((line, i) => (
          <tspan x="50" dy={i === 0 ? "0" : `${LINE_HEIGHT}em`} key={i}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
};

function breakLinesByMeasurement(
  textEl: SVGTextElement,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  for (const char of text) {
    textEl.textContent = char;
    const charWidth = textEl.getBBox().width;

    if (currentWidth + charWidth > maxWidth) {
      lines.push(currentLine);
      currentLine = char;
      currentWidth = charWidth;
    } else {
      currentLine += char;
      currentWidth += charWidth;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

export default HintSVG;
