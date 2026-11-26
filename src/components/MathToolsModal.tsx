import { Clock, Flame, RotateCcw, Sparkles, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playCorrect, playTap, playVictory, playWrong } from '../utils/sound';

interface MathToolsModalProps {
  open: boolean;
  onAwardCoins: (coins: number) => void;
  onClose: () => void;
}

type ToolTab = 'blitz' | 'clock';

interface MulProblem {
  a: number;
  b: number;
  answer: number;
  options: number[];
}

function makeMulProblem(): MulProblem {
  const a = Math.floor(Math.random() * 8) + 2; // 2..9
  const b = Math.floor(Math.random() * 9) + 1; // 1..9
  const answer = a * b;
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = [-3, -2, -1, 1, 2, 3, a, -a][Math.floor(Math.random() * 8)];
    const cand = answer + delta;
    if (cand > 0 && cand !== answer) {
      set.add(cand);
    }
  }
  const options = Array.from(set).sort(() => Math.random() - 0.5);
  return { a, b, answer, options };
}

function formatClock(hour: number, minute: number): string {
  const h = ((hour - 1 + 12) % 12) + 1;
  return `${h}:${String(minute).padStart(2, '0')}`;
}

export function MathToolsModal({
  open,
  onAwardCoins,
  onClose,
}: MathToolsModalProps) {
  const [tab, setTab] = useState<ToolTab>('blitz');

  // 9x9 Blitz state
  const [blitzActive, setBlitzActive] = useState(false);
  const [blitzDone, setBlitzDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [problem, setProblem] = useState<MulProblem>(() => makeMulProblem());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Interactive Clock state
  const [clockHour, setClockHour] = useState(3);
  const [clockMinute, setClockMinute] = useState(15);
  const [clockQuizMode, setClockQuizMode] = useState(false);
  const [clockQuizAnswer, setClockQuizAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !blitzActive) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setBlitzActive(false);
          setBlitzDone(true);
          playVictory();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, blitzActive]);

  useEffect(() => {
    if (blitzDone && score > 0) {
      const coins = Math.min(30, Math.max(5, Math.floor(score * 2)));
      onAwardCoins(coins);
    }
  }, [blitzDone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const startBlitz = () => {
    playTap();
    setScore(0);
    setCombo(0);
    setTimeLeft(60);
    setFeedback(null);
    setBlitzDone(false);
    setProblem(makeMulProblem());
    setBlitzActive(true);
  };

  const handleBlitzAnswer = (choice: number) => {
    if (!blitzActive) return;
    if (choice === problem.answer) {
      playCorrect();
      setScore((s) => s + 1);
      setCombo((c) => c + 1);
      setFeedback('答對了！');
    } else {
      playWrong();
      setCombo(0);
      setFeedback(`${problem.a} × ${problem.b} = ${problem.answer}`);
    }
    setProblem(makeMulProblem());
  };

  const adjustMinutes = (delta: number) => {
    playTap();
    const total = clockHour * 60 + clockMinute + delta;
    const wrapped = ((total % 720) + 720) % 720;
    const nextH = Math.floor(wrapped / 60) || 12;
    const nextM = wrapped % 60;
    setClockHour(nextH);
    setClockMinute(nextM);
    setClockQuizAnswer(null);
  };

  const startClockQuiz = () => {
    playTap();
    const h = Math.floor(Math.random() * 12) + 1;
    const m = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][
      Math.floor(Math.random() * 12)
    ];
    setClockHour(h);
    setClockMinute(m);
    setClockQuizMode(true);
    setClockQuizAnswer(null);
  };

  const minuteAngle = clockMinute * 6;
  const hourAngle = ((clockHour % 12) + clockMinute / 60) * 30;
  const formattedTime = formatClock(clockHour, clockMinute);

  const clockOptions = [
    formattedTime,
    formatClock(clockHour, (clockMinute + 15) % 60),
    formatClock((clockHour % 12) + 1, clockMinute),
    formatClock(clockHour, (clockMinute + 30) % 60),
  ].sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border-4 border-sky-300 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playTap();
                setTab('blitz');
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                tab === 'blitz'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Zap className="h-4 w-4" />
              九九乘法 60 秒閃電戰
            </button>
            <button
              type="button"
              onClick={() => {
                playTap();
                setTab('clock');
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                tab === 'clock'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="h-4 w-4" />
              互動時鐘教具
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              playTap();
              onClose();
            }}
            aria-label="關閉數學小教具"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {tab === 'blitz' && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-5 text-center">
            {!blitzActive && !blitzDone && (
              <>
                <h3 className="text-xl font-black text-slate-800">
                  九九乘法 60 秒快閃挑戰
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  二年級必練基礎！60 秒內盡量多答對幾題，完成可獲得金幣獎勵。
                </p>
                <button
                  type="button"
                  onClick={startBlitz}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-base font-black text-white shadow-md hover:bg-amber-600"
                >
                  <Zap className="h-5 w-5" />
                  開始 60 秒挑戰
                </button>
              </>
            )}

            {blitzActive && (
              <>
                <div className="mb-4 flex items-center justify-between text-sm font-black">
                  <span className="rounded-full bg-white px-3 py-1 text-rose-600 shadow-sm">
                    ⏱️ {timeLeft} 秒
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-amber-700 shadow-sm">
                    <Flame className="h-4 w-4 text-orange-500" />
                    連擊 {combo}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-emerald-700 shadow-sm">
                    答對 {score} 題
                  </span>
                </div>

                <div className="my-4 rounded-2xl bg-white py-6 text-4xl font-black tracking-wider text-slate-800 shadow-inner">
                  {problem.a} × {problem.b} = ?
                </div>

                {feedback && (
                  <div className="mb-3 text-xs font-black text-amber-700">
                    {feedback}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  {problem.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleBlitzAnswer(opt)}
                      className="rounded-2xl border-2 border-amber-200 bg-white py-3.5 text-xl font-black text-slate-800 transition hover:border-amber-400 hover:bg-amber-100 active:scale-95"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {blitzDone && (
              <>
                <h3 className="text-2xl font-black text-slate-800">
                  時間到！共答對 {score} 題
                </h3>
                {score > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                    <Sparkles className="h-4 w-4" />
                    獲得 +{Math.min(30, Math.max(5, score * 2))} 金幣！
                  </p>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={startBlitz}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-black text-white hover:bg-amber-600"
                  >
                    <RotateCcw className="h-4 w-4" />
                    再玩一次
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'clock' && (
          <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-5">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              {/* SVG Clock Face */}
              <svg
                viewBox="0 0 200 200"
                className="h-48 w-48 shrink-0 rounded-full bg-white shadow-inner"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="#ffffff"
                  stroke="#38bdf8"
                  strokeWidth="6"
                />
                {Array.from({ length: 12 }, (_, idx) => {
                  const num = idx + 1;
                  const rad = ((num * 30 - 90) * Math.PI) / 180;
                  const x = 100 + Math.cos(rad) * 72;
                  const y = 100 + Math.sin(rad) * 72 + 5;
                  return (
                    <text
                      key={num}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="900"
                      fill="#1e293b"
                    >
                      {num}
                    </text>
                  );
                })}
                {/* Hour hand */}
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="52"
                  stroke="#0f172a"
                  strokeWidth="7"
                  strokeLinecap="round"
                  transform={`rotate(${hourAngle} 100 100)`}
                />
                {/* Minute hand */}
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="32"
                  stroke="#0284c7"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  transform={`rotate(${minuteAngle} 100 100)`}
                />
                <circle cx="100" cy="100" r="6" fill="#f59e0b" />
              </svg>

              <div className="flex-1 text-center sm:text-left">
                {!clockQuizMode ? (
                  <>
                    <div className="text-xs font-bold text-slate-500">
                      目前時間
                    </div>
                    <div className="mt-1 text-3xl font-black tabular-nums text-sky-700">
                      {clockHour} 點 {String(clockMinute).padStart(2, '0')} 分
                    </div>
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                      <button
                        type="button"
                        onClick={() => adjustMinutes(60)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-sky-100"
                      >
                        +1 小時
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustMinutes(15)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-sky-100"
                      >
                        +15 分
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustMinutes(5)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-sky-100"
                      >
                        +5 分
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustMinutes(1)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-sky-100"
                      >
                        +1 分
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={startClockQuiz}
                      className="mt-4 w-full rounded-2xl bg-sky-500 py-2.5 text-sm font-black text-white shadow-sm hover:bg-sky-600"
                    >
                      考考你：現在幾點幾分？
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-black text-slate-800">
                      請問鐘面上是幾點幾分？
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {clockOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (opt === formattedTime) {
                              playCorrect();
                              setClockQuizAnswer('correct');
                            } else {
                              playWrong();
                              setClockQuizAnswer('wrong');
                            }
                          }}
                          className="rounded-xl border-2 border-sky-200 bg-white py-2 text-sm font-black text-slate-800 hover:border-sky-400"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {clockQuizAnswer && (
                      <div
                        className={`mt-2 text-xs font-black ${
                          clockQuizAnswer === 'correct'
                            ? 'text-emerald-700'
                            : 'text-rose-600'
                        }`}
                      >
                        {clockQuizAnswer === 'correct'
                          ? '答對了！你很會看時鐘喔！'
                          : `提示：短針看小時(${clockHour})、長針看分鐘(${clockMinute})`}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={startClockQuiz}
                        className="flex-1 rounded-xl bg-sky-500 py-2 text-xs font-black text-white"
                      >
                        下一題
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockQuizMode(false)}
                        className="flex-1 rounded-xl bg-white py-2 text-xs font-black text-slate-600"
                      >
                        自由撥針
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MathToolsModal;
