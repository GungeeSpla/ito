import React, { useMemo } from 'react';
import { fitName } from '@/lib/measureText.ts';

// カードに書く名前。枠に収まる大きさにする
interface NameSVGProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

const MAX_WIDTH = 100;
const MAX_HEIGHT = 40;
const MAX_FONT_SIZE = 10;

const NameSVG: React.FC<NameSVGProps> = ({ text, className, style }) => {
  const fontSize = useMemo(() => (text ? fitName(text, MAX_WIDTH, MAX_HEIGHT, MAX_FONT_SIZE) : MAX_FONT_SIZE), [text]);
  return (
    <svg className={className} width="100%" style={style} viewBox="0 0 100 41">
      <text
        x="50"
        y={MAX_HEIGHT}
        fontSize={fontSize}
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
