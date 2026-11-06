import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownCircle } from 'lucide-react';
import type { FieldCardView, PlayerView } from '@shared/engine.ts';
import Card from '@/components/common/card/Card';
import styles from '@/components/phases/PlaceCardsPhase.module.scss';

// 場のカード。左端の 0 から順に並べる
interface Props {
  mode: 'place' | 'reveal';
  field: FieldCardView[];
  players: PlayerView[];
  myId: string;
  /** 手札のカードを選んでいる間、カードの間に「ここに出す」を出す */
  onInsertCard?: (index: number) => void;
  onRemoveCard?: (value: number) => void;
  onEditCard?: (value: number) => void;
  onRevealCard?: (index: number) => void;
  /** 失敗したとき、並びを崩したカードに印を付ける */
  showMisplaced?: boolean;
}

const InsertButton: React.FC<{ onClick: () => void; index: number }> = ({ onClick, index }) => (
  <button
    type="button"
    aria-label={`${index} 番目に出す`}
    className="flex flex-col items-center justify-center gap-0.5 text-xs bg-blue-600 text-white py-2 rounded hover:bg-blue-500 transition w-4 px-3"
    onClick={onClick}
  >
    <ArrowDownCircle className="w-3 h-3" />
    ここに出す
  </button>
);

/** めくったカードのうち、左にもっと大きい数字があるもの (並びが崩れた原因) */
function misplacedIndexes(field: FieldCardView[]): Set<number> {
  const result = new Set<number>();
  let max = -1;
  field.forEach((card, index) => {
    if (!card.revealed || card.value === null) return;
    if (card.value < max) result.add(index);
    max = Math.max(max, card.value);
  });
  return result;
}

const CardArea: React.FC<Props> = ({ mode, field, players, myId, onInsertCard, onRemoveCard, onEditCard, onRevealCard, showMisplaced = false }) => {
  const playerOf = (id: string) => players.find((p) => p.id === id);
  const misplaced = showMisplaced ? misplacedIndexes(field) : new Set<number>();
  return (
    <div className={`${styles.playedCardsArea} responsive-text`} style={mode === 'reveal' ? { animation: 'none', opacity: 1 } : undefined}>
      <div className="flex items-center gap-2 pointer-events-auto">
        <Card value={0} location="field" name="" />
        {onInsertCard && <InsertButton index={0} onClick={() => onInsertCard(0)} />}
      </div>

      <AnimatePresence initial={false}>
        {field.map((card, index) => {
          const player = playerOf(card.playerId);
          const isMine = card.playerId === myId;
          const canReveal = mode === 'reveal' && !card.revealed && onRevealCard;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, translateY: isMine ? '2em' : '-2em' }}
              animate={{ opacity: 1, translateY: '0em' }}
              exit={{ opacity: 0, translateY: isMine ? '2em' : '-2em' }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 pointer-events-auto"
              data-testid="field-card"
            >
              <Card
                value={card.value ?? '?'}
                name={player?.nickname}
                color={player?.color}
                avatarUrl={player?.avatarUrl}
                revealed={mode === 'reveal' && card.revealed}
                isMine={isMine}
                hint={card.hint}
                mode={mode}
                location="field"
                label={canReveal ? `${player?.nickname ?? ''}のカードをめくる` : undefined}
                onClick={canReveal ? () => onRevealCard(index) : undefined}
                onReturnToHand={isMine && onRemoveCard && card.value !== null ? () => onRemoveCard(card.value!) : undefined}
                onEdit={isMine && onEditCard && card.value !== null ? () => onEditCard(card.value!) : undefined}
                misplaced={misplaced.has(index)}
              />
              {onInsertCard && <InsertButton index={index + 1} onClick={() => onInsertCard(index + 1)} />}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default CardArea;
