import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  BookOpen,
  Focus,
  Heart,
  Lightbulb,
  RefreshCw,
  Shuffle,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadLessonPack } from '../data/curriculum/lessonLoader';
import type { LessonScript } from '../types/lesson';
import type {
  BattleMode,
  Question,
  QuestionAttemptOutcome,
  Stage,
  WorkedExampleData,
} from '../types/quiz';
import {
  isDynamicStage,
  resolveStageQuestionsAsync,
} from '../utils/generators/registry';
import { resolveLessonForStage } from '../utils/lessonSynthesizer';
import {
  playCorrect,
  playCrit,
  playDefeat,
  playTap,
  playVictory,
  playWrong,
} from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';
import { shuffleQuestionOptions } from '../utils/questionUtils';
import {
  buildHintLevels,
  buildWorkedExampleFromQuestion,
  pickEliminatedOptionIndices,
} from '../utils/workedExample';
import { BattleSummary, type BattleResult } from './BattleSummary';
import { HeroSprite, MonsterSprite } from './GameSprites';
import { LessonDiagram } from './lesson-diagrams/LessonDiagram';
import { QuestionVisual } from './QuestionVisual';
import { WorkedExampleSplit } from './WorkedExampleSplit';

export type { BattleResult };

interface BattleArenaProps {
  stage: Stage;
  selectedAvatarId: string;
  currentXp: number;
  previousStars?: number;
  isWrongReviewMode?: boolean;
  battleMode?: BattleMode;
  focusMode?: boolean;
  speechSlowMode?: boolean;
  autoReadQuestion?: boolean;
  onToggleFocusMode?: () => void;
  onToggleSpeechSlow?: () => void;
  onToggleAutoRead?: () => void;
  onReviewLesson?: () => void;
  onOpenCertificate?: () => void;
  onFinishBattle: (result: BattleResult) => void;
  onExit: () => void;
}

interface BattleQueueItem {
  question: Question;
  isRetry: boolean;
  originId: string;
}

const READ_LOCK_MS = 1500;
const OPTION_LABELS = ['1', '2', '3', '4'];
const OPTION_COLORS = [
  'bg-sky-50 border-sky-300 hover:bg-sky-100 text-sky-900 shadow-[0_4px_0_#7dd3fc]',
  'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-900 shadow-[0_4px_0_#6ee7b7]',
  'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900 shadow-[0_4px_0_#fcd34d]',
  'bg-violet-50 border-violet-300 hover:bg-violet-100 text-violet-900 shadow-[0_4px_0_#c4b5fd]',
];

function toInitialQueue(questions: Question[]): BattleQueueItem[] {
  return questions.map((question) => ({
    question,
    isRetry: false,
    originId: question.id,
  }));
}

