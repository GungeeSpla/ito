import { get, ref, remove } from "firebase/database";
import { db } from "@/firebase";

// 古いユーザーを削除（1ヶ月非アクティブ）＋アバターも削除
export const deleteOldUsers = async () => {
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
          console.warn(`アバター削除失敗: ${userId}`, err);
        }
      }

      // users/{userId} を削除
      try {
        await remove(ref(db, `users/${userId}`));
        console.log(`ユーザー削除: ${userId}`);
      } catch (err) {
        console.warn(`ユーザー削除失敗: ${userId}`, err);
      }
    }
  });

  await Promise.all(deletions);
};
