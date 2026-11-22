import type { Question, Stage, SubjectId } from '../../types/quiz.ts';

export type QuestionGenerator = (count?: number) => Question[];

type GeneratorGroup =
  | 'basic'
  | 'g1'
  | 'g2'
  | 'g3'
  | 'g4'
  | 'g5s1'
  | 'g5s2'
  | 'g6';

const GROUP_GENERATOR_IDS: Record<GeneratorGroup, readonly string[]> = {
  basic: ['math-basic-easy', 'math-basic-medium', 'math-basic-hard'],
  g1: [
    'g1s1-math-u1',
    'g1s1-math-u3',
    'g1s1-math-u4',
    'g1s1-math-u6',
    'g1s1-math-u7',
    'g1s1-math-u8',
    'g1s1-math-u9',
    'g1s2-math-u1',
    'g1s2-math-u2',
    'g1s2-math-u4',
    'g1s2-math-u6',
    'g1s2-math-u7',
    'g1s2-math-u8',
    'g1s2-math-u9',
  ],
  g2: [
    'g2s1-math-u1',
    'g2s1-math-u2',
    'g2s1-math-u3',
    'g2s1-math-u6',
    'g2s1-math-u7',
    'g2s1-math-u8',
    'g2s1-math-u9',
    'g2s2-math-u1',
    'g2s2-math-u3',
    'g2s2-math-u5',
    'g2s2-math-u6',
    'g2s2-math-u7',
    'g2s2-math-u8',
    'g2s2-math-u9',
    'g2s2-math-u10',
  ],
  g3: [
    'g3s1-math-u1',
    'g3s1-math-u2',
    'g3s1-math-u3',
    'g3s1-math-u4',
    'g3s1-math-u6',
    'g3s1-math-u7',
    'g3s1-math-u8',
    'g3s2-math-u1',
    'g3s2-math-u2',
    'g3s2-math-u3',
    'g3s2-math-u5',
    'g3s2-math-u6',
    'g3s2-math-u7',
    'g3s2-math-u8',
    'g3s2-math-u9',
  ],
  g4: [
    'g4s1-math-u1',
    'g4s1-math-u2',
    'g4s1-math-u4',
    'g4s1-math-u5',
    'g4s1-math-u6',
    'g4s1-math-u8',
    'g4s1-math-u9',
    'g4s2-math-u1',
    'g4s2-math-u2',
    'g4s2-math-u4',
    'g4s2-math-u6',
    'g4s2-math-u7',
    'g4s2-math-u8',
    'g4s2-math-u9',
  ],
  g5s1: [
    'g5s1-math-u2',
    'g5s1-math-u4',
    'g5s1-math-u6',
    'g5s1-math-u7',
    'g5s1-math-u8',
    'g5s1-math-u9',
  ],
  g5s2: [
    'g5s2-math-u1',
    'g5s2-math-u2',
    'g5s2-math-u3',
    'g5s2-math-u4',
    'g5s2-math-u5',
    'g5s2-math-u6',
    'g5s2-math-u7',
    'g5s2-math-u8',
    'g5s2-math-u9',
  ],
  g6: [
    'g6s1-math-u1',
    'g6s1-math-u2',
    'g6s1-math-u3',
    'g6s1-math-u4',
    'g6s1-math-u5',
    'g6s1-math-u6',
    'g6s1-math-u7',
    'g6s1-math-u8',
    'g6s1-math-u9',
    'g6s2-math-u1',
    'g6s2-math-u2',
    'g6s2-math-u3',
    'g6s2-math-u4',
    'g6s2-math-u5',
  ],
};

const ID_TO_GROUP = new Map<string, GeneratorGroup>();
for (const [group, ids] of Object.entries(GROUP_GENERATOR_IDS) as [
  GeneratorGroup,
  readonly string[],
][]) {
  for (const id of ids) {
    ID_TO_GROUP.set(id, group);
  }
}

export const KNOWN_GENERATOR_IDS: ReadonlySet<string> = new Set(
  ID_TO_GROUP.keys(),
);

const GROUP_LOADERS: Record<
  GeneratorGroup,
  () => Promise<Record<string, QuestionGenerator>>
