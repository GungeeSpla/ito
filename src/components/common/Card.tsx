import React from "react"

interface CardProps {
  value: number | "?"
  name?: string
  revealed?: boolean
  isActive?: boolean
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({ value, name, revealed = true, isActive = false, onClick }) => {
  return (
    
    <div
      className={`w-20 h-28 flex flex-col justify-center items-center border rounded text-black
        ${revealed ? "bg-white" : "bg-gray-200"}
        ${isActive ? "border-4 border-blue-500" : "border-gray-300"}
        cursor-pointer bg-white text-lg font-bold`}
      onClick={onClick}
    >
      {name && <p className="text-sm">{name}</p>}
      <strong className="text-xl">{value}</strong>
    </div>
  )
}

export default Card
