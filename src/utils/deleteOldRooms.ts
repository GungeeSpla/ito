import { db } from "../firebase";
import { ref, get, remove } from "firebase/database";

export const deleteOldRooms = async () => {
  const roomsRef = ref(db, "rooms");
  const snapshot = await get(roomsRef);
  if (!snapshot.exists()) return;

  const rooms = snapshot.val();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const promises: Promise<void>[] = [];

  Object.entries(rooms).forEach(([roomId, roomData]: any) => {
    const updated = roomData.lastUpdated ?? 0;
    const isOld = now - updated > oneDay;

    if (isOld) {
      console.log(`🧹 削除対象: ${roomId}`);
      promises.push(remove(ref(db, `rooms/${roomId}`)));
    }
  });

  await Promise.all(promises);
  console.log("✅ 24時間以上経過したルームの削除が完了しました");
};
