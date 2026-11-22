import assert from 'node:assert/strict';
import {
  countDueWrongQuestions,
  createInitialFsrsCard,
  deriveFsrsRating,
  getMasteryStage,
  isCardDue,
  isCardMastered,
  migrateWrongIdsToFsrs,
  reviewFsrsCard,
} from '../src/utils/fsrs.ts';

const t0 = new Date('2026-11-22T04:00:00.000Z');

// 1. 舊版錯題遷移檢查（v2 -> v3 不遺失錯題且過濾毀損資料）
const existingValid = reviewFsrsCard(
  undefined,
  'q-existing',
  { wasCorrect: true, usedHint: false, responseTimeMs: 4000 },
  t0,
);
const migrated = migrateWrongIdsToFsrs(
  ['q-legacy-1', 'q-legacy-2', 'q-existing', 'q-corrupt'],
  {
    'q-existing': existingValid,
    'q-corrupt': {
      questionId: 'q-corrupt',
      stability: Number.NaN,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 0,
      dueAt: 'invalid-date',
      reps: 1,
      lapses: 0,
      state: 'review',
    },
  },
  t0,
);

assert.equal(Object.keys(migrated).length, 4);
assert.equal(migrated['q-legacy-1'].state, 'new');
assert.equal(isCardDue(migrated['q-legacy-1'], t0), true);
assert.equal(isCardDue(migrated['q-legacy-2'], t0), true);
assert.equal(isCardDue(migrated['q-corrupt'], t0), true);
assert.equal(migrated['q-existing'].dueAt, existingValid.dueAt);
assert.equal(isCardDue(migrated['q-existing'], t0), false);

// 2. 四級 FSRS Rating 自動推導檢查
assert.equal(
  deriveFsrsRating({
    wasCorrect: false,
    usedHint: false,
    responseTimeMs: 1200,
    prevReps: 4,
  }),
  'again',
);
assert.equal(
  deriveFsrsRating({
    wasCorrect: true,
    usedHint: true,
    responseTimeMs: 3000,
    prevReps: 3,
  }),
  'hard',
);
assert.equal(
  deriveFsrsRating({
    wasCorrect: true,
    usedHint: false,
    responseTimeMs: 15001,
    prevReps: 3,
  }),
  'hard',
);
assert.equal(
  deriveFsrsRating({
    wasCorrect: true,
    usedHint: false,
    responseTimeMs: 15000,
    prevReps: 1,
  }),
  'good',
);
assert.equal(
  deriveFsrsRating({
    wasCorrect: true,
    usedHint: false,
    responseTimeMs: 8000,
    prevReps: 2,
  }),
  'easy',
);

// 3. 完整複習循環：答錯立即到期 -> 答對推遲 -> 累積達長期掌握 -> 再答錯累計 lapses
let card = reviewFsrsCard(
  createInitialFsrsCard('q-cycle', t0),
  'q-cycle',
  { wasCorrect: false, usedHint: false, responseTimeMs: 5000 },
  t0,
);
assert.equal(card.state, 'learning');
assert.equal(card.scheduledDays, 0);
assert.equal(isCardDue(card, t0), true);
assert.equal(getMasteryStage(card).level, 'new');

const tPlus5m = new Date(t0.getTime() + 5 * 60_000);
card = reviewFsrsCard(
  card,
  'q-cycle',
  { wasCorrect: true, usedHint: false, responseTimeMs: 5000 },
  tPlus5m,
);
assert.equal(card.state, 'review');
assert.ok(card.scheduledDays >= 1);
assert.ok(new Date(card.dueAt).getTime() > tPlus5m.getTime());
assert.equal(isCardDue(card, tPlus5m), false);

let reviewClock = new Date(card.dueAt);
for (let step = 0; step < 5 && !isCardMastered(card); step++) {
  card = reviewFsrsCard(
    card,
    'q-cycle',
    { wasCorrect: true, usedHint: false, responseTimeMs: 4500 },
    reviewClock,
  );
  reviewClock = new Date(card.dueAt);
}
assert.ok(card.stability >= 21, `預期穩定度 >= 21，實際為 ${card.stability}`);
assert.equal(isCardMastered(card), true);
assert.equal(getMasteryStage(card).level, 'mastered');
assert.equal(getMasteryStage(card).emoji, '🌳');

const prevLapses = card.lapses;
const lapsedCard = reviewFsrsCard(
  card,
  'q-cycle',
  { wasCorrect: false, usedHint: false, responseTimeMs: 9000 },
  reviewClock,
);
assert.equal(lapsedCard.lapses, prevLapses + 1);
assert.equal(lapsedCard.state, 'relearning');
assert.equal(lapsedCard.scheduledDays, 0);
assert.equal(isCardDue(lapsedCard, reviewClock), true);

// 4. 成長隱喻與到期計數邊界檢查
assert.equal(getMasteryStage(undefined).emoji, '🌱');
assert.equal(
  getMasteryStage({
    ...createInitialFsrsCard('q-mid', t0),
    stability: 4.2,
    state: 'review',
    reps: 2,
  }).emoji,
  '🌿',
);
assert.equal(
  isCardMastered({
    ...createInitialFsrsCard('q-relearn', t0),
    stability: 25,
    state: 'relearning',
    reps: 4,
  }),
  false,
);

const dueTotal = countDueWrongQuestions(
  {
    wrongQuestionIds: ['q-legacy-1', 'q-existing', 'q-missing-card'],
    fsrsCards: migrated,
  },
  t0,
);
assert.equal(dueTotal, 2);

console.log('FSRS 引擎單元檢查通過（遷移 / Rating / 排程推進 / lapses / 熟練階段全數驗證）');
