import HanziWriter from 'hanzi-writer';
import {
  CheckCircle2,
  Eraser,
  Eye,
  PenTool,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  extractHanziCharacters,
  GRADE_HANZI_VOCAB,
} from '../data/hanziVocab';
import type { CustomHanziList, Grade, PlayerProgress } from '../types/quiz';
import { playCorrect, playTap, playVictory } from '../utils/sound';
import { isSpeechSupported, speakText } from '../utils/speech';

export interface HanziPracticeProps {
  progress: PlayerProgress;
  initialChars?: string[];
  initialTitle?: string;
  onCompleteHanzi: (char: string) => void;
  onSaveCustomList?: (title: string, chars: string[]) => void;
  onDeleteCustomList?: (id: string) => void;
}

type PracticeStage = 'demo' | 'trace' | 'blind';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const CANVAS_SIZE = 280;

export function HanziPractice({
  progress,
  initialChars,
  initialTitle,
  onCompleteHanzi,
  onSaveCustomList,
  onDeleteCustomList,
}: HanziPracticeProps) {
  const [grade, setGrade] = useState<Grade>(progress.selectedGrade ?? 1);
  const [customInput, setCustomInput] = useState('');
  const [customChars, setCustomChars] = useState<string[]>(
    () => initialChars ?? [],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stageMode, setStageMode] = useState<PracticeStage>('demo');
  const [fallbackCanvas, setFallbackCanvas] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    '先看一次筆順動畫，準備好了就點「開始描紅」喔！',
  );
  const [completedInSession, setCompletedInSession] = useState<string[]>([]);

  useEffect(() => {
    if (initialChars && initialChars.length > 0) {
      setCustomChars(initialChars);
      setSelectedIndex(0);
      setStageMode('demo');
    }
  }, [initialChars]);

  const writerHostRef = useRef<HTMLDivElement>(null);
  const writerInstanceRef = useRef<HanziWriter | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const speechAvailable = isSpeechSupported();

  const zhuyinLookup = useMemo(() => {
    const map = new Map<string, { zhuyin?: string; word: string }>();
    for (const list of Object.values(GRADE_HANZI_VOCAB)) {
      for (const entry of list) {
        if (!map.has(entry.char)) {
          map.set(entry.char, { zhuyin: entry.zhuyin, word: entry.word });
        }
      }
    }
    return map;
  }, []);

  const wordList = useMemo(() => {
    if (customChars.length > 0) {
      return customChars.map((char) => {
        const known = zhuyinLookup.get(char);
        return {
          char,
          zhuyin: known?.zhuyin,
          word: initialTitle ? `${initialTitle}生字` : known?.word ?? '自訂聯絡簿生字',
        };
      });
    }
    return GRADE_HANZI_VOCAB[grade] ?? GRADE_HANZI_VOCAB[1];
  }, [customChars, grade, initialTitle, zhuyinLookup]);

  const activeEntry = wordList[selectedIndex] ?? wordList[0];
  const activeChar = activeEntry?.char ?? '一';
  const practicedCount = progress.practicedHanzi?.[activeChar]?.count ?? 0;

  const speakCurrentChar = useCallback(() => {
    if (!speechAvailable || !activeEntry) return;
    const phrase =
      activeEntry.word === '自訂聯絡簿生字'
        ? activeEntry.char
        : `${activeEntry.char}，${activeEntry.word}`;
    speakText(phrase, 'zh-TW', {
      grade,
      slowMode: progress.speechRateMode === 'slow' || grade <= 2,
    });
  }, [activeEntry, grade, progress.speechRateMode, speechAvailable]);

  const clearFallbackCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  const markCharacterCompleted = useCallback(
    (char: string) => {
      playVictory();
      onCompleteHanzi(char);
      setCompletedInSession((prev) =>
        prev.includes(char) ? prev : [...prev, char],
      );
      setStatusMessage(
        `🎉 太棒了！你成功手寫完成「${char}」，獲得經驗值與金幣！`,
      );
    },
    [onCompleteHanzi],
  );

  // 初始化或切換 HanziWriter / 降級畫布
  useEffect(() => {
    let cancelled = false;
    const host = writerHostRef.current;
    writerInstanceRef.current = null;
    if (host) {
      host.innerHTML = '';
    }
    setFallbackCanvas(false);
    clearFallbackCanvas();

    if (stageMode === 'demo') {
      setStatusMessage('👀 看一看筆順怎麼寫，也可以點右上方聽發音喔！');
    } else if (stageMode === 'trace') {
      setStatusMessage('✍️ 請沿著淡淡的字形描紅寫一次！');
    } else {
      setStatusMessage('🧠 挑戰空白田字格盲寫！憑記憶把字寫出來吧！');
    }

    if (!host) return;

    try {
      const writer = HanziWriter.create(host, activeChar, {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        padding: 16,
        showOutline: stageMode !== 'blind',
        showCharacter: stageMode === 'demo',
        strokeAnimationSpeed: grade <= 2 ? 0.8 : 1.1,
        delayBetweenStrokes: 240,
        strokeColor: '#0f172a',
        outlineColor: '#cbd5e1',
        drawingColor: '#0284c7',
        drawingWidth: 16,
        showHintAfterMisses: stageMode === 'trace' ? 2 : 3,
        highlightOnComplete: true,
        onLoadCharDataError: () => {
          if (cancelled) return;
          setFallbackCanvas(true);
          setStatusMessage(
            '✍️ 已切換為自由描紅田字格（支援 Apple Pencil 與手指書寫）',
          );
        },
      });

      writerInstanceRef.current = writer;

      if (stageMode === 'demo') {
        void writer.animateCharacter();
      } else {
        void writer.quiz({
          onMistake: () => {
            setStatusMessage('💡 筆畫順序差一點點，跟著藍色提示再試一次！');
          },
          onCorrectStroke: () => {
            playCorrect(1);
          },
          onComplete: () => {
            if (cancelled) return;
            if (stageMode === 'trace') {
              playCorrect(2);
              setStatusMessage(
                '✨ 描紅成功！接下來試試看「空白盲寫」檢驗自己記住了沒！',
              );
            } else {
              markCharacterCompleted(activeChar);
            }
          },
        });
      }
    } catch {
      setFallbackCanvas(true);
    }

    return () => {
      cancelled = true;
      if (host) {
        host.innerHTML = '';
      }
      writerInstanceRef.current = null;
    };
  }, [
    activeChar,
    clearFallbackCanvas,
    grade,
    markCharacterCompleted,
    stageMode,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = e.pointerType === 'pen' ? 10 : 14;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleApplyCustomChars = (e: React.FormEvent) => {
    e.preventDefault();
    playTap();
    const chars = extractHanziCharacters(customInput);
    setCustomChars(chars);
    setSelectedIndex(0);
    setStageMode('demo');
  };

  const totalMasteredChars = Object.keys(progress.practicedHanzi ?? {}).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-4 rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              平板手寫國字練字坊（筆順・描紅・盲寫）
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              支援 iPad 手指與 Apple Pencil 手寫！依序完成「看筆順 → 描紅 →
              空白盲寫」，就能把國字牢牢記住！
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>已練過 {totalMasteredChars} 個國字</span>
          </div>
        </div>

        {/* 年級選擇與家長自訂生字簿 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-black text-slate-500">
              國語年級字庫：
            </span>
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  playTap();
                  setCustomChars([]);
                  setGrade(g);
                  setSelectedIndex(0);
                  setStageMode('demo');
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                  customChars.length === 0 && grade === g
                    ? 'bg-amber-400 text-slate-900 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                }`}
              >
                {g} 年級
              </button>
            ))}
          </div>

          <form
            onSubmit={handleApplyCustomChars}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="貼上聯絡簿生字（如：春風雨花）"
              aria-label="自訂聯絡簿生字"
              className="w-56 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-sky-400 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-400"
            >
              自訂練字
            </button>
            {customChars.length > 0 && (
              <>
                {onSaveCustomList && (
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      const label = `聯絡簿 ${new Date().getMonth() + 1}/${new Date().getDate()}（${customChars.slice(0, 3).join('')}）`;
                      onSaveCustomList(label, customChars);
                    }}
                    className="rounded-xl bg-emerald-500 px-2.5 py-1.5 text-xs font-black text-white hover:bg-emerald-400"
                  >
                    儲存生字單
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setCustomChars([]);
                    setCustomInput('');
                    setSelectedIndex(0);
                  }}
                  className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  恢復年級字庫
                </button>
              </>
            )}
          </form>
        </div>

        {(progress.customHanziLists?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-sky-50/70 px-3 py-2">
            <span className="text-xs font-black text-sky-700">
              已儲存聯絡簿：
            </span>
            {(progress.customHanziLists as CustomHanziList[]).map((list) => (
              <div
                key={list.id}
                className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
              >
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setCustomChars(list.chars);
                    setSelectedIndex(0);
                    setStageMode('demo');
                  }}
                  className="hover:text-sky-600"
                >
                  {list.title} ({list.chars.length}字)
                </button>
                {onDeleteCustomList && (
                  <button
                    type="button"
                    aria-label={`刪除 ${list.title}`}
                    onClick={() => {
                      playTap();
                      onDeleteCustomList(list.id);
                    }}
                    className="ml-1 text-slate-400 hover:text-rose-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 選字列 */}
        <div className="flex flex-wrap gap-2 pt-1">
          {wordList.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const practiced =
              (progress.practicedHanzi?.[item.char]?.count ?? 0) > 0 ||
              completedInSession.includes(item.char);
            return (
              <button
                key={`${item.char}-${idx}`}
                type="button"
                onClick={() => {
                  playTap();
                  setSelectedIndex(idx);
                  setStageMode('demo');
                }}
                className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border-2 text-xl font-black transition ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-xs'
                    : practiced
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {item.char}
                {practiced && (
                  <CheckCircle2 className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-white text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 主手寫區 */}
      <section className="grid gap-6 rounded-3xl border-2 border-sky-200 bg-white p-5 shadow-sm sm:grid-cols-[320px_1fr] sm:p-7">
        <div className="flex flex-col items-center space-y-3">
          {/* 田字格手寫區（鎖定 touch-action: none 防誤觸捲動） */}
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-2xl border-4 border-amber-300 bg-amber-50/40 select-none"
            style={{
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              touchAction: 'none',
            }}
          >
            {/* 田字格輔助虛線 */}
            <svg
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <line
                x1={CANVAS_SIZE / 2}
                y1="0"
                x2={CANVAS_SIZE / 2}
                y2={CANVAS_SIZE}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                opacity="0.45"
              />
              <line
                x1="0"
                y1={CANVAS_SIZE / 2}
                x2={CANVAS_SIZE}
                y2={CANVAS_SIZE / 2}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                opacity="0.45"
              />
              <line
                x1="0"
                y1="0"
                x2={CANVAS_SIZE}
                y2={CANVAS_SIZE}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="4 8"
                opacity="0.25"
              />
              <line
                x1={CANVAS_SIZE}
                y1="0"
                x2="0"
                y2={CANVAS_SIZE}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="4 8"
                opacity="0.25"
              />
            </svg>

            {fallbackCanvas && stageMode !== 'blind' && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[190px] leading-none text-slate-300/70 select-none"
              >
                {activeChar}
              </span>
            )}

            <div
              ref={writerHostRef}
              className={fallbackCanvas ? 'hidden' : 'relative z-10'}
              style={{ touchAction: 'none' }}
            />

            {fallbackCanvas && (
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative z-10 cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {stageMode === 'demo' && !fallbackCanvas && (
              <button
                type="button"
                onClick={() => {
                  playTap();
                  void writerInstanceRef.current?.animateCharacter();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-800 hover:bg-sky-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>重播筆順動畫</span>
              </button>
            )}
            {fallbackCanvas && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    clearFallbackCanvas();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>清除重寫</span>
                </button>
                <button
                  type="button"
                  onClick={() => markCharacterCompleted(activeChar)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-black text-white shadow-2xs hover:bg-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>我寫好了，完成本字 ✓</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-4xl font-black text-slate-900">
                    {activeChar}
                  </span>
                  {activeEntry.zhuyin && (
                    <span className="rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1 text-sm font-black text-sky-900">
                      {activeEntry.zhuyin}
                    </span>
                  )}
                  <span className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                    造詞：{activeEntry.word}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  已練習 {practicedCount} 次
                </p>
              </div>

              {speechAvailable && (
                <button
                  type="button"
                  onClick={speakCurrentChar}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>聽字音與造詞</span>
                </button>
              )}
            </div>

            {/* 三段式切換按鈕 */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setStageMode('demo');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 text-xs font-black transition sm:text-sm ${
                  stageMode === 'demo'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>1. 看筆順</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setStageMode('trace');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 text-xs font-black transition sm:text-sm ${
                  stageMode === 'trace'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PenTool className="h-4 w-4" />
                <span>2. 描紅寫</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setStageMode('blind');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 text-xs font-black transition sm:text-sm ${
                  stageMode === 'blind'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>3. 空白盲寫</span>
              </button>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm font-bold text-sky-900">
              {statusMessage}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => {
                playTap();
                setSelectedIndex((prev) => Math.max(0, prev - 1));
                setStageMode('demo');
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              ← 上一個字
            </button>
            <button
              type="button"
              disabled={selectedIndex >= wordList.length - 1}
              onClick={() => {
                playTap();
                setSelectedIndex((prev) =>
                  Math.min(wordList.length - 1, prev + 1),
                );
                setStageMode('demo');
              }}
              className="btn-3d rounded-xl bg-amber-400 px-5 py-2 text-xs font-black text-slate-900 shadow-[0_3px_0_#d97706] hover:bg-amber-300 disabled:opacity-40"
            >
              下一個字 →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HanziPractice;
