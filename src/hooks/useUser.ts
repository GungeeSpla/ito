import { useEffect, useState } from "react";
import { ref, get, set, update } from "firebase/database";
import { db } from "@/firebase";

const LOCAL_STORAGE_KEY = "userId";

const generateUserId = () => {
  return crypto.randomUUID(); // またはハッシュ化でもOK
};

export const useUser = () => {
  const [userId, setUserId] = useState<string>("");
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    let id = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!id) {
      id = generateUserId();
      localStorage.setItem(LOCAL_STORAGE_KEY, id);
    }
    setUserId(id);

    const userRef = ref(db, `users/${id}`);

    get(userRef).then((snap) => {
      const now = Date.now();

      if (snap.exists()) {
        const existing = snap.val();
        setUserInfo(existing);

        // lastActive 更新だけしておく
        update(userRef, { lastActive: now });
      } else {
        // 初回登録
        const newUser = {
          userId: id,
          nickname: "名無しの勇者",
          color: "#888888",
          avatarUrl: "",
          createdAt: now,
          lastActive: now,
        };
        set(userRef, newUser);
        setUserInfo(newUser);
      }
    });
  }, []);

  const updateUserInfo = async (
    data: Partial<Omit<any, "userId" | "createdAt">>,
  ) => {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, data);
    setUserInfo((prev: any) => ({ ...prev, ...data }));
  };

  return {
    userId,
    userInfo,
    updateUserInfo,
  };
};
