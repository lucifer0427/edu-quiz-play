import { ArrowLeft, Clock, FlipVertical2, Heart, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Grade, LocalProfileMeta, Question } from '../types/quiz';
import { playCorrect, playTap, playVictory, playWrong } from '../utils/sound';
import {
  DuoFinishedCard,
  DuoSpeedBuzzPanel,
  DuoSplitPanel,
} from './duo/DuoPlayPanels';
import { DuoSetupPanel } from './duo/DuoSetupPanel';
import { loadQuestionsForGrade } from './duo/duoQuestionLoader';
import {
  SPEED_MAX_QUESTIONS,
  SPEED_ROUND_SECONDS,
  SPEED_TARGET_SCORE,
  TARGET_VERSUS_SCORE,
  type DuoMode,
  type DuoSubject,
  type PlayerState,
  type SpeedRoundState,
} from './duo/duoTypes';

interface SiblingDuoArenaProps {
  open: boolean;
  profiles?: LocalProfileMeta[];
  defaultGradeA?: Grade;
  defaultGradeB?: Grade;
  defaultNameA?: string;
  defaultNameB?: string;
  questionLoader?: (grade: Grade, subject: DuoSubject) => Promise<Question[]>;
  onAwardCoins: (coins: number) => void;
  onClose: () => void;
}

export function SiblingDuoArena({
  open,
  profiles = [],
  defaultGradeA = 5,
  defaultGradeB = 2,
  defaultNameA = '大寶',
  defaultNameB = '二寶',
  questionLoader = loadQuestionsForGrade,
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
        const sharedGrade = (Math.min(gradeA, gradeB) as Grade) || gradeA;
        const sharedQs = await questionLoader(sharedGrade, subject);
        setQuestionsA(sharedQs);
        setQuestionsB(sharedQs);
      } else {
        const [qA, qB] = await Promise.all([
          questionLoader(gradeA, subject),
          questionLoader(gradeB, subject),
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
  }, [clearTimers, duoMode, gradeA, gradeB, questionLoader, subject]);

  const advanceSpeedRound = useCallback(
    (nextScoreA: number, nextScoreB: number, curIdx: number) => {
      const nextIdx = curIdx + 1;
      const reachedTarget =
        nextScoreA >= SPEED_TARGET_SCORE || nextScoreB >= SPEED_TARGET_SCORE;
      const outOfQuestions =
        nextIdx >=
        Math.min(SPEED_MAX_QUESTIONS, questionsA.length || SPEED_MAX_QUESTIONS);

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

  const handleSplitAnswer = (who: 'A' | 'B', optIdx: number) => {
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
          <DuoSetupPanel
            profiles={profiles}
            duoMode={duoMode}
            subject={subject}
            flipTop={flipTop}
            gradeA={gradeA}
            gradeB={gradeB}
            nameA={nameA}
            nameB={nameB}
            loading={loading}
            onChangeMode={setDuoMode}
            onChangeSubject={setSubject}
            onChangeFlipTop={setFlipTop}
            onChangeGradeA={setGradeA}
            onChangeGradeB={setGradeB}
            onChangeNameA={setNameA}
            onChangeNameB={setNameB}
            onStart={startDuoGame}
          />
        )}

        {phase === 'playing' && duoMode !== 'speed' && (
          <div className="flex flex-1 flex-col gap-3">
            <DuoSplitPanel
              who="A"
              duoMode={duoMode}
              playerName={nameA || '大寶'}
              playerGrade={gradeA}
              state={playerA}
              question={
                questionsA.length > 0
                  ? questionsA[playerA.index % questionsA.length]
                  : null
              }
              flipTop={flipTop}
              onAnswer={handleSplitAnswer}
            />

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

            <DuoSplitPanel
              who="B"
              duoMode={duoMode}
              playerName={nameB || '二寶'}
              playerGrade={gradeB}
              state={playerB}
              question={
                questionsB.length > 0
                  ? questionsB[playerB.index % questionsB.length]
                  : null
              }
              flipTop={flipTop}
              onAnswer={handleSplitAnswer}
            />
          </div>
        )}

        {phase === 'playing' && duoMode === 'speed' && (
          <div className="flex flex-1 flex-col gap-3">
            <DuoSpeedBuzzPanel
              who="A"
              playerName={nameA || '大寶'}
              score={playerA.score}
              combo={playerA.combo}
              question={questionsA[speedState.questionIndex]}
              speedState={speedState}
              flipTop={flipTop}
              onBuzzAnswer={handleSpeedAnswer}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-violet-300 bg-white px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-black text-violet-700">
                <Zap className="h-4 w-4" />
                第 {speedState.questionIndex + 1} /{' '}
                {Math.min(
                  SPEED_MAX_QUESTIONS,
                  questionsA.length || SPEED_MAX_QUESTIONS,
                )}{' '}
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

            <DuoSpeedBuzzPanel
              who="B"
              playerName={nameB || '二寶'}
              score={playerB.score}
              combo={playerB.combo}
              question={questionsA[speedState.questionIndex]}
              speedState={speedState}
              flipTop={flipTop}
              onBuzzAnswer={handleSpeedAnswer}
            />
          </div>
        )}

        {phase === 'finished' && (
          <DuoFinishedCard
            duoMode={duoMode}
            nameA={nameA || '大寶'}
            nameB={nameB || '二寶'}
            gradeA={gradeA}
            gradeB={gradeB}
            scoreA={playerA.score}
            scoreB={playerB.score}
            onReplay={startDuoGame}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

export default SiblingDuoArena;
