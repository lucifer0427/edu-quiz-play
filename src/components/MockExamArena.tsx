import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flag,
  PenTool,
  RotateCcw,
  Send,
  Volume2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Grade,
  MockExamRecord,
  MockExamUnitScore,
  Question,
  QuestionAttemptOutcome,
  Semester,
  Stage,
} from '../types/quiz';
import { playCorrect, playTap, playVictory } from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';
import { MathScratchpad } from './MathScratchpad';
import { QuestionVisual } from './QuestionVisual';

export interface MockExamFinishPayload {
  record: MockExamRecord;
  wrongQuestions: Question[];
  attemptOutcomes: QuestionAttemptOutcome[];
  xpEarned: number;
  coinsEarned: number;
}

interface MockExamArenaProps {
  stage: Stage;
  grade: Grade;
  semester: Semester;
  timeLimitSec?: number;
  previousRecord?: MockExamRecord;
  speechSlowMode?: boolean;
  onFinishExam: (payload: MockExamFinishPayload) => void;
  onRetryWrongOnly: (wrongQuestions: Question[]) => void;
  onOpenUnitLesson?: (stageTitle: string) => void;
  onExit: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function MockExamArena({
  stage,
  grade,
  semester,
  timeLimitSec,
  previousRecord,
  speechSlowMode = false,
  onFinishExam,
  onRetryWrongOnly,
  onOpenUnitLesson,
  onExit,
}: MockExamArenaProps) {
  const questions = stage.questions;
  const totalCount = questions.length;
  const speechAvailable = isSpeechSupported();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submittedPayload, setSubmittedPayload] =
    useState<MockExamFinishPayload | null>(null);

