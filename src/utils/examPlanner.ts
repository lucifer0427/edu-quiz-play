import type {
  ExamPlan,
  PlayerProgress,
  QuizPack,
  Stage,
  SubjectId,
} from '../types/quiz.ts';
import { getLocalDateKey } from './dailyStudy.ts';

export type ExamSprintPhase =
  | 'foundation'
  | 'wrong-clear'
  | 'final-mock'
  | 'today'
  | 'expired';

export interface SubjectReadinessSummary {
  subjectId: SubjectId;
  unitCount: number;
  threeStarCount: number;
  attemptedCount: number;
  wrongInScopeCount: number;
  readinessPercent: number;
  weakStages: Stage[];
}

export interface ExamSprintSummary {
  title: string;
  examDate: string;
  daysLeft: number;
  phase: ExamSprintPhase;
  phaseLabel: string;
  recommendationText: string;
  overallReadinessPercent: number;
  totalWrongInScope: number;
  dailyTargetUnits: number;
  priorityTask: {
    subjectId: SubjectId;
    stage: Stage;
    reason: string;
  } | null;
  subjectReadiness: SubjectReadinessSummary[];
}

export function getDaysUntilExam(
  examDate: string,
  now: Date = new Date(),
): number {
  const todayKey = getLocalDateKey(now);
  const targetMs = new Date(`${examDate}T00:00:00`).getTime();
  const todayMs = new Date(`${todayKey}T00:00:00`).getTime();
  if (Number.isNaN(targetMs) || Number.isNaN(todayMs)) return 0;
  return Math.round((targetMs - todayMs) / 86_400_000);
}

export function selectPresetStages(
  stages: Stage[],
  preset: ExamPlan['preset'] = 'midterm',
  customIds?: string[],
): Stage[] {
  if (customIds && customIds.length > 0) {
    const idSet = new Set(customIds);
    const matched = stages.filter((s) => idSet.has(s.id));
    if (matched.length > 0) return matched;
  }
  const half = Math.ceil(stages.length / 2);
  if (preset === 'midterm') return stages.slice(0, half);
  if (preset === 'final') return stages.slice(half);
  return stages;
}

