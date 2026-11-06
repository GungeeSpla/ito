// ルームとの接続。サーバーから届く状態を持ち、操作を送る
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Action, RoomView } from '@shared/engine.ts';
import { PROTOCOL_VERSION, type Ack, type ConnectRefusal, type Handshake } from '@shared/protocol.ts';
import { secret } from '@/lib/identity.ts';
import { toastWithAnimation } from '@/utils/ui/toast';

export type Connection = 'connecting' | 'online' | 'offline' | 'notFound';

const RELOADED_KEY = 'ito:reloadedForUpdate';

export function useRoom(roomId: string) {
  const [state, setState] = useState<RoomView | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const auth: Handshake = { protocol: PROTOCOL_VERSION, secret: secret(), roomId };
    const socket = io({ auth, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('state', (next: RoomView) => {
      sessionStorage.removeItem(RELOADED_KEY);
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
      if (refusal === 'notFound') {
        setConnection('notFound');
        socket.disconnect();
        return;
      }
      // 画面が古い。新しい版を読み込み直す (繰り返さないよう 1 回だけ)
      if (refusal === 'outdated' && !sessionStorage.getItem(RELOADED_KEY)) {
        sessionStorage.setItem(RELOADED_KEY, '1');
        location.reload();
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
