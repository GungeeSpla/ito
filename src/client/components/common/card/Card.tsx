import React from 'react';
import { ArrowDownLeft, Eraser, Pencil } from 'lucide-react';
import { FALLBACK_COLOR } from '@shared/colors.ts';
import HintSVG from '@/components/common/effects/HintSVG';
import NameSVG from '@/components/common/effects/NameSVG';
import NumberSVG from '@/components/common/effects/NumberSVG';
import styles from './Card.module.scss';

// カード 1 枚。表 (数字) と裏 (色・アバター・たとえワード) を回して見せる
interface CardProps {
  value: number | '?';
  name?: string;
  /** 表を向けるか */
  revealed?: boolean;
  isActive?: boolean;
  isMine?: boolean;
  mode?: 'place' | 'reveal';
  location?: 'hand' | 'field';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onEdit?: () => void;
  onClearHint?: () => void;
  onReturnToHand?: () => void;
  hint?: string;
  className?: string;
  avatarUrl?: string;
  color?: string;
  label?: string;
}

const stop = (handler?: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  handler?.();
};

const Card: React.FC<CardProps> = ({
  value,
  name,
  mode,
  location = 'field',
  revealed = true,
  isActive = false,
  isMine = false,
  onClick,
  onEdit,
  onClearHint,
  onReturnToHand,
  hint,
  className = '',
  avatarUrl,
  color,
  label,
}) => {
  // 特定の名前の人のカードに絵柄を出す遊び (index.css の .player-*)
  const playerClass = name ? `player-${name}` : '';
  const ownFieldCard = location === 'field' && mode === 'place' && isMine;

  return (
    <div
      className={`${styles.card} ${playerClass} ${className} ${isActive ? styles.active : ''}
        ${mode === 'place' ? styles.placeCard : styles.revealCard}
        ${location === 'hand' ? styles.handCard : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={label}
      aria-pressed={location === 'hand' ? isActive : undefined}
      data-value={typeof value === 'number' && (isMine || revealed) ? value : undefined}
    >
      {/*--- カードの表面と裏面を包括 ---*/}
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{ transform: `rotateY(${revealed ? 0 : 180}deg)`, transformStyle: 'preserve-3d' }}
      >
        {/*--- カードの表面 ---*/}
        <div
          className={`${styles.cardFore}
            ${location === 'hand' ? styles.handCard : ''}
            ${isActive ? styles.activeHandCard : ''}
            absolute w-full h-full rounded flex flex-col justify-center items-center`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={styles.dot} />
          {(mode === 'reveal' || value === 0 || location === 'hand') && <NumberSVG className={styles.numberSvg} value={value} />}
          {location === 'hand' && hint && (
            <div className="absolute w-full text-center top-6 left-1/2 -translate-x-1/2 text-sm text-black bg-opacity-50 px-1 break-all">
              {hint}
            </div>
          )}
          <p className={`${styles.name} text-shadow-sm`}>{name}</p>
        </div>

        {/*--- カードの裏面 ---*/}
        <div
          className={`${styles.cardBack} ito-card-back absolute w-full h-full rounded text-black flex flex-col justify-center items-center`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: color || FALLBACK_COLOR }}
          title={isMine && typeof value === 'number' ? `${value}` : ''}
        >
          <div className={styles.dot} />
          {avatarUrl ? (
            <div className={styles.face} style={{ backgroundImage: `url(${avatarUrl})` }} />
          ) : (
            <HintSVG className={styles.hintSvg} text={hint || ''} />
          )}
          <NameSVG className={styles.nameSvg} text={name || ''} />
        </div>
      </div>

      {/*--- たとえワードのフキダシ ---*/}
      {location === 'field' && hint && ((avatarUrl && mode === 'place') || (mode === 'reveal' && revealed)) && (
        <div className={styles.speechBubble}>
          {hint}
          <div className={styles.tail} />
        </div>
      )}

      {/*--- 手札: たとえワードの削除と入力 ---*/}
      {location === 'hand' && (
        <div>
          <div className="absolute top-1 left-1 flex gap-1">
            <button
              type="button"
              title="たとえワードを削除する"
              aria-label="たとえワードを削除する"
              onClick={stop(onClearHint)}
              className="text-white hover:bg-red-300 hover:border-red-400 text-xs bg-gray-400 p-0.5"
            >
              <Eraser size={16} />
            </button>
          </div>
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              type="button"
              title="たとえワードを入力する"
              aria-label="たとえワードを入力する"
              onClick={stop(onEdit)}
              className="text-white hover:bg-blue-300 hover:border-blue-400 text-xs bg-gray-400 p-0.5"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      )}

      {/*--- 場に出した自分のカード: 手札に戻す・たとえワードの書き換え・数字 ---*/}
      {ownFieldCard && (
        <>
          <div className="absolute bottom-[-1.7rem] left-1 flex gap-1">
            <button
              type="button"
              title="手札に戻す"
              aria-label="手札に戻す"
              onClick={stop(onReturnToHand)}
              className="text-white hover:bg-yellow-500 hover:border-yellow-600 text-xs bg-zinc-700 p-0.5 rounded-md"
            >
              <ArrowDownLeft size={16} />
            </button>
          </div>
          {onEdit && (
            <div className="absolute bottom-[-1.7rem] right-1 flex gap-1">
              <button
                type="button"
                title="たとえワードを入力する"
                aria-label="たとえワードを入力する"
                onClick={stop(onEdit)}
                className="text-white hover:bg-blue-500 hover:border-blue-600 text-xs bg-zinc-700 p-0.5 rounded-md"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
          {typeof value === 'number' && (
            <div
              className="absolute bottom-[-1.6rem] left-1/2 -translate-x-1/2 text-white text-sm font-bold text-center w-12"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.5), rgba(0,0,0,0.1))',
                borderRadius: '4px',
              }}
            >
              {value}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(Card);