> = {
  basic: async () => {
    const mod = await import('../mathGenerator.ts');
    return {
      'math-basic-easy': (count = 6) =>
        mod.generateMathQuestions('easy', count),
      'math-basic-medium': (count = 6) =>
        mod.generateMathQuestions('medium', count),
      'math-basic-hard': (count = 6) =>
        mod.generateMathQuestions('hard', count),
    };
  },
  g1: async () => {
    const mod = await import('./g1Math.ts');
    return {
      'g1s1-math-u1': (count = 6) => mod.generateG1S1U1Numbers10(count),
      'g1s1-math-u3': (count = 6) => mod.generateG1S1U3OrderCompare(count),
      'g1s1-math-u4': (count = 6) =>
        mod.generateG1S1U4ComposeDecompose10(count),
      'g1s1-math-u6': (count = 6) => mod.generateG1S1U6Numbers30(count),
      'g1s1-math-u7': (count = 6) => mod.generateG1S1U7Add10(count),
      'g1s1-math-u8': (count = 6) => mod.generateG1S1U8Sub10(count),
      'g1s1-math-u9': (count = 6) => mod.generateG1S1U9ClockHours(count),
      'g1s2-math-u1': (count = 6) => mod.generateG1S2U1Numbers50(count),
      'g1s2-math-u2': (count = 6) => mod.generateG1S2U2CarryAdd18(count),
      'g1s2-math-u4': (count = 6) => mod.generateG1S2U4BorrowSub18(count),
      'g1s2-math-u6': (count = 6) => mod.generateG1S2U6Numbers100(count),
      'g1s2-math-u7': (count = 6) => mod.generateG1S2U7Coins(count),
      'g1s2-math-u8': (count = 6) => mod.generateG1S2U8AddSub2Digits(count),
      'g1s2-math-u9': (count = 6) => mod.generateG1S2U9CalendarDate(count),
    };
  },
  g2: async () => {
    const mod = await import('./g2Math.ts');
    return {
      'g2s1-math-u1': (count = 6) => mod.generateG2S1U1Numbers200(count),
      'g2s1-math-u2': (count = 6) => mod.generateG2S1U2AddSub2Digits(count),
      'g2s1-math-u3': (count = 6) => mod.generateG2S1U3Centimeters(count),
      'g2s1-math-u6': (count = 6) => mod.generateG2S1U6TwoStepAddSub(count),
      'g2s1-math-u7': (count = 6) => mod.generateG2S1U7Multiplication1(count),
      'g2s1-math-u8': (count = 6) => mod.generateG2S1U8TellingTime(count),
      'g2s1-math-u9': (count = 6) => mod.generateG2S1U9Multiplication2(count),
      'g2s2-math-u1': (count = 6) => mod.generateG2S2U1Numbers1000(count),
      'g2s2-math-u3': (count = 6) => mod.generateG2S2U3AddSub3Digits(count),
      'g2s2-math-u5': (count = 6) => mod.generateG2S2U5TenHundredMul(count),
      'g2s2-math-u6': (count = 6) => mod.generateG2S2U6MetersCm(count),
      'g2s2-math-u7': (count = 6) => mod.generateG2S2U7MulAddSub(count),
      'g2s2-math-u8': (count = 6) => mod.generateG2S2U8CalendarDays(count),
      'g2s2-math-u9': (count = 6) => mod.generateG2S2U9GroupingSharing(count),
      'g2s2-math-u10': (count = 6) => mod.generateG2S2U10UnitFractions(count),
    };
  },
  g3: async () => {
    const mod = await import('./g3Math.ts');
    return {
      'g3s1-math-u1': (count = 6) => mod.generateG3S1U1Numbers10000(count),
      'g3s1-math-u2': (count = 6) => mod.generateG3S1U2AddSub4Digits(count),
      'g3s1-math-u3': (count = 6) => mod.generateG3S1U3Millimeters(count),
      'g3s1-math-u4': (count = 6) => mod.generateG3S1U4Multiplication(count),
      'g3s1-math-u6': (count = 6) => mod.generateG3S1U6Division(count),
      'g3s1-math-u7': (count = 6) => mod.generateG3S1U7KilogramsGrams(count),
      'g3s1-math-u8': (count = 6) => mod.generateG3S1U8BasicFractions(count),
      'g3s2-math-u1': (count = 6) => mod.generateG3S2U1Division(count),
      'g3s2-math-u2': (count = 6) => mod.generateG3S2U2LitersMl(count),
      'g3s2-math-u3': (count = 6) => mod.generateG3S2U3FractionAddSub(count),
      'g3s2-math-u5': (count = 6) => mod.generateG3S2U5TwoStepApps(count),
      'g3s2-math-u6': (count = 6) => mod.generateG3S2U6OnePlaceDecimals(count),
      'g3s2-math-u7': (count = 6) => mod.generateG3S2U7TimeAddSub(count),
      'g3s2-math-u8': (count = 6) => mod.generateG3S2U8MulDivInverse(count),
      'g3s2-math-u9': (count = 6) => mod.generateG3S2U9AreaSqCm(count),
    };
  },
  g4: async () => {
    const mod = await import('./g4Math.ts');
    return {
      'g4s1-math-u1': (count = 6) => mod.generateG4S1U1BigNumbers(count),
      'g4s1-math-u2': (count = 6) => mod.generateG4S1U2Multiplication(count),
      'g4s1-math-u4': (count = 6) => mod.generateG4S1U4Fractions(count),
      'g4s1-math-u5': (count = 6) => mod.generateG4S1U5Kilometers(count),
      'g4s1-math-u6': (count = 6) => mod.generateG4S1U6Division(count),
      'g4s1-math-u8': (count = 6) => mod.generateG4S1U8TwoStepOps(count),
      'g4s1-math-u9': (count = 6) => mod.generateG4S1U9TwoPlaceDecimals(count),
      'g4s2-math-u1': (count = 6) => mod.generateG4S2U1Rounding(count),
      'g4s2-math-u2': (count = 6) => mod.generateG4S2U2FourOps(count),
      'g4s2-math-u4': (count = 6) => mod.generateG4S2U4Fractions1(count),
      'g4s2-math-u6': (count = 6) => mod.generateG4S2U6DecimalMul(count),
      'g4s2-math-u7': (count = 6) => mod.generateG4S2U7PerimeterArea(count),
      'g4s2-math-u8': (count = 6) => mod.generateG4S2U8Fractions2(count),
      'g4s2-math-u9': (count = 6) => mod.generateG4S2U9TimeCalc(count),
    };
  },
  g5s1: async () => {
    const mod = await import('./g5s1Math.ts');
    return {
      'g5s1-math-u2': (count = 6) => mod.generateG5S1U2FactorsMultiples(count),
      'g5s1-math-u4': (count = 6) => mod.generateG5S1U4GcdLcm(count),
      'g5s1-math-u6': (count = 6) => mod.generateG5S1U6FourOps(count),
      'g5s1-math-u7': (count = 6) => mod.generateG5S1U7Fractions(count),
      'g5s1-math-u8': (count = 6) => mod.generateG5S1U8Area(count),
      'g5s1-math-u9': (count = 6) => mod.generateG5S1U9UnitFraction(count),
    };
  },
  g5s2: async () => {
    const mod = await import('./g5s2Math.ts');
    return {
      'g5s2-math-u1': (count = 6) => mod.generateG5S2U1DecimalPlace(count),
      'g5s2-math-u2': (count = 6) => mod.generateG5S2U2FractionMulDiv(count),
      'g5s2-math-u3': (count = 6) => mod.generateG5S2U3CuboidVolume(count),
      'g5s2-math-u4': (count = 6) => mod.generateG5S2U4Decimals(count),
      'g5s2-math-u5': (count = 6) => mod.generateG5S2U5LargeUnits(count),
      'g5s2-math-u6': (count = 6) => mod.generateG5S2U6TimeMulDiv(count),
      'g5s2-math-u7': (count = 6) => mod.generateG5S2U7Capacity(count),
      'g5s2-math-u8': (count = 6) => mod.generateG5S2U8RatioPercent(count),
      'g5s2-math-u9': (count = 6) => mod.generateG5S2U9SurfaceArea(count),
    };
  },
  g6: async () => {
    const mod = await import('./g6Math.ts');
    return {
      'g6s1-math-u1': (count = 6) => mod.generateG6S1U1GcdLcm(count),
      'g6s1-math-u2': (count = 6) => mod.generateG6S1U2FractionDiv(count),
      'g6s1-math-u3': (count = 6) => mod.generateG6S1U3NumberPatterns(count),
      'g6s1-math-u4': (count = 6) => mod.generateG6S1U4DecimalDiv(count),
      'g6s1-math-u5': (count = 6) => mod.generateG6S1U5Ratio(count),
      'g6s1-math-u6': (count = 6) => mod.generateG6S1U6CirclePerimeter(count),
      'g6s1-math-u7': (count = 6) => mod.generateG6S1U7CircleArea(count),
      'g6s1-math-u8': (count = 6) => mod.generateG6S1U8Speed(count),
      'g6s1-math-u9': (count = 6) => mod.generateG6S1U9Scale(count),
      'g6s2-math-u1': (count = 6) => mod.generateG6S2U1MixedOps(count),
      'g6s2-math-u2': (count = 6) => mod.generateG6S2U2SpeedApps(count),
      'g6s2-math-u3': (count = 6) => mod.generateG6S2U3PrismCylinder(count),
      'g6s2-math-u4': (count = 6) => mod.generateG6S2U4BaseComparison(count),
      'g6s2-math-u5': (count = 6) => mod.generateG6S2U5ProblemSolving(count),
    };
  },
};

