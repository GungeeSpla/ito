import React, { useEffect, useRef } from "react";
import styles from "./ItoAnimation.module.scss";

const ItoAnimation: React.FC = () => {
  const kotobaRef = useRef<HTMLImageElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const scaleNumberRef = useRef<HTMLDivElement>(null);
  const rulerNumberRef = useRef<HTMLDivElement>(null);
  const meterNumberRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(0);

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  useEffect(() => {
    // 1回の計測アニメーション時間は3秒
    const oneAnimationDuration = 3000;

    // アニメーション対象のリスト
    const refList = [
      {
        container: scaleRef,
        number: scaleNumberRef,
      },
      {
        container: rulerRef,
        number: rulerNumberRef,
      },
      {
        container: meterRef,
        number: meterNumberRef,
      },
    ];
    let currentRefIndex = -1;

    // カウントアップアニメーション
    let startTime = performance.now();
    const countUpDuration = 600;
    const initialValue = 0;
    let targetValue = 90;
    let currentValue = 100;
    const loop = (time: number) => {
      if (currentValue < targetValue) {
        const pastTime = time - startTime;
        const progress = pastTime / countUpDuration;
        const changeRatio = easeOutCubic(progress);
        currentValue = Math.max(
          0,
          Math.min(
            Math.floor(
              initialValue + (targetValue - initialValue) * changeRatio,
            ),
            targetValue,
          ),
        );
        const numberRef = refList[currentRefIndex].number.current;
        if (numberRef) {
          numberRef.textContent = String(currentValue);
        }
      }
      animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);

    // アニメーション開始
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;
    if (scaleRef.current) {
      const loop = () => {
        currentRefIndex = (currentRefIndex + 1) % 3;
        refList.forEach((item) => {
          item.container.current?.classList.remove(styles.animating);
        });
        refList[currentRefIndex].container.current?.classList.add(
          styles.animating,
        );
        kotobaRef.current?.setAttribute(
          "animation-index",
          String(currentRefIndex),
        );
        timeoutId = setTimeout(() => {
          currentValue = 0;
          targetValue = Math.floor(Math.random() * 99) + 1;
          startTime = performance.now();
        }, 300);
        const numberRef = refList[currentRefIndex].number.current;
        if (numberRef) {
          numberRef.textContent = "0";
        }
      };
      intervalId = setInterval(loop, oneAnimationDuration);
      loop();
    }

    // アンマウント時にアニメーションを解除
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={styles.itoAnimation}>
      <img
        ref={kotobaRef}
        className={styles.kotoba}
        src="/icons/kotoba.min.svg"
      />

      <div ref={scaleRef} className={styles.scale}>
        <div className={styles.head} />
        <div className={styles.neck} />
        <div className={styles.body} />
        <div className={styles.number}>
          <span ref={scaleNumberRef}>0</span>
        </div>
      </div>

      <div ref={rulerRef} className={styles.ruler}>
        <div className={styles.base} />
        <div className={styles.bone1} />
        <div className={styles.bone2} />
        <div className={styles.bone3} />
        <div className={styles.bone4} />
        <div className={styles.bone5} />
        <div className={styles.number}>
          <span ref={rulerNumberRef}>0</span>
        </div>
      </div>

      <div ref={meterRef} className={styles.thermometer}>
        <div className={styles.rotater}>
          <div className={styles.frame} />
          <div className={styles.bar} />
          <div className={styles.root} />
        </div>
        <div className={styles.number}>
          <span ref={meterNumberRef}>0</span>
        </div>
      </div>
    </div>
  );
};

export default ItoAnimation;
