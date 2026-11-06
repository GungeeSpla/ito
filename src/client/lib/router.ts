// 画面の切り替え。画面はトップ (/) とルーム (/room/:id) の 2 つだけなので、ライブラリを使わずに History API で行う
import { useSyncExternalStore } from 'react';

const CHANGE = 'ito:navigate';

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
};

/** 今のパス。戻る・進むと navigate で変わる */
export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname);

export function navigate(to: string, { replace = false } = {}): void {
  if (to === location.pathname) return;
  if (replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  window.dispatchEvent(new Event(CHANGE));
}