const groupCache = new Map<
  GeneratorGroup,
  Promise<Record<string, QuestionGenerator>>
>();

function loadGeneratorGroup(
  group: GeneratorGroup,
): Promise<Record<string, QuestionGenerator>> {
  const cached = groupCache.get(group);
  if (cached) return cached;

  const pending = GROUP_LOADERS[group]().catch((err) => {
    groupCache.delete(group);
    throw err;
  });
  groupCache.set(group, pending);
  return pending;
}

const DEFAULT_DYNAMIC_COUNT = 6;
const GRADE_LABELS = ['', '一', '二', '三', '四', '五', '六'];

/**
 * 語文科認知邊界護欄：嚴禁跨單元混排，一律維持同單元分塊練習。
 */
export const BLOCKED_INTERLEAVING_SUBJECTS: ReadonlySet<SubjectId> = new Set([
  'mandarin',
  'english',
  'minnan',
  'hakka',
]);

export interface ResolveStageQuestionsOptions {
  enableInterleaving?: boolean;
  prevStars?: number;
  isReviewMode?: boolean;
}

interface ParsedGeneratorId {
  id: string;
  grade: number;
  semester: 1 | 2;
  unitNo: number;
}

function parseMathGeneratorId(generatorId: string): ParsedGeneratorId | null {
  const match = /^g([1-6])s([12])-math-u(\d+)$/.exec(generatorId);
  if (!match) return null;
  return {
    id: generatorId,
    grade: Number(match[1]),
    semester: Number(match[2]) as 1 | 2,
    unitNo: Number(match[3]),
  };
}

