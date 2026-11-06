import React from "react";

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-4 my-4 ${className}`}>
      <div className="flex-grow h-px bg-gray-400 opacity-50" />
      <div className="text-sm font-semibold text-gray-100 whitespace-nowrap">
        {children}
      </div>
      <div className="flex-grow h-px bg-gray-400 opacity-50" />
    </div>
  );
};

export default SectionTitle;
