import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ref, get, set, onValue, child } from "firebase/database";
import { db } from "../firebase";
import { Topic } from "../types/Topic";
import { topics } from "../data/topics";
import { deleteOldRooms } from "../utils/deleteOldRooms";

import WaitingPhase from "../components/phases/WaitingPhase";
import ChooseTopicPhase from "../components/phases/ChooseTopicPhase";
import DealCardsPhase from "../components/phases/DealCardsPhase";
import PlaceCardsPhase from "../components/phases/PlaceCardsPhase";
import RevealCardsPhase from "../components/phases/RevealCardsPhase";

const Room = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const storedNickname = localStorage.getItem("nickname") || "";
  const [nickname, setNickname] = useState(storedNickname);
  const [newNickname, setNewNickname] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("waiting");
  const [topicOptions, setTopicOptions] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSet, setSelectedSet] = useState<"normal" | "rainbow" | "classic">("normal");

  const alreadyJoined = players.includes(nickname);

  useEffect(() => {
    deleteOldRooms();
    
    if (!roomId) {
      navigate("/");
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    get(roomRef).then((snap) => {
      if (!snap.exists()) {
        alert("ルームが存在しません！");
        navigate("/");
        return;
      }

      const room = snap.val();
      setIsHost(room.host === nickname);
      setPhase(room.phase || "waiting");
    });

    const unsub1 = onValue(child(roomRef, "phase"), (snap) => setPhase(snap.val() || "waiting"));
    const unsub2 = onValue(child(roomRef, "topic"), (snap) => setSelectedTopic(snap.val() || null));
    const unsub3 = onValue(child(roomRef, "topicOptions"), (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) setTopicOptions(data);
    });
    const unsub4 = onValue(child(roomRef, "players"), (snap) => {
      const data = snap.val();
      if (Array.isArray(data)) setPlayers(data);
    });

    setLoading(false);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [roomId, nickname, navigate]);

  // 🔽 カードを配る処理（フェーズ: dealCards）
  useEffect(() => {
    if (phase === "dealCards" && isHost && players.length > 0) {
      const availableNumbers = Array.from({ length: 100 }, (_, i) => i + 1)
        .sort(() => 0.5 - Math.random())
        .slice(0, players.length);

      const cards = players.reduce((acc, player, idx) => {
        acc[player] = availableNumbers[idx];
        return acc;
      }, {} as Record<string, number>);

      const roomRef = ref(db, `rooms/${roomId}`);
      set(child(roomRef, "cards"), cards);
      set(child(roomRef, "phase"), "placeCards");
    }
  }, [phase, isHost, players, roomId]);

  const addPlayer = () => {
    if (!newNickname.trim()) return alert("ニックネームを入力してね！");
    if (players.includes(newNickname)) return alert("この名前は使われています！");

    const updatedPlayers = [...players, newNickname];
    const roomRef = ref(db, `rooms/${roomId}`);

    set(roomRef, {
      host: players[0] || newNickname,
      players: updatedPlayers,
      phase: "waiting",
    }).then(() => {
      localStorage.setItem("nickname", newNickname);
      setNickname(newNickname);
    });
  };

  const startGame = () => {
    if (!isHost) return;

    const randomTopics = topics
      .filter((t) => t.set === selectedSet)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    set(ref(db, `rooms/${roomId}/topicOptions`), randomTopics);
    set(ref(db, `rooms/${roomId}/phase`), "chooseTopic");
  };

  const chooseTopic = (topic: Topic) => {
    if (!isHost) return;
    set(ref(db, `rooms/${roomId}/topic`), topic);
    set(ref(db, `rooms/${roomId}/phase`), "dealCards");
  };

  if (loading) return <div>読み込み中...</div>;

  if (phase === "waiting") {
    return (
      <WaitingPhase
        roomId={roomId!}
        players={players}
        nickname={nickname}
        isHost={isHost}
        alreadyJoined={alreadyJoined}
        newNickname={newNickname}
        setNewNickname={setNewNickname}
        addPlayer={addPlayer}
        selectedSet={selectedSet}
        setSelectedSet={(s) => setSelectedSet(s as any)}
        startGame={startGame}
      />
    );
  }

  if (phase === "chooseTopic") {
    return (
      <ChooseTopicPhase
        topicOptions={topicOptions}
        isHost={isHost}
        chooseTopic={chooseTopic}
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

  return <div>不明なフェーズ: {phase}</div>;
};

export default Room;
