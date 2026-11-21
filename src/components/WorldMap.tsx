import {
  Award,
  BookOpen,
  Calculator,
  FlaskConical,
  Languages,
  Play,
  Sparkles,
  Star,
  Swords,
  Zap,
} from 'lucide-react';
import { BUILTIN_STAGES, SUBJECT_META } from '../data/quizzes';
import type { PlayerProgress, Stage, SubjectId } from '../types/quiz';
import { getLevelFromXp } from '../utils/storage';
import { HeroSprite, MonsterSprite } from './GameSprites';

interface WorldMapProps {
  progress: PlayerProgress;
  onStartStage: (stage: Stage) => void;
  onGoWrongBook: () => void;
  onGoTeacher: () => void;
}

const SUBJECT_ICONS: Record<SubjectId, typeof Calculator> = {
  math: Calculator,
  mandarin: BookOpen,
  english: Languages,
  science: FlaskConical,
  custom: Sparkles,
};

const DIFFICULTY_BADGE: Record<
  Stage['difficulty'],
  { label: string; className: string }
> = {
  easy: { label: '基礎冒險', className: 'bg-emerald-100 text-emerald-700' },
  medium: { label: '進階挑戰', className: 'bg-amber-100 text-amber-800' },
  hard: { label: '魔王試煉', className: 'bg-rose-100 text-rose-700' },
};

export function WorldMap({
  progress,
  onStartStage,
  onGoWrongBook,
  onGoTeacher,
}: WorldMapProps) {
  const levelInfo = getLevelFromXp(progress.xp);
  const allStages = [...progress.customStages, ...BUILTIN_STAGES];
  const totalStars = Object.values(progress.stageStars).reduce(
    (sum, s) => sum + s,
    0,
  );
  const maxStars = allStages.length * 3;
  const accuracy =
    progress.totalAnswered > 0
      ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
      : 0;

  const subjectOrder: SubjectId[] =
    progress.customStages.length > 0
      ? ['custom', 'math', 'mandarin', 'english', 'science']
      : ['math', 'mandarin', 'english', 'science'];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <section className="relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="animate-bob rounded-3xl bg-white/90 p-2 shadow-sm ring-2 ring-amber-300">
              <HeroSprite avatarId={progress.selectedAvatarId} size={76} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/30 px-3 py-1 text-xs font-black text-amber-900">
                <Award className="h-3.5 w-3.5" />
                <span>
                  Lv.{levelInfo.level} {levelInfo.title}
                </span>
              </div>
              <h2 className="mt-1.5 text-2xl font-black text-slate-800 sm:text-3xl">
                哈囉，{progress.nickname}！準備好闖關了嗎？
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                答對題目就能攻擊知識怪獸、累積 Combo 爆擊並賺取金幣解鎖新英雄！
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2.5 md:w-auto">
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-xs">
              <div className="text-xs font-bold text-slate-500">蒐集星星</div>
              <div className="mt-0.5 flex items-center justify-center gap-1 text-xl font-black text-amber-500">
                <Star className="h-5 w-5 fill-amber-400" />
                <span>
                  {totalStars}/{maxStars}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-xs">
              <div className="text-xs font-bold text-slate-500">答題正確率</div>
              <div className="mt-0.5 text-xl font-black text-emerald-600">
                {accuracy}%
              </div>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-xs">
              <div className="text-xs font-bold text-slate-500">累計答對</div>
              <div className="mt-0.5 text-xl font-black text-sky-600">
                {progress.totalCorrect} 題
              </div>
            </div>
          </div>
        </div>

        {progress.wrongQuestionIds.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white/90 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-700">
              <Swords className="h-5 w-5" />
              <span>
                你有 {progress.wrongQuestionIds.length} 題待複習的錯題，消滅它們可以賺雙倍獎勵金幣！
              </span>
            </div>
            <button
              type="button"
              onClick={onGoWrongBook}
              className="btn-3d rounded-xl bg-rose-500 px-4 py-2 text-sm font-black text-white shadow-[0_3px_0_#be123c] hover:bg-rose-600"
            >
              前往錯題特訓
            </button>
          </div>
        )}
      </section>

      {subjectOrder.map((subjectId) => {
        const meta = SUBJECT_META[subjectId];
        const Icon = SUBJECT_ICONS[subjectId];
        const stages = allStages.filter((s) => s.subjectId === subjectId);
        if (stages.length === 0) return null;

        return (
          <section key={subjectId} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs ${meta.iconBgClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {meta.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    {meta.subtitle}
                  </p>
                </div>
              </div>
              {subjectId === 'custom' && (
                <button
                  type="button"
                  onClick={onGoTeacher}
                  className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
                >
                  管理或新增自訂題庫
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {stages.map((stage) => {
                const earnedStars = progress.stageStars[stage.id] ?? 0;
                const diff = DIFFICULTY_BADGE[stage.difficulty];
                return (
                  <div
                    key={stage.id}
                    className={`flex flex-col justify-between rounded-3xl border-2 bg-gradient-to-br p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${meta.borderClass} ${meta.cardBgClass}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-black ${diff.className}`}
                          >
                            {diff.label}
                          </span>
                          {stage.isDynamicMath && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-700">
                              <Zap className="h-3 w-3" />
                              無限出題
                            </span>
                          )}
                          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                            {stage.isDynamicMath ? 6 : stage.questions.length} 題
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-slate-800">
                          {stage.title}
                        </h4>
                        <p className="text-sm leading-relaxed text-slate-600">
                          {stage.description}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-2xl bg-white/75 p-2 shadow-xs">
                        <MonsterSprite monsterId={stage.monsterId} size={76} />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/70 pt-4">
                      <div className="flex items-center gap-1" aria-label={`獲得 ${earnedStars} 顆星`}>
                        {[1, 2, 3].map((starNum) => (
                          <Star
                            key={starNum}
                            className={`h-5 w-5 ${
                              starNum <= earnedStars
                                ? 'fill-amber-400 text-amber-500'
                                : 'fill-slate-200 text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 text-xs font-bold text-slate-500">
                          頭目：{stage.monsterName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onStartStage(stage)}
                        className="btn-3d inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 shadow-[0_3px_0_#d97706] hover:bg-amber-300"
                      >
                        <Play className="h-4 w-4 fill-slate-900" />
                        <span>開始挑戰</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
