import { Eye, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playTap, playUnlock } from '../utils/sound';

interface EyeCareModalProps {
  open: boolean;
  onComplete: (bonusCoins: number) => void;
  onSkip: () => void;
}

const REST_SECONDS = 30;
const BONUS_COINS = 20;

export function EyeCareModal({ open, onComplete, onSkip }: EyeCareModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(REST_SECONDS);

  useEffect(() => {
    if (!open) {
      setSecondsLeft(REST_SECONDS);
      return;
    }
    setSecondsLeft(REST_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const progressPct = Math.round(
    ((REST_SECONDS - secondsLeft) / REST_SECONDS) * 100,
  );
  const done = secondsLeft === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border-4 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <Eye className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">
          護眼休息時間到囉！
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          已經連續專心學習 20 分鐘了，請看看窗外遠方或閉上眼睛休息{' '}
          <span className="font-black text-emerald-700">30 秒</span>，保護好視力！
        </p>

        <div className="my-5 rounded-2xl border-2 border-emerald-200 bg-white p-4">
          <div className="text-4xl font-black tabular-nums text-emerald-600">
            {done ? '完成！' : `${secondsLeft} 秒`}
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!done}
            onClick={() => {
              playUnlock();
              onComplete(BONUS_COINS);
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-black transition ${
              done
                ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            {done
              ? `休息完成！領取 +${BONUS_COINS} 金幣`
              : `請先休息 ${secondsLeft} 秒...`}
          </button>

          <button
            type="button"
            onClick={() => {
              playTap();
              onSkip();
            }}
            className="rounded-xl py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            先略過這次提醒
          </button>
        </div>
      </div>
    </div>
  );
}

export default EyeCareModal;
