import { ref, get, update } from "firebase/database";
import { db } from "@/firebase";
import { PlayerInfo } from "@/types/PlayerInfo";

interface UseJoinRoomProps {
  roomId: string;
  userId: string;
  userInfo: PlayerInfo;
  players: Record<string, PlayerInfo>;
  setPlayers: (players: Record<string, PlayerInfo>) => void;
  setHost: (hostId: string) => void;
}

export const useJoinRoom = ({
  roomId,
  userId,
  players,
  setPlayers,
  setHost,
}: UseJoinRoomProps) => {
  const alreadyJoined = !!players[userId];

  const joinRoom = async (nicknameOverride?: string) => {
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    const latestUserInfo = userSnap.val() || {};

    const nickname = nicknameOverride?.trim() || latestUserInfo.nickname;

    await update(ref(db, `users/${userId}`), {
      nickname,
      lastActive: Date.now(),
    });

    const roomRef = ref(db, `rooms/${roomId}`);
    const roomSnap = await get(roomRef);

    const newPlayer: PlayerInfo = {
      nickname,
      color: latestUserInfo.color ?? "transparent",
      avatarUrl: latestUserInfo.avatarUrl ?? "",
      joinedAt: Date.now(),
    };

    const updates: any = {
      [`players/${userId}`]: newPlayer,
    };

    if (!roomSnap.exists()) {
      updates.host = userId;
      updates.phase = "waiting";
    }

    await update(roomRef, updates);
    setPlayers({ ...players, [userId]: newPlayer });
    if (!roomSnap.exists()) setHost(userId);
  };

  return { joinRoom, alreadyJoined };
};
