import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Home, RefreshCcw } from 'lucide-react';
import type { RoomView } from '@shared/engine.ts';
import Card from '@/components/common/card/Card';
import CardArea from '@/components/common/card/CardArea';
import cardStyles from '@/components/common/card/Card.module.scss';
import EditHintModal from '@/components/ui/EditHintModal';
import WoodyButton from '@/components/ui/WoodyButton';
import type { Send } from '@/hooks/useRoom.ts';
import { dealSound, placeSound, returnSound } from '@/utils/ui/sounds';
import styles from './PlaceCardsPhase.module.scss';
import { PhaseHeader, TopicHeading, useOnChange } from './parts';

interface Props {
  room: RoomView;
  send: Send;
}

const PlaceCardsPhase: React.FC<Props> = ({ room, send }) => {
  const round = room.round!;
  const { me } = room;
  const [activeValue, setActiveValue] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<number | null>(null);
  // 配られた直後だけ、手札が降りてくる演出をする。演出を終えた配布の番号を覚えておく
  const [settledDeal, setSettledDeal] = useState<number | null>(null);
  const dealing = settledDeal !== round.dealId;
  useEffect(() => {
    dealSound.play();
    const timer = setTimeout(() => setSettledDeal(round.dealId), 2500);
    return () => clearTimeout(timer);
  }, [round.dealId]);

  // 場のカードが増えたら置く音、減ったら戻す音。配り直しで場が空になったときは鳴らさない
  useOnChange(`${round.dealId}:${round.field.length}`, (previous, next) => {
    const [prevDeal, prevCount] = previous.split(':').map(Number);
    const [deal, count] = next.split(':').map(Number);
    if (prevDeal !== deal) return;
    if (count > prevCount) placeSound.play();
    if (count < prevCount) returnSound.play();
  });

  // 選んでいたカードが手札から無くなったら (配り直しなど) 選択を外す
  const active = round.myHand.find((card) => card.value === activeValue) ? activeValue : null;

  // カード以外を押したら選択を外す
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest(`.${cardStyles.handCard}`)) return;
      setActiveValue(null);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const place = (index: number) => {
    if (active === null) return;
    setActiveValue(null);
    send({ type: 'place', value: active, index });
  };

  const editingCard =
    editingValue === null
      ? null
      : (round.myHand.find((c) => c.value === editingValue) ?? round.field.find((c) => c.playerId === me.id && c.value === editingValue));

  const waitingFor = room.players.filter((p) => (round.handCounts[p.id] ?? 0) > 0);

  return (
    <div className="relative min-h-screen text-white">
      <PhaseHeader>
        {me.isHost && (
          <>
            <WoodyButton onClick={() => send({ type: 'redeal' })}>
              <RefreshCcw className="w-4 h-4 translate-y-[0.1rem]" />
              手札を配り直す
            </WoodyButton>
            <WoodyButton onClick={() => send({ type: 'toLobby' })}>
              <Home className="w-4 h-4 translate-y-[0.1rem]" />
              ロビーに戻る
            </WoodyButton>
          </>
        )}
      </PhaseHeader>

      {round.topic && <TopicHeading topic={round.topic} animate />}

      <CardArea
        mode="place"
        field={round.field}
        players={room.players}
        myId={me.id}
        onInsertCard={active !== null ? place : undefined}
        onRemoveCard={(value) => send({ type: 'takeBack', value })}
        onEditCard={setEditingValue}
      />

      <div className="absolute responsive-text left-1/2 top-1/2 -translate-x-1/2 translate-y-[10em] text-center">
        {round.allPlaced ? (
          me.isHost && (
            <WoodyButton onClick={() => send({ type: 'toReveal' })}>
              <Eye className="w-4 h-4 translate-y-[0.1rem]" />
              めくりフェーズへ！
            </WoodyButton>
          )
        ) : (
          <p className="text-sm text-shadow-sm whitespace-nowrap" data-testid="waiting-for">
            まだ出していない人：{waitingFor.map((p) => p.nickname).join('、')}
          </p>
        )}
        {!me.participant && <p className="text-sm text-shadow-sm mt-2">ゲームの途中です。次のゲームから参加できます。</p>}
      </div>

      {/* 自分の手札 */}
      <div
        className={`${styles.handCardsArea} responsive-text w-full overflow-x-auto pointer-events-none px-4 pt-28 pb-2 fixed bottom-0 z-10`}
      >
        <div className="h-[14em] w-full absolute left-0 bottom-0 bg-gradient-to-t from-gray-900 to-transparent" />
        <div className="w-max mx-auto flex gap-2 responsive-text-hand-card" aria-label="手札">
          <AnimatePresence>
            {round.myHand.map((card) => (
              <motion.div
                key={`hand-${round.dealId}-${card.value}`}
                className="pointer-events-auto"
                layout
                initial={{ translateY: '-2rem', opacity: 0 }}
                animate={{ translateY: '0rem', opacity: 1 }}
                exit={{ translateY: '-2rem', opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  value={card.value}
                  mode="place"
                  location="hand"
                  label={`手札 ${card.value}`}
                  isActive={active === card.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveValue(active === card.value ? null : card.value);
                  }}
                  onEdit={() => setEditingValue(card.value)}
                  onClearHint={() => send({ type: 'setHint', value: card.value, hint: '' })}
                  hint={card.hint}
                  isMine
                  className={dealing ? styles.handCard : ''}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {editingCard && (
        <EditHintModal
          open
          initialValue={editingCard.hint}
          onSubmit={(hint) => {
            send({ type: 'setHint', value: editingValue!, hint });
            setEditingValue(null);
          }}
          onClose={() => setEditingValue(null)}
        />
      )}
    </div>
  );
};

export default PlaceCardsPhase;
