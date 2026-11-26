import {
  ArrowLeft,
  FlipVertical2,
  Heart,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getCurriculumCatalog, loadQuizPack } from '../data/curriculum/loader';
import type { Grade, Question, SubjectId } from '../types/quiz';
import { playCorrect, playTap, playVictory, playWrong } from '../utils/sound';

interface SiblingDuoArenaProps {
  open: boolean;
  defaultGradeA?: Grade;
  defaultGradeB?: Grade;
  defaultNameA?: string;
  defaultNameB?: string;
  onAwardCoins: (coins: number) => void;
  onClose: () => void;
}

type DuoMode = 'coop' | 'versus';
type DuoSubject = Extract<SubjectId, 'math' | 'mandarin' | 'english' | 'science'>;

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const SUBJECT_OPTIONS: Array<{ id: DuoSubject; label: string }> = [
  { id: 'math', label: '數學' },
  { id: 'mandarin', label: '國語' },
  { id: 'english', label: '英語' },
  { id: 'science', label: '自然' },
];

function shufflePick(questions: Question[], count: number): Question[] {
  const arr = [...questions];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function buildFallbackMathQuestions(grade: Grade, count = 10): Question[] {
  const maxBase = grade <= 2 ? 9 : grade <= 4 ? 25 : 50;
  const list: Question[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * maxBase) + 2;
    const b = Math.floor(Math.random() * (grade <= 2 ? 9 : 12)) + 2;
    const useMul = grade >= 2 && i % 2 === 0;
    const ans = useMul ? a * b : a + b;
    const prompt = useMul ? `${a} × ${b} = ?` : `${a} + ${b} = ?`;
    const wrong1 = ans + 2;
    const wrong2 = Math.max(1, ans - 3);
    const wrong3 = ans + 10;
    const opts = [String(ans), String(wrong1), String(wrong2), String(wrong3)];
    for (let j = opts.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [opts[j], opts[k]] = [opts[k], opts[j]];
    }
    list.push({
      id: `duo-fallback-${grade}-${i}-${Date.now()}`,
      prompt,
      options: opts as [string, string, string, string],
      answerIndex: opts.indexOf(String(ans)),
      explanation: `正確答案是 ${ans}。`,
    });
  }
  return list;
}

async function loadQuestionsForGrade(
  grade: Grade,
  subject: DuoSubject,
): Promise<Question[]> {
  const { academicYear } = getCurriculumCatalog();
  const tryOrder: DuoSubject[] =
    subject === 'science' && grade <= 2
      ? ['math', 'mandarin']
      : [subject, 'math'];
  for (const subj of tryOrder) {
    const pack =
      (await loadQuizPack(academicYear, 1, grade, subj)) ??
      (await loadQuizPack(academicYear, 2, grade, subj));
    if (pack && pack.stages.length > 0) {
      const all = pack.stages.flatMap((s) => s.questions);
      if (all.length >= 5) {
        return shufflePick(all, 12);
      }
    }
  }
  return buildFallbackMathQuestions(grade, 12);
}

interface PlayerState {
  index: number;
  score: number;
  combo: number;
  feedback: 'correct' | 'wrong' | null;
}

