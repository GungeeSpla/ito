import React, { useState, useEffect, useRef } from "react";
import { Crown, PlayIcon, LogOut, XCircle, Copy } from "lucide-react";
import { Topic } from "@/types/Topic";
import { getRoomMaxClearLevel } from "@/utils/levelProgress";
import WoodyButton from "@/components/common/WoodyButton";
import { toastWithAnimation } from "@/utils/toast";
import NoticeGame from "@/components/common/NoticeGame";
import { PlayerInfo } from "@/types/PlayerInfo";
import { useUser } from "@/hooks/useUser";
import PlayerSetupForm from "@/components/common/PlayerSetupForm";
import SectionTitle from "@/components/common/SectionTitle";
import { copyToClipboard } from "@/utils/clipboard";

// -----------------------------
// Props 型定義
// -----------------------------
interface WaitingPhaseProps {
  roomId: string;
  players: Record<string, PlayerInfo>;
  host: string;
  alreadyJoined: boolean;
  addPlayer: (nickname: string) => void;
  selectedSet: string;
  setSelectedSet: React.Dispatch<
    React.SetStateAction<"normal" | "rainbow" | "classic" | "salmon" | "custom">
  >;
  level: number;
  setLevel: (level: number) => void;
  startGame: () => void;
  removePlayer: (playerName: string) => void;
  leaveRoom: () => void;
  setCustomTopics: (topics: Topic[]) => void;
}

