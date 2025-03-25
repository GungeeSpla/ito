import { adjectives, colors, animals } from "./words";
import { db } from "../firebase";
import { get, ref } from "firebase/database";

const getRandom = (list: string[]) => list[Math.floor(Math.random() * list.length)];

const generateCandidateId = () => {
  const part1 = getRandom(adjectives);
  const part2 = getRandom(colors);
  const part3 = getRandom(animals);
  return `${part1}-${part2}-${part3}`;
};

// 🎯 最終的に使う関数（非同期）
export const generateUniqueRoomId = async (): Promise<string> => {
  let id = "";
  let exists = true;

  while (exists) {
    id = generateCandidateId();
    const roomRef = ref(db, `rooms/${id}`);
    const snap = await get(roomRef);
    exists = snap.exists();
  }

  return id;
};
