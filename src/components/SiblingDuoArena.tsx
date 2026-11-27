import {
  ArrowLeft,
  Clock,
  FlipVertical2,
  Heart,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurriculumCatalog, loadQuizPack } from '../data/curriculum/loader';
import type {
  Grade,
  LocalProfileMeta,
  Question,
  Stage,
  SubjectId,
} from '../types/quiz';
import { resolveStageQuestionsAsync } from '../utils/generators/registry';
import { playCorrect, playTap, playVictory, playWrong } from '../utils/sound';

interface SiblingDuoArenaProps {
  open: boolean;
  profiles?: LocalProfileMeta[];
  defaultGradeA?: Grade;
  defaultGradeB?: Grade;
  defaultNameA?: string;
  defaultNameB?: string;
  onAwardCoins: (coins: number) => void;
  onClose: () => void;
}

type DuoMode = 'coop' | 'versus' | 'speed';
type DuoSubject =
  | Extract<SubjectId, 'math' | 'mandarin' | 'english' | 'science' | 'social'>
  | 'mixed';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const SUBJECT_OPTIONS: Array<{ id: DuoSubject; label: string }> = [
  { id: 'math', label: '數學' },
  { id: 'mandarin', label: '國語' },
  { id: 'english', label: '英語' },
  { id: 'science', label: '生活／自然' },
  { id: 'social', label: '社會' },
  { id: 'mixed', label: '全科綜合' },
];

const SPEED_ROUND_SECONDS = 12;
const SPEED_TARGET_SCORE = 10;
const SPEED_MAX_QUESTIONS = 10;
const TARGET_VERSUS_SCORE = 5;

