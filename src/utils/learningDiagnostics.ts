import type { FsrsCardState, Stage } from '../types/quiz.ts';
import { getMasteryStage, isCardDue } from './fsrs.ts';

export type DiagnosticTagStatus = 'mastered' | 'growing' | 'weak' | 'unseen';

export interface TagDiagnosticSummary {
  tag: string;
  totalQuestions: number;
  wrongCount: number;
  dueCount: number;
  masteredCount: number;
  growingCount: number;
  status: DiagnosticTagStatus;
}

export interface UnitDiagnosticSummary {
  stageId: string;
  title: string;
  stars: number;
  questionCount: number;
  wrongCount: number;
  dueCount: number;
  masteredCount: number;
  needsAttention: boolean;
}

export interface SubjectDiagnosticReport {
  totalQuestions: number;
  masteredCount: number;
  growingCount: number;
  dueCount: number;
  wrongCount: number;
  weakUnits: UnitDiagnosticSummary[];
  tagSummaries: TagDiagnosticSummary[];
}

const CURRICULUM_CODE_RE = /^[A-Za-z]-\d+-\d+$|^[a-z]-[IVX]+-\d+$/i;

export function isReadableKnowledgeTag(tag: string): boolean {
  const trimmed = tag.trim();
  if (!trimmed) return false;
  return !CURRICULUM_CODE_RE.test(trimmed);
}

export function buildSubjectDiagnostics(
  stages: Stage[],
  fsrsCards: Record<string, FsrsCardState> | undefined,
  stageStars: Record<string, number>,
  wrongQuestionIds: string[],
  now: Date = new Date(),
): SubjectDiagnosticReport {
  const wrongSet = new Set(wrongQuestionIds);
  let totalQuestions = 0;
  let masteredCount = 0;
  let growingCount = 0;
  let dueCount = 0;
  let wrongCount = 0;

  const tagMap = new Map<
    string,
    {
      totalQuestions: number;
      wrongCount: number;
      dueCount: number;
      masteredCount: number;
      growingCount: number;
    }
  >();

  const unitSummaries: UnitDiagnosticSummary[] = [];

  for (const stage of stages) {
    const stars = stageStars[stage.id] ?? 0;
    let unitWrong = 0;
    let unitDue = 0;
    let unitMastered = 0;

    for (const q of stage.questions) {
      totalQuestions += 1;
      const card = fsrsCards?.[q.id];
      const isWrong = wrongSet.has(q.id);
      const due = card ? isCardDue(card, now) : isWrong;
      const mastery = card ? getMasteryStage(card) : null;
      const isMastered = mastery?.level === 'mastered';
      const isGrowing = mastery?.level === 'growing';

      if (isWrong) {
        wrongCount += 1;
        unitWrong += 1;
      }
      if (due) {
        dueCount += 1;
        unitDue += 1;
      }
      if (isMastered) {
        masteredCount += 1;
        unitMastered += 1;
      } else if (isGrowing) {
        growingCount += 1;
      }

      const rawTags = Array.isArray(q.tags) ? q.tags : [];
      const readableTags = rawTags.filter(isReadableKnowledgeTag);
      const effectiveTags = readableTags.length > 0 ? readableTags : rawTags;

      for (const rawTag of effectiveTags) {
        const tag = rawTag.trim();
        if (!tag) continue;
        const entry = tagMap.get(tag) ?? {
          totalQuestions: 0,
          wrongCount: 0,
          dueCount: 0,
          masteredCount: 0,
          growingCount: 0,
        };
        entry.totalQuestions += 1;
        if (isWrong) entry.wrongCount += 1;
        if (due) entry.dueCount += 1;
        if (isMastered) entry.masteredCount += 1;
        else if (isGrowing) entry.growingCount += 1;
        tagMap.set(tag, entry);
      }
    }

    const needsAttention = unitWrong > 0 || unitDue > 0 || (stars > 0 && stars < 2);
    unitSummaries.push({
      stageId: stage.id,
      title: stage.title,
      stars,
      questionCount: stage.questions.length,
      wrongCount: unitWrong,
      dueCount: unitDue,
      masteredCount: unitMastered,
      needsAttention,
    });
  }

  const tagSummaries: TagDiagnosticSummary[] = Array.from(tagMap.entries())
    .map(([tag, stats]) => {
      let status: DiagnosticTagStatus = 'unseen';
      if (stats.dueCount > 0 || stats.wrongCount > 0) {
        status = 'weak';
      } else if (
        stats.masteredCount > 0 &&
        stats.masteredCount >= stats.totalQuestions * 0.5
      ) {
        status = 'mastered';
      } else if (stats.masteredCount > 0 || stats.growingCount > 0) {
        status = 'growing';
      }
      return {
        tag,
        ...stats,
        status,
      };
    })
    .sort((a, b) => {
      const rank: Record<DiagnosticTagStatus, number> = {
        weak: 0,
        growing: 1,
        mastered: 2,
        unseen: 3,
      };
      if (rank[a.status] !== rank[b.status]) {
        return rank[a.status] - rank[b.status];
      }
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      return b.totalQuestions - a.totalQuestions;
    });

  const weakUnits = unitSummaries
    .filter((u) => u.needsAttention)
    .sort((a, b) => b.wrongCount + b.dueCount - (a.wrongCount + a.dueCount));

  return {
    totalQuestions,
    masteredCount,
    growingCount,
    dueCount,
    wrongCount,
    weakUnits,
    tagSummaries,
  };
}
