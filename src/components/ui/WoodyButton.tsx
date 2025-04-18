import React from "react";
import styles from "./WoodyButton.module.scss";

type WoodyButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

const WoodyButton: React.FC<WoodyButtonProps> = ({
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`${styles.woody} ${className}`}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default WoodyButton;