function shufflePick<T>(items: T[], count: number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function buildFallbackMathQuestions(grade: Grade, count = 12): Question[] {
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

function resolveSubjectsForGrade(
  grade: Grade,
  subject: DuoSubject,
): Exclude<SubjectId, 'custom'>[] {
  if (subject === 'mixed') {
    return grade <= 2
      ? ['math', 'mandarin', 'english', 'life']
      : ['math', 'mandarin', 'english', 'science', 'social'];
  }
  if ((subject === 'science' || subject === 'social') && grade <= 2) {
    return ['life', 'math'];
  }
  return [subject, 'math'];
}

async function sampleQuestionsFromStage(stage: Stage): Promise<Question[]> {
  try {
    const resolved = await resolveStageQuestionsAsync(stage, 4);
    if (resolved.length > 0) return resolved;
  } catch {
    // Fallback to static questions on stage
  }
  return stage.questions;
}

async function loadQuestionsForGrade(
  grade: Grade,
  subject: DuoSubject,
): Promise<Question[]> {
  const { academicYear } = getCurriculumCatalog();
  const candidates = resolveSubjectsForGrade(grade, subject);
  const collected: Question[] = [];

  for (const subj of candidates) {
    const [pack1, pack2] = await Promise.all([
      loadQuizPack(academicYear, 1, grade, subj),
      loadQuizPack(academicYear, 2, grade, subj),
    ]);
    const stages = [
      ...(pack1?.stages ?? []),
      ...(pack2?.stages ?? []),
    ];
    if (stages.length === 0) continue;

    const pickedStages = shufflePick(stages, subject === 'mixed' ? 2 : 4);
    const stageBatches = await Promise.all(
      pickedStages.map((s) => sampleQuestionsFromStage(s)),
    );
    for (const batch of stageBatches) {
      collected.push(...batch);
    }
    if (subject !== 'mixed' && collected.length >= 12) {
      return shufflePick(collected, 12);
    }
  }

  if (collected.length >= 5) {
    return shufflePick(collected, 12);
  }
  return buildFallbackMathQuestions(grade, 12);
}

interface PlayerState {
  index: number;
  score: number;
  combo: number;
  feedback: 'correct' | 'wrong' | null;
}

interface SpeedRoundState {
  questionIndex: number;
  timeLeft: number;
  lockedA: boolean;
  lockedB: boolean;
  winnerThisRound: 'A' | 'B' | 'none' | null;
  pickedOptIdx: number | null;
  lastMessage: string | null;
}

export function SiblingDuoArena({
  open,
  profiles = [],
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

  const [speedState, setSpeedState] = useState<SpeedRoundState>({
    questionIndex: 0,
    timeLeft: SPEED_ROUND_SECONDS,
    lockedA: false,
    lockedB: false,
    winnerThisRound: null,
    pickedOptIdx: null,
    lastMessage: null,
  });

  const roundFinishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimers();
      roundFinishedRef.current = false;
      setPhase('setup');
    }
    return () => clearTimers();
  }, [open, clearTimers]);

  const startDuoGame = useCallback(async () => {
    playTap();
    clearTimers();
    roundFinishedRef.current = false;
    setLoading(true);
    try {
      if (duoMode === 'speed') {
        // In speed mode, both players race on the exact same question stream.
        // Use the lower grade of the two so both children have a fair shot.
        const sharedGrade = (Math.min(gradeA, gradeB) as Grade) || gradeA;
        const sharedQs = await loadQuestionsForGrade(sharedGrade, subject);
        setQuestionsA(sharedQs);
        setQuestionsB(sharedQs);
      } else {
        const [qA, qB] = await Promise.all([
          loadQuestionsForGrade(gradeA, subject),
          loadQuestionsForGrade(gradeB, subject),
        ]);
        setQuestionsA(qA);
        setQuestionsB(qB);
      }
      setPlayerA({ index: 0, score: 0, combo: 0, feedback: null });
      setPlayerB({ index: 0, score: 0, combo: 0, feedback: null });
      setBossHp(100);
      setSpeedState({
        questionIndex: 0,
        timeLeft: SPEED_ROUND_SECONDS,
        lockedA: false,
        lockedB: false,
        winnerThisRound: null,
        pickedOptIdx: null,
        lastMessage: null,
      });
      setPhase('playing');
    } finally {
      setLoading(false);
    }
  }, [clearTimers, duoMode, gradeA, gradeB, subject]);

  const advanceSpeedRound = useCallback(
    (nextScoreA: number, nextScoreB: number, curIdx: number) => {
      const nextIdx = curIdx + 1;
      const reachedTarget =
        nextScoreA >= SPEED_TARGET_SCORE || nextScoreB >= SPEED_TARGET_SCORE;
      const outOfQuestions =
        nextIdx >= Math.min(SPEED_MAX_QUESTIONS, questionsA.length || SPEED_MAX_QUESTIONS);

      if ((reachedTarget || outOfQuestions) && !roundFinishedRef.current) {
        roundFinishedRef.current = true;
        const t = window.setTimeout(() => {
          playVictory();
          onAwardCoins(50);
          setPhase('finished');
        }, 700);
        timersRef.current.push(t);
        return;
      }

      const t = window.setTimeout(() => {
        setSpeedState({
          questionIndex: nextIdx,
          timeLeft: SPEED_ROUND_SECONDS,
          lockedA: false,
          lockedB: false,
          winnerThisRound: null,
          pickedOptIdx: null,
          lastMessage: null,
        });
      }, 900);
      timersRef.current.push(t);
    },
    [onAwardCoins, questionsA.length],
  );

  // Speed mode countdown timer
  useEffect(() => {
    if (
      !open ||
      phase !== 'playing' ||
      duoMode !== 'speed' ||
      speedState.winnerThisRound !== null ||
      roundFinishedRef.current
    ) {
      return;
    }

    if (speedState.timeLeft <= 0) {
      playWrong();
      setSpeedState((prev) => ({
        ...prev,
        winnerThisRound: 'none',
        lastMessage: '時間到！無人搶答成功，直接進入下一題',
      }));
      advanceSpeedRound(playerA.score, playerB.score, speedState.questionIndex);
      return;
    }

    const id = window.setTimeout(() => {
      setSpeedState((prev) => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1),
      }));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [
    open,
    phase,
    duoMode,
    speedState.timeLeft,
    speedState.winnerThisRound,
    speedState.questionIndex,
    playerA.score,
    playerB.score,
    advanceSpeedRound,
  ]);

  const handleSpeedAnswer = useCallback(
    (who: 'A' | 'B', optIdx: number) => {
      if (
        phase !== 'playing' ||
        duoMode !== 'speed' ||
        roundFinishedRef.current ||
        speedState.winnerThisRound !== null
      ) {
        return;
      }
      if (who === 'A' && speedState.lockedA) return;
      if (who === 'B' && speedState.lockedB) return;

      const q = questionsA[speedState.questionIndex];
      if (!q) return;

      const isCorrect = optIdx === q.answerIndex;
      const pName = who === 'A' ? nameA || '大寶' : nameB || '二寶';

      if (isCorrect) {
        playCorrect();
        const curCombo = who === 'A' ? playerA.combo : playerB.combo;
        const nextCombo = curCombo + 1;
        const pts = nextCombo >= 2 ? 3 : 2;
        const nextScoreA = who === 'A' ? playerA.score + pts : playerA.score;
        const nextScoreB = who === 'B' ? playerB.score + pts : playerB.score;

        if (who === 'A') {
          setPlayerA((prev) => ({
            ...prev,
            score: prev.score + pts,
            combo: nextCombo,
          }));
          setPlayerB((prev) => ({ ...prev, combo: 0 }));
        } else {
          setPlayerB((prev) => ({
            ...prev,
            score: prev.score + pts,
            combo: nextCombo,
          }));
          setPlayerA((prev) => ({ ...prev, combo: 0 }));
        }

        setSpeedState((prev) => ({
          ...prev,
          winnerThisRound: who,
          pickedOptIdx: optIdx,
          lastMessage: `${pName} 搶答成功！+${pts} 分${nextCombo >= 2 ? '（連擊加分！）' : ''}`,
        }));
        advanceSpeedRound(nextScoreA, nextScoreB, speedState.questionIndex);
      } else {
        playWrong();
        const nextScoreA =
          who === 'A' ? Math.max(0, playerA.score - 1) : playerA.score;
        const nextScoreB =
          who === 'B' ? Math.max(0, playerB.score - 1) : playerB.score;

        if (who === 'A') {
          setPlayerA((prev) => ({ ...prev, score: nextScoreA, combo: 0 }));
        } else {
          setPlayerB((prev) => ({ ...prev, score: nextScoreB, combo: 0 }));
        }

        const bothLocked =
          (who === 'A' ? true : speedState.lockedA) &&
          (who === 'B' ? true : speedState.lockedB);

        if (bothLocked) {
          setSpeedState((prev) => ({
            ...prev,
            lockedA: true,
            lockedB: true,
            winnerThisRound: 'none',
            pickedOptIdx: optIdx,
            lastMessage: `雙方皆答錯！正確答案是 ${['A', 'B', 'C', 'D'][q.answerIndex]}. ${q.options[q.answerIndex]}`,
          }));
          advanceSpeedRound(nextScoreA, nextScoreB, speedState.questionIndex);
        } else {
          const otherName = who === 'A' ? nameB || '二寶' : nameA || '大寶';
          setSpeedState((prev) => ({
            ...prev,
            lockedA: who === 'A' ? true : prev.lockedA,
            lockedB: who === 'B' ? true : prev.lockedB,
            lastMessage: `${pName} 答錯 -1 分！換 ${otherName} 補答！`,
          }));
        }
      }
    },
    [
      phase,
      duoMode,
      speedState,
      questionsA,
      nameA,
      nameB,
      playerA.combo,
      playerA.score,
      playerB.combo,
      playerB.score,
      advanceSpeedRound,
    ],
  );

  // Desktop keyboard shortcuts for Speed Duel (A: 1-4, B: 7-0)
  useEffect(() => {
    if (!open || phase !== 'playing' || duoMode !== 'speed') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleSpeedAnswer('A', Number(e.key) - 1);
      } else if (e.key === '7') {
        handleSpeedAnswer('B', 0);
      } else if (e.key === '8') {
        handleSpeedAnswer('B', 1);
      } else if (e.key === '9') {
        handleSpeedAnswer('B', 2);
      } else if (e.key === '0') {
        handleSpeedAnswer('B', 3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, phase, duoMode, handleSpeedAnswer]);

  if (!open) return null;

  const handleAnswer = (who: 'A' | 'B', optIdx: number) => {
    if (phase !== 'playing' || roundFinishedRef.current) return;
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
      const nextHp = Math.max(0, bossHp - dmg);
      setBossHp(nextHp);
      if (nextHp === 0 && !roundFinishedRef.current) {
        roundFinishedRef.current = true;
        const t = window.setTimeout(() => {
          playVictory();
          onAwardCoins(40);
          setPhase('finished');
        }, 450);
        timersRef.current.push(t);
        return;
      }
    } else if (
      duoMode === 'versus' &&
      nextScore >= TARGET_VERSUS_SCORE &&
      !roundFinishedRef.current
    ) {
      roundFinishedRef.current = true;
      const t = window.setTimeout(() => {
        playVictory();
        onAwardCoins(30);
        setPhase('finished');
      }, 450);
      timersRef.current.push(t);
      return;
    }

    const advanceTimer = window.setTimeout(() => {
      setter((curr) => ({
        ...curr,
        index: curr.index + 1,
        feedback: null,
      }));
    }, 550);
    timersRef.current.push(advanceTimer);
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
                {state.combo} 連擊
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

  const renderSpeedBuzzPanel = (who: 'A' | 'B') => {
    const isA = who === 'A';
    const q = questionsA[speedState.questionIndex];
    const playerName = isA ? nameA || '大寶' : nameB || '二寶';
    const score = isA ? playerA.score : playerB.score;
    const combo = isA ? playerA.combo : playerB.combo;
    const isLocked = isA ? speedState.lockedA : speedState.lockedB;
    const isRoundDone = speedState.winnerThisRound !== null;
    const keys = isA ? ['1', '2', '3', '4'] : ['7', '8', '9', '0'];

    return (
      <div
        className={`flex flex-1 flex-col justify-between rounded-3xl border-3 p-4 shadow-sm ${
          isA
            ? 'border-sky-300 bg-gradient-to-b from-sky-50 to-white'
            : 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-white'
        } ${isA && flipTop ? 'rotate-180' : ''}`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black text-white ${
                isA ? 'bg-sky-600' : 'bg-emerald-600'
              }`}
            >
              {playerName}
            </span>
            {combo >= 2 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
                {combo} 連擊
              </span>
            )}
            {isLocked && !isRoundDone && (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-700">
                本題鎖定
              </span>
            )}
          </div>
          <div className="text-sm font-black text-slate-700">
            積分：{score} / {SPEED_TARGET_SCORE}
          </div>
        </div>

        {q && (
          <div>
            <div className="mb-2.5 rounded-2xl bg-white/95 px-4 py-2.5 text-sm font-black text-slate-800 shadow-inner sm:text-base">
              {q.prompt}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, idx) => {
                let btnCls =
                  'border-slate-200 bg-white text-slate-800 hover:border-violet-400 hover:bg-violet-50';
                if (isRoundDone) {
                  if (idx === q.answerIndex) {
                    btnCls = 'border-emerald-500 bg-emerald-100 text-emerald-900';
                  } else {
                    btnCls = 'border-slate-200 bg-slate-100 text-slate-400';
                  }
                } else if (isLocked) {
                  btnCls = 'border-slate-200 bg-slate-100 text-slate-400 opacity-60';
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isLocked || isRoundDone}
                    onClick={() => handleSpeedAnswer(who, idx)}
                    className={`rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-extrabold transition active:scale-[0.97] ${btnCls}`}
                  >
                    <span className="mr-1.5 inline-flex items-center gap-1 font-black text-slate-400">
                      {['A', 'B', 'C', 'D'][idx]}.
                      <span className="hidden text-[10px] font-bold text-slate-300 md:inline">
                        [{keys[idx]}]
                      </span>
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
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
              離開對戰模式
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-black text-white shadow-sm">
              <Users className="h-4 w-4" />
              雙人同機對戰大廳
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
          <div className="mx-auto my-auto w-full max-w-3xl rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-center text-2xl font-black text-slate-800">
              雙人對戰模式
            </h2>
            <p className="mt-1 text-center text-xs font-medium text-slate-500">
              支援 1–6 年級全科目與動態數學出題，同一台平板就能同樂競技！
            </p>

            {/* 3 Mode cards */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setDuoMode('coop');
                }}
                className={`rounded-2xl border-3 p-3.5 text-left transition ${
                  duoMode === 'coop'
                    ? 'border-amber-400 bg-amber-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  合作打魔王
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  各答各年級題目，協力扣大魔王血量，共享 +40 金幣！
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTap();
                  setDuoMode('versus');
                }}
                className={`rounded-2xl border-3 p-3.5 text-left transition ${
                  duoMode === 'versus'
                    ? 'border-amber-400 bg-amber-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <Swords className="h-5 w-5 text-rose-500" />
                  公平競速賽
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  跨年級各自解題，先答對 5 題者獲勝，共享 +30 金幣！
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTap();
                  setDuoMode('speed');
                }}
                className={`rounded-2xl border-3 p-3.5 text-left transition ${
                  duoMode === 'speed'
                    ? 'border-violet-500 bg-violet-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <Zap className="h-5 w-5 text-violet-600" />
                  同題即時搶答
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  12 秒限時搶答同一題！答對 +2 分、答錯 -1 分，共享 +50 金幣！
                </p>
              </button>
            </div>

            {/* Players config */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-3.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-sky-700">
                    上方玩家（玩家 A）
                  </span>
                  {profiles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profiles.slice(0, 3).map((pf) => (
                        <button
                          key={`a-${pf.id}`}
                          type="button"
                          onClick={() => {
                            setNameA(pf.nickname);
                            if (pf.defaultGrade) setGradeA(pf.defaultGrade);
                          }}
                          className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-sky-700 shadow-xs hover:bg-sky-100"
                        >
                          {pf.nickname}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  maxLength={10}
                  aria-label="玩家 A 暱稱"
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
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-emerald-700">
                    下方玩家（玩家 B）
                  </span>
                  {profiles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profiles.slice(0, 3).map((pf) => (
                        <button
                          key={`b-${pf.id}`}
                          type="button"
                          onClick={() => {
                            setNameB(pf.nickname);
                            if (pf.defaultGrade) setGradeB(pf.defaultGrade);
                          }}
                          className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-xs hover:bg-emerald-100"
                        >
                          {pf.nickname}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  maxLength={10}
                  aria-label="玩家 B 暱稱"
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
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-base font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
            >
              {loading
                ? '正在準備對戰題庫...'
                : duoMode === 'speed'
                  ? '開始即時搶答賽！'
                  : '開始雙人對戰！'}
            </button>
          </div>
        )}

        {phase === 'playing' && duoMode !== 'speed' && (
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

        {phase === 'playing' && duoMode === 'speed' && (
          <div className="flex flex-1 flex-col gap-3">
            {renderSpeedBuzzPanel('A')}

            {/* Center Speed Countdown & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-violet-300 bg-white px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-black text-violet-700">
                <Zap className="h-4 w-4" />
                第 {speedState.questionIndex + 1} /{' '}
                {Math.min(SPEED_MAX_QUESTIONS, questionsA.length || SPEED_MAX_QUESTIONS)}{' '}
                題
              </div>

              <div className="flex-1 text-center text-xs font-black text-slate-700 sm:text-sm">
                {speedState.lastMessage ?? '誰先答對就得 +2 分！（答錯 -1 分）'}
              </div>

              <div
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                  speedState.timeLeft <= 4
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-violet-100 text-violet-800'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {speedState.timeLeft}s
              </div>
            </div>

            {renderSpeedBuzzPanel('B')}
          </div>
        )}

        {phase === 'finished' && (
          <div className="mx-auto my-auto w-full max-w-md rounded-3xl border-4 border-amber-300 bg-white p-6 text-center shadow-lg">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-500">
              <Trophy className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">
              {duoMode === 'coop'
                ? '雙人合作打敗大魔王！'
                : playerA.score === playerB.score
                  ? '勢均力敵！平手！'
                  : playerA.score > playerB.score
                    ? `恭喜 ${nameA} 獲勝！`
                    : `恭喜 ${nameB} 獲勝！`}
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-600">
              {nameA}（{gradeA}年級）{playerA.score} 分 · {nameB}（{gradeB}
              年級）{playerB.score} 分
            </p>
            <div className="my-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-black text-amber-800">
              <Sparkles className="h-4 w-4" />
              已為目前帳號加上 +
              {duoMode === 'coop' ? 40 : duoMode === 'speed' ? 50 : 30} 金幣！
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
