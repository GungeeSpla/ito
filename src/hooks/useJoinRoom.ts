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
  userInfo,
  players,
  setPlayers,
  setHost,
}: UseJoinRoomProps) => {
  const alreadyJoined = !!players[userId];

  const joinRoom = async (nicknameOverride?: string) => {
    const nickname = nicknameOverride?.trim() || userInfo.nickname;

    await update(ref(db, `users/${userId}`), {
      nickname,
      lastActive: Date.now(),
    });

    const roomRef = ref(db, `rooms/${roomId}`);
    const roomSnap = await get(roomRef);

    const newPlayer: PlayerInfo = {
      nickname,
      color: userInfo.color,
      avatarUrl: userInfo.avatarUrl,
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
