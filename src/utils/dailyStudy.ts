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
} {
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getPreviousDateKey(todayKey);
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
  const streakDays =
    lastDate === todayKey || lastDate === yesterdayKey ? rawStreak : 0;

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
  'dailyActivity' | 'lastStudyDate' | 'studyStreakDays'
> {
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getPreviousDateKey(todayKey);

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
    };
  }

  let nextStreak = progress.studyStreakDays ?? 0;
  if (progress.lastStudyDate === todayKey) {
    nextStreak = Math.max(1, nextStreak);
  } else if (progress.lastStudyDate === yesterdayKey) {
    nextStreak = Math.max(1, nextStreak) + 1;
  } else {
    nextStreak = 1;
  }

  return {
    dailyActivity: nextActivity,
    lastStudyDate: todayKey,
    studyStreakDays: nextStreak,
  };
}
