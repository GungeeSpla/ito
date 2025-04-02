// ------------------------------------------------------
// ランダムな単語リストをインポート（形容詞・色・動物）
// ex: happy-blue-elephant みたいなIDを作るため
// ------------------------------------------------------
import { adjectives, colors, animals } from "./words";
import { db } from "../firebase";
import { get, ref } from "firebase/database";

// ------------------------------------------------------
// 与えられたリストからランダムに1つ選ぶユーティリティ関数
// ------------------------------------------------------
const getRandom = (list: string[]) =>
  list[Math.floor(Math.random() * list.length)];

// ------------------------------------------------------
// ランダムな3単語で構成されるIDの候補を生成
// 例: gentle-yellow-fox
// ------------------------------------------------------
const generateCandidateId = () => {
  const part1 = getRandom(adjectives);
  const part2 = getRandom(colors);
  const part3 = getRandom(animals);
  return `${part1}-${part2}-${part3}`;
};

// ------------------------------------------------------
// 実際に使うルームIDを生成（既存と重複しないもの）
// Firebase Realtime Database に存在しないIDが出るまでループ
// ------------------------------------------------------
export const generateUniqueRoomId = async (): Promise<string> => {
  let id = "";
  let exists = true;

  while (exists) {
    id = generateCandidateId(); // 候補を作成
    const roomRef = ref(db, `rooms/${id}`);
    const snap = await get(roomRef); // DBにそのルームが存在するか確認
    exists = snap.exists(); // 存在したら再生成
  }

  return id;
};
