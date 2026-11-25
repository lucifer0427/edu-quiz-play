import type {
  Grade,
  MapViewMode,
  PlayerProgress,
  Semester,
  SubjectId,
} from '../types/quiz.ts';
import { migrateWrongIdsToFsrs } from './fsrs.ts';

const VALID_SUBJECT_IDS = new Set<string>([
  'mandarin',
  'math',
  'english',
  'life',
  'science',
  'social',
  'arts',
  'health-pe',
  'integrative',
  'computer',
  'minnan',
  'hakka',
  'custom',
]);

export const DEFAULT_PROGRESS: PlayerProgress = {
  schemaVersion: 3,
  nickname: '小勇者',
  selectedAvatarId: 'hero-knight',
  unlockedAvatarIds: ['hero-knight'],
  xp: 0,
  coins: 50,
  stageStars: {},
  wrongQuestionIds: [],
  wrongQuestionSnapshots: {},
  totalCorrect: 0,
  totalAnswered: 0,
  soundEnabled: true,
  focusMode: false,
  speechRateMode: 'normal',
  fsrsCards: {},
  completedLessonIds: [],
  customStages: [],
  selectedView: 'curriculum',
  selectedGrade: 5,
  selectedSemester: 1,
  selectedSubject: 'math',
};

function normalizeView(value: unknown): MapViewMode {
  return value === 'curriculum' || value === 'classic'
    ? value
    : (DEFAULT_PROGRESS.selectedView ?? 'curriculum');
}

function normalizeGrade(value: unknown): Grade {
  const n = Number(value);
  return n >= 1 && n <= 6 && Number.isInteger(n)
    ? (n as Grade)
    : (DEFAULT_PROGRESS.selectedGrade ?? 5);
}

function normalizeSemester(value: unknown): Semester {
  return value === 1 || value === 2
    ? value
    : (DEFAULT_PROGRESS.selectedSemester ?? 1);
}

function normalizeSubject(value: unknown): SubjectId | 'all' {
  if (value === 'all') return 'all';
  if (typeof value === 'string' && VALID_SUBJECT_IDS.has(value)) {
    return value as SubjectId;
  }
  return DEFAULT_PROGRESS.selectedSubject ?? 'all';
}

function nonNegativeInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

