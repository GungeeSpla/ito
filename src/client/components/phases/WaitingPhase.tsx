import React, { useEffect, useRef, useState } from 'react';
import { Copy, Crown, PlayIcon, XCircle } from 'lucide-react';
import { parseCustomTopics, type RoomView, type SelectableTopicSet } from '@shared/engine.ts';
import NoticeGame from '@/components/common/others/NoticeGame';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PlayerSetupForm from '@/components/ui/PlayerSetupForm';
import SectionTitle from '@/components/ui/SectionTitle';
import WoodyButton from '@/components/ui/WoodyButton';
import type { Send } from '@/hooks/useRoom.ts';
import { useProfileForm } from '@/hooks/useProfileForm.ts';
import { preference } from '@/lib/identity.ts';
import { copyToClipboard } from '@/utils/core/clipboard';
import { toastWithAnimation } from '@/utils/ui/toast';
import { PhaseHeader } from './parts';

const TOPIC_SET_LABELS: Record<SelectableTopicSet, string> = { rainbow: 'レインボー', salmon: 'サーモンラン', custom: 'カスタム' };
const CUSTOM_TEXT_KEY = 'customTopicsText';
// 以前の版がブラウザに残した入力も引き継ぐ
const loadCustomText = () => preference.get(CUSTOM_TEXT_KEY) ?? localStorage.getItem('customPromptText') ?? '';

// index.css の button の共通スタイル (背景・余白・枠) を打ち消す
const iconButton = 'bg-transparent p-0 border-0 rounded-none align-baseline';
const selectClass ='w-full p-2 bg-white text-black rounded focus:outline-none focus:ring-2 focus:ring-blue-400';

interface Props {
  room: RoomView;
  send: Send;
}

