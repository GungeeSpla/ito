import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Home, PlusCircle, RefreshCw } from 'lucide-react';
import type { RoomView, Tiebreak, Topic } from '@shared/engine.ts';
import ClickOrTouch from '@/components/common/others/ClickOrTouch';
import ProposalModal from '@/components/ui/ProposalModal';
import WoodyButton from '@/components/ui/WoodyButton';
import type { Send } from '@/hooks/useRoom.ts';
import { toastWithAnimation } from '@/utils/ui/toast';
import styles from './ChooseTopicPhase.module.scss';
import { headingClass, PhaseHeader } from './parts';

interface Props {
  room: RoomView;
  send: Send;
  /** お題が決まったあと、次の画面へ移る前の演出の間だけ渡す */
  chosenTitle?: string;
}

const ChooseTopicPhase: React.FC<Props> = ({ room, send, chosenTitle }) => {
  const round = room.round!;
  const { me } = room;
  const [showProposal, setShowProposal] = useState(false);
  const decided = chosenTitle !== undefined;
  const topics: (Topic & { by?: string })[] = decided ? [] : [...round.options, ...round.proposals];
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.nickname ?? '';

  // 同票でホストが決めるときは、全員に知らせる
  useEffect(() => {
    if (!round.tie) return;
    toastWithAnimation(me.isHost ? '同票なのでホストのあなたが決めてください！' : '同票なのでホストに決めてもらいます。', {
      duration: 5000,
      type: 'info',
    });
  }, [round.tie, me.isHost]);

  const fade = { initial: { opacity: 0 }, animate: { opacity: decided ? 0 : 1 } };

  return (
    <div className="relative min-h-dvh text-white">
      <ProposalModal
        open={showProposal}
        onClose={() => setShowProposal(false)}
        onSubmit={(topic) => send({ type: 'propose', topic: { title: topic.title, min: topic.min ?? '', max: topic.max ?? '' } })}
      />

      <PhaseHeader>
        {me.isHost && (
          <WoodyButton onClick={() => send({ type: 'toLobby' })}>
            <Home className="w-4 h-4 translate-y-[0.1rem]" />
            ロビーに戻る
          </WoodyButton>
        )}
      </PhaseHeader>

      <div className="relative w-full text-center px-4">
        <motion.h2 className={headingClass} {...fade} transition={{ duration: 0.4 }}>
          お題の選択
        </motion.h2>

        <motion.p className="text-center text-white text-shadow-md my-6" {...fade} transition={{ delay: decided ? 0 : 0.2 }}>
          {me.participant ? (
            <>
              遊びたいお題カードを
              <ClickOrTouch />
              して投票してください。
              <br />
              （ホストの一存で決めることもできます）
            </>
          ) : (
            'ゲームの途中です。次のゲームから参加できます。'
          )}
        </motion.p>

        <div className="max-w-3xl mx-auto flex items-center justify-center text-white px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {topics.map((topic, index) => {
                const voters = round.participants.filter((id) => round.votes[id] === topic.title);
                const isVoted = round.votes[me.id] === topic.title;
                const isChosen = topic.title === chosenTitle;
                return (
                  <motion.div
                    key={topic.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={isChosen ? { opacity: 0, scale: 1.2 } : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: decided ? 0 : 0.4 + index * 0.1 }}
                    layout
                    onClick={() => me.participant && !isVoted && send({ type: 'vote', title: topic.title })}
                    className={`${styles.topicCard} pb-8 relative bg-white text-black rounded-xl p-4 text-center transition border border-gray-300`}
                    title="これに投票する"
                    role="button"
                    aria-label={`お題「${topic.title}」に投票`}
                    aria-pressed={isVoted}
                    data-testid="topic-card"
                  >
                    <h3 className="text-lg font-semibold mb-2">{topic.title}</h3>
                    <div className="my-4">
                      <div className="grid grid-cols-2 text-xs text-gray-800">
                        <div className="text-left">1 {topic.min}</div>
                        <div className="text-right">{topic.max} 100</div>
                      </div>
                      <div className="h-[2px] bg-gray-900 mt-1" />
                    </div>
                    <p className="text-sm text-gray-900 mb-1">
                      票: {voters.length} {isVoted && <span>（投票済み）</span>}
                    </p>
                    {voters.length > 0 && <p className="text-xs text-gray-700 mb-2 break-all">{voters.map(nameOf).join('、')}</p>}
                    {topic.by && <p className="text-xs text-gray-700 mb-2">{nameOf(topic.by)} の提案</p>}
                    {me.isHost && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          title="これにする"
                          className={styles.forceChooseButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            send({ type: 'decide', title: topic.title });
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3 translate-y-[0.05rem]" />
                          これにする
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <motion.div className="text-center text-white text-shadow-md mt-6" {...fade} transition={{ delay: decided ? 0 : 0.8 }}>
          <div className="flex justify-center gap-4">
            {me.isHost && (
              <WoodyButton onClick={() => send({ type: 'redraw' })}>
                <RefreshCw className="w-4 h-4 translate-y-[0.1rem]" />
                <span>お題を再抽選</span>
              </WoodyButton>
            )}
            {me.participant && (
              <WoodyButton onClick={() => setShowProposal(true)}>
                <PlusCircle className="w-4 h-4 translate-y-[0.1rem]" />
                <span>お題を提案</span>
              </WoodyButton>
            )}
          </div>

          {me.isHost && (
            <div className="my-4 text-white text-shadow-md text-center">
              <label className="mr-2" htmlFor="tiebreak">
                同票時の決定方法：
              </label>
              <select
                id="tiebreak"
                value={room.settings.tiebreak}
                onChange={(e) => send({ type: 'updateSettings', settings: { tiebreak: e.target.value as Tiebreak } })}
                className="border border-gray-300 rounded px-2 py-1 text-black bg-white"
              >
                <option value="random">ランダムに決定</option>
                <option value="host">ホストが決定</option>
              </select>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ChooseTopicPhase;
