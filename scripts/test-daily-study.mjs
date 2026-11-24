import assert from 'node:assert/strict';
import {
  getLocalDateKey,
  getTodayStudyStats,
  recordDailyStudyActivity,
} from '../src/utils/dailyStudy.ts';
import {
  DEFAULT_PROGRESS,
  parseImportedProgressJson,
} from '../src/utils/progressImport.ts';

const day1 = new Date(2026, 10, 20, 14, 0, 0);
const day2 = new Date(2026, 10, 21, 16, 0, 0);
const day4 = new Date(2026, 10, 23, 10, 0, 0);

assert.equal(getLocalDateKey(day1), '2026-11-20');
assert.equal(DEFAULT_PROGRESS.selectedView, 'curriculum');

// Day 1: 1 lesson + 6 questions
let progress = { ...DEFAULT_PROGRESS };
Object.assign(
  progress,
  recordDailyStudyActivity(progress, { lessonCompleted: true }, day1),
);
Object.assign(
  progress,
  recordDailyStudyActivity(progress, { answered: 6 }, day1),
);

let stats = getTodayStudyStats(progress, day1);
assert.equal(stats.answeredToday, 6);
assert.equal(stats.lessonsToday, 1);
assert.equal(stats.streakDays, 1);
assert.equal(stats.goalReached, false);

// Day 2 (consecutive): 5 more questions -> streak becomes 2, yesterday's answeredCount resets
const statsBeforeDay2 = getTodayStudyStats(progress, day2);
assert.equal(statsBeforeDay2.answeredToday, 0);
assert.equal(statsBeforeDay2.streakDays, 1);

Object.assign(
  progress,
  recordDailyStudyActivity(
    progress,
    { answered: 10, reviewCompleted: true },
    day2,
  ),
);
stats = getTodayStudyStats(progress, day2);
assert.equal(stats.answeredToday, 10);
assert.equal(stats.reviewsToday, 1);
assert.equal(stats.streakDays, 2);
assert.equal(stats.goalReached, true);

// Day 4 (gap of 1 day): streak resets to 0 before study, then 1 after study
const statsBeforeDay4 = getTodayStudyStats(progress, day4);
assert.equal(statsBeforeDay4.streakDays, 0);

Object.assign(
  progress,
  recordDailyStudyActivity(progress, { answered: 5 }, day4),
);
stats = getTodayStudyStats(progress, day4);
assert.equal(stats.streakDays, 1);
assert.equal(stats.answeredToday, 5);

// JSON import round-trip with daily fields
const imported = parseImportedProgressJson(JSON.stringify(progress));
assert.equal(imported.ok, true);
if (imported.ok) {
  assert.equal(imported.progress.studyStreakDays, 1);
  assert.equal(imported.progress.lastStudyDate, '2026-11-23');
  assert.equal(imported.progress.dailyActivity?.answeredCount, 5);
}

console.log('每日學習任務與連續打卡測試通過（日期切換 / 連續天數 / 斷簽重置 / JSON 還原）');
