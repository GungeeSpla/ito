import React from "react";

interface NumberSVGProps {
  value: number | "?";
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

const NumberSVG: React.FC<NumberSVGProps> = ({ value }) => {
  if (value === "?") value = 0;
  const fillColor = getColorFromValue(value);

  return (
    <svg
      style={{ marginTop: "2.5rem" }}
      width="100"
      height="100"
      viewBox="0 0 100 100"
    >
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="1" stdDeviation="0" floodColor="black" />
          <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="black" />
        </filter>
      </defs>
      <text
        x="50"
        y="50"
        textAnchor="middle"
        fontSize="60"
        fontWeight="bold"
        fill={fillColor}
        stroke="black"
        strokeWidth="3"
        filter="url(#shadow)"
        paintOrder="stroke"
        dominantBaseline="top"
      >
        {value}
      </text>
    </svg>
  );
};

export default NumberSVG;
