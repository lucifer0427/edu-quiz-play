import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';
import type {
  FsrsCardState,
  FsrsCardStatus,
  PlayerProgress,
} from '../types/quiz.ts';

export type DerivedFsrsRating = 'again' | 'hard' | 'good' | 'easy';

export interface MasteryStageInfo {
  level: 'new' | 'growing' | 'mastered';
  emoji: string;
  label: string;
  badgeClass: string;
}

const MS_PER_DAY = 86_400_000;

const scheduler = fsrs({
  enable_short_term: false,
  maximum_interval: 365,
});

const STATUS_TO_STATE: Record<FsrsCardStatus, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const STATE_TO_STATUS: Record<State, FsrsCardStatus> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const RATING_TO_GRADE: Record<DerivedFsrsRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function parseValidDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toTsFsrsCard(state: FsrsCardState, fallbackNow: Date): Card {
  const empty = createEmptyCard(fallbackNow);
  return {
    ...empty,
    due: parseValidDate(state.dueAt, fallbackNow),
    stability: Number.isFinite(state.stability) ? state.stability : 0,
    difficulty: Number.isFinite(state.difficulty) ? state.difficulty : 0,
    scheduled_days: Number.isFinite(state.scheduledDays)
      ? state.scheduledDays
      : 0,
    learning_steps: Number.isFinite(state.learningSteps)
      ? (state.learningSteps as number)
      : 0,
    reps: Number.isFinite(state.reps) ? state.reps : 0,
    lapses: Number.isFinite(state.lapses) ? state.lapses : 0,
    state: STATUS_TO_STATE[state.state] ?? State.New,
    last_review: state.lastReviewedAt
      ? parseValidDate(state.lastReviewedAt, fallbackNow)
      : undefined,
  };
}

export function isValidFsrsCardState(value: unknown): value is FsrsCardState {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<FsrsCardState>;
  return (
    typeof card.questionId === 'string' &&
    card.questionId.trim() !== '' &&
    typeof card.stability === 'number' &&
    Number.isFinite(card.stability) &&
    typeof card.difficulty === 'number' &&
    Number.isFinite(card.difficulty) &&
    typeof card.dueAt === 'string' &&
    !Number.isNaN(new Date(card.dueAt).getTime()) &&
    typeof card.reps === 'number' &&
    Number.isInteger(card.reps) &&
    card.reps >= 0 &&
    typeof card.lapses === 'number' &&
    Number.isInteger(card.lapses) &&
    card.lapses >= 0 &&
    (card.state === 'new' ||
      card.state === 'learning' ||
      card.state === 'review' ||
      card.state === 'relearning')
  );
}

export function createInitialFsrsCard(
  questionId: string,
  now: Date = new Date(),
): FsrsCardState {
  const empty = createEmptyCard(now);
  return {
    questionId,
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: 0,
    scheduledDays: empty.scheduled_days,
    learningSteps: empty.learning_steps,
    dueAt: now.toISOString(),
    reps: empty.reps,
    lapses: empty.lapses,
    state: 'new',
  };
}

export function deriveFsrsRating(input: {
  wasCorrect: boolean;
  usedHint: boolean;
  responseTimeMs: number;
  prevReps?: number;
}): DerivedFsrsRating {
  if (!input.wasCorrect) return 'again';
  if (input.usedHint || input.responseTimeMs > 15_000) return 'hard';
  if ((input.prevReps ?? 0) >= 2 && input.responseTimeMs <= 8_000) {
    return 'easy';
  }
  return 'good';
}

export function reviewFsrsCard(
  existing: FsrsCardState | undefined,
  questionId: string,
  outcome: {
    wasCorrect: boolean;
    usedHint: boolean;
    responseTimeMs: number;
  },
  now: Date = new Date(),
): FsrsCardState {
  const base = existing ?? createInitialFsrsCard(questionId, now);
  const prevCard = toTsFsrsCard(base, now);
  const ratingKey = deriveFsrsRating({
    ...outcome,
    prevReps: base.reps,
  });
  const grade = RATING_TO_GRADE[ratingKey];
  const { card: nextCard } = scheduler.next(prevCard, now, grade);

  const elapsedDays = base.lastReviewedAt
    ? Math.max(
        0,
        (now.getTime() - parseValidDate(base.lastReviewedAt, now).getTime()) /
          MS_PER_DAY,
      )
    : 0;

  if (ratingKey === 'again') {
    // 答錯後應立即列入今日到期錯題佇列，避免延後數天才出現
    return {
      questionId,
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      elapsedDays,
      scheduledDays: 0,
      learningSteps: nextCard.learning_steps,
      dueAt: now.toISOString(),
      lastReviewedAt: now.toISOString(),
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: base.state === 'review' ? 'relearning' : 'learning',
    };
  }

  return {
    questionId,
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    elapsedDays,
    scheduledDays: nextCard.scheduled_days,
    learningSteps: nextCard.learning_steps,
    dueAt: nextCard.due.toISOString(),
    lastReviewedAt: now.toISOString(),
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    state: STATE_TO_STATUS[nextCard.state] ?? 'review',
  };
}

export function isCardDue(
  card: FsrsCardState | undefined,
  now: Date = new Date(),
): boolean {
  if (!card) return true;
  const dueTime = new Date(card.dueAt).getTime();
  if (Number.isNaN(dueTime)) return true;
  return dueTime <= now.getTime();
}

export function isCardMastered(card: FsrsCardState | undefined): boolean {
  return Boolean(
    card && card.stability >= 21 && card.reps >= 2 && card.state === 'review',
  );
}

export function getMasteryStage(
  card: FsrsCardState | undefined,
): MasteryStageInfo {
  if (isCardMastered(card) || (card && card.stability >= 21)) {
    return {
      level: 'mastered',
      emoji: '🌳',
      label: '長期記憶大師',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  }
  if (card && card.stability >= 3) {
    return {
      level: 'growing',
      emoji: '🌿',
      label: '穩固中',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    };
  }
  return {
    level: 'new',
    emoji: '🌱',
    label: '剛學會',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  };
}

export function countDueWrongQuestions(
  progress: Pick<PlayerProgress, 'wrongQuestionIds' | 'fsrsCards'>,
  now: Date = new Date(),
): number {
  let dueCount = 0;
  for (const id of progress.wrongQuestionIds) {
    const card = progress.fsrsCards?.[id];
    if (isCardDue(card, now)) {
      dueCount++;
    }
  }
  return dueCount;
}

export function migrateWrongIdsToFsrs(
  wrongQuestionIds: string[],
  existingCards?: Record<string, FsrsCardState>,
  now: Date = new Date(),
): Record<string, FsrsCardState> {
  const migrated: Record<string, FsrsCardState> = {};

  if (existingCards && typeof existingCards === 'object') {
    for (const [id, rawCard] of Object.entries(existingCards)) {
      if (isValidFsrsCardState(rawCard)) {
        migrated[id] = {
          ...rawCard,
          elapsedDays:
            typeof rawCard.elapsedDays === 'number' &&
            Number.isFinite(rawCard.elapsedDays)
              ? rawCard.elapsedDays
              : 0,
          scheduledDays:
            typeof rawCard.scheduledDays === 'number' &&
            Number.isFinite(rawCard.scheduledDays)
              ? rawCard.scheduledDays
              : 0,
        };
      }
    }
  }

  for (const id of wrongQuestionIds) {
    if (typeof id === 'string' && id.trim() !== '' && !migrated[id]) {
      migrated[id] = createInitialFsrsCard(id, now);
    }
  }

  return migrated;
}
