// ルームとの接続。サーバーから届く状態を持ち、操作を送る
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Action, RoomView } from '@shared/engine.ts';
import { PROTOCOL_VERSION, type Ack, type ConnectRefusal, type Handshake } from '@shared/protocol.ts';
import { secret } from '@/lib/identity.ts';
import { toastWithAnimation } from '@/lib/toast';

export type Connection = 'connecting' | 'online' | 'offline' | 'notFound' | 'outdated' | 'tooMany';

const RELOADED_KEY = 'ito:reloadedForUpdate';

// 新しい版へ読み込み直したかどうか。保存できない設定のブラウザでは、読み込み直しを繰り返さないよう「済み」とみなす
const reloadedForUpdate = {
  get: () => {
    try {
      return sessionStorage.getItem(RELOADED_KEY) !== null;
    } catch {
      return true;
    }
  },
  set: (value: boolean) => {
    try {
      if (value) sessionStorage.setItem(RELOADED_KEY, '1');
      else sessionStorage.removeItem(RELOADED_KEY);
    } catch {
      // 保存できなくても続ける
    }
  },
};

export function useRoom(roomId: string) {
  const [state, setState] = useState<RoomView | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const auth: Handshake = { protocol: PROTOCOL_VERSION, secret: secret(), roomId };
    const socket = io({ auth, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('state', (next: RoomView) => {
      reloadedForUpdate.set(false);
      setState(next);
    });
    socket.on('connect', () => setConnection('online'));
    socket.on('disconnect', (reason) => {
      setConnection('offline');
      // サーバーから切られたとき (部屋が消えたときなど) は自動でつなぎ直さないので、確かめに行く
      if (reason === 'io server disconnect') socket.connect();
    });
    socket.on('connect_error', (error) => {
      const refusal = error.message as ConnectRefusal;
      // 部屋が無い・接続が多すぎるときは、つなぎ直しても同じなので止める
      if (refusal === 'notFound' || refusal === 'tooMany') {
        setConnection(refusal);
        socket.disconnect();
        return;
      }
      // 画面が古い。新しい版を読み込み直す (繰り返さないよう 1 回だけ)。それでも古ければ、利用者に頼む
      if (refusal === 'outdated') {
        socket.disconnect();
        if (!reloadedForUpdate.get()) {
          reloadedForUpdate.set(true);
          location.reload();
        } else {
          setConnection('outdated');
        }
        return;
      }
      setConnection('offline');
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  /** 操作を送る。断られたら、その理由を表示して false を返す */
  const send = useCallback(async (action: Action): Promise<boolean> => {
    const socket = socketRef.current;
    let ack: Ack;
    try {
      if (!socket?.connected) throw new Error();
      ack = await socket.timeout(8000).emitWithAck('action', action);
    } catch {
      ack = { error: 'サーバーにつながっていません。少し待ってからお試しください' };
    }
    if (ack.error) {
      toastWithAnimation(ack.error, { type: 'error' });
      return false;
    }
    return true;
  }, []);

  return { state, connection, send };
}

export type Send = ReturnType<typeof useRoom>['send'];
