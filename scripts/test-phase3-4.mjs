import assert from 'node:assert/strict';
import { isCardDue } from '../src/utils/fsrs.ts';
import { parseImportedProgressJson } from '../src/utils/progressImport.ts';
import { resolveSpeechRate } from '../src/utils/speech.ts';
import { pickEliminatedOptionIndices } from '../src/utils/workedExample.ts';

// 1. 低年級 3 選 1 與中高年級 50/50 選項排除檢查（絕不排除正解）
for (let ansIdx = 0; ansIdx < 4; ansIdx++) {
  const q = {
    id: `q-opt-check-${ansIdx}`,
    prompt: '測試題目',
    options: ['A', 'B', 'C', 'D'],
    answerIndex: ansIdx,
    explanation: '解析',
  };

  const oneRemoved = pickEliminatedOptionIndices(q, 1);
  assert.equal(oneRemoved.length, 1);
  assert.equal(oneRemoved.includes(ansIdx), false);

  const twoRemoved = pickEliminatedOptionIndices(q, 2);
  assert.equal(twoRemoved.length, 2);
  assert.equal(new Set(twoRemoved).size, 2);
  assert.equal(twoRemoved.includes(ansIdx), false);
}

// 2. 分齡語速與慢速切換檢查
assert.equal(resolveSpeechRate('zh-TW', 1, false), 0.85);
assert.equal(resolveSpeechRate('zh-TW', 2, false), 0.85);
assert.equal(resolveSpeechRate('en-US', 1, false), 0.82);
assert.equal(resolveSpeechRate('zh-TW', 5, false), 0.95);
assert.equal(resolveSpeechRate('en-US', 5, false), 0.88);
assert.equal(resolveSpeechRate('zh-TW', 2, true), 0.78);
assert.equal(resolveSpeechRate('zh-TW', 6, true), 0.78);
assert.equal(resolveSpeechRate('en-US', 6, true), 0.75);

// 3. 學習紀錄 JSON 匯入還原與 v2->v3 遷移檢查
const v2BackupPayload = JSON.stringify({
  exportedAt: '2026-11-22T00:00:00.000Z',
  app: '知識大冒險 EduQuiz Play',
  progress: {
    schemaVersion: 2,
    nickname: '小晴',
    selectedAvatarId: 'hero-cat',
    unlockedAvatarIds: ['hero-knight', 'hero-cat'],
    xp: 420,
    coins: 180,
    stageStars: { '115-s1-g2-math-u1': 3 },
    wrongQuestionIds: ['w-1', 'w-2'],
    totalCorrect: 20,
    totalAnswered: 24,
    soundEnabled: true,
    customStages: [],
  },
});

const importedWrapped = parseImportedProgressJson(v2BackupPayload);
assert.equal(importedWrapped.ok, true);
if (importedWrapped.ok) {
  assert.equal(importedWrapped.progress.schemaVersion, 3);
  assert.equal(importedWrapped.progress.nickname, '小晴');
  assert.equal(importedWrapped.progress.xp, 420);
  assert.equal(importedWrapped.progress.speechRateMode, 'normal');
  assert.ok(importedWrapped.progress.fsrsCards?.['w-1']);
  assert.ok(importedWrapped.progress.fsrsCards?.['w-2']);
  assert.equal(isCardDue(importedWrapped.progress.fsrsCards?.['w-1']), true);
}

const v3DirectPayload = JSON.stringify({
  schemaVersion: 3,
  nickname: '阿哲',
  xp: 90,
  coins: 55,
  focusMode: true,
  speechRateMode: 'slow',
  completedLessonIds: ['lesson-g5-u1', 'lesson-g5-u1'],
  wrongQuestionIds: [],
});
const importedDirect = parseImportedProgressJson(v3DirectPayload);
assert.equal(importedDirect.ok, true);
if (importedDirect.ok) {
  assert.equal(importedDirect.progress.focusMode, true);
  assert.equal(importedDirect.progress.speechRateMode, 'slow');
  assert.deepEqual(importedDirect.progress.completedLessonIds, [
    'lesson-g5-u1',
  ]);
}

assert.equal(parseImportedProgressJson('').ok, false);
assert.equal(parseImportedProgressJson('{bad-json').ok, false);
assert.equal(parseImportedProgressJson('[]').ok, false);
assert.equal(parseImportedProgressJson('{"foo": 123}').ok, false);

console.log(
  'Phase 3 & 4 單元檢查通過（3選1與50/50安全排除 / 分齡語速 / JSON匯入還原與v2遷移）',
);
