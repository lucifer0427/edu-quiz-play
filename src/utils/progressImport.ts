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
    wrongMistakeCounts:
      parsed.wrongMistakeCounts &&
      typeof parsed.wrongMistakeCounts === 'object' &&
      !Array.isArray(parsed.wrongMistakeCounts)
        ? Object.fromEntries(
            Object.entries(parsed.wrongMistakeCounts).filter(
              ([k, v]) =>
                typeof k === 'string' &&
                k.trim() !== '' &&
                typeof v === 'number' &&
                Number.isFinite(v) &&
                v >= 1,
            ).map(([k, v]) => [k, Math.floor(v)]),
          )
        : undefined,
    wrongReasonTags:
      parsed.wrongReasonTags &&
      typeof parsed.wrongReasonTags === 'object' &&
      !Array.isArray(parsed.wrongReasonTags)
        ? Object.fromEntries(
            Object.entries(parsed.wrongReasonTags).filter(
              ([k, v]) =>
                typeof k === 'string' &&
                k.trim() !== '' &&
                (v === 'careless' || v === 'misread' || v === 'concept'),
            ),
          )
        : undefined,
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
    defaultGrade:
      parsed.defaultGrade !== undefined
        ? normalizeGrade(parsed.defaultGrade)
        : undefined,
    eyeCareEnabled:
      typeof parsed.eyeCareEnabled === 'boolean' ? parsed.eyeCareEnabled : true,
    customHanziLists: Array.isArray(parsed.customHanziLists)
      ? parsed.customHanziLists.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.title === 'string' &&
            Array.isArray(item.chars) &&
            item.chars.length > 0,
        )
      : undefined,
    examPlan:
      parsed.examPlan &&
      typeof parsed.examPlan === 'object' &&
      typeof parsed.examPlan.title === 'string' &&
      typeof parsed.examPlan.examDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.examPlan.examDate) &&
      Array.isArray(parsed.examPlan.subjectIds)
        ? {
            title: parsed.examPlan.title.trim().slice(0, 40) || '段考衝刺計畫',
            examDate: parsed.examPlan.examDate,
            grade:
              parsed.examPlan.grade !== undefined
                ? normalizeGrade(parsed.examPlan.grade)
                : undefined,
            semester:
              parsed.examPlan.semester === 1 || parsed.examPlan.semester === 2
                ? parsed.examPlan.semester
                : undefined,
            preset:
              parsed.examPlan.preset === 'midterm' ||
              parsed.examPlan.preset === 'final' ||
              parsed.examPlan.preset === 'all' ||
              parsed.examPlan.preset === 'custom'
                ? parsed.examPlan.preset
                : undefined,
            subjectIds: parsed.examPlan.subjectIds.filter(
              (s): s is SubjectId =>
                typeof s === 'string' && VALID_SUBJECT_IDS.has(s),
            ),
            stageIdsBySubject:
              parsed.examPlan.stageIdsBySubject &&
              typeof parsed.examPlan.stageIdsBySubject === 'object' &&
              !Array.isArray(parsed.examPlan.stageIdsBySubject)
                ? Object.fromEntries(
                    Object.entries(parsed.examPlan.stageIdsBySubject)
                      .filter(
                        ([k, v]) =>
                          VALID_SUBJECT_IDS.has(k) && Array.isArray(v),
                      )
                      .map(([k, v]) => [
                        k,
                        v.filter(
                          (id): id is string =>
                            typeof id === 'string' && id.trim() !== '',
                        ),
                      ]),
                  )
                : undefined,
          }
        : undefined,
    mockExamHistory: Array.isArray(parsed.mockExamHistory)
      ? parsed.mockExamHistory
          .filter(
            (r) =>
              r &&
              typeof r === 'object' &&
              typeof r.id === 'string' &&
              typeof r.takenAt === 'string' &&
              typeof r.score === 'number' &&
              Number.isFinite(r.score) &&
              typeof r.totalCount === 'number' &&
              Number.isFinite(r.totalCount) &&
              r.totalCount > 0,
          )
          .slice(0, 30)
          .map((r) => ({
            ...r,
            grade: normalizeGrade(r.grade),
            semester: normalizeSemester(r.semester),
            subjectId: VALID_SUBJECT_IDS.has(r.subjectId)
              ? r.subjectId
              : 'custom',
            score: Math.max(0, Math.min(100, Math.round(r.score))),
            correctCount: nonNegativeInt(r.correctCount, 0),
            totalCount: Math.max(1, Math.floor(r.totalCount)),
            durationSec: nonNegativeInt(r.durationSec, 1),
            unitBreakdown: Array.isArray(r.unitBreakdown)
              ? r.unitBreakdown
                  .filter(
                    (u) =>
                      u &&
                      typeof u === 'object' &&
                      typeof u.stageTitle === 'string' &&
                      typeof u.total === 'number' &&
                      u.total > 0,
                  )
                  .map((u) => ({
                    stageTitle: u.stageTitle,
                    correct: nonNegativeInt(u.correct, 0),
                    total: Math.max(1, Math.floor(u.total)),
                  }))
              : [],
          }))
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

const SYNC_CODE_PREFIX = 'EQP1:';

export function encodeProgressSyncCode(progress: PlayerProgress): string {
  const json = JSON.stringify({
    exportedAt: new Date().toISOString(),
    progress,
  });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `${SYNC_CODE_PREFIX}${btoa(binary)}`;
}

export function decodeProgressSyncCode(code: string): ImportProgressResult {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, error: '請先貼上同步碼。' };
  }
  if (!trimmed.startsWith(SYNC_CODE_PREFIX)) {
    return parseImportedProgressJson(trimmed);
  }
  try {
    const b64 = trimmed.slice(SYNC_CODE_PREFIX.length).replace(/\s+/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return parseImportedProgressJson(json);
  } catch {
    return { ok: false, error: '同步碼格式無效或已損毀，請重新複製。' };
  }
}
