import { get, ref, remove } from "firebase/database";
import { db } from "@/firebase";
import { logInfo, logWarn, logSuccess } from "@/utils/logger";

// 古いユーザーを削除（1ヶ月非アクティブ）＋アバターも削除
export const deleteOldUsers = async () => {
  logInfo("古いユーザーを削除しています…");

  const usersRef = ref(db, "users");
  const snap = await get(usersRef);
  const users = snap.val() ?? {};

  const now = Date.now();
  const oneMonth = 30 * 24 * 60 * 60 * 1000;
  // const oneMonth = 1; // デバッグ用

  const deletions = Object.entries(users).map(async ([userId, info]: any) => {
    if (info.lastActive && now - info.lastActive > oneMonth) {
      // プロフィール画像がある場合、削除をリクエスト
      if (info.avatarUrl) {
        try {
          await fetch("https://ito.gungee.jp/delete-avatar.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          });
        } catch (err) {
          logWarn(`アバター画像の削除に失敗しました: ${userId}`, err);
        }
      }

      // users/{userId} を削除
      try {
        await remove(ref(db, `users/${userId}`));
        logSuccess(`ユーザーを削除しました: ${userId}`);
      } catch (err) {
        logWarn(`ユーザーの削除に失敗しました: ${userId}`, err);
      }
    }
  });

  await Promise.all(deletions);
};
