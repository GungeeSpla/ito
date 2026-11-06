import { useNavigate } from 'react-router-dom';
import ItoAnimation from '@/components/common/effects/ItoAnimation';
import NoticeGame from '@/components/common/others/NoticeGame';
import PlayerSetupForm from '@/components/ui/PlayerSetupForm';
import { useProfileForm } from '@/hooks/useProfileForm.ts';
import { createRoom } from '@/lib/api.ts';
import { headingClass } from '@/components/phases/parts';
import { toastWithAnimation } from '@/lib/toast';

// トップページ: ルームを作る
export default function Home() {
  const navigate = useNavigate();
  const form = useProfileForm();

  const create = () =>
    form.submit(async (profile) => {
      try {
        const { roomId } = await createRoom(profile);
        toastWithAnimation('ルームを作成しました！', { type: 'success' });
        navigate(`/room/${roomId}`);
      } catch (error) {
        toastWithAnimation((error as Error).message, { type: 'error' });
      }
    });

  return (
    <div className="relative min-h-dvh text-white">
      <ItoAnimation />

      <div className="relative w-full text-center px-4 overflow-hidden">
        <h2 className={headingClass}>数字の大きさを言葉でたとえて価値観を比べるゲーム</h2>
        <p className="text-center text-white text-shadow-md my-6">ニックネームを入力して、ルームを作成してください。</p>

        <div className="bg-black/70 backdrop-blur-sm text-black p-6 my-6 rounded-md shadow-md w-full max-w-md animate-fade-in relative mx-auto">
          <PlayerSetupForm form={form} submitLabel="ルームを作成" onSubmit={create} />
        </div>

        <NoticeGame />
      </div>
    </div>
  );
}
