import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ref, get, set, remove, onValue, child, update } from "firebase/database";
import { db } from "../firebase";
import { Topic } from "../types/Topic";
import { topics } from "../data/topics";
import { deleteOldRooms } from "../utils/deleteOldRooms";
import { selectRandomTopics } from "../utils/selectRandomTopics";
import { toast } from "sonner";

// 各フェーズごとの画面コンポーネント
import WaitingPhase from "../components/phases/WaitingPhase";
import ChooseTopicPhase from "../components/phases/ChooseTopicPhase";
import DealCardsPhase from "../components/phases/DealCardsPhase";
import PlaceCardsPhase from "../components/phases/PlaceCardsPhase";
import RevealCardsPhase from "../components/phases/RevealCardsPhase";

// フェーズ内のカード配布処理（カスタムフック）
import { useDealCards } from "../hooks/useDealCards";

// --------------------------------------------
// ルーム画面（/room/:roomId）
// 各ゲームフェーズを切り替えながら進行を管理
// --------------------------------------------
const Room = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  useEffect(() => {
    if (!roomId) {
      navigate("/", { replace: true });
    }
  }, [roomId, navigate]);

  if (!roomId) return null;

  const safeRoomId = roomId;

  // ローカルストレージからニックネームを取得
  const storedNickname = localStorage.getItem("nickname") || "";

  // -----------------------------
  // 状態管理
  // -----------------------------
  const [nickname, setNickname] = useState(storedNickname);
  const [newNickname, setNewNickname] = useState("");
  const [players, setPlayers] = useState<Record<string, boolean>>({});
  const [host, setHost] = useState("");
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("waiting");
  const [selectedSet, setSelectedSet] = useState<"normal" | "rainbow" | "classic" | "salmon" | "custom">("rainbow");
  const [level, setLevel] = useState<number>(1);
  const alreadyJoined = !!players[nickname];
  const isHost = nickname === host;
  
  // トースト通知を1回だけ出す
  let toastTimerId: ReturnType<typeof setTimeout>;
  const toastOnce = (fn: () => void) => {
    clearTimeout(toastTimerId);
    toastTimerId = setTimeout(fn, 10);
  };
  
  // お題の再抽選
  const onRefreshTopics = async () => {
    const usedTopicsSnap = await get(ref(db, `rooms/${safeRoomId}/usedTitles`));
    const usedTitles = usedTopicsSnap.exists()
      ? Object.keys(usedTopicsSnap.val())
      : [];
    const randomTopics = selectRandomTopics(topics, selectedSet, usedTitles);
    await set(ref(db, `rooms/${safeRoomId}/topicOptions`), randomTopics);
  };

  // -----------------------------
  // 初期化＆リアルタイム監視（DBの値が変わるたびに再描画）
  // -----------------------------
  useEffect(() => {
    deleteOldRooms(); // 古いルームの自動削除（メンテ用）

    const roomRef = ref(db, `rooms/${safeRoomId}`);

    // 初回読み取り：ルームが存在するかチェック
    get(roomRef)
      .then((snap) => {
        if (!snap.exists()) {
          clearTimeout(toastTimerId)
          toastTimerId = setTimeout(() => {
            toastOnce(() => toast.error("ルームが存在しません。"))
          }, 10)
          navigate("/");
          return;
        }
        const room = snap.val();
        setHost(room.host || "");
        setPhase(room.phase || "waiting");
        setLoading(false);
        toastOnce(() => toast.success("ルームが見つかりました。"))
      })
      .catch((err) => {
        toastOnce(() => toast.error("初期化に失敗しました。"))
        console.error("初期読み込み失敗", err);
        setLoading(false);
      });

    // 各項目をリアルタイムで購読（onValue = WebSocket的な役割）
    const unsub1 = onValue(child(roomRef, "phase"), (snap) => setPhase(snap.val() || "waiting"));
    const unsub2 = onValue(child(roomRef, "players"), (snap) => {
      const data = snap.val();
      if (data) {
        setPlayers(data);
      }
    });
    const unsub3 = onValue(child(roomRef, "host"), (snap) => {
      if (snap.exists()) setHost(snap.val());
    });

    // クリーンアップ
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [roomId, navigate]);

  // -----------------------------
  // フェーズ: dealCards のときカードを配る
  // -----------------------------
  useDealCards({ phase, isHost, players, roomId: safeRoomId, level });

  // -----------------------------
  // プレイヤー参加処理（ニックネームを登録）
  // -----------------------------
  const addPlayer = () => {
    if (!newNickname.trim()) {
      toast.warning("ニックネームを入力してください。")
      return
    }
    if (players[newNickname]) {
      toast.warning("この名前はすでに使われています。")
      return
    }
    const updatedPlayers = {
      ...players,
      [newNickname]: true,
    };

    const roomRef = ref(db, `rooms/${safeRoomId}`);

    set(roomRef, {
      host: host || newNickname,
      players: updatedPlayers,
      phase: "waiting",
    }).then(() => {
      localStorage.setItem("nickname", newNickname);
      setNickname(newNickname);
    });
  };

  // -----------------------------
  // ゲーム開始（ホストのみ可能）
  // -----------------------------
  const startGame = async () => {
    if (!isHost) return;

    const usedTopicsSnap = await get(ref(db, `rooms/${safeRoomId}/usedTitles`));
    const usedData = usedTopicsSnap.exists() ? usedTopicsSnap.val() : {};
    const usedTitles = Object.keys(usedData);
    const randomTopics = selectRandomTopics(topics, selectedSet, usedTitles);

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

    const updates = {
      cardOrder: [],
      cards: {},
      customTopics: {},
      host,
      level,
      phase: "chooseTopic",
      players,
      revealedCards: [],
      selectedTopic: {},
      usedTitles: usedData,
      tiebreakMethod: currentTiebreakMethod,
      topic: {},
      topicOptions: randomTopics,
      votes: {},
    };

    update(ref(db, `rooms/${safeRoomId}`), updates);
    
    console.log("ゲームを開始します。")
    console.log("- カテゴリ:", selectedSet)
    console.log("- レベル:", level)
    console.log("- お題候補:", randomTopics)
  };

  // -----------------------------
  // お題を選択して次のフェーズへ（ホストのみ可能）
  // -----------------------------
  const chooseTopic = (topic: Topic) => {
    if (!isHost) return;

    update(ref(db, `rooms/${safeRoomId}`), {
      topic,
      phase: "dealCards"
    });
  };

  // -----------------------------
  // プレイヤー追放（ホストのみ可能）
  // -----------------------------
  const removePlayer = (playerName: string) => {
    if (!isHost) return;

    const playerRef = ref(db, `rooms/${safeRoomId}/players/${playerName}`);
    remove(playerRef)
  };

  // -----------------------------
  // 部屋を退出する
  // -----------------------------
  const leaveRoom = () => {
    if (!nickname || !safeRoomId) return;
  
    const playerRef = ref(db, `rooms/${safeRoomId}/players/${nickname}`);
    remove(playerRef).then(() => {
      toast.info("ルームを退出しました。");
      navigate("/");
    });
  };

  // -----------------------------
  // ロード中はプレースホルダーを表示
  // -----------------------------
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-white">
      <span className="text-xl font-semibold animate-pulse-dots">読み込み中</span>
    </div>
  );

  // -----------------------------
  // 各フェーズごとに表示を切り替え
  // -----------------------------
  if (phase === "waiting") {
    return (
      <WaitingPhase
        roomId={safeRoomId}
        players={players}
        nickname={nickname}
        host={host}
        alreadyJoined={alreadyJoined}
        newNickname={newNickname}
        setNewNickname={setNewNickname}
        addPlayer={addPlayer}
        selectedSet={selectedSet}
        setSelectedSet={setSelectedSet}
        setLevel={setLevel}
        startGame={startGame}
        level={level}
        removePlayer={removePlayer}
        leaveRoom={leaveRoom}
      />
    );
  }

  if (phase === "chooseTopic") {
    return (
      <ChooseTopicPhase
        isHost={isHost}
        chooseTopic={chooseTopic}
        onRefreshTopics={onRefreshTopics}
      />
    );
  }

  if (phase === "dealCards") {
    return <DealCardsPhase roomId={safeRoomId} nickname={nickname} />;
  }

  if (phase === "placeCards") {
    return <PlaceCardsPhase roomId={safeRoomId} nickname={nickname} />;
  }

  if (phase === "revealCards") {
    return <RevealCardsPhase roomId={safeRoomId} nickname={nickname} />;
  }

  // 未定義のフェーズ用フォールバック
  return <div>不明なフェーズ: {phase}</div>;
};

export default Room;
