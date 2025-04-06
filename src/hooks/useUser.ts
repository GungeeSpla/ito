import { useEffect, useState } from "react";
import { ref, get, set, update } from "firebase/database";
import { db } from "@/firebase";
import { UserInfo } from "@/types/User";

const LOCAL_STORAGE_KEY = "userId";

const generateUserId = () => crypto.randomUUID();

export const useUser = () => {
  const [userId, setUserId] = useState<string>("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // userIdだけ生成＆記録（登録まではしない！）
  useEffect(() => {
    let id = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!id) {
      id = generateUserId();
      localStorage.setItem(LOCAL_STORAGE_KEY, id);
    }
    setUserId(id);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;

      const userRef = ref(db, `users/${userId}`);
      const now = Date.now();

      const snap = await get(userRef);
      if (snap.exists()) {
        const existing = snap.val();
        setUserInfo(existing);
        await update(userRef, { lastActive: now });
      }
    };

    fetchUser();
  }, [userId]);

  // 必要になったら手動でユーザー登録
  const ensureUserExists = async () => {
    if (!userId) return;

    const userRef = ref(db, `users/${userId}`);
    const now = Date.now();

    const snap = await get(userRef);
    if (snap.exists()) {
      const existing = snap.val();
      setUserInfo(existing);
      await update(userRef, { lastActive: now });
    } else {
      const newUser: UserInfo = {
        userId,
        nickname: "名無しさん",
        color: "",
        avatarUrl: "",
        createdAt: now,
        lastActive: now,
      };
      await set(userRef, newUser);
      setUserInfo(newUser);
    }
  };

  const updateUserInfo = async (
    data: Partial<Omit<UserInfo, "userId" | "createdAt">>,
  ) => {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, data);
    setUserInfo((prev) => ({ ...prev!, ...data }));
  };

  return {
    userId,
    userInfo,
    setUserInfo,
    ensureUserExists,
    updateUserInfo,
  };
};