export function SiblingDuoArena({
  open,
  defaultGradeA = 5,
  defaultGradeB = 2,
  defaultNameA = '大寶',
  defaultNameB = '二寶',
  onAwardCoins,
  onClose,
}: SiblingDuoArenaProps) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [duoMode, setDuoMode] = useState<DuoMode>('coop');
  const [subject, setSubject] = useState<DuoSubject>('math');
  const [flipTop, setFlipTop] = useState(true);
  const [gradeA, setGradeA] = useState<Grade>(defaultGradeA);
  const [gradeB, setGradeB] = useState<Grade>(defaultGradeB);
  const [nameA, setNameA] = useState(defaultNameA);
  const [nameB, setNameB] = useState(defaultNameB);

  const [questionsA, setQuestionsA] = useState<Question[]>([]);
  const [questionsB, setQuestionsB] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const [playerA, setPlayerA] = useState<PlayerState>({
    index: 0,
    score: 0,
    combo: 0,
    feedback: null,
  });
  const [playerB, setPlayerB] = useState<PlayerState>({
    index: 0,
    score: 0,
    combo: 0,
    feedback: null,
  });
  const [bossHp, setBossHp] = useState(100);
  const TARGET_VERSUS_SCORE = 5;

  useEffect(() => {
    if (!open) {
      setPhase('setup');
    }
  }, [open]);

  const startDuoGame = useCallback(async () => {
    playTap();
    setLoading(true);
    try {
      const [qA, qB] = await Promise.all([
        loadQuestionsForGrade(gradeA, subject),
        loadQuestionsForGrade(gradeB, subject),
      ]);
      setQuestionsA(qA);
      setQuestionsB(qB);
      setPlayerA({ index: 0, score: 0, combo: 0, feedback: null });
      setPlayerB({ index: 0, score: 0, combo: 0, feedback: null });
      setBossHp(100);
      setPhase('playing');
    } finally {
      setLoading(false);
    }
  }, [gradeA, gradeB, subject]);

  if (!open) return null;

  const handleAnswer = (who: 'A' | 'B', optIdx: number) => {
    if (phase !== 'playing') return;
    const isA = who === 'A';
    const state = isA ? playerA : playerB;
    const list = isA ? questionsA : questionsB;
    if (state.feedback !== null || list.length === 0) return;

    const q = list[state.index % list.length];
    const isCorrect = optIdx === q.answerIndex;

    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }

    const nextScore = isCorrect ? state.score + 1 : state.score;
    const nextCombo = isCorrect ? state.combo + 1 : 0;
    const setter = isA ? setPlayerA : setPlayerB;

    setter({
      index: state.index,
      score: nextScore,
      combo: nextCombo,
      feedback: isCorrect ? 'correct' : 'wrong',
    });

    if (duoMode === 'coop' && isCorrect) {
      const dmg = 15 + Math.min(10, nextCombo * 2);
      setBossHp((prev) => {
        const nextHp = Math.max(0, prev - dmg);
        if (nextHp === 0) {
          window.setTimeout(() => {
            playVictory();
            onAwardCoins(40);
            setPhase('finished');
          }, 450);
        }
        return nextHp;
      });
    } else if (duoMode === 'versus' && nextScore >= TARGET_VERSUS_SCORE) {
      window.setTimeout(() => {
        playVictory();
        onAwardCoins(30);
        setPhase('finished');
      }, 450);
    }

    window.setTimeout(() => {
      setter((curr) => ({
        ...curr,
        index: curr.index + 1,
        feedback: null,
      }));
    }, 550);
  };

  const renderPlayerPanel = (who: 'A' | 'B') => {
    const isA = who === 'A';
    const state = isA ? playerA : playerB;
    const list = isA ? questionsA : questionsB;
    const q = list.length > 0 ? list[state.index % list.length] : null;
    const playerName = isA ? nameA || '大寶' : nameB || '二寶';
    const playerGrade = isA ? gradeA : gradeB;
    const themeBg = isA
      ? 'border-sky-300 bg-gradient-to-b from-sky-50 to-white'
      : 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-white';

    return (
      <div
        className={`flex flex-1 flex-col justify-between rounded-3xl border-3 p-4 shadow-sm ${themeBg} ${
          isA && flipTop ? 'rotate-180' : ''
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black text-white ${
                isA ? 'bg-sky-600' : 'bg-emerald-600'
              }`}
            >
              {playerName} · {playerGrade}年級
            </span>
            {state.combo >= 2 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
                🔥 {state.combo} 連擊
              </span>
            )}
          </div>
          <div className="text-sm font-black text-slate-700">
            得分：{state.score}
            {duoMode === 'versus' ? ` / ${TARGET_VERSUS_SCORE}` : ''}
          </div>
        </div>

        {q ? (
          <div>
            <div className="mb-3 rounded-2xl bg-white/90 px-4 py-3 text-base font-black text-slate-800 shadow-inner sm:text-lg">
              {q.prompt}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, idx) => {
                let btnCls =
                  'border-slate-200 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-50';
                if (state.feedback !== null) {
                  if (idx === q.answerIndex) {
                    btnCls = 'border-emerald-500 bg-emerald-100 text-emerald-900';
                  } else {
                    btnCls = 'border-slate-200 bg-slate-100 text-slate-400';
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={state.feedback !== null}
                    onClick={() => handleAnswer(who, idx)}
                    className={`rounded-2xl border-2 px-3 py-3 text-left text-sm font-extrabold transition active:scale-[0.98] sm:text-base ${btnCls}`}
                  >
                    <span className="mr-1.5 inline-block font-black text-slate-400">
                      {['A', 'B', 'C', 'D'][idx]}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm font-bold text-slate-400">
            載入題目中...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-900/75 p-3 backdrop-blur-sm sm:p-5">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col rounded-3xl border-4 border-amber-300 bg-amber-50 p-4 shadow-2xl sm:p-6">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playTap();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              離開雙人模式
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-black text-white shadow-sm">
              <Users className="h-4 w-4" />
              手足雙人同機對戰
            </span>
          </div>

          {phase === 'playing' && (
            <button
              type="button"
              onClick={() => {
                playTap();
                setFlipTop((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black shadow-sm transition ${
                flipTop
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FlipVertical2 className="h-4 w-4" />
              {flipTop ? '面對面旋轉：開' : '面對面旋轉：關'}
            </button>
          )}
        </div>

        {phase === 'setup' && (
          <div className="mx-auto my-auto w-full max-w-2xl rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-sm">
            <h2 className="text-center text-2xl font-black text-slate-800">
              雙寶同機合作 / 跨年級公平 PK
            </h2>
            <p className="mt-1 text-center text-xs font-medium text-slate-500">
              各自出自己年級的題目，兄弟姊妹同樂不吵架！
            </p>

            {/* Mode picker */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setDuoMode('coop');
                }}
                className={`rounded-2xl border-3 p-4 text-left transition ${
                  duoMode === 'coop'
                    ? 'border-amber-400 bg-amber-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-base font-black text-slate-800">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  合作打魔王（推薦）
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  兩人同心協力答題扣大魔王血量，過關共享 +40 金幣！
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTap();
                  setDuoMode('versus');
                }}
                className={`rounded-2xl border-3 p-4 text-left transition ${
                  duoMode === 'versus'
                    ? 'border-amber-400 bg-amber-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-base font-black text-slate-800">
                  <Swords className="h-5 w-5 text-rose-500" />
                  公平 PK 競速賽
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  各解各年級題目，先答對 5 題者獲勝，共享 +30 金幣！
                </p>
              </button>
            </div>

            {/* Players config */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-3.5">
                <div className="mb-2 text-xs font-black text-sky-700">
                  上方玩家（預設大寶）
                </div>
                <input
                  type="text"
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  maxLength={10}
                  className="mb-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-800"
                />
                <div className="flex items-center gap-1">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGradeA(g)}
                      className={`h-8 flex-1 rounded-lg text-xs font-black ${
                        gradeA === g
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-slate-600'
                      }`}
                    >
                      {g}年
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-3.5">
                <div className="mb-2 text-xs font-black text-emerald-700">
                  下方玩家（預設二寶）
                </div>
                <input
                  type="text"
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  maxLength={10}
                  className="mb-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-800"
                />
                <div className="flex items-center gap-1">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGradeB(g)}
                      className={`h-8 flex-1 rounded-lg text-xs font-black ${
                        gradeB === g
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600'
                      }`}
                    >
                      {g}年
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subject picker */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-slate-600">
                  對戰科目：
                </span>
                {SUBJECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSubject(opt.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                      subject === opt.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={flipTop}
                  onChange={(e) => setFlipTop(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600"
                />
                平板放桌面面對面玩（旋轉上方畫面）
              </label>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={startDuoGame}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
            >
              {loading ? '正在準備雙寶題庫...' : '開始雙人挑戰！'}
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div className="flex flex-1 flex-col gap-3">
            {renderPlayerPanel('A')}

            {/* Center Boss / Score Strip */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-white px-4 py-2.5 shadow-sm">
              {duoMode === 'coop' ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-black text-rose-600">
                    <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                    魔王血量：{bossHp} / 100
                  </div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${bossHp}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex w-full items-center justify-around text-sm font-black text-slate-700">
                  <span className="text-sky-700">
                    {nameA}：{playerA.score} 分
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs text-amber-800">
                    先達 {TARGET_VERSUS_SCORE} 分獲勝
                  </span>
                  <span className="text-emerald-700">
                    {nameB}：{playerB.score} 分
                  </span>
                </div>
              )}
            </div>

            {renderPlayerPanel('B')}
          </div>
        )}

        {phase === 'finished' && (
          <div className="mx-auto my-auto w-full max-w-md rounded-3xl border-4 border-amber-300 bg-white p-6 text-center shadow-lg">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-500">
              <Trophy className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">
              {duoMode === 'coop'
                ? '雙寶合作打敗大魔王！'
                : playerA.score >= playerB.score
                  ? `恭喜 ${nameA} 獲勝！`
                  : `恭喜 ${nameB} 獲勝！`}
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-600">
              {nameA}（{gradeA}年級）答對 {playerA.score} 題 · {nameB}（
              {gradeB}年級）答對 {playerB.score} 題
            </p>
            <div className="my-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-black text-amber-800">
              <Sparkles className="h-4 w-4" />
              已為目前帳號加上 +{duoMode === 'coop' ? 40 : 30} 金幣！
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={startDuoGame}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-amber-500 py-3 text-sm font-black text-white hover:bg-amber-600"
              >
                <RotateCcw className="h-4 w-4" />
                再玩一局
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
              >
                返回地圖
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SiblingDuoArena;
