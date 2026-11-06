import React, { useMemo } from 'react';
import { wrapText } from '@/lib/measureText.ts';

// カードの裏面に書く、たとえワード。枠に収まるよう折り返して縮める
interface HintSVGProps {
  text: string;
  className?: string;
}

const MAX_WIDTH = 100;
const MAX_HEIGHT = 110;
const LINE_HEIGHT = 1.2;
const MAX_FONT_SIZE = 20;

const HintSVG: React.FC<HintSVGProps> = ({ text, className }) => {
  const { lines, fontSize, startY } = useMemo(() => {
    if (!text) return { lines: [], fontSize: 16, startY: 0 };
    const wrapped = wrapText(text, MAX_WIDTH, MAX_HEIGHT, MAX_FONT_SIZE, LINE_HEIGHT);
    return { ...wrapped, startY: (MAX_HEIGHT - wrapped.height + wrapped.fontSize / 2) / 2 };
  }, [text]);

  return (
    <svg className={className} width="100%" viewBox="-5 -5 110 130">
      <defs>
        <filter id="hintShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx={fontSize / 40} dy={fontSize / 40} stdDeviation="0" floodColor="black" />
          <feDropShadow dx={fontSize / 20} dy={fontSize / 20} stdDeviation="0" floodColor="black" />
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
          <tspan x="50" dy={i === 0 ? '0' : `${LINE_HEIGHT}em`} key={i}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
};

export default HintSVG;
