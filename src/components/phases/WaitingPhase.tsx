import React from "react";

interface WaitingPhaseProps {
  roomId: string;
  players: Record<string, boolean>;
  nickname: string;
  host: string;
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
  host,
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
        {Object.keys(players).map((player) => (
          <li key={player}>
            {player}
            {player === nickname && "（あなた）"}
            {player === host && <span style={{ color: "red" }}>（ホスト）</span>}
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

      {nickname === host && (
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
          {Object.keys(players).length > 1 && (
            <button onClick={startGame} style={{ marginLeft: "10px" }}>
              ゲーム開始
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default WaitingPhase;
