import type {
  Grade,
  LocalProfileMeta,
  PlayerProgress,
  Stage,
} from '../types/quiz';
import {
  DEFAULT_PROGRESS,
  normalizeProgress,
  parseImportedProgressJson,
  type ImportProgressResult,
} from './progressImport';

export {
  DEFAULT_PROGRESS,
  normalizeProgress,
  parseImportedProgressJson,
  type ImportProgressResult,
};

const STORAGE_KEY = 'edu_quiz_play_progress_v1';
const PROFILES_META_KEY = 'edu_quiz_play_profiles_v1';
export const DEFAULT_PROFILE_ID = 'default';

interface StoredProfileIndex {
  activeProfileId: string;
  profiles: LocalProfileMeta[];
}

function getProfileStorageKey(profileId: string): string {
  return profileId === DEFAULT_PROFILE_ID
    ? STORAGE_KEY
    : `${STORAGE_KEY}__profile_${profileId}`;
}

function loadRawProgressByKey(storageKey: string): PlayerProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return normalizeProgress(parsed);
  } catch {
    return null;
  }
}

function readProfileIndex(): StoredProfileIndex {
  if (typeof window === 'undefined') {
    return {
      activeProfileId: DEFAULT_PROFILE_ID,
      profiles: [
        {
          id: DEFAULT_PROFILE_ID,
          nickname: DEFAULT_PROGRESS.nickname,
          selectedAvatarId: DEFAULT_PROGRESS.selectedAvatarId,
          createdAt: new Date(0).toISOString(),
        },
      ],
    };
  }

  const defaultProgress = loadRawProgressByKey(STORAGE_KEY) ?? DEFAULT_PROGRESS;
  const fallbackDefaultMeta: LocalProfileMeta = {
    id: DEFAULT_PROFILE_ID,
    nickname: defaultProgress.nickname,
    selectedAvatarId: defaultProgress.selectedAvatarId,
    createdAt: new Date(0).toISOString(),
  };

  try {
    const raw = window.localStorage.getItem(PROFILES_META_KEY);
    if (!raw) {
      return {
        activeProfileId: DEFAULT_PROFILE_ID,
        profiles: [fallbackDefaultMeta],
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredProfileIndex>;
    const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const seen = new Set<string>();
    const validProfiles: LocalProfileMeta[] = [];

    for (const item of rawProfiles) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        item.id.trim() !== '' &&
        !seen.has(item.id)
      ) {
        seen.add(item.id);
        validProfiles.push({
          id: item.id,
          nickname:
            typeof item.nickname === 'string' && item.nickname.trim() !== ''
              ? item.nickname.trim()
              : '小勇者',
          selectedAvatarId:
            typeof item.selectedAvatarId === 'string' &&
            item.selectedAvatarId.trim() !== ''
              ? item.selectedAvatarId
              : 'hero-knight',
          defaultGrade:
            typeof item.defaultGrade === 'number' &&
            item.defaultGrade >= 1 &&
            item.defaultGrade <= 6
              ? (item.defaultGrade as Grade)
              : undefined,
          createdAt:
            typeof item.createdAt === 'string'
              ? item.createdAt
              : new Date().toISOString(),
        });
      }
    }

    if (!seen.has(DEFAULT_PROFILE_ID)) {
      validProfiles.unshift(fallbackDefaultMeta);
    }

    const activeProfileId =
      typeof parsed.activeProfileId === 'string' &&
      validProfiles.some((p) => p.id === parsed.activeProfileId)
        ? parsed.activeProfileId
        : DEFAULT_PROFILE_ID;

    return {
      activeProfileId,
      profiles: validProfiles,
    };
  } catch {
    return {
      activeProfileId: DEFAULT_PROFILE_ID,
      profiles: [fallbackDefaultMeta],
    };
  }
}

function writeProfileIndex(index: StoredProfileIndex): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILES_META_KEY, JSON.stringify(index));
  } catch {
    // Ignore quota errors on restricted browsers
  }
}

export function listProfiles(): LocalProfileMeta[] {
  return readProfileIndex().profiles;
}

export function getActiveProfileId(): string {
  return readProfileIndex().activeProfileId;
}

export function loadProgress(profileId?: string): PlayerProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  const targetId = profileId ?? getActiveProfileId();
  return (
    loadRawProgressByKey(getProfileStorageKey(targetId)) ?? DEFAULT_PROGRESS
  );
}

export function saveProgress(
  progress: PlayerProgress,
  profileId?: string,
): void {
  if (typeof window === 'undefined') return;
  const targetId = profileId ?? getActiveProfileId();
  try {
    window.localStorage.setItem(
      getProfileStorageKey(targetId),
      JSON.stringify(progress),
    );
  } catch {
    // Ignore quota errors on restricted browsers
  }
}

export function syncActiveProfileMeta(
  progress: PlayerProgress,
  profileId?: string,
): LocalProfileMeta[] {
  const index = readProfileIndex();
  const targetId = profileId ?? index.activeProfileId;
  const nextProfiles = index.profiles.map((profile) =>
    profile.id === targetId
      ? {
          ...profile,
          nickname: progress.nickname,
          selectedAvatarId: progress.selectedAvatarId,
          defaultGrade: progress.defaultGrade ?? profile.defaultGrade,
        }
      : profile,
  );
  writeProfileIndex({
    activeProfileId: index.activeProfileId,
    profiles: nextProfiles,
  });
  return nextProfiles;
}

