
import { adjectives, colors, animals } from "./words";

const getRandom = (list: string[]) => list[Math.floor(Math.random() * list.length)];

export const generateRoomId = () => {
  const part1 = getRandom(adjectives);
  const part2 = getRandom(colors);
  const part3 = getRandom(animals);
  return `${part1}-${part2}-${part3}`; // 例: brave-blue-panda
};