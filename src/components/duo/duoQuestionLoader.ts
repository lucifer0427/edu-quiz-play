import { getCurriculumCatalog, loadQuizPack } from '../../data/curriculum/loader';
import type { Grade, Question, Stage, SubjectId } from '../../types/quiz';
import { resolveStageQuestionsAsync } from '../../utils/generators/registry';
import type { DuoSubject } from './duoTypes';

export function shufflePick<T>(items: T[], count: number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function buildFallbackMathQuestions(grade: Grade, count = 12): Question[] {
  const maxBase = grade <= 2 ? 9 : grade <= 4 ? 25 : 50;
  const list: Question[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * maxBase) + 2;
    const b = Math.floor(Math.random() * (grade <= 2 ? 9 : 12)) + 2;
    const useMul = grade >= 2 && i % 2 === 0;
    const ans = useMul ? a * b : a + b;
    const prompt = useMul ? `${a} × ${b} = ?` : `${a} + ${b} = ?`;
    const wrong1 = ans + 2;
    const wrong2 = Math.max(1, ans - 3);
    const wrong3 = ans + 10;
    const opts = [String(ans), String(wrong1), String(wrong2), String(wrong3)];
    for (let j = opts.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [opts[j], opts[k]] = [opts[k], opts[j]];
    }
    list.push({
      id: `duo-fallback-${grade}-${i}-${Date.now()}`,
      prompt,
      options: opts as [string, string, string, string],
      answerIndex: opts.indexOf(String(ans)),
      explanation: `正確答案是 ${ans}。`,
    });
  }
  return list;
}

export function resolveSubjectsForGrade(
  grade: Grade,
  subject: DuoSubject,
): Exclude<SubjectId, 'custom'>[] {
  if (subject === 'mixed') {
    return grade <= 2
      ? ['math', 'mandarin', 'english', 'life']
      : ['math', 'mandarin', 'english', 'science', 'social'];
  }
  if ((subject === 'science' || subject === 'social') && grade <= 2) {
    return ['life', 'math'];
  }
  return [subject, 'math'];
}

async function sampleQuestionsFromStage(stage: Stage): Promise<Question[]> {
  try {
    const resolved = await resolveStageQuestionsAsync(stage, 4);
    if (resolved.length > 0) return resolved;
  } catch {
    // Fallback to static questions on stage
  }
  return stage.questions;
}

export async function loadQuestionsForGrade(
  grade: Grade,
  subject: DuoSubject,
): Promise<Question[]> {
  const { academicYear } = getCurriculumCatalog();
  const candidates = resolveSubjectsForGrade(grade, subject);
  const collected: Question[] = [];

  for (const subj of candidates) {
    const [pack1, pack2] = await Promise.all([
      loadQuizPack(academicYear, 1, grade, subj),
      loadQuizPack(academicYear, 2, grade, subj),
    ]);
    const stages = [...(pack1?.stages ?? []), ...(pack2?.stages ?? [])];
    if (stages.length === 0) continue;

    const pickedStages = shufflePick(stages, subject === 'mixed' ? 2 : 4);
    const stageBatches = await Promise.all(
      pickedStages.map((s) => sampleQuestionsFromStage(s)),
    );
    for (const batch of stageBatches) {
      collected.push(...batch);
    }
    if (subject !== 'mixed' && collected.length >= 12) {
      return shufflePick(collected, 12);
    }
  }

  if (collected.length >= 5) {
    return shufflePick(collected, 12);
  }
  return buildFallbackMathQuestions(grade, 12);
}
