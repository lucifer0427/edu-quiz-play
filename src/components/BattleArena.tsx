import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Heart,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question, Stage, SubjectId } from '../types/quiz';
import {
  isDynamicStage,
  resolveStageQuestions,
} from '../utils/generators/registry';
import {
  playCorrect,
  playCrit,
  playDefeat,
  playTap,
  playVictory,
  playWrong,
} from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';
import { getLevelFromXp } from '../utils/storage';
import { HeroSprite, MonsterSprite } from './GameSprites';

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
}

interface BattleArenaProps {
  stage: Stage;
  selectedAvatarId: string;
  currentXp: number;
  isWrongReviewMode?: boolean;
  onFinishBattle: (result: BattleResult) => void;
  onExit: () => void;
}

const OPTION_LABELS = ['1', '2', '3', '4'];
const OPTION_COLORS = [
  'bg-sky-50 border-sky-300 hover:bg-sky-100 text-sky-900 shadow-[0_4px_0_#7dd3fc]',
  'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-900 shadow-[0_4px_0_#6ee7b7]',
  'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900 shadow-[0_4px_0_#fcd34d]',
  'bg-violet-50 border-violet-300 hover:bg-violet-100 text-violet-900 shadow-[0_4px_0_#c4b5fd]',
];

function buildQuestionList(stage: Stage): Question[] {
  return resolveStageQuestions(stage);
}

