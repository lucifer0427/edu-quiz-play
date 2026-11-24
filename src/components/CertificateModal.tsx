import { Award, Printer, Sparkles, X } from 'lucide-react';
import { playTap } from '../utils/sound';

interface CertificateModalProps {
  open: boolean;
  nickname: string;
  achievementTitle: string;
  subtitle: string;
  onClose: () => void;
}

export function CertificateModal({
  open,
  nickname,
  achievementTitle,
  subtitle,
  onClose,
}: CertificateModalProps) {
  if (!open) return null;

  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="榮譽冒險小獎狀"
    >
      <div className="w-full max-w-lg rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-amber-50 via-white to-yellow-50 p-6 text-center shadow-2xl sm:p-8 print:border-amber-500 print:shadow-none">
        <div className="flex justify-end print:hidden">
          <button
            type="button"
            onClick={() => {
              playTap();
              onClose();
            }}
            aria-label="關閉獎狀"
            className="rounded-xl bg-white/80 p-2 text-slate-500 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
          <Award className="h-9 w-9" />
        </div>

        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black tracking-widest text-amber-800">
          <Sparkles className="h-3.5 w-3.5" />
          <span>知識大冒險 · 榮譽獎狀</span>
        </div>

        <h2 className="mt-4 text-3xl font-black text-slate-900">
          {nickname} 小勇者
        </h2>

        <p className="mt-3 text-sm font-bold text-slate-600">
          憑藉認真專注的學習態度與不放棄的精神，成功達成：
        </p>

        <div className="my-4 rounded-2xl border-2 border-amber-300 bg-white px-4 py-4 shadow-2xs">
          <div className="text-xl font-black text-amber-700">
            🏆 {achievementTitle}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-600">
            {subtitle}
          </div>
        </div>

        <p className="text-xs font-bold text-slate-500">
          每一次思考與練習，都在讓大腦變得更強壯！繼續保持這份好奇心喔！
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-amber-200 pt-4 text-xs font-black text-slate-500">
          <span>頒發日期：{today}</span>
          <span>EduQuiz Play 認證</span>
        </div>

        <div className="mt-5 flex justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => {
              playTap();
              window.print();
            }}
            className="btn-3d inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-900 shadow-[0_3px_0_#d97706] hover:bg-amber-300"
          >
            <Printer className="h-4 w-4" />
            <span>列印／另存獎狀</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTap();
              onClose();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
