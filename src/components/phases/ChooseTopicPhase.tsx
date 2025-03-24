import React from "react";
import { Topic } from "../../types/Topic";

interface Props {
  topicOptions: Topic[];
  isHost: boolean;
  chooseTopic: (topic: Topic) => void;
}

const ChooseTopicPhase: React.FC<Props> = ({ topicOptions, isHost, chooseTopic }) => {
  return (
    <div>
      <h2>お題を選んでね：</h2>
      <ul>
        {topicOptions.map((t) => (
          <li key={t.title}>
            <strong>{t.title}</strong>
            <div>1 = {t.min} ／ 100 = {t.max}</div>
            {isHost && <button onClick={() => chooseTopic(t)}>これにする！</button>}
          </li>
        ))}
      </ul>
      {!isHost && <p>ホストが選ぶのを待ってね…</p>}
    </div>
  );
};

export default ChooseTopicPhase;
