import type { LessonPack, LessonScript } from '../../types/lesson';
import type { Grade, Semester, SubjectId } from '../../types/quiz';

const lessonModules = import.meta.glob<{ default: LessonPack }>(
  './lessons/**/*.json',
);
const lessonCache = new Map<string, LessonPack | null>();

function getLessonModuleKey(
  academicYear: number,
  semester: Semester,
  grade: Grade,
  subjectId: Exclude<SubjectId, 'custom'>,
): string | null {
  const candidates = [
    `./lessons/${academicYear}-s${semester}/g${grade}/${subjectId}.json`,
    `./lessons/${academicYear}-s${semester}-g${grade}-${subjectId}.json`,
  ];
  for (const key of candidates) {
    if (key in lessonModules) {
      return key;
    }
  }
  return null;
}

export function hasLessonPack(
  academicYear: number,
  semester: Semester,
  grade: Grade,
  subjectId: Exclude<SubjectId, 'custom'>,
): boolean {
  return getLessonModuleKey(academicYear, semester, grade, subjectId) !== null;
}

export async function loadLessonPack(
  academicYear: number,
  semester: Semester,
  grade: Grade,
  subjectId: Exclude<SubjectId, 'custom'>,
): Promise<LessonPack | null> {
  const cacheKey = `${academicYear}-s${semester}-g${grade}-${subjectId}`;
  if (lessonCache.has(cacheKey)) {
    return lessonCache.get(cacheKey) ?? null;
  }

  const moduleKey = getLessonModuleKey(academicYear, semester, grade, subjectId);
  if (!moduleKey) {
    lessonCache.set(cacheKey, null);
    return null;
  }

  const loader = lessonModules[moduleKey];
  const mod = await loader();
  const pack = mod.default;
  lessonCache.set(cacheKey, pack);
  return pack;
}

export function findLessonForStage(
  pack: LessonPack | null,
  stageId: string,
): LessonScript | null {
  if (!pack || !Array.isArray(pack.lessons)) return null;
  return pack.lessons.find((lesson) => lesson.stageId === stageId) ?? null;
}
