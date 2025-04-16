import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase";
import { ref, set, get } from "firebase/database";
import { deleteRoomsByHost } from "@/utils/deleteRoomsByHost";
import { generateUniqueRoomId } from "@/utils/generateRoomId";
import { toastWithAnimation } from "@/utils/toast";
import NoticeGame from "@/components/common/NoticeGame";
import { useUser } from "@/hooks/useUser";
import PlayerSetupForm from "@/components/common/PlayerSetupForm";
import NameSVG from "@/components/common/NameSVG";
import { logInfo, logSuccess, logError } from "@/utils/logger";
import { deleteOldRooms } from "@/utils/deleteOldRooms";
import { deleteOldUsers } from "@/utils/deleteOldUsers";

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
  const [color, setColor] = useState("transparent"); // ユーザーカラー
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // プロフィ―ル画像
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>("");
  const [showOptions, setShowOptions] = useState<boolean>(() => {
    return localStorage.getItem("showOptions") === "true";
  });
  const [userLoading, setUserLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); // 初期フォーカス用の参照
  useEffect(() => {
    localStorage.setItem("showOptions", String(showOptions));
  }, [showOptions]);

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
      setRoomLoading(true);

      logInfo("データベースのクリーンアップをしています…");
      deleteOldRooms();
      deleteOldUsers();
      logInfo("データベースのクリーンアップが完了しました。");

      logInfo("ルームを作成しています…");

      if (!userId) {
        logError("ユーザーIDが取得できませんでした。");
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
          logError("画像のアップロードに失敗しました。", e);
          toastWithAnimation("画像のアップロードに失敗しました。", {
            type: "warn",
          });
        }
      }

      // 同一ユーザーが作っていた古い部屋を削除
      await deleteRoomsByHost(userId);

      // 必要なときだけユーザーを登録
      await ensureUserExists();

      // 更新用データ
      const updateData: any = {
        nickname,
        color,
        ...(avatarFile && { avatarUrl }),
      };
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
        logSuccess("ルームの作成に成功しました。", { roomId });
      }, 300);
    } catch (err) {
      logSuccess("ルームの作成に失敗しました。", err);
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
      if (userInfo.avatarUrl) setUserAvatarUrl(userInfo.avatarUrl);
      if (userInfo.nickname) setNickname(userInfo.nickname);
      if (userInfo.color) setColor(userInfo.color);
      setTimeout(() => {
        setUserLoading(false);
      }, 100);
    }
  }, [userInfo]);

  useEffect(() => {
    if (userAvatarUrl || avatarFile) {
      setTimeout(() => {
        setUserLoading(false);
      }, 100);
    }
  }, [userAvatarUrl, avatarFile]);

  const presetColors = [
    "#EF4444", // 赤
    "#F97316", // オレンジ
    "#EAB308", // 黄
    "#22C55E", // 緑
    "#14B8A6", // ティール
    "#06B6D4", // シアン
    "#3B82F6", // 青
    "#8B5CF6", // 紫
    "#EC4899", // ピンク
    "#7F1D1D", // ワインレッド
    "#5C4033", // チョコブラウン
    "#064E3B", // ディープグリーン
    "#1E3A8A", // ネイビーブルー
    "#4C1D95", // ダークプラム
    "#475569", // スレートブルー
  ];

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12"></div>

      {/* コンテンツ */}
      <div className="relative w-full text-center px-4 overflow-hidden">
        {/*-------- 見出し --------*/}
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          数字の大きさを言葉でたとえて価値観を共有するゲーム
        </h2>
        <p className="text-center text-white text-shadow-md my-6">
          <span>ニックネームを入力して、ルームを作成してください。</span>
        </p>

        {!!0 && !userLoading && (
          <div
            className="preview-card absolute bottom-1/2 right-4 w-32 h-44 rounded-sm border-2 shadow-xl
          flex items-center justify-center z-0 transition
          transform rotate-[-6deg] pointer-events-none"
            style={{
              backgroundColor:
                color && color !== "transparent" ? color : "#EF4444",
            }}
          >
            {avatarFile || userAvatarUrl ? (
              <img
                src={
                  avatarFile ? URL.createObjectURL(avatarFile) : userAvatarUrl
                }
                alt="アバター"
                className="w-28 h-auto"
              />
            ) : (
              <div />
            )}
            <NameSVG
              text={nickname}
              style={{
                position: "absolute",
                bottom: "0",
              }}
            />
          </div>
        )}

        {/*-------- 設定画面 --------*/}
        <div
          className="
          bg-black/70 backdrop-blur-sm text-black p-6 my-6 rounded-md shadow-md
          w-full max-w-md animate-fade-in relative mx-auto"
        >
          <PlayerSetupForm
            mode="create"
            nickname={nickname}
            setNickname={setNickname}
            color={color}
            setColor={setColor}
            avatarFile={avatarFile}
            setAvatarFile={setAvatarFile}
            onSubmit={createRoom}
            loading={roomLoading}
            showOptions={showOptions}
            setShowOptions={setShowOptions}
            presetColors={presetColors}
            userAvatarUrl={userAvatarUrl}
            setUserAvatarUrl={setUserAvatarUrl}
          />
        </div>

        {/*-------- 注意書き --------*/}
        <NoticeGame />

        {import.meta.env.DEV && (
          <button
            onClick={() => {
              ["showOptions", "userId", "volume", "nickname"].forEach((k) =>
                localStorage.removeItem(k),
              );
              location.reload();
            }}
            className="fixed left-1 bottom-1 z-50 bg-red-600 text-white px-3 py-1 rounded shadow-md"
          >
            Reset localStorage
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
