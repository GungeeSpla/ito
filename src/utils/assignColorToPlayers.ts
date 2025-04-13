import { ref, update } from "firebase/database";
import { db } from "@/firebase";
import { COLOR_PALETTE } from "@/utils/colors";

export const assignColorToPlayers = async (
  roomId: string,
  players: Record<string, { color?: string }>,
) => {
  const usedColors = Object.values(players)
    .map((p) => p.color)
    .filter((c): c is string => !!c && c !== "transparent");
  const availableColors = COLOR_PALETTE.filter((c) => !usedColors.includes(c));
  const shuffled = [...availableColors]; // 必要ならランダム or hue順にシャッフルしてもOK
  const needingColor = Object.entries(players).filter(
    ([_, p]) => !p.color || p.color === "transparent",
  );
  for (let i = 0; i < needingColor.length; i++) {
    const [userId] = needingColor[i];
    const color = shuffled[i % shuffled.length] || "transparent";
    await update(ref(db, `rooms/${roomId}/players/${userId}`), { color });
  }
};
