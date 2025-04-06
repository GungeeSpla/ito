import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase";
import { ref, set, get } from "firebase/database";
import { generateUniqueRoomId } from "@/utils/generateRoomId";
import { Rocket } from "lucide-react";
import { toastWithAnimation } from "@/utils/toast";
import NoticeGame from "@/components/common/NoticeGame";
import { useUser } from "@/hooks/useUser";

// ----------------------------------------
// トップページコンポーネント：ルーム作成画面
// ----------------------------------------
function App() {
  const navigate = useNavigate(); // 画面遷移用フック（React Router）
  const { userId, userInfo, updateUserInfo, ensureUserExists } = useUser();

  // -----------------------------
  // 状態管理
  // -----------------------------
  const [nickname, setNickname] = useState(""); // 入力されたニックネーム
  const [color, setColor] = useState("#888888"); // ユーザーカラー
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // プロフィ―ル画像
  const inputRef = useRef<HTMLInputElement>(null); // 初期フォーカス用の参照

  // -----------------------------
  // プロフィール画像をアップロード・変換する処理
  // -----------------------------
  const uploadAvatarImage = async (
    file: File,
    userId: string,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.src = reader.result as string;
      };

      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas unsupported");

        ctx.clearRect(0, 0, size, size);

        const ratio = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * ratio) / 2;
        const y = (size - img.height * ratio) / 2;

        ctx.drawImage(img, x, y, img.width * ratio, img.height * ratio);

        canvas.toBlob(async (blob) => {
          if (!blob) return reject("Blob generation failed");

          const formData = new FormData();
          formData.append("avatar", blob, `${userId}.png`);
          formData.append("userId", userId);

          try {
            const res = await fetch("https://ito.gungee.jp/upload-avatar.php", {
              method: "POST",
              body: formData,
            });

            const data = await res.json();
            if (data.success && data.url) {
              resolve(data.url);
            } else {
              reject("Upload failed: " + data.message);
            }
          } catch (err) {
            reject("Upload error: " + err);
          }
        }, "image/png");
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // -----------------------------
  // ルーム作成処理
  // -----------------------------
  const createRoom = async () => {
    try {
      console.log("createRoom: start");

      if (!userId) {
        toastWithAnimation("ユーザーIDが取得できませんでした。", {
          type: "error",
        });
        return;
      }

      let avatarUrl = "";
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatarImage(avatarFile, userId);
        } catch (e) {
          console.warn("画像アップロードに失敗しました", e);
          toastWithAnimation("画像のアップロードに失敗しました。", {
            type: "warn",
          });
        }
      }

      // 必要なときだけユーザーを登録
      await ensureUserExists();

      // nickname 更新
      const updateData: any = { nickname, color };
      if (avatarUrl) updateData.avatarUrl = avatarUrl;
      await updateUserInfo(updateData);

      // 再取得（userInfo は非同期更新されるので注意）
      const snap = await get(ref(db, `users/${userId}`));
      const info = snap.val();

      if (!info) {
        toastWithAnimation("ユーザー情報が取得できませんでした。", {
          type: "error",
        });
        return;
      }

      // 重複しないランダムなルームIDを生成
      const roomId = await generateUniqueRoomId();

      const newPlayer = {
        nickname: info.nickname,
        color: info.color,
        avatarUrl: info.avatarUrl,
        joinedAt: Date.now(),
      };

      // Firebase Realtime Database にルーム情報を登録
      await set(ref(db, `rooms/${roomId}`), {
        host: userId,
        players: {
          [userId]: newPlayer,
        },
        phase: "waiting",
      });

      setTimeout(() => {
        toastWithAnimation("ルームを作成しました！", { type: "success" });
        navigate(`/room/${roomId}`);
        console.log("✅ createRoom: success", {
          nickname: info.nickname,
          roomId,
        });
      }, 300);
    } catch (err) {
      console.error("❌ createRoom error", err);
      toastWithAnimation("ルームの作成に失敗しました。", { type: "error" });
    }
  };

  // -----------------------------
  // 初期処理：前回のニックネーム復元＋フォーカス
  // -----------------------------
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (userInfo) {
      if (userInfo.nickname) setNickname(userInfo.nickname);
      if (userInfo.color) setColor(userInfo.color);
    }
  }, [userInfo]);

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12"></div>

      {/* コンテンツ */}
      <div className="relative w-full text-center px-4">
        {/*-------- 見出し --------*/}
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          itoレインボーオンライン
        </h2>
        <p className="text-center text-white text-shadow-md my-6">
          <span>ニックネームを入力して、ルームを作成してください。</span>
        </p>

        {/*-------- 設定画面 --------*/}
        <div
          className="
          bg-white/70 backdrop-blur-sm text-black p-6 my-6 rounded-xl shadow-md
          w-full max-w-md animate-fade-in relative mx-auto"
        >
          {/* 入力フォーム */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createRoom();
            }}
            className="space-y-6"
          >
            {/* ニックネーム */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-100">
                ニックネーム
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="ここにニックネームを入力"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-2.5 rounded-md border border-gray-400 bg-white text-black text-center
                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* ユーザーカラー */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-100">カラー</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-md border border-gray-300"
              />
            </div>

            {/* アバター画像アップロード */}
            <div>
              <label className="block text-sm mb-1 text-gray-100">
                プロフィール画像（任意）
              </label>

              {/* 隠したinput */}
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />

              {/* カスタムボタン */}
              <button
                type="button"
                className="px-3 py-1 bg-gray-200 text-black text-sm rounded hover:bg-gray-300 transition"
                onClick={() =>
                  document.getElementById("avatar-upload")?.click()
                }
              >
                画像を選ぶ
              </button>

              {/* プレビュー表示 */}
              {(avatarFile || userInfo?.avatarUrl) && (
                <div className="mt-3">
                  <img
                    src={
                      avatarFile
                        ? URL.createObjectURL(avatarFile)
                        : userInfo?.avatarUrl || ""
                    }
                    alt="プロフィール画像プレビュー"
                    className="w-16 h-16 object-cover rounded border border-gray-300"
                  />
                </div>
              )}
            </div>

            {/* 作成ボタン */}
            <button
              type="submit"
              disabled={!nickname.trim()}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition
               disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Rocket className="w-4 h-4" />
              ルームを作成
            </button>
          </form>
        </div>

        {/*-------- 注意書き --------*/}
        <NoticeGame />
      </div>
    </div>
  );
}

export default App;
