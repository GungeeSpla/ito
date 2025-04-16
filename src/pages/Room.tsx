import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ref,
  get,
  set,
  remove,
  onValue,
  child,
  update,
} from "firebase/database";
import { db } from "@/firebase";
import { Topic } from "@/types/Topic";
import { topics } from "@/data/topics";
import { selectRandomTopics } from "@/utils/selectRandomTopics";
import { toastWithAnimation } from "@/utils/toast";
import { CardEntry } from "@/types/CardEntry";
import { useUser } from "@/hooks/useUser";
import { PlayerInfo } from "@/types/PlayerInfo";
import WaitingPhase from "@/components/phases/WaitingPhase";
import ChooseTopicPhase from "@/components/phases/ChooseTopicPhase";
import DealCardsPhase from "@/components/phases/DealCardsPhase";
import PlaceCardsPhase from "@/components/phases/PlaceCardsPhase";
import RevealCardsPhase from "@/components/phases/RevealCardsPhase";
import { useDealCards } from "@/hooks/useDealCards";
import { useJoinRoom } from "@/hooks/useJoinRoom";
import { assignColorToPlayers } from "@/utils/assignColorToPlayers";
import { logSuccess, logError, logInfo } from "@/utils/logger";

// --------------------------------------------
// ルーム画面（/room/:roomId）
// 各ゲームフェーズを切り替えながら進行を管理
// --------------------------------------------
const Room = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { userId, userInfo, ensureUserExists } = useUser();
  if (!roomId) return null;
  const safeRoomId = roomId ?? "";
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [host, setHost] = useState("");
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("waiting");
  const [selectedSet, setSelectedSet] = useState<
    "normal" | "rainbow" | "classic" | "salmon" | "custom"
  >("rainbow");
  const [level, setLevel] = useState<number>(1);
  const isHost = userId === host;
  const [cardOrder, setCardOrder] = useState<CardEntry[]>([]);
  const [customTopics, setCustomTopics] = useState<Topic[]>([]);
  useEffect(() => {
    if (userId) {
      ensureUserExists();
    }
  }, [userId]);
  const { joinRoom, alreadyJoined } = useJoinRoom({
    roomId: safeRoomId,
    userId,
    userInfo: {
      ...userInfo,
      nickname: userInfo?.nickname ?? "名無しさん",
      color: userInfo?.color ?? "",
      avatarUrl: userInfo?.avatarUrl ?? "",
      joinedAt: Date.now(),
    },
    players,
    setPlayers,
    setHost,
  });
  useEffect(() => {
    if (!roomId) {
      navigate("/", { replace: true });
    }
  }, [roomId, navigate]);

  // お題の再抽選
  const onRefreshTopics = async () => {
    const usedTopicsSnap = await get(ref(db, `rooms/${safeRoomId}/usedTopics`));
    const usedTopics = usedTopicsSnap.exists() ? usedTopicsSnap.val() : {};
    const usedTitles = Object.keys(usedTopics);
    const randomTopics = selectRandomTopics(
      topics,
      selectedSet,
      usedTitles,
      customTopics,
    );
    await set(ref(db, `rooms/${safeRoomId}/topicOptions`), randomTopics);
    logInfo("お題を再抽選しました。", {
      お題候補: randomTopics.map((t) => t.title).join(", "),
    });
  };

  // -----------------------------
  // 初期化＆リアルタイム監視（DBの値が変わるたびに再描画）
  // -----------------------------
  useEffect(() => {

    // 初回読み取り：ルームが存在するかチェック
    const roomRef = ref(db, `rooms/${safeRoomId}`);
    get(roomRef)
      .then((snap) => {
        if (!snap.exists()) {
          logError("ルームが存在しません。");
          toastWithAnimation("ルームが存在しません。", {
            type: "error",
          });
          navigate("/");
          return;
        }
        const room = snap.val();
        setHost(room.host || "");
        setPhase(room.phase || "waiting");
        setLoading(false);
      })
      .catch((err) => {
        toastWithAnimation("初期化に失敗しました。", {
          type: "error",
        });
        logError("初期化に失敗しました。", err);
        setLoading(false);
      });

    // 各項目をリアルタイムで購読（onValue = WebSocket的な役割）
    const unsub1 = onValue(child(roomRef, "phase"), (snap) =>
      setPhase(snap.val() || "waiting"),
    );
    const unsub2 = onValue(child(roomRef, "players"), (snap) => {
      const data = snap.val();
      if (data) {
        setPlayers(data as Record<string, PlayerInfo>);
      }
    });
    const unsub3 = onValue(child(roomRef, "host"), (snap) => {
      if (snap.exists()) setHost(snap.val());
    });
    const unsub4 = onValue(child(roomRef, "cardOrder"), (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) {
        setCardOrder(data);
      }
    });

    // クリーンアップ
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [roomId, navigate]);

  // -----------------------------
  // フェーズ: dealCards のときカードを配る
  // -----------------------------
  useDealCards({ phase, isHost, players, roomId: safeRoomId, level });

  // -----------------------------
  // ゲーム開始（ホストのみ可能）
  // -----------------------------
  const startGame = async () => {
    if (!isHost) return;

    const usedTopicsSnap = await get(ref(db, `rooms/${safeRoomId}/usedTopics`));
    const usedTopics = usedTopicsSnap.exists() ? usedTopicsSnap.val() : {};
    const usedTitles = Object.keys(usedTopics);
    const randomTopics = selectRandomTopics(
      topics,
      selectedSet,
      usedTitles,
      customTopics,
    );

    let currentTiebreakMethod = "random";
    const tiebreakRef = ref(db, `rooms/${safeRoomId}/tiebreakMethod`);
    await get(tiebreakRef).then((snap) => {
      if (snap.exists()) {
        const value = snap.val();
        if (value === "host" || value === "random") {
          currentTiebreakMethod = value;
        }
      }
    });

    await assignColorToPlayers(roomId, players);

    const updates = {
      cardOrder: [],
      cards: {},
      customTopics: {},
      host,
      level,
      phase: "chooseTopic",
      revealedCards: [],
      selectedTopic: {},
      usedTopics: usedTopics,
      tiebreakMethod: currentTiebreakMethod,
      topic: {},
      topicOptions: randomTopics,
      votes: {},
    };
    update(ref(db, `rooms/${safeRoomId}`), updates);

    logSuccess("ゲームを開始します。", {
      お題カテゴリ: selectedSet,
      プレイヤー: Object.values(players)
        .map((p) => p.nickname)
        .join(", "),
      レベル: level,
      お題候補: randomTopics.map((t) => t.title).join(", "),
    });
  };

  // -----------------------------
  // お題を選択して次のフェーズへ（ホストのみ可能）
  // -----------------------------
  const chooseTopic = (topic: Topic) => {
    if (!isHost) return;

    update(ref(db, `rooms/${safeRoomId}`), {
      topic,
      phase: "dealCards",
    });
  };

  // -----------------------------
  // プレイヤー追放（ホストのみ可能）
  // -----------------------------
  const removePlayer = (playerName: string) => {
    if (!isHost) return;

    const playerRef = ref(db, `rooms/${safeRoomId}/players/${playerName}`);
    remove(playerRef);
  };

  // -----------------------------
  // 部屋を退出する
  // -----------------------------
  const leaveRoom = () => {
    if (!userInfo || !userInfo.nickname || !safeRoomId) return;

    const playerRef = ref(db, `rooms/${safeRoomId}/players/${userId}`);
    remove(playerRef).then(() => {
      toastWithAnimation("ルームを退出しました。", {
        type: "success",
      });
      navigate("/");
    });
  };

  // -----------------------------
  // ロード中はプレースホルダーを表示
  // -----------------------------
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <span className="text-xl font-semibold animate-pulse-dots">
          読み込み中
        </span>
      </div>
    );

  if (!userId || !userInfo) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <span className="text-xl font-semibold animate-pulse-dots">
          ユーザー情報を取得中
        </span>
      </div>
    );
  }

  // -----------------------------
  // 各フェーズごとに表示を切り替え
  // -----------------------------
  if (phase === "waiting") {
    return (
      <WaitingPhase
        roomId={safeRoomId}
        players={players}
        host={host}
        alreadyJoined={alreadyJoined}
        addPlayer={(nickname) => joinRoom(nickname)}
        selectedSet={selectedSet}
        setSelectedSet={setSelectedSet}
        setLevel={setLevel}
        startGame={startGame}
        level={level}
        removePlayer={removePlayer}
        leaveRoom={leaveRoom}
        setCustomTopics={setCustomTopics}
      />
    );
  }

  if (phase === "chooseTopic") {
    return (
      <ChooseTopicPhase
        isHost={isHost}
        nickname={userInfo.nickname}
        chooseTopic={chooseTopic}
        onRefreshTopics={onRefreshTopics}
      />
    );
  }

  if (phase === "dealCards") {
    return <DealCardsPhase isHost={isHost} />;
  }

  if (phase === "placeCards") {
    return (
      <PlaceCardsPhase
        roomId={safeRoomId}
        userId={userInfo.userId}
        nickname={userInfo.nickname}
        cardOrder={cardOrder}
        setCardOrder={setCardOrder}
        players={players}
      />
    );
  }

  if (phase === "revealCards") {
    return (
      <RevealCardsPhase
        roomId={safeRoomId}
        userId={userId}
        nickname={userInfo.nickname}
        cardOrder={cardOrder}
        level={level}
        players={players}
      />
    );
  }

  // 未定義のフェーズ用フォールバック
  return <div>不明なフェーズ: {phase}</div>;
};

export default Room;
