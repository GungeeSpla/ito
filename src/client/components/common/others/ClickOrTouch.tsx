import React, { useEffect, useState } from "react";

const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const touchDetected =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouch(touchDetected);
  }, []);

  return isTouch;
};

const ClickOrTouch: React.FC = () => {
  const isTouch = useIsTouchDevice();
  return <span>{isTouch ? "タッチ" : "クリック"}</span>;
};

export default ClickOrTouch;