// -----------------------------
// メインコンポーネント
// -----------------------------
const WaitingPhase: React.FC<WaitingPhaseProps> = ({
  roomId,
  players,
  host,
  alreadyJoined,
  addPlayer,
  selectedSet,
  setSelectedSet,
  level,
  setLevel,
  startGame,
  removePlayer,
  leaveRoom,
  setCustomTopics,
}) => {
  const inputRef = useRef<HTMLInputElement>(null); // ニックネーム入力にフォーカスする用
  const [customPromptText, setCustomPromptText] = useState("");
  const [maxClearLevel, setMaxClearLevel] = useState(1);
  const { userId } = useUser();
  const { userInfo, updateUserInfo } = useUser();
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("transparent");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState("");
  const [showOptions, setShowOptions] = useState(() => {
    return localStorage.getItem("showOptions") === "true";
  });
  const [joinLoading, setJoinLoading] = useState(false);
  const presetColors = [
    "#EF4444",
    "#F97316",
    "#EAB308",
    "#22C55E",
    "#14B8A6",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#7F1D1D",
    "#5C4033",
    "#064E3B",
    "#1E3A8A",
    "#4C1D95",
    "#475569",
  ];

  // 最大クリアレベルを取得
  useEffect(() => {
    getRoomMaxClearLevel(roomId).then((level) => {
      setMaxClearLevel(level);
    });
  }, [roomId]);

  // -----------------------------
  // カスタムお題をパース
  // -----------------------------
  const parseCustomPrompts = (text: string): Topic[] => {
    const seenTitles = new Set<string>();
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim());
        const [title = "", min = "", max = ""] = parts;
        return { title, min, max, set: "custom" as const };
      })
      .filter(({ title }) => {
        if (seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
      });
  };

  // カスタムお題の保存＆Room.tsx側に反映
  useEffect(() => {
    localStorage.setItem("customPromptText", customPromptText);
    setCustomTopics(parseCustomPrompts(customPromptText));
  }, [customPromptText]);

  // 初回：ローカルストレージから復元
  useEffect(() => {
    const savedCustomPrompts = localStorage.getItem("customPromptText");
    if (savedCustomPrompts) {
      setCustomPromptText(savedCustomPrompts);
    }
  }, []);

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
      if (userInfo.avatarUrl) setUserAvatarUrl(userInfo.avatarUrl);
    }
  }, [userInfo]);

  // -----------------------------
  // 現在のページURLをクリップボードにコピー
  // -----------------------------
  const handleCopyUrl = async () => {
    try {
      await copyToClipboard(window.location.href);
      toastWithAnimation("ルームURLをコピーしました！", {
        type: "success",
      });
    } catch (err) {
      toastWithAnimation("コピーに失敗しました。", {
        type: "error",
      });
    }
  };
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

  const handleJoin = async () => {
    if (!userInfo || !nickname.trim()) return;
    setJoinLoading(true);

    try {
      let avatarUrl = userAvatarUrl;
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

      await updateUserInfo({ nickname, color, avatarUrl });
      await addPlayer(nickname);
    } catch (e) {
      toastWithAnimation("参加に失敗しました", { type: "error" });
    } finally {
      setJoinLoading(false);
    }
  };

  const isHost = userId === host; // ホスト判定

  // -----------------------------
  // UI描画
  // -----------------------------
  return (
    <div className="relative min-h-screen text-white">
      {/* ヘッダー */}
      <div key="ito-header" className="relative h-12">
        {/* 中断ボタン */}
        {isHost && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-x-2">
            <WoodyButton onClick={handleCopyUrl}>
              <Copy className="w-3 h-3" />
              ルームURLをコピー
            </WoodyButton>
            <WoodyButton onClick={leaveRoom}>
              <LogOut className="w-3 h-3" />
              ルームから退出する
            </WoodyButton>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="relative w-full text-center px-4">
        {/*-------- 見出し --------*/}
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
          数字の大きさを言葉でたとえて価値観を共有するゲーム
        </h2>
        <p className="text-center text-white text-shadow-md my-6">
          {!alreadyJoined ? (
            <span>ニックネームを入力して、ルームに参加してください。</span>
          ) : (
            <span>
              {isHost ? (
                <span>
                  フレンドにルームURLに伝えましょう。
                  <br />
                  2人以上になったらゲームを開始できます。
                </span>
              ) : (
                <span>ホストのゲーム開始を待っています。</span>
              )}
            </span>
          )}
        </p>

        {/*-------- 設定画面 --------*/}
        <div
          className="
          bg-black/70 backdrop-blur-sm text-white p-6 my-6 rounded-md shadow-md
          w-full max-w-md animate-fade-in relative mx-auto"
        >
          {/* プレイヤー一覧 */}
          <div className="mb-4">
            <SectionTitle className="mt-0">参加者一覧</SectionTitle>
            <ul className="grid grid-cols-2 gap-y-2 text-left">
              {Object.entries(players)
                .sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)) // ←ここで参加順ソート
                .map(([id, player]) => (
                  <li key={id} className="text-sm">
                    {player.nickname}
                    {id === host && (
                      <Crown
                        size={16}
                        className="inline text-yellow-700 ml-1 relative top-[-0.05rem]"
                      />
                    )}
                    <span className="text-white text-xs">
                      {id === userId && "（You）"}
                    </span>
                    {isHost && id !== host && (
                      <span
                        onClick={() => removePlayer(id)}
                        title={`${player.nickname} をキック`}
                      >
                        <XCircle
                          size={16}
                          className="cursor-pointer inline text-red-600 hover:text-red-400 ml-1 relative top-[-0.05rem]"
                        />
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </div>

          {/* 参加フォーム or メッセージ */}
          {!alreadyJoined && (
            <div className="mb-4">
              <PlayerSetupForm
                mode="join"
                nickname={nickname}
                setNickname={setNickname}
                color={color}
                setColor={setColor}
                avatarFile={avatarFile}
                setAvatarFile={setAvatarFile}
                onSubmit={handleJoin}
                loading={joinLoading}
                showOptions={showOptions}
                setShowOptions={setShowOptions}
                presetColors={presetColors}
                userAvatarUrl={userAvatarUrl}
                setUserAvatarUrl={setUserAvatarUrl}
              />
            </div>
          )}

          {/* ホスト用設定UI */}
          {isHost && (
            <div className="space-y-4">
              {/* お題セット選択 */}
              <div>
                <SectionTitle>お題セット</SectionTitle>
                <select
                  value={selectedSet}
                  onChange={(e) =>
                    setSelectedSet(
                      e.target.value as
                        | "normal"
                        | "rainbow"
                        | "classic"
                        | "salmon"
                        | "custom",
                    )
                  }
                  className="w-full p-2 bg-white text-black rounded
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="rainbow">レインボー</option>
                  <option value="normal">通常</option>
                  <option value="classic">クラシック</option>
                  <option value="salmon">サーモンラン</option>
                  <option value="custom">カスタム</option>
                </select>
              </div>

              {selectedSet === "custom" && isHost && (
                <div>
                  <label className="block mb-1">
                    カスタムお題セット（カンマ区切りで記述）
                  </label>
                  <textarea
                    value={customPromptText}
                    onChange={(e) => setCustomPromptText(e.target.value)}
                    rows={6}
                    placeholder={`例：\nコンビニの商品の人気, 人気ない, 人気ある\n100円ショップの商品の人気, 人気ない, 人気ある`}
                    className="w-full p-2 bg-white text-black rounded resize-y
                      focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}

              {/* レベル選択 */}
              <div>
                <SectionTitle>レベル</SectionTitle>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full p-2 bg-white text-black rounded focus:outline-none focus:ring-2
                  focus:ring-blue-400"
                >
                  {Array.from(
                    // { length: 10 }, // デバッグ用
                    { length: maxClearLevel + 1 },
                    (_, i) => i + 1,
                  ).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      レベル {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {isHost && (
          <div className="flex justify-center gap-x-2 h-12 scale-125">
            <WoodyButton
              onClick={startGame}
              disabled={Object.keys(players).length <= 1}
              className="absolute"
            >
              <PlayIcon className="w-4 h-4" />
              ゲーム開始
            </WoodyButton>
          </div>
        )}

        {/*-------- 注意書き --------*/}
        <NoticeGame />
      </div>
    </div>
  );
};

export default WaitingPhase;