export function switchProfile(profileId: string): {
  activeProfileId: string;
  progress: PlayerProgress;
  profiles: LocalProfileMeta[];
} {
  const index = readProfileIndex();
  const targetExists = index.profiles.some((p) => p.id === profileId);
  const nextId = targetExists ? profileId : DEFAULT_PROFILE_ID;
  writeProfileIndex({
    activeProfileId: nextId,
    profiles: index.profiles,
  });
  const loaded = loadProgress(nextId);
  const meta = index.profiles.find((p) => p.id === nextId);
  const effectiveGrade = loaded.defaultGrade ?? meta?.defaultGrade;
  const adjusted: PlayerProgress =
    effectiveGrade !== undefined
      ? {
          ...loaded,
          defaultGrade: effectiveGrade,
          selectedGrade: effectiveGrade,
          autoReadQuestion:
            loaded.autoReadQuestion ?? (effectiveGrade <= 2 ? true : false),
        }
      : loaded;
  return {
    activeProfileId: nextId,
    progress: adjusted,
    profiles: index.profiles,
  };
}

export function createProfile(
  nickname: string,
  defaultGrade?: Grade,
): {
  activeProfileId: string;
  progress: PlayerProgress;
  profiles: LocalProfileMeta[];
} {
  const cleanName = nickname.trim().slice(0, 20) || '新勇者';
  const index = readProfileIndex();
  const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const grade = defaultGrade ?? 5;
  const newProgress: PlayerProgress = {
    ...DEFAULT_PROGRESS,
    nickname: cleanName,
    defaultGrade: defaultGrade,
    selectedGrade: grade,
    autoReadQuestion: grade <= 2,
  };
  const newMeta: LocalProfileMeta = {
    id,
    nickname: cleanName,
    selectedAvatarId: newProgress.selectedAvatarId,
    defaultGrade,
    createdAt: new Date().toISOString(),
  };
  const nextProfiles = [...index.profiles, newMeta];
  saveProgress(newProgress, id);
  writeProfileIndex({
    activeProfileId: id,
    profiles: nextProfiles,
  });
  return {
    activeProfileId: id,
    progress: newProgress,
    profiles: nextProfiles,
  };
}

export function deleteProfile(profileId: string): {
  activeProfileId: string;
  progress: PlayerProgress;
  profiles: LocalProfileMeta[];
} {
  const index = readProfileIndex();
  if (profileId === DEFAULT_PROFILE_ID) {
    return {
      activeProfileId: index.activeProfileId,
      progress: loadProgress(index.activeProfileId),
      profiles: index.profiles,
    };
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(getProfileStorageKey(profileId));
    } catch {
      // Ignore storage error
    }
  }

  const nextProfiles = index.profiles.filter((p) => p.id !== profileId);
  const nextActiveId =
    index.activeProfileId === profileId
      ? DEFAULT_PROFILE_ID
      : index.activeProfileId;

  writeProfileIndex({
    activeProfileId: nextActiveId,
    profiles: nextProfiles,
  });

  return {
    activeProfileId: nextActiveId,
    progress: loadProgress(nextActiveId),
    profiles: nextProfiles,
  };
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
    const parsed = JSON.parse(json) as Partial<Stage>;
    if (
      !parsed ||
      typeof parsed.title !== 'string' ||
      parsed.title.trim() === '' ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0
    ) {
      return null;
    }

    const validQuestions = parsed.questions
      .filter((q): q is Stage['questions'][number] => {
        if (!q || typeof q !== 'object') return false;
        if (typeof q.prompt !== 'string' || q.prompt.trim() === '') return false;
        if (!Array.isArray(q.options) || q.options.length !== 4) return false;
        if (
          q.options.some(
            (opt) => typeof opt !== 'string' || opt.trim() === '',
          )
        ) {
          return false;
        }
        if (
          typeof q.answerIndex !== 'number' ||
          !Number.isInteger(q.answerIndex) ||
          q.answerIndex < 0 ||
          q.answerIndex > 3
        ) {
          return false;
        }
        return true;
      })
      .map((q, qIdx) => ({
        ...q,
        id:
          typeof q.id === 'string' && q.id.trim() !== ''
            ? q.id
            : `shared-q-${qIdx + 1}`,
        prompt: q.prompt.trim(),
        options: [
          q.options[0].trim(),
          q.options[1].trim(),
          q.options[2].trim(),
          q.options[3].trim(),
        ] as [string, string, string, string],
        explanation:
          typeof q.explanation === 'string' && q.explanation.trim() !== ''
            ? q.explanation.trim()
            : `正確答案是「${q.options[q.answerIndex].trim()}」。`,
        speechText:
          typeof q.speechText === 'string' && q.speechText.trim() !== ''
            ? q.speechText.trim()
            : q.prompt.trim(),
        speechLang: q.speechLang === 'en-US' ? 'en-US' : 'zh-TW',
      }));

    if (validQuestions.length === 0) return null;

    return {
      id:
        typeof parsed.id === 'string' && parsed.id.trim() !== ''
          ? parsed.id
          : `shared-${Date.now()}`,
      subjectId: 'custom',
      title: parsed.title.trim().slice(0, 60),
      description:
        typeof parsed.description === 'string' && parsed.description.trim() !== ''
          ? parsed.description.trim()
          : '老師分享的自訂測驗關卡',
      difficulty:
        parsed.difficulty === 'medium' || parsed.difficulty === 'hard'
          ? parsed.difficulty
          : 'easy',
      monsterId: parsed.monsterId || 'slime',
      monsterName: parsed.monsterName || '自訂題庫史萊姆',
      monsterHp: validQuestions.length * 25,
      questions: validQuestions,
    };
  } catch {
    return null;
  }
}
