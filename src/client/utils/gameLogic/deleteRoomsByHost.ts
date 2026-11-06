import { db } from "@/firebase";
import {
  ref,
  get,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { logInfo, logSuccess } from "@/utils/core/logger";

/**
 * 同一ユーザーがホストを務めている古いルームをすべて削除する。
 * （新しいルームを作成する前に実行することを想定）
 * @param userId 削除対象のホストID（つまり現在のユーザー）
 */
export const deleteRoomsByHost = async (userId: string) => {
  logInfo("同一ホストの既存ルームを削除しています…");

  const roomsRef = ref(db, "rooms");

  // host === userId のルームのみ取得
  const q = query(roomsRef, orderByChild("host"), equalTo(userId));
  const snapshot = await get(q);
  if (!snapshot.exists()) return;

  const rooms = snapshot.val();
  const promises: Promise<void>[] = [];

  Object.entries(rooms).forEach(([roomId]: any) => {
    logSuccess("同一ホストの既存ルームを削除しました。", { roomId });
    promises.push(remove(ref(db, `rooms/${roomId}`)));
  });

  await Promise.all(promises);
};