export function normalizeProgress(
  parsed: Partial<PlayerProgress>,
): PlayerProgress {
  const wrongQuestionIds = Array.isArray(parsed.wrongQuestionIds)
    ? Array.from(
        new Set(
          parsed.wrongQuestionIds.filter(
            (id): id is string => typeof id === 'string' && id.trim() !== '',
          ),
        ),
      )
    : [];
  const fsrsCards = migrateWrongIdsToFsrs(wrongQuestionIds, parsed.fsrsCards);
  const completedLessonIds = Array.isArray(parsed.completedLessonIds)
    ? Array.from(
        new Set(
          parsed.completedLessonIds.filter(
            (id): id is string => typeof id === 'string' && id.trim() !== '',
          ),
        ),
      )
    : [];

  const unlockedAvatarIdsRaw = Array.isArray(parsed.unlockedAvatarIds)
    ? Array.from(
        new Set(
          parsed.unlockedAvatarIds.filter(
            (id): id is string => typeof id === 'string' && id.trim() !== '',
          ),
        ),
      )
    : [];
  const unlockedAvatarIds =
    unlockedAvatarIdsRaw.length > 0
      ? unlockedAvatarIdsRaw
      : DEFAULT_PROGRESS.unlockedAvatarIds;

  return {
    ...DEFAULT_PROGRESS,
    ...parsed,
    schemaVersion: 3,
    nickname:
      typeof parsed.nickname === 'string' && parsed.nickname.trim() !== ''
        ? parsed.nickname.trim().slice(0, 20)
        : DEFAULT_PROGRESS.nickname,
    selectedAvatarId:
      typeof parsed.selectedAvatarId === 'string' &&
      parsed.selectedAvatarId.trim() !== ''
        ? parsed.selectedAvatarId
        : DEFAULT_PROGRESS.selectedAvatarId,
    xp: nonNegativeInt(parsed.xp, DEFAULT_PROGRESS.xp),
    coins: nonNegativeInt(parsed.coins, DEFAULT_PROGRESS.coins),
    totalCorrect: nonNegativeInt(
      parsed.totalCorrect,
      DEFAULT_PROGRESS.totalCorrect,
    ),
    totalAnswered: nonNegativeInt(
      parsed.totalAnswered,
      DEFAULT_PROGRESS.totalAnswered,
    ),
    totalRepairedCount: nonNegativeInt(parsed.totalRepairedCount, 0),
    soundEnabled:
      typeof parsed.soundEnabled === 'boolean'
        ? parsed.soundEnabled
        : DEFAULT_PROGRESS.soundEnabled,
    focusMode:
      typeof parsed.focusMode === 'boolean' ? parsed.focusMode : false,
    speechRateMode: parsed.speechRateMode === 'slow' ? 'slow' : 'normal',
    autoReadQuestion:
      typeof parsed.autoReadQuestion === 'boolean'
        ? parsed.autoReadQuestion
        : false,
    lowerGradeNudgeDismissed:
      typeof parsed.lowerGradeNudgeDismissed === 'boolean'
        ? parsed.lowerGradeNudgeDismissed
        : false,
    streakGraceUsedWeek:
      typeof parsed.streakGraceUsedWeek === 'string'
        ? parsed.streakGraceUsedWeek
        : undefined,
    unlockedAvatarIds,
    stageStars:
      parsed.stageStars &&
      typeof parsed.stageStars === 'object' &&
      !Array.isArray(parsed.stageStars)
        ? parsed.stageStars
        : {},
    wrongQuestionIds,
    wrongQuestionSnapshots:
      parsed.wrongQuestionSnapshots &&
      typeof parsed.wrongQuestionSnapshots === 'object' &&
      !Array.isArray(parsed.wrongQuestionSnapshots)
        ? parsed.wrongQuestionSnapshots
        : {},
    fsrsCards,
    completedLessonIds,
    practicedHanzi:
      parsed.practicedHanzi &&
      typeof parsed.practicedHanzi === 'object' &&
      !Array.isArray(parsed.practicedHanzi)
        ? parsed.practicedHanzi
        : undefined,
    unlockedBadgeIds: Array.isArray(parsed.unlockedBadgeIds)
      ? Array.from(
          new Set(
            parsed.unlockedBadgeIds.filter(
              (id): id is string => typeof id === 'string' && id.trim() !== '',
            ),
          ),
        )
      : undefined,
    familyRewards: Array.isArray(parsed.familyRewards)
      ? parsed.familyRewards.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.title === 'string' &&
            typeof item.costCoins === 'number' &&
            item.costCoins > 0,
        )
      : undefined,
    redeemedRewards: Array.isArray(parsed.redeemedRewards)
      ? parsed.redeemedRewards.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.title === 'string',
        )
      : undefined,
    parentPin:
      typeof parsed.parentPin === 'string' && /^\d{4}$/.test(parsed.parentPin)
        ? parsed.parentPin
        : undefined,
    customStages: Array.isArray(parsed.customStages)
      ? parsed.customStages
      : [],
    selectedView: normalizeView(parsed.selectedView),
    selectedGrade: normalizeGrade(parsed.selectedGrade),
    selectedSemester: normalizeSemester(parsed.selectedSemester),
    selectedSubject: normalizeSubject(parsed.selectedSubject),
    dailyGoalQuestions:
      typeof parsed.dailyGoalQuestions === 'number' &&
      Number.isFinite(parsed.dailyGoalQuestions) &&
      parsed.dailyGoalQuestions >= 1
        ? Math.floor(parsed.dailyGoalQuestions)
        : undefined,
    studyStreakDays:
      typeof parsed.studyStreakDays === 'number' &&
      Number.isFinite(parsed.studyStreakDays) &&
      parsed.studyStreakDays >= 0
        ? Math.floor(parsed.studyStreakDays)
        : undefined,
    lastStudyDate:
      typeof parsed.lastStudyDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastStudyDate)
        ? parsed.lastStudyDate
        : undefined,
    dailyActivity:
      parsed.dailyActivity &&
      typeof parsed.dailyActivity === 'object' &&
      !Array.isArray(parsed.dailyActivity) &&
      typeof parsed.dailyActivity.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.dailyActivity.date)
        ? {
            date: parsed.dailyActivity.date,
            answeredCount: nonNegativeInt(
              parsed.dailyActivity.answeredCount,
              0,
            ),
            lessonsCompleted: nonNegativeInt(
              parsed.dailyActivity.lessonsCompleted,
              0,
            ),
            reviewsCompleted: nonNegativeInt(
              parsed.dailyActivity.reviewsCompleted,
              0,
            ),
          }
        : undefined,
  };
}

export type ImportProgressResult =
  | { ok: true; progress: PlayerProgress }
  | { ok: false; error: string };

/**
 * 解析並驗證匯入的學習紀錄 JSON（同時相容 exportProgressJson 外層格式與舊版 v2 格式）。
 */
export function parseImportedProgressJson(
  rawText: string,
): ImportProgressResult {
  if (!rawText || !rawText.trim()) {
    return { ok: false, error: '匯入的檔案內容是空的。' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      error: 'JSON 格式不正確，請確認選擇的是學習紀錄備份檔。',
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: '檔案結構無效，無法解析學習紀錄。' };
  }

  const wrapper = parsed as { progress?: unknown };
  const candidateRaw =
    wrapper.progress && typeof wrapper.progress === 'object'
      ? wrapper.progress
      : parsed;

  if (
    !candidateRaw ||
    typeof candidateRaw !== 'object' ||
    Array.isArray(candidateRaw)
  ) {
    return { ok: false, error: '檔案中找不到有效的 progress 學習紀錄物件。' };
  }

  const candidate = candidateRaw as Partial<PlayerProgress>;
  if (
    typeof candidate.nickname !== 'string' ||
    typeof candidate.xp !== 'number' ||
    !Number.isFinite(candidate.xp) ||
    typeof candidate.coins !== 'number' ||
    !Number.isFinite(candidate.coins)
  ) {
    return {
      ok: false,
      error: '檔案缺少學習紀錄必要欄位（nickname / xp / coins），無法匯入。',
    };
  }

  return {
    ok: true,
    progress: normalizeProgress(candidate),
  };
}
