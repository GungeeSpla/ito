import React, { useEffect, useRef, useState } from 'react';
import { Copy, Crown, Lock, LockOpen, PlayIcon, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseCustomTopics, type RoomView, type SelectableTopicSet } from '@shared/engine.ts';
import NoticeGame from '@/components/common/others/NoticeGame';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PlayerSetupForm from '@/components/ui/PlayerSetupForm';
import SectionTitle from '@/components/ui/SectionTitle';
import WoodyButton from '@/components/ui/WoodyButton';
import type { Send } from '@/hooks/useRoom.ts';
import { useProfileForm } from '@/hooks/useProfileForm.ts';
import { preference } from '@/lib/identity.ts';
import { copyToClipboard } from '@/lib/clipboard';
import { toastWithAnimation } from '@/lib/toast';
import { headingClass, PhaseHeader } from './parts';

const TOPIC_SET_LABELS: Record<SelectableTopicSet, string> = { rainbow: 'レインボー', salmon: 'サーモンラン', custom: 'カスタム' };
const CUSTOM_TEXT_KEY = 'customTopicsText';
// 以前の版がブラウザに残した入力も引き継ぐ
const loadCustomText = () => preference.get(CUSTOM_TEXT_KEY) ?? localStorage.getItem('customPromptText') ?? '';

// index.css の button の共通スタイル (背景・余白・枠) を打ち消す
// スマホで押しやすいよう、アイコンの周りにも押せる余白を持たせる
const iconButton = 'shrink-0 bg-transparent p-1 border-0 rounded';
const selectClass = 'w-full p-2 bg-white text-black rounded focus:outline-none focus:ring-2 focus:ring-blue-400';

interface Props {
  room: RoomView;
  send: Send;
}

const WaitingPhase: React.FC<Props> = ({ room, send }) => {
  const { me, settings } = room;
  const form = useProfileForm();
  const [customText, setCustomText] = useState(loadCustomText);
  const [confirm, setConfirm] = useState<{ id: string; kind: 'kick' | 'host' | 'leave' } | null>(null);
  const navigate = useNavigate();
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
  const dialog =
    target &&
    {
      kick: {
        title: `${target.nickname} をキックしますか？`,
        description: 'キックした人は、このルームに入り直せなくなります。',
        label: 'キックする',
      },
      host: { title: `${target.nickname} にホストを渡しますか？`, description: undefined, label: 'ホストを渡す' },
      leave: { title: 'ルームから抜けますか？', description: undefined, label: '抜ける' },
    }[confirm.kind];

  return (
    <div className="relative min-h-dvh text-white overflow-x-hidden">
      <PhaseHeader>
        <WoodyButton onClick={copyUrl}>
          <Copy className="w-3 h-3" />
          ルームURLをコピー
        </WoodyButton>
      </PhaseHeader>

      <div className="relative w-full text-center px-4">
        <h2 className={headingClass}>数字の大きさを感覚でたとえて言葉にするゲーム</h2>
        <p className="text-center text-white text-shadow-md my-6">
          {!me.joined ? (
            room.locked ? (
              'このルームは参加を締め切っています。'
            ) : (
              'ニックネームを入力して、ルームに参加してください。'
            )
          ) : me.isHost ? (
            <>
              フレンドにルームURLを伝えましょう。
              {/* 開始できない理由は、1 人のあいだだけ出す */}
              {room.players.length < 2 && (
                <>
                  <br />
                  2人以上で開始できます。
                </>
              )}
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
                <li
                  key={player.id}
                  className={`text-sm flex items-center min-w-0 pr-1 ${player.online ? '' : 'opacity-50'}`}
                  title={player.online ? player.nickname : `${player.nickname}（接続していません）`}
                >
                  <span className="truncate">{player.nickname}</span>
                  {player.id === room.hostId && <Crown size={16} className="shrink-0 text-yellow-700 ml-1" aria-label="ホスト" />}
                  {player.id === me.id && <span className="shrink-0 text-white text-xs">（You）</span>}
                  {me.isHost && player.id !== me.id && (
                    <>
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => setConfirm({ id: player.id, kind: 'host' })}
                        title={`${player.nickname} にホストを渡す`}
                        aria-label={`${player.nickname} にホストを渡す`}
                      >
                        <Crown size={16} className="text-gray-400 hover:text-yellow-500" />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => setConfirm({ id: player.id, kind: 'kick' })}
                        title={`${player.nickname} をキック`}
                        aria-label={`${player.nickname} をキック`}
                      >
                        <XCircle size={16} className="text-red-600 hover:text-red-400" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {me.joined && !me.isHost && (
              <button
                type="button"
                className={`${iconButton} mt-3 text-xs text-gray-300 underline hover:text-white`}
                onClick={() => setConfirm({ id: me.id, kind: 'leave' })}
              >
                ルームから抜ける
              </button>
            )}
            {/* 締め切り: メンバーがそろったら新しい人を入れない */}
            {me.isHost ? (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                {room.locked && (
                  <span className="inline-flex items-center gap-1 text-yellow-300">
                    <Lock className="w-3 h-3" />
                    参加を締め切っています
                  </span>
                )}
                <button
                  type="button"
                  className={`${iconButton} inline-flex items-center gap-1 text-gray-300 underline hover:text-white`}
                  onClick={() => send({ type: 'setLocked', locked: !room.locked })}
                >
                  {room.locked ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {room.locked ? '受付を再開する' : '参加を締め切る'}
                </button>
              </div>
            ) : (
              room.locked && (
                <p className="mt-3 text-xs text-yellow-300 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  参加を締め切っています
                </p>
              )
            )}
          </div>

          {/* 参加フォーム。締め切り中は出さない */}
          {!me.joined && !room.locked && (
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
        title={dialog?.title ?? ''}
        description={dialog?.description}
        confirmLabel={dialog?.label}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.kind === 'leave') {
            if (await send({ type: 'leave' })) navigate('/');
          } else {
            send({ type: confirm.kind === 'kick' ? 'kick' : 'transferHost', playerId: confirm.id });
          }
        }}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
    </div>
  );
};

export default WaitingPhase;