  const submittedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const baselinePrevRecordRef = useRef<MockExamRecord | undefined>(
    previousRecord,
  );
  const prevStageIdRef = useRef(stage.id);
  if (prevStageIdRef.current !== stage.id) {
    prevStageIdRef.current = stage.id;
    baselinePrevRecordRef.current = previousRecord;
  }

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setFlagged({});
    setConfirmSubmitOpen(false);
    setElapsedSec(0);
    setSubmittedPayload(null);
    submittedRef.current = false;
    startedAtRef.current = Date.now();
    return () => {
      stopSpeech();
    };
  }, [stage.id]);

  const submitExam = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stopSpeech();
    setConfirmSubmitOpen(false);

    const durationSec = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 1000),
    );
    const avgMsPerQ = Math.round((durationSec * 1000) / Math.max(1, totalCount));

    let correctCount = 0;
    const wrongQuestions: Question[] = [];
    const attemptOutcomes: QuestionAttemptOutcome[] = [];
    const unitMap = new Map<string, { correct: number; total: number }>();

    questions.forEach((q, idx) => {
      const chosen = answers[idx];
      const wasCorrect = chosen !== undefined && chosen === q.answerIndex;
      if (wasCorrect) {
        correctCount += 1;
      } else {
        wrongQuestions.push(q);
      }
      attemptOutcomes.push({
        question: q,
        wasCorrect,
        usedHint: false,
        responseTimeMs: avgMsPerQ,
      });

      const unitName = q.stageTitle || '綜合單元';
      const entry = unitMap.get(unitName) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (wasCorrect) entry.correct += 1;
      unitMap.set(unitName, entry);
    });

    const score =
      totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const unitBreakdown: MockExamUnitScore[] = Array.from(unitMap.entries()).map(
      ([stageTitle, stats]) => ({
        stageTitle,
        correct: stats.correct,
        total: stats.total,
      }),
    );

    const xpEarned = Math.max(15, correctCount * 20 + (score >= 85 ? 30 : 0));
    const coinsEarned = Math.max(10, correctCount * 10 + (score >= 85 ? 20 : 0));

    const record: MockExamRecord = {
      id: `mock-${Date.now()}`,
      takenAt: new Date().toISOString(),
      grade,
      semester,
      subjectId: stage.subjectId,
      title: stage.title,
      score,
      correctCount,
      totalCount,
      durationSec,
      timeLimitSec,
      unitBreakdown,
    };

    const payload: MockExamFinishPayload = {
      record,
      wrongQuestions,
      attemptOutcomes,
      xpEarned,
      coinsEarned,
    };

    setSubmittedPayload(payload);
    onFinishExam(payload);

    if (score >= 60) {
      playVictory();
    } else {
      playCorrect(1);
    }
  }, [
    answers,
    grade,
    onFinishExam,
    questions,
    semester,
    stage.subjectId,
    stage.title,
    timeLimitSec,
    totalCount,
  ]);

  useEffect(() => {
    if (submittedPayload) return;
    const timer = window.setInterval(() => {
      const nextElapsed = Math.floor(
        (Date.now() - startedAtRef.current) / 1000,
      );
      setElapsedSec(nextElapsed);
      if (timeLimitSec && timeLimitSec > 0 && nextElapsed >= timeLimitSec) {
        submitExam();
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [submitExam, submittedPayload, timeLimitSec]);

  const unansweredIndices = useMemo(
    () =>
      questions
        .map((_, idx) => idx)
        .filter((idx) => answers[idx] === undefined),
    [answers, questions],
  );
  const flaggedIndices = useMemo(
    () =>
      questions
        .map((_, idx) => idx)
        .filter((idx) => Boolean(flagged[idx])),
    [flagged, questions],
  );

  const handleRequestSubmit = () => {
    playTap();
    if (unansweredIndices.length > 0 || flaggedIndices.length > 0) {
      setConfirmSubmitOpen(true);
    } else {
      submitExam();
    }
  };

  if (totalCount === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-base font-black text-slate-700">
          此模擬考卷目前沒有題目，請返回重新組卷。
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-black text-white"
        >
          返回
        </button>
      </div>
    );
  }

  // 交卷後成績單畫面
  if (submittedPayload) {
    const { record, wrongQuestions, xpEarned, coinsEarned } = submittedPayload;
    const prevRec =
      baselinePrevRecordRef.current &&
      baselinePrevRecordRef.current.id !== record.id
        ? baselinePrevRecordRef.current
        : undefined;
    const scoreDiff = prevRec ? record.score - prevRec.score : null;
    const scoreTone =
      record.score >= 85
        ? 'text-emerald-600'
        : record.score >= 60
          ? 'text-amber-600'
          : 'text-rose-600';

    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <section className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-md sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
                真實段考成績單
              </span>
              <h2 className="mt-2 text-2xl font-black text-slate-800">
                {record.title}
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                答對 {record.correctCount} / {record.totalCount} 題 · 耗時{' '}
                {formatDuration(record.durationSec)}
              </p>
            </div>

            <div className="text-right">
              <div className={`text-5xl font-black ${scoreTone}`}>
                {record.score}
                <span className="ml-1 text-lg font-bold text-slate-500">分</span>
              </div>
              {scoreDiff !== null && (
                <div
                  className={`mt-1 text-xs font-black ${
                    scoreDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {scoreDiff >= 0
                    ? `比上次進步 +${scoreDiff} 分`
                    : `比上次少 ${Math.abs(scoreDiff)} 分`}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-amber-50/80 p-4 text-center sm:grid-cols-3">
            <div>
              <div className="text-xs font-bold text-slate-500">獲得經驗值</div>
              <div className="text-xl font-black text-violet-600">
                +{xpEarned} XP
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">獲得金幣</div>
              <div className="text-xl font-black text-amber-600">
                +{coinsEarned}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs font-bold text-slate-500">錯題收錄</div>
              <div className="text-xl font-black text-rose-600">
                {wrongQuestions.length} 題
              </div>
            </div>
          </div>

          {/* 各單元得分率診斷 */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-black text-slate-800">
              📊 各單元掌握度診斷
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {record.unitBreakdown.map((u) => {
                const pct =
                  u.total > 0 ? Math.round((u.correct / u.total) * 100) : 0;
                const badgeClass =
                  pct >= 85
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    : pct >= 60
                      ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                      : 'border-rose-200 bg-rose-50/70 text-rose-900';
                const barClass =
                  pct >= 85
                    ? 'bg-emerald-500'
                    : pct >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500';
                return (
                  <div
                    key={u.stageTitle}
                    className={`rounded-2xl border p-3 ${badgeClass}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-black">
                      <span className="truncate">{u.stageTitle}</span>
                      <span>
                        {u.correct}/{u.total} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
                      <div
                        className={`h-full rounded-full ${barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {pct < 85 && onOpenUnitLesson && u.stageTitle !== '綜合單元' && (
                      <button
                        type="button"
                        onClick={() => {
                          playTap();
                          onOpenUnitLesson(u.stageTitle);
                        }}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-sky-700 shadow-2xs hover:bg-sky-50"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>回看微課程補觀念</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 錯題解析清單 */}
          {wrongQuestions.length > 0 ? (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-black text-rose-700">
                📝 錯題逐題解析（已自動加入記憶樹錯題本）
              </h3>
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const chosen = answers[idx];
                  if (chosen === q.answerIndex) return null;
                  return (
                    <div
                      key={`${q.id}-${idx}`}
                      className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-black text-slate-800">
                          <span className="mr-1.5 rounded-md bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">
                            第 {idx + 1} 題
                          </span>
                          {q.prompt}
                        </div>
                        {speechAvailable && (
                          <button
                            type="button"
                            onClick={() =>
                              speakText(
                                `${q.speechText || q.prompt}。正確答案是：${q.options[q.answerIndex]}。${q.explanation}`,
                                q.speechLang || 'zh-TW',
                                { grade, slowMode: speechSlowMode },
                              )
                            }
                            aria-label="朗讀錯題解析"
                            className="shrink-0 rounded-lg bg-violet-50 p-1.5 text-violet-600 hover:bg-violet-100"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold">
                        <span className="text-rose-600">
                          ✗ 你的作答：
                          {chosen !== undefined
                            ? `${OPTION_LABELS[chosen]}. ${q.options[chosen]}`
                            : '未作答'}
                        </span>
                        <span className="text-emerald-700">
                          ✓ 正確答案：{OPTION_LABELS[q.answerIndex]}.{' '}
                          {q.options[q.answerIndex]}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-slate-700">
                        <span className="font-black text-amber-800">
                          小老師解析：
                        </span>
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-black text-emerald-800">
              🎉 太強了！本次模擬考 100 分全對！
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {wrongQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playTap();
                  onRetryWrongOnly(wrongQuestions);
                }}
                className="btn-3d inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-[0_4px_0_#be123c] hover:bg-rose-400"
              >
                <RotateCcw className="h-4 w-4" />
                <span>只重考本次錯題 ({wrongQuestions.length} 題)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playTap();
                stopSpeech();
                onExit();
              }}
              className="btn-3d inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-[0_4px_0_#cbd5e1] hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回考前複習中心</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const remainingSec =
    timeLimitSec && timeLimitSec > 0
      ? Math.max(0, timeLimitSec - elapsedSec)
      : null;
  const isTimeLow = remainingSec !== null && remainingSec <= 180;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-5">
      {/* 考場頂部列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-indigo-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playTap();
              stopSpeech();
              onExit();
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>離開考場</span>
          </button>
          <div>
            <div className="text-xs font-black text-indigo-700">
              真實段考模式 · 已作答 {answeredCount}/{totalCount}
            </div>
            <div className="max-w-[220px] truncate text-sm font-black text-slate-800 sm:max-w-xs">
              {stage.title}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black ${
              isTimeLow
                ? 'bg-rose-100 text-rose-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>
              {remainingSec !== null
                ? `剩餘 ${formatDuration(remainingSec)}`
                : `已用時 ${formatDuration(elapsedSec)}`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playTap();
              setScratchpadOpen((v) => !v);
            }}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-black ${
              scratchpadOpen
                ? 'border-sky-400 bg-sky-50 text-sky-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>計算紙</span>
          </button>

          <button
            type="button"
            onClick={handleRequestSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-black text-white shadow-xs hover:bg-indigo-500"
          >
            <Send className="h-3.5 w-3.5" />
            <span>交卷</span>
          </button>
        </div>
      </div>

      {/* 題號導覽格 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
          <span>題號導覽（點擊可快速跳題）</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> 已作答
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm border border-amber-400 bg-amber-100" />{' '}
              待檢查
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" />{' '}
              未作答
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((_, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = answers[idx] !== undefined;
            const isFlagged = Boolean(flagged[idx]);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playTap();
                  setCurrentIndex(idx);
                }}
                aria-label={`跳至第 ${idx + 1} 題`}
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-black transition ${
                  isFlagged
                    ? 'border-amber-400 bg-amber-100 text-amber-900'
                    : isAnswered
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                } ${isCurrent ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* 題目主體 */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
              第 {currentIndex + 1} / {totalCount} 題
            </span>
            {currentQuestion.stageTitle && (
              <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {currentQuestion.stageTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {speechAvailable && (
              <button
                type="button"
                onClick={() =>
                  speakText(
                    currentQuestion.speechText || currentQuestion.prompt,
                    currentQuestion.speechLang || 'zh-TW',
                    {
                      grade,
                      slowMode: speechSlowMode,
                      audioUrl: currentQuestion.audioUrl,
                    },
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 hover:bg-violet-100"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>朗讀題目</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playTap();
                setFlagged((prev) => ({
                  ...prev,
                  [currentIndex]: !prev[currentIndex],
                }));
              }}
              aria-pressed={Boolean(flagged[currentIndex])}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                flagged[currentIndex]
                  ? 'border-amber-400 bg-amber-100 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-amber-50'
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>{flagged[currentIndex] ? '已標記待檢查' : '標記待檢查'}</span>
            </button>
          </div>
        </div>

        <h3 className="text-lg font-black leading-relaxed text-slate-800 sm:text-xl">
          {currentQuestion.prompt}
        </h3>

        <QuestionVisual question={currentQuestion} />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {currentQuestion.options.map((opt, oIdx) => {
            const selected = answers[currentIndex] === oIdx;
            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => {
                  playTap();
                  setAnswers((prev) => ({ ...prev, [currentIndex]: oIdx }));
                }}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-bold transition sm:text-base ${
                  selected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-950 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/40'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {OPTION_LABELS[oIdx]}
                </span>
                <span className="flex-1">{opt}</span>
                {selected && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-600" />
                )}
              </button>
            );
          })}
        </div>

        {scratchpadOpen && (
          <MathScratchpad questionKey={`${stage.id}-${currentIndex}`} />
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => {
              playTap();
              setCurrentIndex((i) => Math.max(0, i - 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>上一題</span>
          </button>

          {currentIndex < totalCount - 1 ? (
            <button
              type="button"
              onClick={() => {
                playTap();
                setCurrentIndex((i) => Math.min(totalCount - 1, i + 1));
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2 text-sm font-black text-white shadow-xs hover:bg-sky-400"
            >
              <span>下一題</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestSubmit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-black text-white shadow-xs hover:bg-indigo-500"
            >
              <Send className="h-4 w-4" />
              <span>檢查並交卷</span>
            </button>
          )}
        </div>
      </section>

      {/* 交卷前確認對話框 */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-amber-800">
              <AlertCircle className="h-6 w-6 shrink-0 text-amber-500" />
              <h3 className="text-lg font-black">交卷前再確認一下！</h3>
            </div>

            {unansweredIndices.length > 0 && (
              <div>
                <p className="text-xs font-black text-rose-700">
                  還有 {unansweredIndices.length} 題尚未作答（點擊題號可跳過去寫）：
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {unansweredIndices.map((idx) => (
                    <button
                      key={`un-${idx}`}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setConfirmSubmitOpen(false);
                      }}
                      className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-800 hover:bg-rose-200"
                    >
                      第 {idx + 1} 題
                    </button>
                  ))}
                </div>
              </div>
            )}

            {flaggedIndices.length > 0 && (
              <div>
                <p className="text-xs font-black text-amber-800">
                  有 {flaggedIndices.length} 題標記為待檢查：
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {flaggedIndices.map((idx) => (
                    <button
                      key={`fl-${idx}`}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setConfirmSubmitOpen(false);
                      }}
                      className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900 hover:bg-amber-200"
                    >
                      🚩 第 {idx + 1} 題
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                回去檢查
              </button>
              <button
                type="button"
                onClick={submitExam}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-500"
              >
                確定交卷
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MockExamArena;
