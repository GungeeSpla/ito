import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Home, RefreshCw, UserPlus } from 'lucide-react';
import type { Phase, RoomView } from '@shared/engine.ts';
import { ROOM_ID_PATTERN } from '@shared/protocol.ts';
import ChooseTopicPhase from '@/components/phases/ChooseTopicPhase';
import PlaceCardsPhase from '@/components/phases/PlaceCardsPhase';
import RevealCardsPhase from '@/components/phases/RevealCardsPhase';
import WaitingPhase from '@/components/phases/WaitingPhase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PlayerSetupForm from '@/components/ui/PlayerSetupForm';
import WoodyButton from '@/components/ui/WoodyButton';
import { useProfileForm } from '@/hooks/useProfileForm.ts';
import { useRoom, type Send } from '@/hooks/useRoom.ts';
import { toastWithAnimation } from '@/lib/toast';

/** お題が決まってから、選ばれたカードの演出を見せる時間 */
const CHOSEN_MS = 900;

const Message: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col items-center justify-center gap-6 h-dvh text-white text-center px-4">{children}</div>
);

/** お題が決まった直後は、すぐ次の画面へ移らず、選ばれたお題の演出を挟む */
function useDisplayedPhase(room: RoomView | null): { phase: Phase | null; chosenTitle?: string } {
  const [holding, setHolding] = useState<{ dealId: number; title: string } | null>(null);
  const [previous, setPrevious] = useState<Phase | null>(null);
  const phase = room?.phase ?? null;
  const round = room?.round;
  if (phase !== previous) {
    setPrevious(phase);
    if (previous === 'chooseTopic' && phase === 'placeCards' && round?.topic)
      setHolding({ dealId: round.dealId, title: round.topic.title });
    else if (holding) setHolding(null);
  }
  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => setHolding(null), CHOSEN_MS);
    return () => clearTimeout(timer);
  }, [holding]);
  if (holding && phase === 'placeCards' && round?.dealId === holding.dealId) return { phase: 'chooseTopic', chosenTitle: holding.title };
  return { phase };
}

/** ゲームの途中で来た人の参加の入口。参加すると次のゲームから遊べる */
const JoinLater: React.FC<{ send: Send }> = ({ send }) => {
  const [open, setOpen] = useState(false);
  const form = useProfileForm();
  return (
    <>
      <div className="fixed left-2 top-2 z-40">
        <WoodyButton onClick={() => setOpen(true)}>
          <UserPlus className="w-4 h-4 translate-y-[0.1rem]" />
          ルームに参加
        </WoodyButton>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-black/90 text-white border-gray-700 w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ルームに参加</DialogTitle>
            <DialogDescription className="text-gray-300">ゲームの途中なので、次のゲームから遊べます。</DialogDescription>
          </DialogHeader>
          <PlayerSetupForm
            form={form}
            submitLabel="ルームに参加"
            onSubmit={() =>
              form.submit(async (profile) => {
                if (await send({ type: 'join', profile })) setOpen(false);
              })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function Room() {
  const { roomId = '' } = useParams<{ roomId: string }>();
  if (!ROOM_ID_PATTERN.test(roomId)) return <Navigate to="/" replace />;
  return <RoomScreen key={roomId} roomId={roomId} />;
}

function RoomScreen({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const { state: room, connection, send } = useRoom(roomId);
  const { phase, chosenTitle } = useDisplayedPhase(room);

  useEffect(() => {
    if (connection !== 'notFound') return;
    toastWithAnimation('ルームが存在しません。', { type: 'error' });
    navigate('/', { replace: true });
  }, [connection, navigate]);

  // フェーズが変わったら上へ戻す。スクロールするのは Layout の main
  useEffect(() => {
    const timer = setTimeout(() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    return () => clearTimeout(timer);
  }, [phase]);

  if (connection === 'outdated') {
    return (
      <Message>
        <p className="text-xl font-semibold text-shadow-md">新しい版が公開されました。ページを読み込み直してください。</p>
        <WoodyButton onClick={() => location.reload()}>
          <RefreshCw className="w-4 h-4 translate-y-[0.1rem]" />
          読み込み直す
        </WoodyButton>
      </Message>
    );
  }

  if (!room) {
    return (
      <Message>
        <span className="text-xl font-semibold animate-pulse-dots">読み込み中</span>
      </Message>
    );
  }

  if (room.me.kicked) {
    return (
      <Message>
        <p className="text-xl font-semibold text-shadow-md">ホストによってルームから退出させられました。</p>
        <WoodyButton onClick={() => navigate('/')}>
          <Home className="w-4 h-4 translate-y-[0.1rem]" />
          トップへ
        </WoodyButton>
      </Message>
    );
  }

  return (
    <>
      {connection === 'offline' && (
        <div role="status" className="fixed top-0 inset-x-0 z-50 bg-yellow-500 text-black text-sm text-center py-1">
          サーバーとの接続が切れました。つなぎ直しています…
        </div>
      )}
      {!room.me.joined && room.phase !== 'waiting' && <JoinLater send={send} />}
      {phase === 'waiting' && <WaitingPhase room={room} send={send} />}
      {phase === 'chooseTopic' && <ChooseTopicPhase room={room} send={send} chosenTitle={chosenTitle} />}
      {phase === 'placeCards' && <PlaceCardsPhase room={room} send={send} />}
      {phase === 'revealCards' && <RevealCardsPhase room={room} send={send} />}
    </>
  );
}
