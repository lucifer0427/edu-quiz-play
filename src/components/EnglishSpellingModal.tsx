import { CheckCircle2, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Grade, Question } from '../types/quiz';
import { playCorrect, playTap, playWrong } from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';

export interface SpellingWordItem {
  word: string;
  hint: string;
}

export function extractSpellingWords(questions: Question[]): SpellingWordItem[] {
  const seen = new Set<string>();
  const items: SpellingWordItem[] = [];
  for (const q of questions) {
    const ans = q.options[q.answerIndex]?.trim();
    if (!ans || !/^[a-zA-Z]{2,14}$/.test(ans)) continue;
    const lower = ans.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    items.push({
      word: ans,
      hint: q.prompt.replace(/Listen and choose:\s*/i, ''),
    });
  }
  return items;
}

function shuffleLetters(word: string): Array<{ id: number; char: string }> {
  const chars = word.split('').map((char, idx) => ({ id: idx, char }));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

interface EnglishSpellingModalProps {
  open: boolean;
  title: string;
  grade: Grade;
  words: SpellingWordItem[];
  speechSlowMode?: boolean;
  onClose: () => void;
}

export function EnglishSpellingModal({
  open,
  title,
  grade,
  words,
  speechSlowMode = false,
  onClose,
}: EnglishSpellingModalProps) {
  const speechAvailable = isSpeechSupported();
  const [index, setIndex] = useState(0);
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);

  const activeItem = words[index];
  const letterPool = useMemo(
    () => (activeItem ? shuffleLetters(activeItem.word) : []),
    [activeItem],
  );

  useEffect(() => {
    if (!open) {
      stopSpeech();
      return;
    }
    setIndex(0);
    setPickedIds([]);
    setStatus('idle');
    setScore(0);
  }, [open, words]);

  useEffect(() => {
    if (!open || !activeItem || !speechAvailable) return;
    speakText(activeItem.word, 'en-US', {
      grade,
      slowMode: speechSlowMode || grade <= 2,
    });
  }, [activeItem, grade, open, speechAvailable, speechSlowMode]);

  if (!open) return null;

  const builtWord = pickedIds
    .map((id) => letterPool.find((l) => l.id === id)?.char ?? '')
    .join('');

  const handleCheck = () => {
    if (!activeItem || status === 'correct') return;
    if (builtWord.toLowerCase() === activeItem.word.toLowerCase()) {
      playCorrect(2);
      setStatus('correct');
      setScore((s) => s + 1);
    } else {
      playWrong();
      setStatus('wrong');
    }
  };

  const handleNext = () => {
    playTap();
    if (index + 1 >= words.length) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
    setPickedIds([]);
    setStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-3xl border-2 border-violet-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-black text-violet-800">
              英語聽音拼字積木
            </span>
            <h3 className="mt-1 text-lg font-black text-slate-800">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            aria-label="關閉英語拼字"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {words.length === 0 || !activeItem ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-600">
            目前勾選範圍內沒有適合拼字的單字題，試試勾選其他英語單元！
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs font-black text-slate-500">
              <span>
                第 {index + 1} / {words.length} 題
              </span>
              <span className="text-emerald-700">已拼對 {score} 題</span>
            </div>

            <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-700">
                  {activeItem.hint}
                </p>
                {speechAvailable && (
                  <button
                    type="button"
                    onClick={() =>
                      speakText(activeItem.word, 'en-US', {
                        grade,
                        slowMode: speechSlowMode || grade <= 2,
                      })
                    }
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-500"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>聽發音</span>
                  </button>
                )}
              </div>

              {/* 拼字空格區 */}
              <div className="flex min-h-[52px] flex-wrap items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-violet-300 bg-white px-3 py-2">
                {pickedIds.length === 0 ? (
                  <span className="text-xs font-bold text-slate-400">
                    點擊下方字母積木拼出單字（共 {activeItem.word.length} 個字母）
                  </span>
                ) : (
                  pickedIds.map((id) => {
                    const ch = letterPool.find((l) => l.id === id)?.char ?? '';
                    return (
                      <button
                        key={`picked-${id}`}
                        type="button"
                        disabled={status === 'correct'}
                        onClick={() => {
                          playTap();
                          setStatus('idle');
                          setPickedIds((prev) => prev.filter((x) => x !== id));
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-lg font-black text-white shadow-2xs hover:bg-violet-500"
                      >
                        {ch}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 字母積木池 */}
            <div className="flex flex-wrap justify-center gap-2">
              {letterPool.map((item) => {
                const used = pickedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={used || status === 'correct'}
                    onClick={() => {
                      playTap();
                      setStatus('idle');
                      setPickedIds((prev) => [...prev, item.id]);
                    }}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg font-black transition ${
                      used
                        ? 'border-slate-200 bg-slate-100 text-slate-300'
                        : 'border-amber-300 bg-amber-50 text-slate-800 shadow-2xs hover:bg-amber-100'
                    }`}
                  >
                    {item.char}
                  </button>
                );
              })}
            </div>

            {status === 'correct' && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                <span>拼字完全正確：{activeItem.word}！</span>
              </div>
            )}
            {status === 'wrong' && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-black text-rose-700">
                順序還差一點點，再聽一次發音調整看看！
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setPickedIds([]);
                  setStatus('idle');
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>重排</span>
              </button>

              {status === 'correct' ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-500"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {index + 1 >= words.length ? '完成練習' : '下一題'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pickedIds.length === 0}
                  onClick={handleCheck}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-black text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  檢查拼字
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EnglishSpellingModal;
