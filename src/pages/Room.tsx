import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ref, get, set, onValue, child } from "firebase/database";
import { db } from "../firebase";
import { Topic } from "../types/Topic";
import { topics } from "../data/topics";
import { deleteOldRooms } from "../utils/deleteOldRooms";
import { selectRandomTopics } from "../utils/selectRandomTopics";

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
  const [topicOptions, setTopicOptions] = useState<Topic[]>([]);
  const [selectedSet, setSelectedSet] = useState<"normal" | "rainbow" | "classic" | "salmon">("rainbow");
  const [level, setLevel] = useState<number>(1);

  const alreadyJoined = !!players[nickname];
  const isHost = nickname === host;
  
  const onRefreshTopics = async () => {
    const usedTopicsSnap = await get(ref(db, `rooms/${roomId}/usedTitles`));
    const usedTitles = usedTopicsSnap.exists()
      ? Object.keys(usedTopicsSnap.val())
      : [];
    const randomTopics = selectRandomTopics(topics, selectedSet, usedTitles);
    setTopicOptions(randomTopics);
  };

  // -----------------------------
  // 初期化＆リアルタイム監視（DBの値が変わるたびに再描画）
  // -----------------------------
  useEffect(() => {
    deleteOldRooms(); // 古いルームの自動削除（メンテ用）

    if (!roomId) {
      navigate("/");
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);

    // 初回読み取り：ルームが存在するかチェック
    get(roomRef).then((snap) => {
      if (!snap.exists()) {
        alert("ルームが存在しません！");
        navigate("/");
        return;
      }

      const room = snap.val();
      setHost(room.host || "");
      setPhase(room.phase || "waiting");
    });

    // 各項目をリアルタイムで購読（onValue = WebSocket的な役割）
    const unsub1 = onValue(child(roomRef, "phase"), (snap) => setPhase(snap.val() || "waiting"));
    const unsub3 = onValue(child(roomRef, "topicOptions"), (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) setTopicOptions(data);
    });
    const unsub4 = onValue(child(roomRef, "players"), (snap) => {
      const data = snap.val();
      if (data) setPlayers(data);
    });
    const unsub5 = onValue(child(roomRef, "host"), (snap) => {
      if (snap.exists()) setHost(snap.val());
    });

    setLoading(false);

    // クリーンアップ
    return () => {
      unsub1();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [roomId, nickname, navigate]);

  // -----------------------------
  // フェーズ: dealCards のときカードを配る
  // -----------------------------
  useDealCards({ phase, isHost, players, roomId: roomId!, level });

  // -----------------------------
  // プレイヤー参加処理（ニックネームを登録）
  // -----------------------------
  const addPlayer = () => {
    if (!newNickname.trim()) return alert("ニックネームを入力してね！");
    if (players[newNickname]) return alert("この名前は使われています！");

    const updatedPlayers = {
      ...players,
      [newNickname]: true,
    };

    const roomRef = ref(db, `rooms/${roomId}`);

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

    const usedTopicsSnap = await get(ref(db, `rooms/${roomId}/usedTitles`));
    const usedTitlesMap = usedTopicsSnap.exists()
      ? usedTopicsSnap.val()
      : {};
    const usedTitles = usedTopicsSnap.exists()
      ? Object.keys(usedTopicsSnap.val())
      : [];
    const randomTopics = selectRandomTopics(topics, selectedSet, usedTitles);

    let currentTiebreakMethod = "host";
    const tiebreakRef = ref(db, `rooms/${roomId}/tiebreakMethod`);
    await get(tiebreakRef).then((snap) => {
      if (snap.exists()) {
        const value = snap.val();
        if (value === "host" || value === "random") {
          currentTiebreakMethod = value;
        }
      }
    });

    const updates = {
      topicOptions: randomTopics,
      phase: "chooseTopic",
      level: level,
      players: players,
      host: host,
      tiebreakMethod: currentTiebreakMethod || "random",
      usedTitles: usedTitlesMap || {},
    };

    set(ref(db, `rooms/${roomId}`), updates);
  };

  // -----------------------------
  // ホストが1つのお題を選択（次フェーズへ）
  // -----------------------------
  const chooseTopic = (topic: Topic) => {
    if (!isHost) return;

    set(ref(db, `rooms/${roomId}/topic`), topic);
    set(ref(db, `rooms/${roomId}/phase`), "dealCards");
  };

  // -----------------------------
  // ロード中はプレースホルダーを表示
  // -----------------------------
  if (loading) return <div>読み込み中...</div>;

  // -----------------------------
  // 各フェーズごとに表示を切り替え
  // -----------------------------
  if (phase === "waiting") {
    return (
      <WaitingPhase
        roomId={roomId!}
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
      />
    );
  }

  if (phase === "chooseTopic") {
    return (
      <ChooseTopicPhase
        topicOptions={topicOptions}
        isHost={isHost}
        chooseTopic={chooseTopic}
        onRefreshTopics={onRefreshTopics}
      />
    );
  }

  if (phase === "dealCards") {
    return <DealCardsPhase roomId={roomId!} nickname={nickname} />;
  }

  if (phase === "placeCards") {
    return <PlaceCardsPhase roomId={roomId!} nickname={nickname} />;
  }

  if (phase === "revealCards") {
    return <RevealCardsPhase roomId={roomId!} nickname={nickname} />;
  }

  // 未定義のフェーズ用フォールバック
  return <div>不明なフェーズ: {phase}</div>;
};

export default Room;
