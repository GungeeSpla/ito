import { ref, get, set } from "firebase/database";
import { db } from "@/firebase";

/**
 * 指定されたルームの最大クリアレベルを取得する
 * @param roomId ルームID
 * @returns 最大クリアレベル（存在しない場合は1）
 */
export async function getRoomMaxClearLevel(roomId: string): Promise<number> {
  const levelRef = ref(db, `rooms/${roomId}/maxClearLevel`);
  const snapshot = await get(levelRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return 0; // 初期値
}

/**
 * 指定されたルームの最大クリアレベルを更新する（今のより高い場合のみ）
 * @param roomId ルームID
 * @param clearedLevel クリアしたレベル
 */
export async function updateRoomMaxClearLevel(
  roomId: string,
  clearedLevel: number,
): Promise<void> {
  const current = await getRoomMaxClearLevel(roomId);
  if (clearedLevel > current) {
    const levelRef = ref(db, `rooms/${roomId}/maxClearLevel`);
    await set(levelRef, clearedLevel);
  }
}
