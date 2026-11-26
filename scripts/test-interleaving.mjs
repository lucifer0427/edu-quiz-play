import assert from 'node:assert/strict';
import {
  BLOCKED_INTERLEAVING_SUBJECTS,
  canInterleaveStage,
  getPreviousUnitGeneratorIds,
  resolveStageQuestionsAsync,
} from '../src/utils/generators/registry.ts';
import {
  buildHintLevels,
  buildWorkedExampleFromQuestion,
} from '../src/utils/workedExample.ts';

const baseStaticQuestion = {
  id: 'sample-q1',
  prompt: '下列哪一個數是 6 的倍數？',
  options: ['22', '24', '25', '26'],
  answerIndex: 1,
  explanation: '24 ÷ 6 = 4，可以整除，所以 24 是 6 的倍數！',
  hint: '找找看哪一個數除以 6 沒有餘數。',
};

function makeMathStage(overrides = {}) {
  return {
    id: '115-s1-g5-math-u8',
    subjectId: 'math',
    title: '面積',
    description: '測試關卡',
    difficulty: 'medium',
    monsterId: 'mathCube',
    monsterName: '算數方塊',
    monsterHp: 120,
    isDynamicMath: true,
    generatorId: 'g5s1-math-u8',
    questions: [baseStaticQuestion],
    curriculum: {
      academicYear: 115,
      semester: 1,
      grade: 5,
      unitNo: 8,
    },
    ...overrides,
  };
}

// 1. 語文科認知邊界護欄檢查（嚴禁跨單元混排）
for (const lang of ['mandarin', 'english', 'minnan', 'hakka']) {
  assert.equal(BLOCKED_INTERLEAVING_SUBJECTS.has(lang), true);
  assert.equal(
    canInterleaveStage(
      makeMathStage({ subjectId: lang }),
      3,
      true,
    ),
    false,
  );
}

// 2. 未熟練（< 2 星）且非複習模式時不啟用交錯
const g5U8 = makeMathStage();
assert.equal(canInterleaveStage(g5U8, 0, false), false);
assert.equal(canInterleaveStage(g5U8, 1, false), false);
const nonInterleaved = await resolveStageQuestionsAsync(g5U8, 6, {
  enableInterleaving: true,
  prevStars: 1,
  isReviewMode: false,
});
assert.equal(nonInterleaved.length, 6);
assert.equal(
  nonInterleaved.some((q) => q.interleavingOriginTag === 'PREVIOUS_UNIT_REVIEW'),
  false,
);

// 3. 已達 2 星時，數學科產出「4 新 + 2 舊」交錯題組且第 1 題必為當前單元
assert.equal(canInterleaveStage(g5U8, 2, false), true);
const interleaved = await resolveStageQuestionsAsync(g5U8, 6, {
  enableInterleaving: true,
  prevStars: 2,
  isReviewMode: false,
});
assert.equal(interleaved.length, 6);
assert.equal(interleaved[0].interleavingOriginTag, 'CURRENT_UNIT');
const currentItems = interleaved.filter(
  (q) => q.interleavingOriginTag === 'CURRENT_UNIT',
);
const reviewItems = interleaved.filter(
  (q) => q.interleavingOriginTag === 'PREVIOUS_UNIT_REVIEW',
);
assert.equal(currentItems.length, 4);
assert.equal(reviewItems.length, 2);
assert.equal(new Set(interleaved.map((q) => q.id)).size, 6);
for (const r of reviewItems) {
  assert.ok(r.interleavingSourceUnit && r.interleavingSourceUnit.includes('五上'));
}

// 4. 下學期第 1 單元跨學期回溯至上學期末端單元
const g5S2U1 = makeMathStage({
  id: '115-s2-g5-math-u1',
  generatorId: 'g5s2-math-u1',
  curriculum: { academicYear: 115, semester: 2, grade: 5, unitNo: 1 },
});
assert.deepEqual(getPreviousUnitGeneratorIds(g5S2U1, 3), [
  'g5s1-math-u10',
  'g5s1-math-u9',
  'g5s1-math-u8',
]);
const s2Interleaved = await resolveStageQuestionsAsync(g5S2U1, 6, {
  enableInterleaving: true,
  prevStars: 0,
  isReviewMode: true,
});
assert.equal(
  s2Interleaved.filter((q) => q.interleavingOriginTag === 'CURRENT_UNIT').length,
  4,
);
assert.equal(
  s2Interleaved.filter((q) => q.interleavingOriginTag === 'PREVIOUS_UNIT_REVIEW')
    .length,
  2,
);

// 5. 全學年首單元無前置單元時不混排
const g5S1U1 = makeMathStage({
  id: '115-s1-g5-math-u1',
  generatorId: 'g5s1-math-u1',
});
assert.deepEqual(getPreviousUnitGeneratorIds(g5S1U1), []);
assert.equal(canInterleaveStage(g5S1U1, 3, true), false);

// 6. WorkedExampleSplit 資料建構與分齡規則
const lowGradeWorked = buildWorkedExampleFromQuestion(baseStaticQuestion, 2);
assert.equal(lowGradeWorked.keepStepCardVisible, true);
assert.equal(lowGradeWorked.selfExplanationPrompt, undefined);
assert.ok(lowGradeWorked.steps.length >= 2 && lowGradeWorked.steps.length <= 4);
assert.ok(lowGradeWorked.commonErrorContrast.length > 0);

const highGradeWorked = buildWorkedExampleFromQuestion(baseStaticQuestion, 5);
assert.equal(highGradeWorked.keepStepCardVisible, false);
assert.ok(
  highGradeWorked.selfExplanationPrompt &&
    highGradeWorked.selfExplanationPrompt.length > 0,
);

// 7. 三層漸進提示與正解遮蔽檢查
const [l1, l2, l3] = buildHintLevels(baseStaticQuestion);
assert.ok(l1.length > 0 && l2.length > 0 && l3.length > 0);
assert.equal(l3.includes('24'), false, `Level 3 不應直接洩露答案 24：${l3}`);

console.log(
  '交錯練習與鷹架單元檢查通過（分科護欄 / 4新+2舊比例 / 跨學期回溯 / 示範卡 / 三層提示遮蔽）',
);
