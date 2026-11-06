import React, { useEffect, useRef, useState } from 'react';
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
  /** 手札のカードを選んでいる間・カードをドラッグしている間、カードの間に「ここに出す」を出す。押すか、ドロップすると呼ぶ */
  onInsertCard?: (index: number) => void;
  onRemoveCard?: (value: number) => void;
  onEditCard?: (value: number) => void;
  onRevealCard?: (index: number) => void;
  /** 場に出した自分のカードのドラッグを始めた (value) ・終えた (null) */
  onDragMine?: (value: number | null) => void;
  /** 失敗したとき、並びを崩したカードに印を付ける */
  showMisplaced?: boolean;
}

/** カードの間の「ここに出す」。押しても、カードをドロップしてもよい */
const InsertButton: React.FC<{ onClick: () => void; index: number }> = ({ onClick, index }) => {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${index} 番目に出す`}
      className={`flex flex-col items-center justify-center gap-0.5 text-xs text-white py-3 rounded transition w-7 px-1 border-0
        ${over ? 'bg-blue-400 scale-110' : 'bg-blue-600 hover:bg-blue-500'}`}
      onClick={onClick}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onClick();
      }}
    >
      <ArrowDownCircle className="w-3 h-3" />
      ここに出す
    </button>
  );
};

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

const CardArea: React.FC<Props> = ({
  mode,
  field,
  players,
  myId,
  onInsertCard,
  onRemoveCard,
  onEditCard,
  onRevealCard,
  onDragMine,
  showMisplaced = false,
}) => {
  const playerOf = (id: string) => players.find((p) => p.id === id);
  const misplaced = showMisplaced ? misplacedIndexes(field) : new Set<number>();

  // 自分が新しく出したカードが場の外なら、見えるところまで横にスクロールする
  const areaRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const previous = seenIds.current;
    seenIds.current = new Set(field.map((card) => card.id));
    const placed = previous && field.find((card) => card.playerId === myId && !previous.has(card.id));
    const area = areaRef.current;
    const el = placed && area?.querySelector<HTMLElement>(`[data-card-id="${placed.id}"]`);
    if (!area || !el) return;
    const visible = el.offsetLeft >= area.scrollLeft && el.offsetLeft + el.offsetWidth <= area.scrollLeft + area.clientWidth;
    if (!visible) area.scrollTo({ left: el.offsetLeft - (area.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [field, myId]);

  return (
    <div
      ref={areaRef}
      className={`${styles.playedCardsArea} responsive-text`}
      style={mode === 'reveal' ? { animation: 'none', opacity: 1 } : undefined}
    >
      <div className="flex items-center gap-2 pointer-events-auto">
        <Card value={0} location="field" name="" />
        {onInsertCard && <InsertButton index={0} onClick={() => onInsertCard(0)} />}
      </div>

      <AnimatePresence initial={false}>
        {field.map((card, index) => {
          const player = playerOf(card.playerId);
          const isMine = card.playerId === myId;
          const canReveal = mode === 'reveal' && !card.revealed && onRevealCard;
          const draggable = mode === 'place' && isMine && card.value !== null && !!onDragMine;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, translateY: isMine ? '2em' : '-2em' }}
              animate={{ opacity: 1, translateY: '0em' }}
              exit={{ opacity: 0, translateY: isMine ? '2em' : '-2em' }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 pointer-events-auto"
              data-testid="field-card"
              data-card-id={card.id}
            >
              <div
                draggable={draggable}
                className={draggable ? 'cursor-grab' : undefined}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(card.value));
                  e.dataTransfer.effectAllowed = 'move';
                  onDragMine?.(card.value);
                }}
                onDragEnd={() => onDragMine?.(null)}
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
              </div>
              {onInsertCard && <InsertButton index={index + 1} onClick={() => onInsertCard(index + 1)} />}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default CardArea;
