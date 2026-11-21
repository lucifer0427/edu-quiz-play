import { SUBJECT_META } from '../data/subjects';
import type {
  Grade,
  MapViewMode,
  PlayerProgress,
  Semester,
  Stage,
  SubjectId,
} from '../types/quiz';

const STORAGE_KEY = 'edu_quiz_play_progress_v1';

export const DEFAULT_PROGRESS: PlayerProgress = {
  schemaVersion: 2,
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
  customStages: [],
  selectedView: 'classic',
  selectedGrade: 5,
  selectedSemester: 1,
  selectedSubject: 'all',
};

function normalizeView(value: unknown): MapViewMode {
  return value === 'curriculum' || value === 'classic'
    ? value
    : (DEFAULT_PROGRESS.selectedView ?? 'classic');
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
  if (typeof value === 'string' && value in SUBJECT_META) {
    return value as SubjectId;
  }
  return DEFAULT_PROGRESS.selectedSubject ?? 'all';
}

export function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      schemaVersion: 2,
      unlockedAvatarIds:
        Array.isArray(parsed.unlockedAvatarIds) &&
        parsed.unlockedAvatarIds.length > 0
          ? parsed.unlockedAvatarIds
          : DEFAULT_PROGRESS.unlockedAvatarIds,
      stageStars:
        parsed.stageStars && typeof parsed.stageStars === 'object'
          ? parsed.stageStars
          : {},
      wrongQuestionIds: Array.isArray(parsed.wrongQuestionIds)
        ? parsed.wrongQuestionIds
        : [],
      wrongQuestionSnapshots:
        parsed.wrongQuestionSnapshots &&
        typeof parsed.wrongQuestionSnapshots === 'object'
          ? parsed.wrongQuestionSnapshots
          : {},
      customStages: Array.isArray(parsed.customStages)
        ? parsed.customStages
        : [],
      selectedView: normalizeView(parsed.selectedView),
      selectedGrade: normalizeGrade(parsed.selectedGrade),
      selectedSemester: normalizeSemester(parsed.selectedSemester),
      selectedSubject: normalizeSubject(parsed.selectedSubject),
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: PlayerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore quota errors on restricted browsers
  }
}

const LEVEL_TITLES = [
  '見習小勇者',
  '好奇探索家',
  '解謎小騎士',
  '星光魔法師',
  '智慧小導師',
  '知識傳說王',
];

export function getLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  title: string;
} {
  let level = 1;
  let remaining = Math.max(0, xp);
  let needed = 100;

  while (remaining >= needed) {
    remaining -= needed;
    level++;
    needed = 100 + (level - 1) * 50;
  }

  const titleIndex = Math.min(level - 1, LEVEL_TITLES.length - 1);
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: needed,
    progressPercent: Math.min(100, Math.round((remaining / needed) * 100)),
    title: LEVEL_TITLES[titleIndex],
  };
}

export function exportProgressJson(progress: PlayerProgress): void {
  const levelInfo = getLevelFromXp(progress.xp);
  const accuracy =
    progress.totalAnswered > 0
      ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
      : 0;

  const payload = {
    exportedAt: new Date().toISOString(),
    app: '知識大冒險 EduQuiz Play',
    summary: {
      nickname: progress.nickname,
      level: levelInfo.level,
      title: levelInfo.title,
      xp: progress.xp,
      coins: progress.coins,
      accuracyPercent: accuracy,
      totalCorrect: progress.totalCorrect,
      totalAnswered: progress.totalAnswered,
      wrongCount: progress.wrongQuestionIds.length,
    },
    progress,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `edu-quiz-record-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeCustomStageToHash(stage: Stage): string {
  const json = JSON.stringify(stage);
  const bytes = new TextEncoder().encode(json);
  return `quiz=${bytesToBase64Url(bytes)}`;
}

export function decodeCustomStageFromHash(hash: string): Stage | null {
  try {
    const clean = hash.replace(/^#/, '');
    const prefix = 'quiz=';
    const idx = clean.indexOf(prefix);
    if (idx === -1) return null;
    const encoded = clean.slice(idx + prefix.length).split('&')[0];
    if (!encoded) return null;
    const bytes = base64UrlToBytes(encoded);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Stage;
    if (
      !parsed ||
      typeof parsed.title !== 'string' ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0
    ) {
      return null;
    }
    return {
      ...parsed,
      subjectId: 'custom',
      id: parsed.id || `shared-${Date.now()}`,
      monsterId: parsed.monsterId || 'slime',
      monsterName: parsed.monsterName || '自訂題庫史萊姆',
      monsterHp: parsed.questions.length * 25,
    };
  } catch {
    return null;
  }
}
