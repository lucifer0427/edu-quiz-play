import { AlertTriangle, CheckCircle2, ChevronRight, HelpCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { WorkedExampleData } from '../types/quiz';

interface WorkedExampleSplitProps {
  data: WorkedExampleData;
  compact?: boolean;
  title?: string;
  onDismiss?: () => void;
}

export function WorkedExampleSplit({
  data,
  compact = false,
  title = '🧭 解題示範對比卡（先穩住觀念再繼續！）',
  onDismiss,
}: WorkedExampleSplitProps) {
  const [revealedCount, setRevealedCount] = useState<number>(() =>
    data.keepStepCardVisible ? data.steps.length : 1,
  );
  const [trapChecked, setTrapChecked] = useState(false);
  const [thoughtChecked, setThoughtChecked] = useState(false);

  useEffect(() => {
    setRevealedCount(data.keepStepCardVisible ? data.steps.length : 1);
    setTrapChecked(false);
    setThoughtChecked(false);
  }, [data]);

  const allRevealed = revealedCount >= data.steps.length;

  return (
    <div
      className={`rounded-2xl border-2 border-sky-300 bg-sky-50/70 ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-black text-sky-900 sm:text-base">
            {title}
          </div>
          <div className="rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 sm:text-sm">
            題目參考：{data.problemStatement}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="收起示範卡"
            className="shrink-0 rounded-lg bg-white/80 p-1.5 text-slate-500 hover:bg-white hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-emerald-800 sm:text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>正確思考步驟</span>
          </div>

          <ol className="space-y-1.5">
            {data.steps.slice(0, revealedCount).map((step, idx) => (
              <li
                key={idx}
                className="rounded-lg bg-emerald-50/70 px-2.5 py-1.5 text-xs leading-relaxed font-bold text-slate-800 sm:text-sm"
              >
                {step}
              </li>
            ))}
          </ol>

          {!data.keepStepCardVisible && !allRevealed && (
            <button
              type="button"
              onClick={() =>
                setRevealedCount((prev) => Math.min(data.steps.length, prev + 1))
              }
              className="mt-2.5 inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-100"
            >
              <span>
                看下一步 ({revealedCount}/{data.steps.length})
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-xl border-2 border-rose-200 bg-rose-50/80 p-3.5">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-rose-800 sm:text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>小心這個錯誤陷阱</span>
            </div>
            <p className="rounded-lg bg-white/90 px-3 py-2 text-xs leading-relaxed font-bold text-rose-900 sm:text-sm">
              {data.commonErrorContrast}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTrapChecked((prev) => !prev)}
            aria-pressed={trapChecked}
            className={`mt-2.5 self-start rounded-xl border px-3 py-1 text-xs font-black transition ${
              trapChecked
                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                : 'border-rose-300 bg-white text-rose-700 hover:bg-rose-100'
            }`}
          >
            {trapChecked ? '✓ 我記住這個陷阱了' : '點我標記：記住陷阱'}
          </button>
        </div>
      </div>

      {data.selfExplanationPrompt && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/90 px-3.5 py-2 text-xs font-bold text-indigo-900">
          <div className="flex items-start gap-2">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span>{data.selfExplanationPrompt}</span>
          </div>
          <button
            type="button"
            onClick={() => setThoughtChecked((prev) => !prev)}
            aria-pressed={thoughtChecked}
            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-black transition ${
              thoughtChecked
                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                : 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {thoughtChecked ? '✓ 我想清楚了！' : '我想好了 ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
