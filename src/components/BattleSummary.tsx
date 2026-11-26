import {
  ArrowLeft,
  Award,
  BookOpen,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
} from 'lucide-react';
import type {
  BattleMode,
  Question,
  QuestionAttemptOutcome,
  Stage,
  SubjectId,
} from '../types/quiz';
import { isDynamicStage } from '../utils/generators/registry';
import { playTap } from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';
import { getLevelFromXp } from '../utils/storage';
import { HeroSprite } from './GameSprites';

export interface BattleResult {
  stageId: string;
  subjectId: SubjectId;
  stageTitle: string;
  stars: number;
  xpEarned: number;
  coinsEarned: number;
  correctCount: number;
  totalCount: number;
  wrongQuestions: Question[];
  solvedWrongIds: string[];
  isReviewMode: boolean;
  battleMode: BattleMode;
  attemptOutcomes: QuestionAttemptOutcome[];
  repairedCount: number;
}

interface BattleSummaryProps {
  result: BattleResult;
  stage: Stage;
  selectedAvatarId: string;
  initialXp: number;
  previousStars?: number;
  maxCombo: number;
  focusMode: boolean;
  speechSlowMode: boolean;
  onRetry: () => void;
  onReviewLesson?: () => void;
  onOpenCertificate?: () => void;
  onExit: () => void;
}

