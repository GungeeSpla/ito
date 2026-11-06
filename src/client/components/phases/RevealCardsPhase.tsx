import React, { useEffect } from 'react';
import { Home, PlayIcon, Undo2 } from 'lucide-react';
import type { RoomView } from '@shared/engine.ts';
import CardArea from '@/components/common/card/CardArea';
import EmojiBurst from '@/components/common/effects/EmojiBurst';
import FailBurst from '@/components/common/effects/FailBurst';
import WoodyButton from '@/components/ui/WoodyButton';
import type { Send } from '@/hooks/useRoom.ts';
import { failSound, flipSound, successSound } from '@/lib/sounds';
import { PhaseHeader, TopicHeading, useDelayed, useOnChange } from './parts';

/** カードが裏返る演出 (Card の duration-500) が終わってから結果を見せる */
const FLIP_MS = 600;

interface Props {
  room: RoomView;
  send: Send;
}

const RevealCardsPhase: React.FC<Props> = ({ room, send }) => {
  const round = room.round!;
  const { me } = room;
  const result = useDelayed(round.result, round.result ? FLIP_MS : 0);

  useOnChange(round.field.filter((c) => c.revealed).length, (previous, next) => {
    if (next > previous) flipSound.play();
  });

  useEffect(() => {
    if (result === 'success') successSound.play();
    if (result === 'fail') failSound.play();
  }, [result]);

  return (
    <div className="relative min-h-dvh text-white">
      <PhaseHeader>
        {me.isHost && (
          <>
            <WoodyButton onClick={() => send({ type: 'backToPlace' })}>
              <Undo2 className="w-4 h-4 translate-y-[0.1rem]" />
              プレイフェーズに戻る
            </WoodyButton>
            <WoodyButton onClick={() => send({ type: 'toLobby' })}>
              <Home className="w-4 h-4 translate-y-[0.1rem]" />
              ロビーに戻る
            </WoodyButton>
          </>
        )}
      </PhaseHeader>

      {round.topic && <TopicHeading topic={round.topic} />}

      <CardArea
        mode="reveal"
        field={round.field}
        players={room.players}
        myId={me.id}
        onRevealCard={me.participant ? (index) => send({ type: 'reveal', index }) : undefined}
        showMisplaced={result === 'fail'}
      />

      <div className="absolute responsive-text transition duration-200 left-1/2 top-1/2 -translate-x-1/2 translate-y-[8em] text-center">
        <div data-testid="result" className="mb-4 text-center font-bold text-2xl whitespace-nowrap">
          {result === 'success' && <span className="text-green-400">成功！</span>}
          {result === 'fail' && (
            <>
              <span className="text-red-400">失敗！</span>
              {round.field.some((c) => !c.revealed) && <p className="text-sm font-normal text-shadow-sm mt-1">残りのカードもめくれます。</p>}
            </>
          )}
          {!result && <span className="text-white text-shadow-sm">カードをめくろう！</span>}
        </div>
        {me.isHost && result && (
          <div className="flex justify-center gap-x-2">
            <WoodyButton onClick={() => send({ type: 'start' })}>
              <PlayIcon className="w-4 h-4 translate-y-[0.05rem]" />
              次のゲームへ
            </WoodyButton>
            <WoodyButton onClick={() => send({ type: 'toLobby' })}>
              <Home className="w-4 h-4 translate-y-[0.05rem]" />
              ロビーに戻る
            </WoodyButton>
          </div>
        )}
      </div>

      {result === 'success' && (
        <>
          <EmojiBurst />
          <div className="bg-gradient-success" />
        </>
      )}
      {result === 'fail' && (
        <>
          <FailBurst />
          <div className="bg-gradient-fail" />
        </>
      )}
    </div>
  );
};

export default RevealCardsPhase;
