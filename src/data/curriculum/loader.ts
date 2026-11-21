import type {
  CurriculumCatalogMeta,
  CurriculumGradeCatalog,
  CurriculumSubjectEntry,
  Grade,
  QuizPack,
  Semester,
  SubjectId,
} from '../../types/quiz';
import rawMeta from './catalog-meta.json';

const meta = rawMeta as CurriculumCatalogMeta;

const packModules = import.meta.glob<{ default: QuizPack }>('./packs/**/*.json');
const packCache = new Map<string, QuizPack | null>();
const gradeModules =
  import.meta.glob<{ default: CurriculumGradeCatalog }>('./catalog-g*.json');
const gradeCache = new Map<Grade, CurriculumSubjectEntry[]>();

function getPackCandidates(
  academicYear: number,
  semester: Semester,
  grade: Grade,
  subjectId: Exclude<SubjectId, 'custom'>,
): string[] {
  return [
    `./packs/${academicYear}-s${semester}/g${grade}/${subjectId}.json`,
    `./packs/${academicYear}-s${semester}-g${grade}-${subjectId}.json`,
  ];
}

function resolvePackKey(
  academicYear: number,
  semester: Semester,
  grade: Grade,
  subjectId: Exclude<SubjectId, 'custom'>,
): string | null {
  const candidates = getPackCandidates(academicYear, semester, grade, subjectId);
  for (const key of candidates) {
    if (key in packModules) {
      return key;
    }
  }
  return null;
}

export function getCurriculumCatalog(): CurriculumCatalogMeta {
  return meta;
}

export async function loadGradeEntries(
  grade: Grade,
): Promise<CurriculumSubjectEntry[]> {
  const cached = gradeCache.get(grade);
  if (cached) {
    return cached;
  }

  const loader = gradeModules[`./catalog-g${grade}.json`];
  if (!loader) {
    gradeCache.set(grade, []);
    return [];
  }

  const mod = await loader();
  const entries = mod.default.entries;
  gradeCache.set(grade, entries);
  return entries;
}

export function findCurriculumEntry(
  entries: CurriculumSubjectEntry[],
  semester: Semester,
  subjectId: Exclude<SubjectId, 'custom'>,
): CurriculumSubjectEntry | undefined {
  return entries.find(
    (entry) => entry.semester === semester && entry.subjectId === subjectId,
  );
}

export function hasQuizPack(
  academicYear: number,
  semester: Semester,
  grade: Grade,
  subjectId: Exclude<SubjectId, 'custom'>,
): boolean {
  return resolvePackKey(academicYear, semester, grade, subjectId) !== null;
}

export async function loadQuizPack(
  academicYear: number,
  semester: Semester,
  grade: Grade,
  subjectId: Exclude<SubjectId, 'custom'>,
): Promise<QuizPack | null> {
  const cacheKey = `${academicYear}-s${semester}-g${grade}-${subjectId}`;
  if (packCache.has(cacheKey)) {
    return packCache.get(cacheKey) ?? null;
  }

  const moduleKey = resolvePackKey(academicYear, semester, grade, subjectId);
  if (!moduleKey) {
    packCache.set(cacheKey, null);
    return null;
  }

  const loader = packModules[moduleKey];
  const mod = await loader();
  const pack = mod.default;
  packCache.set(cacheKey, pack);
  return pack;
}
