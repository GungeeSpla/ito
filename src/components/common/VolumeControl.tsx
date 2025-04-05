// components/VolumeControl.tsx
import React, { useState, useEffect, useRef } from "react";
import { Howler } from "howler";
import * as Slider from "@radix-ui/react-slider";
import { Volume1, Volume2, VolumeX } from "lucide-react";

const VOLUME_STORAGE_KEY = "volumeLevel";

const VolumeControl: React.FC = () => {
  const [volume, setVolume] = useState(1); // 0 ~ 1
  const [showSlider, setShowSlider] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const storedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);

  // 初回：localStorageから読み込み
  useEffect(() => {
    if (storedVolume) {
      const vol = parseFloat(storedVolume);
      setVolume(vol);
      Howler.volume(vol);
    }
    setIsLoaded(true);
  }, []);

  // 音量が変わるたびに反映・保存
  useEffect(() => {
    Howler.volume(volume);
    localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
  }, [volume]);

  const triggerSliderTemporaryDisplay = () => {
    setShowSlider(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowSlider(false), 3000);
  };

  // 音量に応じてアイコン切替
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={16} className="absolute" />;
    if (volume <= 0.49) return <Volume1 size={16} className="absolute" />;
    return <Volume2 size={16} className="absolute" />;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative flex flex-col items-center">
        <div
          className={`
            ${showSlider ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
            transition-all duration-300 origin-bottom bg-white/50 w-8 rounded-full
            mb-2
          `}
        >
          <div className="w-2 h-2" />
          <div className="relative">
            {isLoaded && (
              <Slider.Root
                orientation="vertical"
                className="h-24 w-4 flex flex-col items-center select-none m-auto justify-between"
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => {
                  setVolume(v / 100);
                  triggerSliderTemporaryDisplay();
                }}
              >
                <Slider.Track className="relative bg-gray-300 grow w-[4px] rounded-full">
                  <Slider.Range className="absolute bg-blue-500 w-full rounded-full" />
                </Slider.Track>
                <Slider.Thumb
                  className="block w-4 h-4 bg-white border border-gray-500 rounded-full shadow
                hover:bg-gray-200 focus:outline-none transition"
                  aria-label="Volume"
                />
              </Slider.Root>
            )}
          </div>
          <div className="w-2 h-2" />
        </div>

        {/* スピーカーアイコン（クリックでスライダー表示） */}
        <button
          onClick={triggerSliderTemporaryDisplay}
          className="w-8 h-8 p-0 m-0 bg-white/80 text-gray-800 rounded-full shadow grid place-items-center
            hover:bg-gray-200 transition-all"
          aria-label="音量調整を表示"
        >
          {getVolumeIcon()}
        </button>
      </div>
    </div>
  );
};

export default VolumeControl;