export function buildExamSprintSummary(
  examPlan: ExamPlan,
  packsBySubject: Partial<Record<SubjectId, QuizPack | null>>,
  progress: PlayerProgress,
  now: Date = new Date(),
): ExamSprintSummary {
  const daysLeft = getDaysUntilExam(examPlan.examDate, now);
  const wrongSet = new Set(progress.wrongQuestionIds);
  const snapshots = Object.values(progress.wrongQuestionSnapshots ?? {});

  let phase: ExamSprintPhase = 'foundation';
  let phaseLabel = '基礎補強期';
  if (daysLeft < 0) {
    phase = 'expired';
    phaseLabel = '已過期計畫';
  } else if (daysLeft === 0) {
    phase = 'today';
    phaseLabel = '今日上考場';
  } else if (daysLeft === 1) {
    phase = 'final-mock';
    phaseLabel = '考前最後衝刺';
  } else if (daysLeft <= 3) {
    phase = 'wrong-clear';
    phaseLabel = '錯題清零期';
  }

  const subjectReadiness: SubjectReadinessSummary[] = [];
  let totalUnits = 0;
  let totalWeakUnits = 0;
  let totalWrongInScope = 0;
  let priorityTask: ExamSprintSummary['priorityTask'] = null;

  for (const subjectId of examPlan.subjectIds) {
    const pack = packsBySubject[subjectId];
    if (!pack || pack.stages.length === 0) continue;

    const scopedStages = selectPresetStages(
      pack.stages,
      examPlan.preset ?? 'midterm',
      examPlan.stageIdsBySubject?.[subjectId],
    );
    if (scopedStages.length === 0) continue;

    let threeStarCount = 0;
    let attemptedCount = 0;
    let wrongInScopeCount = 0;
    let starPoints = 0;
    const weakStages: Stage[] = [];

    for (const stage of scopedStages) {
      const stars = progress.stageStars[stage.id] ?? 0;
      if (stars >= 3) threeStarCount += 1;
      if (stars > 0) attemptedCount += 1;
      starPoints += Math.min(3, stars);

      let stageWrong = 0;
      for (const q of stage.questions) {
        if (wrongSet.has(q.id)) stageWrong += 1;
      }
      for (const snap of snapshots) {
        if (
          wrongSet.has(snap.id) &&
          snap.subjectId === stage.subjectId &&
          snap.stageTitle === stage.title &&
          !stage.questions.some((q) => q.id === snap.id)
        ) {
          stageWrong += 1;
        }
      }
      wrongInScopeCount += stageWrong;

      if (stars < 3 || stageWrong > 0) {
        weakStages.push(stage);
        if (!priorityTask) {
          priorityTask = {
            subjectId,
            stage,
            reason:
              stageWrong > 0
                ? `有 ${stageWrong} 題錯題待補強`
                : stars === 0
                  ? '尚未挑戰過此單元'
                  : `目前 ${stars} 顆星，衝刺滿星`,
          };
        }
      }
    }

    const maxPoints = scopedStages.length * 3;
    const starRatio = maxPoints > 0 ? starPoints / maxPoints : 0;
    const wrongPenalty = Math.min(0.25, wrongInScopeCount * 0.04);
    const readinessPercent = Math.max(
      0,
      Math.min(100, Math.round((starRatio - wrongPenalty) * 100)),
    );

    totalUnits += scopedStages.length;
    totalWeakUnits += weakStages.length;
    totalWrongInScope += wrongInScopeCount;

    subjectReadiness.push({
      subjectId,
      unitCount: scopedStages.length,
      threeStarCount,
      attemptedCount,
      wrongInScopeCount,
      readinessPercent,
      weakStages,
    });
  }

  const overallReadinessPercent =
    subjectReadiness.length > 0
      ? Math.round(
          subjectReadiness.reduce((s, r) => s + r.readinessPercent, 0) /
            subjectReadiness.length,
        )
      : 0;

  const effectiveDays = Math.max(1, daysLeft);
  const dailyTargetUnits =
    totalWeakUnits > 0
      ? Math.max(1, Math.ceil(totalWeakUnits / effectiveDays))
      : Math.max(1, Math.ceil(totalUnits / effectiveDays));

  let recommendationText = '先瀏覽核心重點，再挑弱點單元練題！';
  if (phase === 'expired') {
    recommendationText = '這次段考日期已過，可以清除或設定下一次段考計畫。';
  } else if (phase === 'today') {
    recommendationText = '今天就是考試日！快速掃過錯題與口訣，保持自信上場！';
  } else if (phase === 'final-mock') {
    recommendationText =
      totalWrongInScope > 0
        ? `考前倒數 1 天：優先做真實模擬考，並清空剩餘 ${totalWrongInScope} 題範圍錯題！`
        : '考前倒數 1 天：做一份真實限時模擬考驗收手感！';
  } else if (phase === 'wrong-clear') {
    recommendationText =
      totalWrongInScope > 0
        ? `倒數 ${daysLeft} 天進入錯題清零期：今天把範圍內 ${totalWrongInScope} 題錯題練熟！`
        : `倒數 ${daysLeft} 天：範圍錯題已清空，建議做一份模擬考維持手感！`;
  } else if (priorityTask) {
    recommendationText = `建議每天複習 ${dailyTargetUnits} 個弱點單元（目前還有 ${totalWeakUnits} 個單元未滿 3 星）`;
  } else if (totalUnits > 0) {
    recommendationText = '太強了！範圍內單元都已 3 星通關，做份真實模擬考檢核吧！';
  }

  return {
    title: examPlan.title,
    examDate: examPlan.examDate,
    daysLeft,
    phase,
    phaseLabel,
    recommendationText,
    overallReadinessPercent,
    totalWrongInScope,
    dailyTargetUnits,
    priorityTask,
    subjectReadiness,
  };
}
