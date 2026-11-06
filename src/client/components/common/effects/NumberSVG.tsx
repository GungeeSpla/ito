import React from "react";

interface NumberSVGProps {
  value: number | "?";
  className?: string;
}

const getColorFromValue = (value: number): string => {
  const colors = [
    "#e74c3c", // 赤
    "#3498db", // 青
    "#2ecc71", // 緑
    "#f39c12", // オレンジ
    "#9b59b6", // 紫
    "#1abc9c", // シアン
    "#e67e22", // 濃いオレンジ
    "#fd79a8", // ピンク
  ];
  const index = value % colors.length;
  return colors[index];
};

const NumberSVG: React.FC<NumberSVGProps> = ({ value, className }) => {
  if (value === "?") value = 0;
  const fillColor = getColorFromValue(value);

  return (
    <svg className={className} viewBox="0 0 100 100">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="1" stdDeviation="0" floodColor="black" />
          <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="black" />
        </filter>
      </defs>
      <text
        x="50"
        y="55"
        fontSize="50"
        fontWeight="bold"
        fill={fillColor}
        stroke="black"
        strokeWidth="3"
        filter="url(#shadow)"
        paintOrder="stroke"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </svg>
  );
};

export default NumberSVG;
