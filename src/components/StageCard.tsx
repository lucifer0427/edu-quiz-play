import { BookOpen, PenTool, Play, Star, Swords, Zap } from 'lucide-react';
import { SUBJECT_META } from '../data/subjects';
import type { LessonScript } from '../types/lesson';
import type { Stage } from '../types/quiz';
import {
  getStageQuestionCount,
  isDynamicStage,
} from '../utils/generators/registry';
import { MonsterSprite } from './GameSprites';

const DIFFICULTY_BADGE: Record<
  Stage['difficulty'],
  { label: string; className: string }
> = {
  easy: { label: '基礎冒險', className: 'bg-emerald-100 text-emerald-700' },
  medium: { label: '進階挑戰', className: 'bg-amber-100 text-amber-800' },
  hard: { label: '魔王試煉', className: 'bg-rose-100 text-rose-700' },
};

export interface StageCardProps {
  stage: Stage;
  earnedStars: number;
  lesson?: LessonScript | null;
  isCuratedLesson?: boolean;
  lessonCompleted?: boolean;
  onStartStage: (stage: Stage) => void;
  onStartLesson?: (lesson: LessonScript, stage: Stage) => void;
  onPracticeHanzi?: (stage: Stage) => void;
}

export function StageCard({
  stage,
  earnedStars,
  lesson,
  isCuratedLesson = false,
  lessonCompleted = false,
  onStartStage,
  onStartLesson,
  onPracticeHanzi,
}: StageCardProps) {
  const meta = SUBJECT_META[stage.subjectId];
  const diff = DIFFICULTY_BADGE[stage.difficulty];
  const dynamic = isDynamicStage(stage);
  const questionCount = getStageQuestionCount(stage);
  const hasLesson = Boolean(lesson && onStartLesson);
  const hasSpatial3D = Boolean(
    isCuratedLesson &&
      lesson?.scenes.some((s) => s.componentType === 'SPATIAL_3D_SCENE'),
  );
  const lessonBadgeText = lessonCompleted
    ? '✓ 已學過觀念'
    : hasSpatial3D
      ? '附 3D 微課程'
      : isCuratedLesson
        ? '附精雕微課程'
        : '附觀念微課程';
  const lessonBadgeClass = lessonCompleted
    ? 'bg-emerald-100 text-emerald-800'
    : hasSpatial3D
      ? 'bg-indigo-100 text-indigo-800'
      : isCuratedLesson
        ? 'bg-sky-100 text-sky-800'
        : 'bg-sky-100/80 text-sky-700';

  return (
    <div
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
            {dynamic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-700">
                <Zap className="h-3 w-3" />
                無限出題
              </span>
            )}
            <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {questionCount} 題
            </span>
            {hasLesson && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${lessonBadgeClass}`}
              >
                <BookOpen className="h-3 w-3" />
                {lessonBadgeText}
              </span>
            )}
          </div>
          <h4 className="text-xl font-black text-slate-800">{stage.title}</h4>
          <p className="text-sm leading-relaxed text-slate-600">
            {stage.description}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-white/75 p-2 shadow-xs">
          <MonsterSprite monsterId={stage.monsterId} size={76} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/70 pt-4">
        <div
          className="flex items-center gap-1"
          aria-label={`獲得 ${earnedStars} 顆星`}
        >
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

        {hasLesson && lesson && onStartLesson ? (
          <div className="flex flex-wrap items-center gap-2">
            {earnedStars === 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onStartStage(stage)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-2xl border-2 border-amber-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-amber-50"
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>直接測驗</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartLesson(lesson, stage)}
                  className="btn-3d inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#0284c7] hover:bg-sky-400"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>先學觀念</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onStartLesson(lesson, stage)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-2xl border-2 border-sky-300 bg-white px-3 py-2 text-xs font-black text-sky-800 hover:bg-sky-50"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>複習觀念</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartStage(stage)}
                  className="btn-3d inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 shadow-[0_3px_0_#d97706] hover:bg-amber-300"
                >
                  <Play className="h-4 w-4 fill-slate-900" />
                  <span>開始挑戰</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStartStage(stage)}
            className="btn-3d inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 shadow-[0_3px_0_#d97706] hover:bg-amber-300"
          >
            <Play className="h-4 w-4 fill-slate-900" />
            <span>開始挑戰</span>
          </button>
        )}
      </div>

      {stage.subjectId === 'mandarin' && onPracticeHanzi && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onPracticeHanzi(stage)}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white/90 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-50"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>✍️ 練寫本單元國字</span>
          </button>
        </div>
      )}
    </div>
  );
}