function formatGeneratorSourceLabel(generatorId: string): string {
  const parsed = parseMathGeneratorId(generatorId);
  if (!parsed) return '前單元';
  const gradeText = GRADE_LABELS[parsed.grade] ?? String(parsed.grade);
  const semText = parsed.semester === 1 ? '上' : '下';
  return `${gradeText}${semText} 第${parsed.unitNo}單元`;
}

/**
 * 依同年級學期與單元順序回溯前 1–3 個已註冊數學動態單元生成器 ID（由近到遠）。
 */
export function getPreviousUnitGeneratorIds(
  stage: Stage,
  maxCount = 3,
): string[] {
  if (!stage.generatorId) return [];
  const current = parseMathGeneratorId(stage.generatorId);
  if (!current) return [];

  const candidates: ParsedGeneratorId[] = [];
  for (const id of KNOWN_GENERATOR_IDS) {
    const parsed = parseMathGeneratorId(id);
    if (!parsed || parsed.grade !== current.grade) continue;
    const isEarlier =
      parsed.semester < current.semester ||
      (parsed.semester === current.semester && parsed.unitNo < current.unitNo);
    if (isEarlier) {
      candidates.push(parsed);
    }
  }

  candidates.sort((a, b) => {
    if (a.semester !== b.semester) return b.semester - a.semester;
    return b.unitNo - a.unitNo;
  });

  return candidates.slice(0, maxCount).map((item) => item.id);
}

/**
 * 檢查關卡是否符合數學交錯練習資格（分科護欄 + 動態數學 + 已熟練或複習模式 + 存在前置單元）。
 */
export function canInterleaveStage(
  stage: Stage,
  prevStars = 0,
  isReviewMode = false,
): boolean {
  if (BLOCKED_INTERLEAVING_SUBJECTS.has(stage.subjectId)) return false;
  if (stage.subjectId !== 'math') return false;
  if (!isDynamicStage(stage) || !stage.generatorId) return false;
  if (!isReviewMode && prevStars < 2) return false;
  return getPreviousUnitGeneratorIds(stage, 1).length > 0;
}

async function generateByGeneratorId(
  generatorId: string,
  count: number,
): Promise<Question[]> {
  const group = ID_TO_GROUP.get(generatorId);
  if (!group) return [];
  const generators = await loadGeneratorGroup(group);
  const generate = generators[generatorId];
  return generate ? generate(count) : [];
}