export function BattleArena({
  stage,
  selectedAvatarId,
  currentXp,
  previousStars = 0,
  isWrongReviewMode = false,
  battleMode,
  focusMode = false,
  speechSlowMode = false,
  autoReadQuestion = false,
  onToggleFocusMode,
  onToggleSpeechSlow,
  onToggleAutoRead,
  onReviewLesson,
  onOpenCertificate,
  onFinishBattle,
  onExit,
}: BattleArenaProps) {
  const effectiveBattleMode: BattleMode =
    battleMode ?? (isWrongReviewMode ? 'wrong-review' : 'stage');
  const isWrongReview = effectiveBattleMode === 'wrong-review';
  const allowHeartElimination = effectiveBattleMode === 'stage';
  const isDynamic = isDynamicStage(stage);
  const [queue, setQueue] = useState<BattleQueueItem[]>(() =>
    isDynamic ? [] : toInitialQueue(stage.questions),
  );
  const [baseQuestionCount, setBaseQuestionCount] = useState<number>(() =>
    isDynamic ? 6 : stage.questions.length,
  );
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(isDynamic);
  const maxMonsterHp = useMemo(
    () => Math.max(stage.monsterHp, baseQuestionCount * 20),
    [stage.monsterHp, baseQuestionCount],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [monsterHp, setMonsterHp] = useState(() =>
    Math.max(stage.monsterHp, (isDynamic ? 6 : stage.questions.length) * 20),
  );
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [manualEliminatedIndices, setManualEliminatedIndices] = useState<
    number[]
  >([]);
  const [activeScaffold, setActiveScaffold] =
    useState<WorkedExampleData | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [solvedWrongIds, setSolvedWrongIds] = useState<string[]>([]);
  const [repairedIds, setRepairedIds] = useState<string[]>([]);
  const [attemptOutcomes, setAttemptOutcomes] = useState<
    QuestionAttemptOutcome[]
  >([]);
  const [readLockRemainingMs, setReadLockRemainingMs] = useState(0);
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [heroHurt, setHeroHurt] = useState(false);
  const [monsterHit, setMonsterHit] = useState(false);
  const [floatingDmg, setFloatingDmg] = useState<{
    id: number;
    text: string;
    isCrit: boolean;
  } | null>(null);
  const [finishedResult, setFinishedResult] = useState<BattleResult | null>(
    null,
  );
  const [conceptDrawerOpen, setConceptDrawerOpen] = useState(false);
  const [conceptDrawerLoading, setConceptDrawerLoading] = useState(false);
  const [conceptDrawerLesson, setConceptDrawerLesson] =
    useState<LessonScript | null>(null);

  const initialXpRef = useRef(currentXp);
  const latestCurrentXpRef = useRef(currentXp);
  latestCurrentXpRef.current = currentXp;
  const latestPrevStarsRef = useRef(previousStars);
  latestPrevStarsRef.current = previousStars;
  const isMountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const queuedRetryIdsRef = useRef<Set<string>>(new Set());
  const questionStartRef = useRef<number>(Date.now());
  const hintUsedRef = useRef<boolean>(false);
  const consecutiveWrongRef = useRef<number>(0);
  const pendingScaffoldRef = useRef<WorkedExampleData | null>(null);
  const readLockTimerRef = useRef<number | null>(null);

  const currentItem = queue[currentIndex];
  const currentQuestion = currentItem?.question;
  const stageGrade = stage.curriculum?.grade;
  const isLowerGrade = stageGrade !== undefined && stageGrade <= 2;
  const autoLowerEliminated = useMemo(
    () =>
      currentQuestion && isLowerGrade
        ? pickEliminatedOptionIndices(currentQuestion, 1)
        : [],
    [currentQuestion, isLowerGrade],
  );
  const visibleOptionEntries = useMemo(() => {
    if (!currentQuestion) return [];
    const autoSet = new Set(autoLowerEliminated);
    return currentQuestion.options
      .map((option, origIndex) => ({ option, origIndex }))
      .filter((entry) => !autoSet.has(entry.origIndex));
  }, [autoLowerEliminated, currentQuestion]);
  const manualEliminatedSet = useMemo(
    () => new Set(manualEliminatedIndices),
    [manualEliminatedIndices],
  );
  const hintLevels = useMemo(
    () => (currentQuestion ? buildHintLevels(currentQuestion) : null),
    [currentQuestion],
  );
  const hasInterleavedQuestions = useMemo(
    () =>
      queue.some(
        (item) => item.question.interleavingOriginTag === 'PREVIOUS_UNIT_REVIEW',
      ),
    [queue],
  );
  const speechAvailable = isSpeechSupported();
  const isNextLocked = readLockRemainingMs > 0;

  const clearReadLock = useCallback(() => {
    if (readLockTimerRef.current !== null) {
      window.clearInterval(readLockTimerRef.current);
      readLockTimerRef.current = null;
    }
    setReadLockRemainingMs(0);
  }, []);

  const startReadLock = useCallback(() => {
    clearReadLock();
    const lockUntil = Date.now() + READ_LOCK_MS;
    setReadLockRemainingMs(READ_LOCK_MS);
    readLockTimerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, lockUntil - Date.now());
      setReadLockRemainingMs(remaining);
      if (remaining <= 0) {
        clearReadLock();
      }
    }, 100);
  }, [clearReadLock]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearReadLock();
      stopSpeech();
    };
  }, [clearReadLock]);

  useEffect(() => {
    if (
      !autoReadQuestion ||
      !speechAvailable ||
      isLoadingQuestions ||
      finishedResult ||
      !currentQuestion
    ) {
      return;
    }
    speakText(
      currentQuestion.speechText || currentQuestion.prompt,
      currentQuestion.speechLang || 'zh-TW',
      {
        grade: stageGrade,
        slowMode: speechSlowMode,
        audioUrl: currentQuestion.audioUrl,
      },
    );
  }, [
    autoReadQuestion,
    currentIndex,
    currentQuestion,
    finishedResult,
    isLoadingQuestions,
    speechAvailable,
    speechSlowMode,
    stageGrade,
  ]);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    initialXpRef.current = latestCurrentXpRef.current;
    queuedRetryIdsRef.current.clear();
    clearReadLock();
    stopSpeech();
    setCurrentIndex(0);
    setHearts(3);
    setCombo(0);
    setMaxCombo(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setWrongQuestions([]);
    setSolvedWrongIds([]);
    setFloatingDmg(null);
    setFinishedResult(null);
    setRepairedIds([]);
    setAttemptOutcomes([]);
    setHintLevel(0);
    setManualEliminatedIndices([]);
    setActiveScaffold(null);
    consecutiveWrongRef.current = 0;
    pendingScaffoldRef.current = null;
    hintUsedRef.current = false;
    questionStartRef.current = Date.now();

    if (!isDynamicStage(stage)) {
      setQueue(toInitialQueue(stage.questions));
      setBaseQuestionCount(stage.questions.length);
      setMonsterHp(Math.max(stage.monsterHp, stage.questions.length * 20));
      setIsLoadingQuestions(false);
      return;
    }

    let cancelled = false;
    setIsLoadingQuestions(true);
    void resolveStageQuestionsAsync(stage, 6, {
      enableInterleaving: true,
      prevStars: latestPrevStarsRef.current,
      isReviewMode: isWrongReviewMode,
    }).then((nextQuestions) => {
      if (cancelled || requestSeqRef.current !== seq) return;
      setQueue(toInitialQueue(nextQuestions));
      setBaseQuestionCount(nextQuestions.length);
      setMonsterHp(Math.max(stage.monsterHp, nextQuestions.length * 20));
      setIsLoadingQuestions(false);
      questionStartRef.current = Date.now();
    });

    return () => {
      cancelled = true;
    };
  }, [clearReadLock, isWrongReviewMode, stage]);

  const recordMathAnswerStreak = useCallback(
    (isCorrect: boolean, question: Question) => {
      if (isCorrect) {
        consecutiveWrongRef.current = 0;
        pendingScaffoldRef.current = null;
        setActiveScaffold(null);
        return;
      }

      const nextWrongStreak = consecutiveWrongRef.current + 1;
      consecutiveWrongRef.current = nextWrongStreak;
      if (
        nextWrongStreak >= 2 &&
        (stage.subjectId === 'math' || question.subjectId === 'math')
      ) {
        pendingScaffoldRef.current = buildWorkedExampleFromQuestion(
          question,
          stage.curriculum?.grade,
        );
        setActiveScaffold(null);
      }
    },
    [stage.curriculum?.grade, stage.subjectId],
  );

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (selectedOption !== null || finishedResult || !currentItem) return;

      const question = currentItem.question;
      const responseTimeMs = Math.max(0, Date.now() - questionStartRef.current);
      const usedHint = hintUsedRef.current;
      const isCorrect = optionIndex === question.answerIndex;

      setSelectedOption(optionIndex);
      recordMathAnswerStreak(isCorrect, question);

      if (currentItem.isRetry) {
        if (isCorrect) {
          const baseDmg = Math.ceil(
            maxMonsterHp / Math.max(1, baseQuestionCount),
          );
          setMonsterHp((prev) => Math.max(0, prev - baseDmg));
          setRepairedIds((prev) =>
            prev.includes(currentItem.originId)
              ? prev
              : [...prev, currentItem.originId],
          );
          setAttemptOutcomes((prev) =>
            prev.map((item) =>
              item.question.id === currentItem.originId
                ? { ...item, repairedInRound: true }
                : item,
            ),
          );
          if (!focusMode) {
            setHeroAttacking(true);
            setMonsterHit(true);
            setFloatingDmg({
              id: Date.now(),
              text: `修復 -${baseDmg}!`,
              isCrit: false,
            });
            window.setTimeout(() => {
              setHeroAttacking(false);
              setMonsterHit(false);
            }, 450);
          }
          playCorrect(1);
        } else {
          if (!focusMode) {
            setHeroHurt(true);
            window.setTimeout(() => setHeroHurt(false), 450);
          }
          playWrong();
          startReadLock();
        }
        return;
      }

      setAttemptOutcomes((prev) => [
        ...prev,
        {
          question,
          wasCorrect: isCorrect,
          usedHint,
          responseTimeMs,
        },
      ]);

      if (isCorrect) {
        const nextCombo = combo + 1;
        const isCrit = nextCombo >= 3;
        const baseDmg = Math.ceil(
          maxMonsterHp / Math.max(1, baseQuestionCount),
        );
        const damage = isCrit ? baseDmg + 15 : baseDmg;

        setCombo(nextCombo);
        setMaxCombo((prev) => Math.max(prev, nextCombo));
        setCorrectCount((prev) => prev + 1);
        setMonsterHp((prev) => Math.max(0, prev - damage));

        if (!focusMode) {
          setHeroAttacking(true);
          setMonsterHit(true);
          setFloatingDmg({
            id: Date.now(),
            text: isCrit ? `CRIT -${damage}!` : `-${damage}`,
            isCrit,
          });
          window.setTimeout(() => {
            setHeroAttacking(false);
            setMonsterHit(false);
          }, 450);
        }

        if (isWrongReviewMode) {
          setSolvedWrongIds((prev) =>
            prev.includes(question.id) ? prev : [...prev, question.id],
          );
        }

        if (isCrit) {
          playCrit();
        } else {
          playCorrect(nextCombo);
        }
      } else {
        const nextHearts = allowHeartElimination
          ? Math.max(0, hearts - 1)
          : hearts;
        setCombo(0);
        if (allowHeartElimination) {
          setHearts(nextHearts);
        }
        setWrongQuestions((prev) => [...prev, question]);
        if (!focusMode) {
          setHeroHurt(true);
          window.setTimeout(() => setHeroHurt(false), 450);
        }
        playWrong();
        startReadLock();

        if (
          (nextHearts > 0 || !allowHeartElimination) &&
          !queuedRetryIdsRef.current.has(currentItem.originId)
        ) {
          queuedRetryIdsRef.current.add(currentItem.originId);
          const retryQuestion = shuffleQuestionOptions(question);
          setQueue((prev) => {
            const insertIndex = Math.min(prev.length, currentIndex + 3);
            const next = [...prev];
            next.splice(insertIndex, 0, {
              question: retryQuestion,
              isRetry: true,
              originId: currentItem.originId,
            });
            return next;
          });
        }
      }
    },
    [
      allowHeartElimination,
      baseQuestionCount,
      combo,
      currentIndex,
      currentItem,
      finishedResult,
      focusMode,
      hearts,
      isWrongReviewMode,
      maxMonsterHp,
      recordMathAnswerStreak,
      selectedOption,
      startReadLock,
    ],
  );

  const finalizeBattle = useCallback(() => {
    clearReadLock();
    stopSpeech();
    const totalCount = baseQuestionCount;
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const survived = allowHeartElimination ? hearts > 0 : accuracy >= 0.4;

    let stars = 0;
    if (survived) {
      if (accuracy >= 0.85 && (hearts >= 2 || !allowHeartElimination)) stars = 3;
      else if (accuracy >= 0.6) stars = 2;
      else stars = 1;
    }

    const xpEarned = survived
      ? correctCount * 20 + maxCombo * 5 + (stars === 3 ? 30 : 0)
      : Math.max(10, correctCount * 8);
    const rawCoins = survived
      ? correctCount * (isWrongReview ? 15 : 10) + maxCombo * 3 + stars * 10
      : Math.max(5, correctCount * 4);
    const isRepeatMasteredStaticStage =
      effectiveBattleMode === 'stage' &&
      !isDynamic &&
      latestPrevStarsRef.current >= 3;
    const coinsEarned = isRepeatMasteredStaticStage
      ? Math.max(5, Math.round(rawCoins * 0.3))
      : rawCoins;

    const result: BattleResult = {
      stageId: stage.id,
      subjectId: stage.subjectId,
      stageTitle: stage.title,
      stars,
      xpEarned,
      coinsEarned,
      correctCount,
      totalCount,
      wrongQuestions,
      solvedWrongIds,
      isReviewMode: isWrongReview,
      battleMode: effectiveBattleMode,
      attemptOutcomes,
      repairedCount: repairedIds.length,
    };

    setFinishedResult(result);
    onFinishBattle(result);

    if (survived) {
      playVictory();
      if (!focusMode) {
        void confetti({
          particleCount: stars === 3 ? 110 : 65,
          spread: 75,
          origin: { y: 0.6 },
        });
      }
    } else {
      playDefeat();
    }
  }, [
    allowHeartElimination,
    attemptOutcomes,
    baseQuestionCount,
    clearReadLock,
    correctCount,
    effectiveBattleMode,
    focusMode,
    hearts,
    isDynamic,
    isWrongReview,
    maxCombo,
    onFinishBattle,
    repairedIds.length,
    solvedWrongIds,
    stage.id,
    stage.subjectId,
    stage.title,
    wrongQuestions,
  ]);

  const handleNext = useCallback(() => {
    if (isNextLocked) return;
    playTap();
    stopSpeech();
    clearReadLock();
    const isLast = currentIndex >= queue.length - 1;
    if ((allowHeartElimination && hearts <= 0) || isLast) {
      finalizeBattle();
      return;
    }
    if (pendingScaffoldRef.current) {
      setActiveScaffold(pendingScaffoldRef.current);
      pendingScaffoldRef.current = null;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setHintLevel(0);
    setManualEliminatedIndices([]);
    hintUsedRef.current = false;
    questionStartRef.current = Date.now();
  }, [
    allowHeartElimination,
    clearReadLock,
    currentIndex,
    finalizeBattle,
    hearts,
    isNextLocked,
    queue.length,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finishedResult || isLoadingQuestions) return;
      if (selectedOption === null) {
        const keyPos = ['1', '2', '3', '4'].indexOf(e.key);
        const target = keyPos !== -1 ? visibleOptionEntries[keyPos] : undefined;
        if (target && !manualEliminatedSet.has(target.origIndex)) {
          handleSelectOption(target.origIndex);
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && !isNextLocked) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    finishedResult,
    handleNext,
    handleSelectOption,
    isLoadingQuestions,
    isNextLocked,
    manualEliminatedSet,
    selectedOption,
    visibleOptionEntries,
  ]);

  const handleRetry = async () => {
    playTap();
    clearReadLock();
    stopSpeech();
    initialXpRef.current = latestCurrentXpRef.current;
    const seq = ++requestSeqRef.current;
    const dynamic = isDynamicStage(stage);
    queuedRetryIdsRef.current.clear();
    hintUsedRef.current = false;
    consecutiveWrongRef.current = 0;
    pendingScaffoldRef.current = null;
    questionStartRef.current = Date.now();
    setCurrentIndex(0);
    setHearts(3);
    setCombo(0);
    setMaxCombo(0);
    setSelectedOption(null);
    setHintLevel(0);
    setManualEliminatedIndices([]);
    setActiveScaffold(null);
    setCorrectCount(0);
    setWrongQuestions([]);
    setSolvedWrongIds([]);
    setRepairedIds([]);
    setAttemptOutcomes([]);
    setFloatingDmg(null);
    setFinishedResult(null);

    if (!dynamic) {
      const nextQuestions = stage.questions;
      setQueue(toInitialQueue(nextQuestions));
      setBaseQuestionCount(nextQuestions.length);
      setMonsterHp(Math.max(stage.monsterHp, nextQuestions.length * 20));
      setIsLoadingQuestions(false);
      return;
    }

    setIsLoadingQuestions(true);
    const nextQuestions = await resolveStageQuestionsAsync(stage, 6, {
      enableInterleaving: true,
      prevStars: latestPrevStarsRef.current,
      isReviewMode: isWrongReviewMode,
    });
    if (!isMountedRef.current || requestSeqRef.current !== seq) return;
    setQueue(toInitialQueue(nextQuestions));
    setBaseQuestionCount(nextQuestions.length);
    setMonsterHp(Math.max(stage.monsterHp, nextQuestions.length * 20));
    setIsLoadingQuestions(false);
    questionStartRef.current = Date.now();
  };

  const handleOpenConceptDrawer = useCallback(async () => {
    playTap();
    setConceptDrawerOpen(true);
    if (conceptDrawerLesson) return;
    setConceptDrawerLoading(true);
    try {
      const ref = stage.curriculum;
      const pack =
        ref && stage.subjectId !== 'custom'
          ? await loadLessonPack(
              ref.academicYear,
              ref.semester,
              ref.grade,
              stage.subjectId,
            )
          : null;
      if (!isMountedRef.current) return;
      setConceptDrawerLesson(resolveLessonForStage(pack, stage).lesson);
    } finally {
      if (isMountedRef.current) {
        setConceptDrawerLoading(false);
      }
    }
  }, [conceptDrawerLesson, stage]);

  if (finishedResult) {
    return (
      <BattleSummary
        result={finishedResult}
        stage={stage}
        selectedAvatarId={selectedAvatarId}
        initialXp={initialXpRef.current}
        previousStars={latestPrevStarsRef.current}
        maxCombo={maxCombo}
        focusMode={focusMode}
        speechSlowMode={speechSlowMode}
        onRetry={handleRetry}
        onReviewLesson={onReviewLesson}
        onOpenCertificate={onOpenCertificate}
        onExit={onExit}
      />
    );
  }

  if (isLoadingQuestions) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border-2 border-amber-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 animate-spin items-center justify-center rounded-full border-4 border-amber-200 border-t-amber-500" />
          <p className="mt-4 text-lg font-black text-slate-800">
            正在為你準備數學新題目...
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">{stage.title}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion || !currentItem) return null;

  const hpPercent = Math.round((monsterHp / maxMonsterHp) * 100);
  const progressPercent = Math.round(
    ((currentIndex + (selectedOption !== null ? 1 : 0)) /
      Math.max(1, queue.length)) *
      100,
  );
  const isAnswered = selectedOption !== null;
  const isAnswerCorrect = selectedOption === currentQuestion.answerIndex;
  const heroAnimClass = focusMode
    ? ''
    : heroAttacking
      ? 'animate-attack'
      : heroHurt
        ? 'animate-shake'
        : 'animate-bob';
  const monsterAnimClass = focusMode
    ? ''
    : monsterHit
      ? 'animate-shake'
      : 'animate-bob';

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-xs">
        <button
          type="button"
          onClick={() => {
            playTap();
            clearReadLock();
            stopSpeech();
            onExit();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>撤退</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-700">
            第 {currentIndex + 1} / {queue.length} 題
          </span>
          <div className="h-3 w-28 overflow-hidden rounded-full bg-slate-100 sm:w-40">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onToggleFocusMode && (
            <button
              type="button"
              onClick={() => {
                playTap();
                onToggleFocusMode();
              }}
              aria-pressed={focusMode}
              title={
                focusMode
                  ? '專注模式已開啟（關閉晃動與彩帶干擾）'
                  : '開啟低干擾專注模式'
              }
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-black transition ${
                focusMode
                  ? 'border-indigo-300 bg-indigo-100 text-indigo-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Focus className="h-3.5 w-3.5" />
              <span>{focusMode ? '專注中' : '專注模式'}</span>
            </button>
          )}

          {combo >= 2 && (
            <div
              className={`${focusMode ? '' : 'animate-pop-in '}inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1 text-xs font-black text-white shadow-xs`}
            >
              <Zap className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
              <span>
                {combo} Combo {combo >= 3 ? '爆擊!' : ''}
              </span>
            </div>
          )}

          {allowHeartElimination ? (
            <div
              className="flex items-center gap-1"
              aria-label={`剩餘 ${hearts} 顆愛心`}
            >
              {[1, 2, 3].map((h) => (
                <Heart
                  key={h}
                  className={`h-6 w-6 transition-transform ${
                    h <= hearts
                      ? 'fill-rose-500 text-rose-500'
                      : 'scale-90 fill-slate-200 text-slate-300'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              {effectiveBattleMode === 'mock-exam'
                ? '完整診斷（不淘汰）'
                : 'FSRS 複習（不淘汰）'}
            </span>
          )}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border-2 border-sky-200 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100 p-5 shadow-sm">
        <div className="grid grid-cols-2 items-center gap-4">
          <div className="flex flex-col items-center">
            <div className={heroAnimClass}>
              <HeroSprite avatarId={selectedAvatarId} size={96} />
            </div>
            <span className="mt-1 rounded-full bg-white/85 px-3 py-0.5 text-xs font-black text-slate-700 shadow-2xs">
              我方勇者
            </span>
          </div>

          <div className="relative flex flex-col items-center">
            {!focusMode && floatingDmg && (
              <div
                key={floatingDmg.id}
                className={`animate-float-up pointer-events-none absolute -top-2 z-10 text-2xl font-black drop-shadow-sm ${
                  floatingDmg.isCrit ? 'text-amber-500' : 'text-rose-600'
                }`}
              >
                {floatingDmg.text}
              </div>
            )}

            <div className={monsterAnimClass}>
              <MonsterSprite
                monsterId={stage.monsterId}
                size={98}
                isHit={monsterHit}
                isDefeated={monsterHp <= 0}
              />
            </div>

            <div className="mt-1 w-full max-w-[180px] rounded-xl bg-white/90 p-2 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                <span className="truncate">{stage.monsterName}</span>
                <span>
                  {monsterHp}/{maxMonsterHp}
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-sm sm:p-6">
        {activeScaffold && !isAnswered && (
          <div className="mb-4">
            <WorkedExampleSplit
              compact
              data={activeScaffold}
              title="🧭 連錯 2 題降階鷹架：先對比正確步驟與常見陷阱，再挑戰這題！"
              onDismiss={() => setActiveScaffold(null)}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {currentItem.isRetry && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-black text-teal-800">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>🔁 即時修復重測（不扣愛心，再想一次就能記牢！）</span>
            </div>
          )}

          {hasInterleavedQuestions &&
            currentQuestion.interleavingOriginTag === 'PREVIOUS_UNIT_REVIEW' && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-800">
                <Shuffle className="h-3.5 w-3.5" />
                <span>
                  🔀 前單元交錯複習
                  {currentQuestion.interleavingSourceUnit
                    ? `（${currentQuestion.interleavingSourceUnit}）`
                    : ''}
                </span>
              </div>
            )}

          {hasInterleavedQuestions &&
            currentQuestion.interleavingOriginTag === 'CURRENT_UNIT' && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                <span>🎯 本單元主線</span>
              </div>
            )}

          {isLowerGrade && (
            <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
              <span>✨ 低年級 3 選 1 減壓模式</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="flex-1 text-xl leading-snug font-black text-slate-800 sm:text-2xl">
            {currentQuestion.prompt}
          </h2>

          <div className="flex flex-wrap shrink-0 items-center gap-2">
            {speechAvailable && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    speakText(
                      currentQuestion.speechText || currentQuestion.prompt,
                      currentQuestion.speechLang || 'zh-TW',
                      {
                        grade: stageGrade,
                        slowMode: speechSlowMode,
                        audioUrl: currentQuestion.audioUrl,
                      },
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
                  title="念出題目"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>朗讀</span>
                </button>
                {onToggleSpeechSlow && (
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      onToggleSpeechSlow();
                    }}
                    aria-pressed={speechSlowMode}
                    className={`rounded-xl border px-2.5 py-2 text-xs font-black transition ${
                      speechSlowMode
                        ? 'border-violet-300 bg-violet-100 text-violet-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="切換朗讀語速"
                  >
                    {speechSlowMode ? '慢速' : '標準語速'}
                  </button>
                )}
                {onToggleAutoRead && (
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      onToggleAutoRead();
                    }}
                    aria-pressed={autoReadQuestion}
                    className={`rounded-xl border px-2.5 py-2 text-xs font-black transition ${
                      autoReadQuestion
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="切換進題自動朗讀"
                  >
                    {autoReadQuestion ? '自動朗讀中' : '自動朗讀'}
                  </button>
                )}
              </>
            )}

            {!isAnswered && !isLowerGrade && (
              <button
                type="button"
                disabled={manualEliminatedIndices.length > 0}
                onClick={() => {
                  playTap();
                  hintUsedRef.current = true;
                  setManualEliminatedIndices(
                    pickEliminatedOptionIndices(currentQuestion, 2),
                  );
                }}
                className={`rounded-xl border px-2.5 py-2 text-xs font-black transition ${
                  manualEliminatedIndices.length > 0
                    ? 'cursor-default border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100'
                }`}
                title="排除 2 個錯誤選項"
              >
                {manualEliminatedIndices.length > 0 ? '已 50/50' : '50/50 減壓'}
              </button>
            )}

            {!isAnswered && hintLevels && (
              <button
                type="button"
                disabled={hintLevel >= 3}
                onClick={() => {
                  playTap();
                  hintUsedRef.current = true;
                  setHintLevel((prev) =>
                    prev < 3 ? ((prev + 1) as 0 | 1 | 2 | 3) : 3,
                  );
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition ${
                  hintLevel >= 3
                    ? 'cursor-default border-amber-200 bg-amber-100/60 text-amber-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                <span>
                  {hintLevel === 0
                    ? '提示 (1/3)'
                    : hintLevel === 1
                      ? '再提示 (2/3)'
                      : hintLevel === 2
                        ? '第一步 (3/3)'
                        : '已全開 (3/3)'}
                </span>
              </button>
            )}
          </div>
        </div>

        <QuestionVisual question={currentQuestion} />

        {hintLevel > 0 && hintLevels && !isAnswered && (
          <div className="mt-3 space-y-2">
            {hintLevels.slice(0, hintLevel).map((hintText, levelIdx) => (
              <div
                key={levelIdx}
                className={`${focusMode ? '' : 'animate-pop-in '}rounded-2xl border px-4 py-2.5 text-sm font-bold ${
                  levelIdx === 0
                    ? 'border-sky-200 bg-sky-50 text-sky-900'
                    : levelIdx === 1
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`}
              >
                {hintText}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {visibleOptionEntries.map(({ option, origIndex }, visIdx) => {
            const isEliminated = manualEliminatedSet.has(origIndex);
            const isThisSelected = selectedOption === origIndex;
            const isCorrectOption = origIndex === currentQuestion.answerIndex;

            let buttonStyle = OPTION_COLORS[visIdx % OPTION_COLORS.length];
            if (isEliminated && !isAnswered) {
              buttonStyle =
                'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-40 line-through';
            } else if (isAnswered) {
              if (isCorrectOption) {
                buttonStyle =
                  'bg-emerald-500 border-emerald-600 text-white shadow-[0_4px_0_#047857]';
              } else if (isThisSelected) {
                buttonStyle =
                  'bg-rose-500 border-rose-600 text-white shadow-[0_4px_0_#be123c]';
              } else {
                buttonStyle =
                  'bg-slate-100 border-slate-200 text-slate-400 opacity-75';
              }
            }

            return (
              <button
                key={origIndex}
                type="button"
                disabled={isAnswered || isEliminated}
                onClick={() => handleSelectOption(origIndex)}
                className={`btn-3d flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-base font-black transition sm:text-lg ${buttonStyle}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-sm font-black text-slate-800">
                  {OPTION_LABELS[visIdx]}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div
            className={`${focusMode ? '' : 'animate-pop-in '}mt-5 rounded-2xl border-2 p-4 ${
              isAnswerCorrect
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-rose-300 bg-rose-50'
            }`}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div
                  className={`text-base font-black ${
                    isAnswerCorrect ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {isAnswerCorrect
                    ? currentItem.isRetry
                      ? '🎉 太棒了！你成功修復這題的觀念囉！'
                      : combo >= 3
                        ? `🔥 太神啦！${combo} 連擊大爆擊！`
                        : '✨ 答對了！漂亮的一擊！'
                    : currentItem.isRetry
                      ? '💪 沒關係！先記進錯題本，之後我們再慢慢練熟：'
                      : hearts > 0
                        ? '💪 看懂解析了嗎？這題等一下還會再考一次喔！'
                        : '💪 沒關係！看看小老師解析就會了：'}
                </div>
                <p className="text-sm leading-relaxed font-medium text-slate-700">
                  {currentQuestion.explanation}
                </p>
                {!isAnswerCorrect && stage.subjectId !== 'custom' && (
                  <button
                    type="button"
                    onClick={handleOpenConceptDrawer}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-black text-sky-800 shadow-2xs hover:bg-sky-50"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>📖 回看本單元觀念圖解</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isNextLocked}
                onClick={handleNext}
                className={`btn-3d shrink-0 rounded-2xl px-6 py-3 text-base font-black transition ${
                  isNextLocked
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                    : 'bg-amber-400 text-slate-900 shadow-[0_4px_0_#d97706] hover:bg-amber-300'
                }`}
              >
                {isNextLocked
                  ? `先讀解析 (${(readLockRemainingMs / 1000).toFixed(1)}s)`
                  : (allowHeartElimination && hearts <= 0) ||
                      currentIndex >= queue.length - 1
                    ? '查看結算'
                    : '下一題 →'}
              </button>
            </div>
          </div>
        )}
      </section>

      {conceptDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="單元觀念即時回看"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-sky-300 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-sky-600" />
                <h3 className="text-lg font-black text-slate-800">
                  {stage.title} · 觀念即時回看
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setConceptDrawerOpen(false);
                }}
                aria-label="關閉觀念回看"
                className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {conceptDrawerLoading ? (
              <div className="py-10 text-center text-sm font-black text-slate-500">
                正在載入單元觀念圖解...
              </div>
            ) : conceptDrawerLesson ? (
              <div className="mt-4 space-y-5">
                {conceptDrawerLesson.scenes
                  .filter(
                    (s) =>
                      s.componentType === 'ANCHOR_SCENE' ||
                      s.componentType === 'WORKED_EXAMPLE_SPLIT',
                  )
                  .slice(0, 2)
                  .map((scene) => (
                    <div
                      key={scene.sceneId}
                      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <h4 className="text-base font-black text-slate-800">
                        {scene.title}
                      </h4>
                      <p className="text-sm leading-relaxed font-medium text-slate-700">
                        {scene.narrationText}
                      </p>
                      {scene.visualSpec && (
                        <LessonDiagram spec={scene.visualSpec} />
                      )}
                      {scene.workedExampleData && (
                        <WorkedExampleSplit
                          compact
                          data={scene.workedExampleData}
                        />
                      )}
                      {scene.cognitiveChunks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {scene.cognitiveChunks.map((chunk, cIdx) => (
                            <span
                              key={cIdx}
                              className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs font-black text-sky-900"
                            >
                              ✓ {chunk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm font-bold text-slate-500">
                暫無額外微課程資料，請先參考上方小老師解析喔！
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setConceptDrawerOpen(false);
                }}
                className="btn-3d rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#0284c7] hover:bg-sky-400"
              >
                看懂了，繼續戰鬥！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
