import { Howl } from "howler";

let currentVolume = 0.5;

export const setGlobalSEVolume = (volume: number) => {
  currentVolume = volume;
};

export const playSE = (src: string) => {
  const sound = new Howl({
    src: [src],
    volume: currentVolume,
  });
  sound.play();
};