export function BattleSummary({
  result,
  stage,
  selectedAvatarId,
  initialXp,
  previousStars,
  maxCombo,
  focusMode,
  speechSlowMode,
  onRetry,
  onReviewLesson,
  onOpenCertificate,
  onExit,
}: BattleSummaryProps) {
  const beforeLevel = getLevelFromXp(initialXp).level;
  const afterLevel = getLevelFromXp(initialXp + result.xpEarned).level;
  const leveledUp = afterLevel > beforeLevel;
  const won = result.stars > 0;
  const isWrongReview = result.battleMode === 'wrong-review';
  const isMockExam = result.battleMode === 'mock-exam';
  const starImproved =
    previousStars !== undefined && result.stars > previousStars;
  const needsLessonReview =
    Boolean(onReviewLesson) &&
    !isWrongReview &&
    (result.stars <= 1 || result.wrongQuestions.length >= 3);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div
        className={`${focusMode ? '' : 'animate-pop-in '}rounded-3xl border-2 border-amber-200 bg-white p-6 text-center shadow-lg sm:p-8`}
      >
        <div className="flex justify-center">
          <HeroSprite avatarId={selectedAvatarId} size={96} />
        </div>

        <h2 className="mt-3 text-3xl font-black text-slate-800">
          {isMockExam
            ? won
              ? '模擬考完成！'
              : '模擬考結束，再接再厲！'
            : won
              ? '冒險大勝利！'
              : '差一點點就成功了！'}
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-500">
          {stage.title} · 答對 {result.correctCount} / {result.totalCount} 題
        </p>

        <div className="my-5 flex items-center justify-center gap-3">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`h-12 w-12 transition-transform ${
                s <= result.stars
                  ? 'scale-110 fill-amber-400 text-amber-500 drop-shadow-sm'
                  : 'fill-slate-200 text-slate-300'
              }`}
            />
          ))}
        </div>

        {leveledUp && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-black text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span>恭喜升級！目前等級 Lv.{afterLevel}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-amber-50 p-4 sm:grid-cols-3">
          <div>
            <div className="text-xs font-bold text-slate-500">獲得經驗值</div>
            <div className="mt-0.5 text-2xl font-black text-violet-600">
              +{result.xpEarned} XP
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">獲得金幣</div>
            <div className="mt-0.5 text-2xl font-black text-amber-600">
              +{result.coinsEarned}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xs font-bold text-slate-500">最高連擊</div>
            <div className="mt-0.5 text-2xl font-black text-rose-500">
              {maxCombo} Combo
            </div>
          </div>
        </div>

        {result.repairedCount > 0 && (
          <p className="mt-4 rounded-xl bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">
            ✨ 本回合已透過即時重測修復了 {result.repairedCount} 題觀念！
          </p>
        )}

        {(starImproved || result.repairedCount > 0) && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {starImproved && (
              <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
                📈 比上次進步了 +{result.stars - (previousStars ?? 0)} 顆星！
              </span>
            )}
            {result.repairedCount > 0 && (
              <span className="rounded-xl bg-teal-100 px-3 py-1.5 text-xs font-black text-teal-900">
                🔧 本回合靠自己修復了 {result.repairedCount} 題錯題！
              </span>
            )}
          </div>
        )}

        {isWrongReview && result.solvedWrongIds.length > 0 && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            🌱 本回合完成複習 {result.solvedWrongIds.length}{' '}
            題，FSRS 記憶引擎已自動推進下一次複習排程！（已幫知識花園的小樹澆水囉！）
          </p>
        )}

        {isMockExam && result.wrongQuestions.length === 0 && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            📝 模擬考全數答對！考前重點已經穩穩掌握囉！
          </p>
        )}

        {result.wrongQuestions.length > 0 && (
          <div className="mt-4 space-y-3 text-left">
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700">
              {isMockExam
                ? `本次模擬考答錯 ${result.wrongQuestions.length} 題，已收錄至「錯題本」排程複習，先來快速回顧：`
                : `這回合答錯的 ${result.wrongQuestions.length} 題已排入「錯題本」FSRS 今日複習佇列，先來快速回顧一次：`}
            </p>
            <div className="max-h-72 space-y-2.5 overflow-y-auto rounded-2xl border border-rose-200 bg-rose-50/40 p-3">
              {result.wrongQuestions.map((wq, idx) => (
                <div
                  key={wq.id}
                  className="rounded-xl border border-rose-100 bg-white p-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-black text-slate-800 sm:text-sm">
                      <span className="mr-1.5 inline-block rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] text-rose-700">
                        錯題 {idx + 1}
                      </span>
                      {wq.prompt}
                    </div>
                    {isSpeechSupported() && (
                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            `${wq.speechText || wq.prompt}。正確答案是：${wq.options[wq.answerIndex]}。${wq.explanation}`,
                            wq.speechLang || 'zh-TW',
                            {
                              grade: stage.curriculum?.grade,
                              slowMode: speechSlowMode,
                              audioUrl: wq.audioUrl,
                            },
                          )
                        }
                        aria-label="朗讀錯題與解析"
                        className="shrink-0 rounded-lg bg-violet-50 p-1.5 text-violet-600 hover:bg-violet-100"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 text-xs font-black text-emerald-700">
                    ✓ 正確答案：{wq.options[wq.answerIndex]}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed font-medium text-slate-600">
                    <span className="font-bold text-amber-800">
                      小老師解析：
                    </span>
                    {wq.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.attemptOutcomes.length > 0 && (() => {
          const rushedWrongs = result.attemptOutcomes.filter(
            (o) => !o.wasCorrect && o.responseTimeMs > 0 && o.responseTimeMs < 2500,
          ).length;
          const hintWrongs = result.attemptOutcomes.filter(
            (o) => !o.wasCorrect && o.usedHint,
          ).length;
          const avgSec = Math.round(
            result.attemptOutcomes.reduce((s, o) => s + o.responseTimeMs, 0) /
              result.attemptOutcomes.length /
              1000,
          );
          const advice =
            rushedWrongs >= 2
              ? '⚡ 發現有幾題不到 2.5 秒就作答而失誤，下次先圈出關鍵字再選答案喔！'
              : hintWrongs >= 2
                ? '💡 使用提示後仍答錯較多，建議先回看「課程教學」把核心觀念弄懂！'
                : result.wrongQuestions.length > 0 && result.subjectId === 'math'
                  ? '🧮 偶有計算小失誤，建議搭配右上角「計算紙」列算式驗算！'
                  : '🌟 答題節奏穩健又專心，繼續保持這個好習慣！';
          return (
            <div className="mt-5 rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-sky-800">
                <span>🔍 本局作答習慣診斷</span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-sky-700">
                  平均每題 {avgSec} 秒
                </span>
              </div>
              <p className="mt-1.5 text-xs font-bold leading-relaxed text-slate-700">
                {advice}
              </p>
            </div>
          );
        })()}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {needsLessonReview && onReviewLesson && (
            <button
              type="button"
              onClick={() => {
                playTap();
                stopSpeech();
                onReviewLesson();
              }}
              className="btn-3d inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-base font-black text-white shadow-[0_4px_0_#0284c7] hover:bg-sky-400"
            >
              <BookOpen className="h-5 w-5" />
              <span>回到微課程再看一次關鍵步驟</span>
            </button>
          )}
          {!isWrongReview && (
            <button
              type="button"
              onClick={onRetry}
              className="btn-3d inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_#d97706] hover:bg-amber-300"
            >
              <RotateCcw className="h-5 w-5" />
              <span>
                {isMockExam
                  ? '再練一次同份試卷'
                  : isDynamicStage(stage)
                    ? '換新題再戰'
                    : '再挑戰一次'}
              </span>
            </button>
          )}
          {won && onOpenCertificate && (
            <button
              type="button"
              onClick={() => {
                playTap();
                onOpenCertificate();
              }}
              className="btn-3d inline-flex items-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-3 text-base font-black text-amber-900 shadow-[0_4px_0_#fcd34d] hover:bg-amber-100"
            >
              <Award className="h-5 w-5 text-amber-600" />
              <span>領取冒險小獎狀</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playTap();
              stopSpeech();
              onExit();
            }}
            className="btn-3d inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-base font-black text-slate-700 shadow-[0_4px_0_#cbd5e1] hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回主畫面</span>
          </button>
        </div>
      </div>
    </div>
  );
}
