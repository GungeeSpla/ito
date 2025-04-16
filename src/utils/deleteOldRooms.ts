import { db } from "@/firebase";
import { ref, get, remove } from "firebase/database";
import { logInfo, logSuccess } from "@/utils/logger";

/**
 * 最終更新から一定時間経過したルームを削除する
 * 現在は「60分以上経過しているルーム」を対象にしている
 */
export const deleteOldRooms = async () => {
  logInfo("古いルームを削除しています…");

  const roomsRef = ref(db, "rooms");

  // 全ルーム情報を取得
  const snapshot = await get(roomsRef);
  if (!snapshot.exists()) return;

  const rooms = snapshot.val();
  const now = Date.now();
  const timeout = 60 * 60 * 1000; // 60分（ミリ秒換算）

  const promises: Promise<void>[] = [];

  // 各ルームの lastUpdated をチェックして、経過時間が60分超なら削除対象にする
  Object.entries(rooms).forEach(([roomId, roomData]: any) => {
    const updated = roomData.lastUpdated;

    if (updated && now - updated > timeout) {
      logSuccess("古いルームを削除しました。", { roomId });
      promises.push(remove(ref(db, `rooms/${roomId}`)));
    }
  });

  // 並列で削除実行（パフォーマンス効率化）
  await Promise.all(promises);
};
