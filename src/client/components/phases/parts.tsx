// 各フェーズで共通の部品
import React, { useEffect, useRef, useState } from 'react';
import type { Topic } from '@shared/engine.ts';
import FallingText from '@/components/common/effects/FallingText';
import styles from './PlaceCardsPhase.module.scss';

/** 画面上部の帯。右側にホスト用のボタンを並べる */
export const PhaseHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="relative h-12">
    {children && <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-x-2">{children}</div>}
  </div>
);

/** お題と、1 と 100 の意味 */
export const TopicHeading: React.FC<{ topic: Topic; animate?: boolean }> = ({ topic, animate = false }) => {
  const still = animate ? '' : styles.noAnim;
  return (
    <div className="relative w-full text-center max-w-xl mx-auto">
      <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">
        {animate ? <FallingText text={`お題：${topic.title}`} duration={0.8} /> : `お題：${topic.title}`}
      </h2>
      <div className={`${styles.scaleDescription} ${still} max-w-md mx-auto`}>
        <div className={`${styles.scaleText} ${still} grid grid-cols-2 font-bold text-white`}>
          <div className="text-left text-shadow-sm">1 {topic.min}</div>
          <div className="text-right text-shadow-sm">{topic.max} 100</div>
        </div>
        <div className={`${styles.scaleBar} ${still} box-shadow-md h-[2px] bg-white mt-1`} />
      </div>
    </div>
  );
};

/** 値が変わってから少し遅れて追いかける。めくる演出が終わってから結果を見せるのに使う */
export function useDelayed<T>(value: T, delayMs: number): T {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDelayed(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return delayed;
}

/** 値が変わったときに、前の値と今の値で onChange を呼ぶ。最初の描画では呼ばない */
export function useOnChange<T>(value: T, onChange: (previous: T, next: T) => void): void {
  const last = useRef(value);
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });
  useEffect(() => {
    const previous = last.current;
    if (Object.is(previous, value)) return;
    last.current = value;
    handler.current(previous, value);
  }, [value]);
}
