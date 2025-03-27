import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useGlobalVolume } from "../../hooks/useGlobalVolume";
import { setGlobalSEVolume } from "../../utils/audio";

const VolumeControl: React.FC = () => {
  const [volume, setVolume] = useGlobalVolume();

  const handleChange = (val: number) => {
    setVolume(val);
    setGlobalSEVolume(val);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white px-3 py-2 rounded shadow-lg flex items-center gap-2">
      {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="w-24 accent-white"
      />
    </div>
  );
};

export default VolumeControl;