function interleaveQuestions(
  currentQuestions: Question[],
  reviewQuestions: Question[],
): Question[] {
  if (reviewQuestions.length === 0) return currentQuestions;
  if (currentQuestions.length === 0) return reviewQuestions;

  const result: Question[] = [];
  const stride = Math.max(1, Math.floor(currentQuestions.length / reviewQuestions.length));
  let reviewIdx = 0;

  for (let i = 0; i < currentQuestions.length; i++) {
    result.push(currentQuestions[i]);
    if (
      reviewIdx < reviewQuestions.length &&
      (i + 1) % stride === 0
    ) {
      result.push(reviewQuestions[reviewIdx]);
      reviewIdx++;
    }
  }

  while (reviewIdx < reviewQuestions.length) {
    result.push(reviewQuestions[reviewIdx]);
    reviewIdx++;
  }

  return result;
}

export function isDynamicStage(stage: Stage): boolean {
  return (
    Boolean(stage.generatorId && KNOWN_GENERATOR_IDS.has(stage.generatorId)) ||
    Boolean(stage.isDynamicMath)
  );
}

export function getStageQuestionCount(stage: Stage): number {
  return isDynamicStage(stage) ? DEFAULT_DYNAMIC_COUNT : stage.questions.length;
}

/**
 * Resolve stage questions lazily so grade math generator modules are code-split
 * and loaded only when a dynamic stage is actually played.
 */
export async function resolveStageQuestionsAsync(
  stage: Stage,
  count = DEFAULT_DYNAMIC_COUNT,
  options?: ResolveStageQuestionsOptions,
): Promise<Question[]> {
  try {
    const shouldInterleave =
      Boolean(options?.enableInterleaving) &&
      count >= 3 &&
      canInterleaveStage(stage, options?.prevStars ?? 0, options?.isReviewMode ?? false);

    if (shouldInterleave && stage.generatorId) {
      const prevGeneratorIds = getPreviousUnitGeneratorIds(stage, 3);
      const reviewCount = Math.min(2, Math.floor(count / 3));
      const currentCount = count - reviewCount;
      const currentUnitLabel = formatGeneratorSourceLabel(stage.generatorId);

      const currentRaw = await generateByGeneratorId(
        stage.generatorId,
        currentCount,
      );

      if (currentRaw.length > 0 && prevGeneratorIds.length > 0) {
        const currentTagged: Question[] = currentRaw.map((q) => ({
          ...q,
          interleavingOriginTag: 'CURRENT_UNIT',
          interleavingSourceUnit: currentUnitLabel,
        }));

        const reviewTagged: Question[] = [];
        const usedIds = new Set(currentTagged.map((q) => q.id));

        if (prevGeneratorIds.length >= reviewCount) {
          const pickedIds = prevGeneratorIds.slice(0, reviewCount);
          const batches = await Promise.all(
            pickedIds.map(async (prevId) => ({
              prevId,
              items: await generateByGeneratorId(prevId, 1),
            })),
          );
          for (const { prevId, items } of batches) {
            const label = formatGeneratorSourceLabel(prevId);
            for (const q of items) {
              const uniqueId = usedIds.has(q.id)
                ? `${q.id}-rev-${reviewTagged.length + 1}`
                : q.id;
              usedIds.add(uniqueId);
              reviewTagged.push({
                ...q,
                id: uniqueId,
                interleavingOriginTag: 'PREVIOUS_UNIT_REVIEW',
                interleavingSourceUnit: label,
              });
            }
          }
        } else {
          const prevId = prevGeneratorIds[0];
          const label = formatGeneratorSourceLabel(prevId);
          const items = await generateByGeneratorId(prevId, reviewCount);
          for (const q of items) {
            const uniqueId = usedIds.has(q.id)
              ? `${q.id}-rev-${reviewTagged.length + 1}`
              : q.id;
            usedIds.add(uniqueId);
            reviewTagged.push({
              ...q,
              id: uniqueId,
              interleavingOriginTag: 'PREVIOUS_UNIT_REVIEW',
              interleavingSourceUnit: label,
            });
          }
        }

        return interleaveQuestions(currentTagged, reviewTagged);
      }
    }

    if (stage.generatorId) {
      const generated = await generateByGeneratorId(stage.generatorId, count);
      if (generated.length > 0) {
        return generated;
      }
    }
    if (stage.isDynamicMath) {
      const { generateMathQuestions } = await import('../mathGenerator.ts');
      return generateMathQuestions(stage.difficulty, count);
    }
  } catch {
    return stage.questions;
  }
  return stage.questions;
}

/**
 * Load all registered dynamic math generators across every grade module (used by tests).
 */
export async function loadAllGenerators(): Promise<
  Record<string, QuestionGenerator>
> {
  const groups = Object.keys(GROUP_LOADERS) as GeneratorGroup[];
  const maps = await Promise.all(groups.map((group) => loadGeneratorGroup(group)));
  return Object.assign({}, ...maps);
}
