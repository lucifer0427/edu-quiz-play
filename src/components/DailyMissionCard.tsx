import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Play,
  Swords,
} from 'lucide-react';
import type { LessonScript } from '../types/lesson';
import type { Semester, Stage } from '../types/quiz';
import { playTap } from '../utils/sound';

const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const;

export interface DailyMissionCardProps {
  todayStats: {
    answeredToday: number;
    lessonsToday: number;
    goal: number;
    goalPercent: number;
    goalReached: boolean;
    streakDays: number;
  };
  activeGradeLabel: string;
  activeSemester: Semester;
  subjectShortName: string;
  dueWrongCount: number;
  totalWrongCount: number;
  recommendedNext: {
    stage: Stage;
    lesson: LessonScript;
    lessonCompleted: boolean;
    stars: number;
  } | null;
  onStartStage: (stage: Stage) => void;
  onStartLesson?: (lesson: LessonScript, stage: Stage) => void;
  onGoWrongBook: () => void;
  onGoExamReview?: () => void;
  onUpdateDailyGoal?: (goal: number) => void;
}

export function DailyMissionCard({
  todayStats,
  activeGradeLabel,
  activeSemester,
  subjectShortName,
  dueWrongCount,
  totalWrongCount,
  recommendedNext,
  onStartStage,
  onStartLesson,
  onGoWrongBook,
  onGoExamReview,
  onUpdateDailyGoal,
}: DailyMissionCardProps) {
  return (
    <section className="space-y-4 rounded-3xl border-2 border-sky-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-xs">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-800">
                今日學習任務
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                連續學習 {todayStats.streakDays} 天
              </span>
              {todayStats.goalReached && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  今日目標達成！
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-500">
              今日已練習 {todayStats.answeredToday} / {todayStats.goal} 題
              {todayStats.lessonsToday > 0
                ? ` · 完成 ${todayStats.lessonsToday} 堂微課程`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="w-full sm:w-52">
            <div className="mb-1 flex justify-between text-[11px] font-black text-slate-500">
              <span>每日練習進度</span>
              <span>{todayStats.goalPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  todayStats.goalReached ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
                style={{ width: `${todayStats.goalPercent}%` }}
              />
            </div>
          </div>

          {onUpdateDailyGoal && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400">
                每日目標：
              </span>
              {DAILY_GOAL_OPTIONS.map((goalOpt) => (
                <button
                  key={goalOpt}
                  type="button"
                  onClick={() => {
                    playTap();
                    onUpdateDailyGoal(goalOpt);
                  }}
                  aria-pressed={todayStats.goal === goalOpt}
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-black transition ${
                    todayStats.goal === goalOpt
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {goalOpt}題
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
          <div>
            <div className="text-xs font-black text-sky-700">
              1. 課業新進度（{activeGradeLabel}
              {activeSemester === 1 ? '上' : '下'} · {subjectShortName}）
            </div>
            {recommendedNext ? (
              <p className="mt-1 text-sm font-black text-slate-800">
                {recommendedNext.stage.title}
              </p>
            ) : (
              <p className="mt-1 text-sm font-black text-emerald-700">
                本科單元都已練過一輪囉！
              </p>
            )}
          </div>
          {recommendedNext ? (
            <div className="flex flex-wrap gap-2">
              {!recommendedNext.lessonCompleted && onStartLesson && (
                <button
                  type="button"
                  onClick={() =>
                    onStartLesson(recommendedNext.lesson, recommendedNext.stage)
                  }
                  className="btn-3d inline-flex items-center gap-1 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-black text-white shadow-[0_2px_0_#0284c7] hover:bg-sky-400"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>先學觀念</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onStartStage(recommendedNext.stage)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-300/80 px-3 py-1.5 text-xs font-black text-slate-900 hover:bg-amber-300"
              >
                <Play className="h-3.5 w-3.5 fill-slate-900" />
                <span>
                  {recommendedNext.lessonCompleted ? '挑戰單元' : '直接測驗'}
                </span>
              </button>
            </div>
          ) : (
            onGoExamReview && (
              <button
                type="button"
                onClick={onGoExamReview}
                className="inline-flex w-fit items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span>挑戰模擬考檢核</span>
              </button>
            )
          )}
        </div>

        <div
          className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 ${
            dueWrongCount > 0
              ? 'border-rose-200 bg-rose-50/70'
              : 'border-emerald-200 bg-emerald-50/70'
          }`}
        >
          <div>
            <div
              className={`text-xs font-black ${
                dueWrongCount > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              2. 記憶樹錯題複習
            </div>
            <p className="mt-1 text-sm font-black text-slate-800">
              {dueWrongCount > 0
                ? `今日有 ${dueWrongCount} 題到期該複習`
                : totalWrongCount > 0
                  ? `今日複習已清零（${totalWrongCount} 題鞏固中）`
                  : '目前沒有待複習錯題'}
            </p>
          </div>
          <button
            type="button"
            onClick={onGoWrongBook}
            className={`inline-flex w-fit items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black ${
              dueWrongCount > 0
                ? 'btn-3d bg-rose-500 text-white shadow-[0_2px_0_#be123c] hover:bg-rose-400'
                : 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <Swords className="h-3.5 w-3.5" />
            <span>
              {dueWrongCount > 0 ? '立即複習（最多 5 題）' : '查看錯題本'}
            </span>
          </button>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <div>
            <div className="text-xs font-black text-violet-700">
              3. 期中／期末考前總複習
            </div>
            <p className="mt-1 text-sm font-black text-slate-800">
              重點摘要朗讀、列印複習單與弱點模擬考
            </p>
          </div>
          {onGoExamReview && (
            <button
              type="button"
              onClick={onGoExamReview}
              className="inline-flex w-fit items-center gap-1 rounded-xl border border-violet-300 bg-white px-3 py-1.5 text-xs font-black text-violet-800 hover:bg-violet-100"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>前往考前複習</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
