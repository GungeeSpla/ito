import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Howler } from "howler";

const LOCAL_STORAGE_KEY = "ito-volume";

export default function VolumeControl() {
  const [volume, setVolume] = useState(0.5);

  // 初期化時にローカルストレージから取得
  useEffect(() => {
    const savedVolume = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedVolume !== null) {
      const parsed = parseFloat(savedVolume);
      setVolume(isNaN(parsed) ? 1.0 : parsed);
      Howler.volume(isNaN(parsed) ? 1.0 : parsed);
    }
  }, []);

  // 音量変更時に即反映＆保存
  useEffect(() => {
    Howler.volume(volume);
    localStorage.setItem(LOCAL_STORAGE_KEY, volume.toString());
  }, [volume]);

  const toggleMute = () => {
    setVolume((prev) => (prev === 0 ? 1.0 : 0));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-2 bg-white/70 backdrop-blur-md p-2 rounded-xl shadow-md">
      <button className="bg-white text-black" onClick={toggleMute}>
        {volume === 0 ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        className="w-24 accent-blue-500"
      />
    </div>
  );
}
