import React from "react";

interface WaitingPhaseProps {
  roomId: string;
  players: string[];
  nickname: string;
  isHost: boolean;
  alreadyJoined: boolean;
  newNickname: string;
  setNewNickname: (name: string) => void;
  addPlayer: () => void;
  selectedSet: string;
  setSelectedSet: (set: string) => void;
  startGame: () => void;
}

const WaitingPhase: React.FC<WaitingPhaseProps> = ({
  roomId,
  players,
  nickname,
  isHost,
  alreadyJoined,
  newNickname,
  setNewNickname,
  addPlayer,
  selectedSet,
  setSelectedSet,
  startGame,
}) => {
  return (
    <div>
      <h1>ルームID: {roomId}</h1>
      <h2>参加者一覧:</h2>
      <ul>
        {players.map((player, i) => (
          <li key={i}>
            {player}
            {player === nickname && "（あなた）"}
            {player === players[0] && <span style={{ color: "red" }}>（ホスト）</span>}
          </li>
        ))}
      </ul>

      {!alreadyJoined ? (
        <div>
          <input
            type="text"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            placeholder="ニックネームを入力"
          />
          <button onClick={addPlayer}>参加する</button>
        </div>
      ) : (
        <p>あなたはこのルームに参加しています</p>
      )}

      {isHost && (
        <>
          <label>お題セットを選んでね：</label>
          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(e.target.value)}
          >
            <option value="normal">通常</option>
            <option value="rainbow">レインボー</option>
            <option value="classic">クラシック</option>
          </select>
          {players.length > 1 && <button onClick={startGame}>ゲーム開始</button>}
        </>
      )}
    </div>
  );
};

export default WaitingPhase;