export function BattleArena({
  stage,
  selectedAvatarId,
  currentXp,
  isWrongReviewMode = false,
  onFinishBattle,
  onExit,
}: BattleArenaProps) {
  const [questions, setQuestions] = useState<Question[]>(() =>
    buildQuestionList(stage),
  );
  const maxMonsterHp = useMemo(
    () => Math.max(stage.monsterHp, questions.length * 20),
    [stage.monsterHp, questions.length],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [monsterHp, setMonsterHp] = useState(maxMonsterHp);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [solvedWrongIds, setSolvedWrongIds] = useState<string[]>([]);
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
  const initialXpRef = useRef(currentXp);

  const currentQuestion = questions[currentIndex];
  const speechAvailable = isSpeechSupported();

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (selectedOption !== null || finishedResult || !currentQuestion) return;

      setSelectedOption(optionIndex);
      const isCorrect = optionIndex === currentQuestion.answerIndex;

      if (isCorrect) {
        const nextCombo = combo + 1;
        const isCrit = nextCombo >= 3;
        const baseDmg = Math.ceil(maxMonsterHp / questions.length);
        const damage = isCrit ? baseDmg + 15 : baseDmg;

        setCombo(nextCombo);
        setMaxCombo((prev) => Math.max(prev, nextCombo));
        setCorrectCount((prev) => prev + 1);
        setMonsterHp((prev) => Math.max(0, prev - damage));
        setHeroAttacking(true);
        setMonsterHit(true);
        setFloatingDmg({
          id: Date.now(),
          text: isCrit ? `CRIT -${damage}!` : `-${damage}`,
          isCrit,
        });

        if (isWrongReviewMode) {
          setSolvedWrongIds((prev) =>
            prev.includes(currentQuestion.id)
              ? prev
              : [...prev, currentQuestion.id],
          );
        }

        if (isCrit) {
          playCrit();
        } else {
          playCorrect(nextCombo);
        }

        window.setTimeout(() => {
          setHeroAttacking(false);
          setMonsterHit(false);
        }, 450);
      } else {
        setCombo(0);
        setHearts((prev) => Math.max(0, prev - 1));
        setWrongQuestions((prev) => [...prev, currentQuestion]);
        setHeroHurt(true);
        playWrong();
        window.setTimeout(() => setHeroHurt(false), 450);
      }
    },
    [
      combo,
      currentQuestion,
      finishedResult,
      isWrongReviewMode,
      maxMonsterHp,
      questions.length,
      selectedOption,
    ],
  );

  const finalizeBattle = useCallback(() => {
    stopSpeech();
    const survived = hearts > 0;
    const totalCount = questions.length;
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;

    let stars = 0;
    if (survived) {
      if (accuracy >= 0.85 && hearts >= 2) stars = 3;
      else if (accuracy >= 0.6) stars = 2;
      else stars = 1;
    }

    const xpEarned = survived
      ? correctCount * 20 + maxCombo * 5 + (stars === 3 ? 30 : 0)
      : Math.max(10, correctCount * 8);
    const coinsEarned = survived
      ? correctCount * (isWrongReviewMode ? 15 : 10) + maxCombo * 3 + stars * 10
      : Math.max(5, correctCount * 4);

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
      isReviewMode: isWrongReviewMode,
    };

    setFinishedResult(result);
    onFinishBattle(result);

    if (survived) {
      playVictory();
      void confetti({
        particleCount: stars === 3 ? 110 : 65,
        spread: 75,
        origin: { y: 0.6 },
      });
    } else {
      playDefeat();
    }
  }, [
    correctCount,
    hearts,
    isWrongReviewMode,
    maxCombo,
    onFinishBattle,
    questions.length,
    solvedWrongIds,
    stage.id,
    stage.subjectId,
    stage.title,
    wrongQuestions,
  ]);

  const handleNext = useCallback(() => {
    playTap();
    stopSpeech();
    const isLast = currentIndex >= questions.length - 1;
    if (hearts <= 0 || isLast) {
      finalizeBattle();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setShowHint(false);
  }, [currentIndex, finalizeBattle, hearts, questions.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finishedResult) return;
      if (selectedOption === null) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1) {
          handleSelectOption(idx);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishedResult, handleNext, handleSelectOption, selectedOption]);

  const handleRetry = () => {
    playTap();
    const nextQuestions = buildQuestionList(stage);
    const nextHp = Math.max(stage.monsterHp, nextQuestions.length * 20);
    setQuestions(nextQuestions);
    setCurrentIndex(0);
    setHearts(3);
    setMonsterHp(nextHp);
    setCombo(0);
    setMaxCombo(0);
    setSelectedOption(null);
    setShowHint(false);
    setCorrectCount(0);
    setWrongQuestions([]);
    setSolvedWrongIds([]);
    setFloatingDmg(null);
    setFinishedResult(null);
  };

  if (finishedResult) {
    const beforeLevel = getLevelFromXp(initialXpRef.current).level;
    const afterLevel = getLevelFromXp(
      initialXpRef.current + finishedResult.xpEarned,
    ).level;
    const leveledUp = afterLevel > beforeLevel;
    const won = finishedResult.stars > 0;

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pop-in rounded-3xl border-2 border-amber-200 bg-white p-6 text-center shadow-lg sm:p-8">
          <div className="flex justify-center">
            <HeroSprite avatarId={selectedAvatarId} size={96} />
          </div>

          <h2 className="mt-3 text-3xl font-black text-slate-800">
            {won ? '冒險大勝利！' : '差一點點就成功了！'}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {stage.title} · 答對 {finishedResult.correctCount} /{' '}
            {finishedResult.totalCount} 題
          </p>

          <div className="my-5 flex items-center justify-center gap-3">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`h-12 w-12 transition-transform ${
                  s <= finishedResult.stars
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
                +{finishedResult.xpEarned} XP
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">獲得金幣</div>
              <div className="mt-0.5 text-2xl font-black text-amber-600">
                +{finishedResult.coinsEarned}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs font-bold text-slate-500">最高連擊</div>
              <div className="mt-0.5 text-2xl font-black text-rose-500">
                {maxCombo} Combo
              </div>
            </div>
          </div>

          {finishedResult.wrongQuestions.length > 0 && (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              這回合答錯的 {finishedResult.wrongQuestions.length}{' '}
              題已經自動收入「錯題本」，隨時都能回來複習喔！
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!isWrongReviewMode && (
              <button
                type="button"
                onClick={handleRetry}
                className="btn-3d inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_#d97706] hover:bg-amber-300"
              >
                <RotateCcw className="h-5 w-5" />
                <span>{isDynamicStage(stage) ? '換新題再戰' : '再挑戰一次'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playTap();
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

  if (!currentQuestion) return null;

  const hpPercent = Math.round((monsterHp / maxMonsterHp) * 100);
  const progressPercent = Math.round(
    ((currentIndex + (selectedOption !== null ? 1 : 0)) / questions.length) *
      100,
  );
  const isAnswered = selectedOption !== null;
  const isAnswerCorrect = selectedOption === currentQuestion.answerIndex;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-xs">
        <button
          type="button"
          onClick={() => {
            playTap();
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
            第 {currentIndex + 1} / {questions.length} 題
          </span>
          <div className="h-3 w-28 overflow-hidden rounded-full bg-slate-100 sm:w-40">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <div className="animate-pop-in inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1 text-xs font-black text-white shadow-xs">
              <Zap className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
              <span>
                {combo} Combo {combo >= 3 ? '爆擊!' : ''}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1" aria-label={`剩餘 ${hearts} 顆愛心`}>
            {[1, 2, 3].map((h) => (
              <Heart
                key={h}
                className={`h-6 w-6 transition-transform ${
                  h <= hearts
                    ? 'fill-rose-500 text-rose-500'
                    : 'fill-slate-200 text-slate-300 scale-90'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border-2 border-sky-200 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100 p-5 shadow-sm">
        <div className="grid grid-cols-2 items-center gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`${
                heroAttacking
                  ? 'animate-attack'
                  : heroHurt
                    ? 'animate-shake'
                    : 'animate-bob'
              }`}
            >
              <HeroSprite avatarId={selectedAvatarId} size={96} />
            </div>
            <span className="mt-1 rounded-full bg-white/85 px-3 py-0.5 text-xs font-black text-slate-700 shadow-2xs">
              我方勇者
            </span>
          </div>

          <div className="relative flex flex-col items-center">
            {floatingDmg && (
              <div
                key={floatingDmg.id}
                className={`animate-float-up pointer-events-none absolute -top-2 z-10 text-2xl font-black drop-shadow-sm ${
                  floatingDmg.isCrit ? 'text-amber-500' : 'text-rose-600'
                }`}
              >
                {floatingDmg.text}
              </div>
            )}

            <div className={monsterHit ? 'animate-shake' : 'animate-bob'}>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="flex-1 text-xl leading-snug font-black text-slate-800 sm:text-2xl">
            {currentQuestion.prompt}
          </h2>

          <div className="flex shrink-0 items-center gap-2">
            {speechAvailable && (
              <button
                type="button"
                onClick={() =>
                  speakText(
                    currentQuestion.speechText || currentQuestion.prompt,
                    currentQuestion.speechLang || 'zh-TW',
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
                title="念出題目"
              >
                <Volume2 className="h-4 w-4" />
                <span>朗讀</span>
              </button>
            )}

            {currentQuestion.hint && !isAnswered && (
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setShowHint((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 hover:bg-amber-100"
              >
                <Lightbulb className="h-4 w-4" />
                <span>提示</span>
              </button>
            )}
          </div>
        </div>

        {showHint && currentQuestion.hint && !isAnswered && (
          <div className="animate-pop-in mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900">
            💡 小提示：{currentQuestion.hint}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {currentQuestion.options.map((option, idx) => {
            const isThisSelected = selectedOption === idx;
            const isCorrectOption = idx === currentQuestion.answerIndex;

            let buttonStyle = OPTION_COLORS[idx];
            if (isAnswered) {
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
                key={idx}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`btn-3d flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-base font-black transition sm:text-lg ${buttonStyle}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-sm font-black text-slate-800">
                  {OPTION_LABELS[idx]}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div
            className={`animate-pop-in mt-5 rounded-2xl border-2 p-4 ${
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
                    ? combo >= 3
                      ? `🔥 太神啦！${combo} 連擊大爆擊！`
                      : '✨ 答對了！漂亮的一擊！'
                    : '💪 沒關係！看看小老師解析就會了：'}
                </div>
                <p className="text-sm leading-relaxed font-medium text-slate-700">
                  {currentQuestion.explanation}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="btn-3d shrink-0 rounded-2xl bg-amber-400 px-6 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_#d97706] hover:bg-amber-300"
              >
                {hearts <= 0 || currentIndex >= questions.length - 1
                  ? '查看結算'
                  : '下一題 →'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
