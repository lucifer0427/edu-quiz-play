import type { DailyStudyActivity, PlayerProgress } from '../types/quiz.ts';

export const DEFAULT_DAILY_GOAL_QUESTIONS = 10;

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() - 1);
  return getLocalDateKey(dt);
}

export function getIsoWeekKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((dt.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getDaysBetweenDateKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return Number.POSITIVE_INFINITY;
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function getTodayStudyStats(
  progress: PlayerProgress,
  now: Date = new Date(),
): {
  todayKey: string;
  answeredToday: number;
  lessonsToday: number;
  reviewsToday: number;
  goal: number;
  goalPercent: number;
  goalReached: boolean;
  streakDays: number;
  studiedToday: boolean;
  graceAvailable: boolean;
} {
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getPreviousDateKey(todayKey);
  const currentWeekKey = getIsoWeekKey(todayKey);
  const activity =
    progress.dailyActivity?.date === todayKey ? progress.dailyActivity : null;

  const answeredToday = activity?.answeredCount ?? 0;
  const lessonsToday = activity?.lessonsCompleted ?? 0;
  const reviewsToday = activity?.reviewsCompleted ?? 0;
  const goal =
    typeof progress.dailyGoalQuestions === 'number' &&
    progress.dailyGoalQuestions > 0
      ? progress.dailyGoalQuestions
      : DEFAULT_DAILY_GOAL_QUESTIONS;

  const goalPercent = Math.min(100, Math.round((answeredToday / goal) * 100));
  const goalReached = answeredToday >= goal;

  const lastDate = progress.lastStudyDate;
  const rawStreak = progress.studyStreakDays ?? 0;
  const daysSinceLast = lastDate
    ? getDaysBetweenDateKeys(lastDate, todayKey)
    : Number.POSITIVE_INFINITY;
  const canUseGrace =
    daysSinceLast === 2 &&
    rawStreak > 0 &&
    progress.streakGraceUsedWeek !== currentWeekKey;

  const streakDays =
    lastDate === todayKey || lastDate === yesterdayKey || canUseGrace
      ? rawStreak
      : 0;

  return {
    todayKey,
    answeredToday,
    lessonsToday,
    reviewsToday,
    goal,
    goalPercent,
    goalReached,
    streakDays,
    studiedToday: lastDate === todayKey,
    graceAvailable:
      rawStreak > 0 && progress.streakGraceUsedWeek !== currentWeekKey,
  };
}

export function recordDailyStudyActivity(
  progress: PlayerProgress,
  delta: {
    answered?: number;
    lessonCompleted?: boolean;
    reviewCompleted?: boolean;
  },
  now: Date = new Date(),
): Pick<
  PlayerProgress,
  'dailyActivity' | 'lastStudyDate' | 'studyStreakDays' | 'streakGraceUsedWeek'
> {
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getPreviousDateKey(todayKey);
  const currentWeekKey = getIsoWeekKey(todayKey);

  const prevActivity: DailyStudyActivity =
    progress.dailyActivity?.date === todayKey
      ? progress.dailyActivity
      : {
          date: todayKey,
          answeredCount: 0,
          lessonsCompleted: 0,
          reviewsCompleted: 0,
        };

  const addedAnswered =
    typeof delta.answered === 'number' && delta.answered > 0
      ? Math.floor(delta.answered)
      : 0;
  const addedLessons = delta.lessonCompleted ? 1 : 0;
  const addedReviews = delta.reviewCompleted ? 1 : 0;

  const didStudy =
    addedAnswered > 0 || addedLessons > 0 || addedReviews > 0;

  const nextActivity: DailyStudyActivity = {
    date: todayKey,
    answeredCount: prevActivity.answeredCount + addedAnswered,
    lessonsCompleted: prevActivity.lessonsCompleted + addedLessons,
    reviewsCompleted: prevActivity.reviewsCompleted + addedReviews,
  };

  if (!didStudy) {
    return {
      dailyActivity: nextActivity,
      lastStudyDate: progress.lastStudyDate,
      studyStreakDays: progress.studyStreakDays ?? 0,
      streakGraceUsedWeek: progress.streakGraceUsedWeek,
    };
  }

  let nextStreak = progress.studyStreakDays ?? 0;
  let nextGraceWeek = progress.streakGraceUsedWeek;
  const daysSinceLast = progress.lastStudyDate
    ? getDaysBetweenDateKeys(progress.lastStudyDate, todayKey)
    : Number.POSITIVE_INFINITY;

  if (progress.lastStudyDate === todayKey) {
    nextStreak = Math.max(1, nextStreak);
  } else if (progress.lastStudyDate === yesterdayKey) {
    nextStreak = Math.max(1, nextStreak) + 1;
  } else if (
    daysSinceLast === 2 &&
    nextStreak > 0 &&
    progress.streakGraceUsedWeek !== currentWeekKey
  ) {
    nextStreak = nextStreak + 1;
    nextGraceWeek = currentWeekKey;
  } else {
    nextStreak = 1;
  }

  return {
    dailyActivity: nextActivity,
    lastStudyDate: todayKey,
    studyStreakDays: nextStreak,
    streakGraceUsedWeek: nextGraceWeek,
  };
}
