import { Lock, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { playTap } from '../utils/sound';

interface ParentGateModalProps {
  open: boolean;
  savedPin?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const CHALLENGES = [
  { a: 17, b: 6 },
  { a: 18, b: 7 },
  { a: 23, b: 4 },
  { a: 19, b: 8 },
  { a: 16, b: 9 },
];

export function ParentGateModal({
  open,
  savedPin,
  onSuccess,
  onClose,
}: ParentGateModalProps) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAnswer('');
      setError('');
    }
  }, [open]);

  const challenge = useMemo(() => {
    const idx = Math.floor(Math.random() * CHALLENGES.length);
    return CHALLENGES[idx];
  }, [open]);

  if (!open) return null;

  const hasPin = Boolean(savedPin && /^\d{4}$/.test(savedPin));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = answer.trim();
    if (hasPin) {
      if (trimmed === savedPin) {
        setAnswer('');
        setError('');
        onSuccess();
      } else {
        setError('家長密碼不正確，請再試一次。');
      }
      return;
    }

    if (Number(trimmed) === challenge.a * challenge.b) {
      setAnswer('');
      setError('');
      onSuccess();
    } else {
      setError('答案不對喔！請由家長協助計算並輸入正確答案。');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="家長身份驗證"
    >
      <div className="w-full max-w-sm rounded-3xl border-2 border-emerald-300 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-black text-slate-800">家長管理驗證</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              playTap();
              setAnswer('');
              setError('');
              onClose();
            }}
            aria-label="關閉家長驗證"
            className="rounded-xl bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <p className="text-sm font-bold text-slate-700">
            {hasPin
              ? '請輸入 4 位數家長管理密碼：'
              : `請計算成人驗證題以解鎖家長功能：${challenge.a} × ${challenge.b} = ?`}
          </p>
          <input
            type={hasPin ? 'password' : 'number'}
            inputMode="numeric"
            autoFocus
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setError('');
            }}
            placeholder={hasPin ? '輸入 4 碼數字密碼' : '輸入計算結果'}
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-center text-lg font-black text-slate-900 focus:border-emerald-400 focus:outline-none"
          />
          {error && (
            <p className="text-xs font-bold text-rose-600">{error}</p>
          )}
          <button
            type="submit"
            className="btn-3d w-full rounded-2xl bg-emerald-600 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#047857] hover:bg-emerald-500"
          >
            確認解鎖
          </button>
        </form>
      </div>
    </div>
  );
}