const WaitingPhase: React.FC<Props> = ({ room, send }) => {
  const { me, settings } = room;
  const form = useProfileForm();
  const [customText, setCustomText] = useState(loadCustomText);
  const [confirm, setConfirm] = useState<{ id: string; kind: 'kick' | 'host' } | null>(null);
  const players = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt);

  // カスタムお題は入力が止まってから送る。ゲーム開始の直前にも送り直す
  const customTopics = parseCustomTopics(customText);
  const sentCustom = useRef('');
  const syncCustom = async () => {
    const json = JSON.stringify(customTopics);
    if (sentCustom.current === json) return true;
    const ok = await send({ type: 'updateSettings', settings: { customTopics } });
    if (ok) sentCustom.current = json;
    return ok;
  };
  useEffect(() => {
    preference.set(CUSTOM_TEXT_KEY, customText);
    if (!me.isHost || settings.topicSet !== 'custom') return;
    const timer = setTimeout(syncCustom, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customText, me.isHost, settings.topicSet]);

  const start = async () => {
    if (settings.topicSet === 'custom' && !(await syncCustom())) return;
    await send({ type: 'start' });
  };

  const join = () => form.submit((profile) => send({ type: 'join', profile }));

  const copyUrl = async () => {
    try {
      await copyToClipboard(window.location.href);
      toastWithAnimation('ルームURLをコピーしました！', { type: 'success' });
    } catch {
      toastWithAnimation('コピーに失敗しました。', { type: 'error' });
    }
  };

  const target = confirm && room.players.find((p) => p.id === confirm.id);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <PhaseHeader>
        <WoodyButton onClick={copyUrl}>
          <Copy className="w-3 h-3" />
          ルームURLをコピー
        </WoodyButton>
      </PhaseHeader>

      <div className="relative w-full text-center px-4">
        <h2 className="text-3xl font-bold text-shadow-md mt-0 mb-4">数字の大きさを言葉でたとえて価値観を比べるゲーム</h2>
        <p className="text-center text-white text-shadow-md my-6">
          {!me.joined ? (
            'ニックネームを入力して、ルームに参加してください。'
          ) : me.isHost ? (
            <>
              フレンドにルームURLを伝えましょう。
              <br />
              2人以上になったらゲームを開始できます。
            </>
          ) : (
            'ホストのゲーム開始を待っています。'
          )}
        </p>

        <div className="bg-black/70 backdrop-blur-sm text-white p-6 my-6 rounded-md shadow-md w-full max-w-md animate-fade-in relative mx-auto">
          {/* 参加者一覧 */}
          <div className="mb-4">
            <SectionTitle className="mt-0">参加者一覧</SectionTitle>
            <ul className="grid grid-cols-2 gap-y-2 text-left" aria-label="参加者一覧">
              {players.map((player) => (
                <li key={player.id} className={`text-sm ${player.online ? '' : 'opacity-50'}`} title={player.online ? undefined : '接続していません'}>
                  {player.nickname}
                  {player.id === room.hostId && <Crown size={16} className="inline text-yellow-700 ml-1 relative top-[-0.05rem]" aria-label="ホスト" />}
                  {player.id === me.id && <span className="text-white text-xs">（You）</span>}
                  {me.isHost && player.id !== me.id && (
                    <>
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => setConfirm({ id: player.id, kind: 'host' })}
                        title={`${player.nickname} にホストを渡す`}
                        aria-label={`${player.nickname} にホストを渡す`}
                      >
                        <Crown size={16} className="inline text-gray-400 hover:text-yellow-500 ml-1 relative top-[-0.05rem]" />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => setConfirm({ id: player.id, kind: 'kick' })}
                        title={`${player.nickname} をキック`}
                        aria-label={`${player.nickname} をキック`}
                      >
                        <XCircle size={16} className="inline text-red-600 hover:text-red-400 ml-1 relative top-[-0.05rem]" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* 参加フォーム */}
          {!me.joined && (
            <div className="mb-4">
              <PlayerSetupForm form={form} submitLabel="ルームに参加" onSubmit={join} />
            </div>
          )}

          {/* ホスト用設定 */}
          {me.isHost ? (
            <div className="space-y-4">
              <div>
                <SectionTitle>お題セット</SectionTitle>
                <select
                  aria-label="お題セット"
                  value={settings.topicSet}
                  onChange={(e) => send({ type: 'updateSettings', settings: { topicSet: e.target.value as SelectableTopicSet } })}
                  className={selectClass}
                >
                  {Object.entries(TOPIC_SET_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {settings.topicSet === 'custom' && (
                <div>
                  <label className="block mb-1" htmlFor="custom-topics">
                    カスタムお題セット（{customTopics.length}件）
                  </label>
                  <textarea
                    id="custom-topics"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={6}
                    placeholder={`例：\nコンビニの商品の人気, 人気ない, 人気ある\n100円ショップの商品の人気, 人気ない, 人気ある`}
                    className="w-full p-2 bg-white text-black rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-sm">（カンマもしくはタブ区切りで記述）</p>
                </div>
              )}

              <div>
                <SectionTitle>レベル</SectionTitle>
                <select
                  aria-label="レベル"
                  value={settings.level}
                  onChange={(e) => send({ type: 'updateSettings', settings: { level: Number(e.target.value) } })}
                  className={selectClass}
                >
                  {Array.from({ length: room.levelMax }, (_, i) => i + 1).map((level) => (
                    <option key={level} value={level}>
                      レベル {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            me.joined && (
              <p className="text-sm text-center flex justify-center gap-x-4">
                <span>お題セット：{TOPIC_SET_LABELS[settings.topicSet]}</span>
                <span>レベル {settings.level}</span>
              </p>
            )
          )}
        </div>

        {me.isHost && (
          <div className="flex justify-center gap-x-2 h-12 scale-125">
            <WoodyButton onClick={start} disabled={room.players.length <= 1} className="absolute">
              <PlayIcon className="w-4 h-4" />
              ゲーム開始
            </WoodyButton>
          </div>
        )}

        <NoticeGame />
      </div>

      <ConfirmDialog
        open={!!target}
        title={confirm?.kind === 'kick' ? `${target?.nickname} をキックしますか？` : `${target?.nickname} にホストを渡しますか？`}
        description={confirm?.kind === 'kick' ? 'キックした人は、このルームに入り直せなくなります。' : undefined}
        confirmLabel={confirm?.kind === 'kick' ? 'キックする' : 'ホストを渡す'}
        onConfirm={() => {
          if (confirm) send({ type: confirm.kind === 'kick' ? 'kick' : 'transferHost', playerId: confirm.id });
        }}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
    </div>
  );
};

export default WaitingPhase;
