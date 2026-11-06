import React from 'react';

// 操作の呼び方を、タッチ操作の端末かどうかで変える
const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const ClickOrTouch: React.FC = () => <span>{isTouch ? 'タッチ' : 'クリック'}</span>;

export default ClickOrTouch;
