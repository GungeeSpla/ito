import { useEffect, useState } from "react";

export const useGlobalVolume = (): [number, (v: number) => void] => {
  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem("seVolume");
    return stored ? parseFloat(stored) : 0.5;
  });

  useEffect(() => {
    localStorage.setItem("seVolume", volume.toString());
  }, [volume]);

  return [volume, setVolume];
};
