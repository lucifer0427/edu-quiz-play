import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LessonScript } from '../../types/lesson';
import type { Stage } from '../../types/quiz';
import {
  getTodayStudyStats,
  recordDailyStudyActivity,
} from '../../utils/dailyStudy';
import { buildSubjectDiagnostics } from '../../utils/learningDiagnostics';
import { DEFAULT_PROGRESS } from '../../utils/progressImport';
import { shuffleQuestionOptions } from '../../utils/questionUtils';
import { BattleArena } from '../BattleArena';
import { BattleSummary, type BattleResult } from '../BattleSummary';
import { DailyMissionCard } from '../DailyMissionCard';

vi.mock('canvas-confetti', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  cleanup();
});

const SAMPLE_STAGE: Stage = {
  id: 'test-stage-1',
  subjectId: 'math',
  title: '單元一：整數加法',
  description: '練習二位數加法',
  difficulty: 'easy',
  monsterId: 'slime',
  monsterName: '加法史萊姆',
  monsterHp: 40,
  questions: [
    {
      id: 'q1',
      prompt: '12 + 8 = ?',
      options: ['18', '20', '21', '22'],
      answerIndex: 1,
      explanation: '12 + 8 = 20。',
    },
    {
      id: 'q2',
      prompt: '15 + 5 = ?',
      options: ['19', '20', '21', '25'],
      answerIndex: 1,
      explanation: '15 + 5 = 20。',
    },
  ],
};

const SAMPLE_LESSON: LessonScript = {
  schemaVersion: '2026.1',
  lessonId: 'lesson-test-1',
  stageId: 'test-stage-1',
  subject: 'MATH',
  ageBand: 'AGE_9_12_UPPER',
  title: '整數加法微課程',
  scenes: [
    {
      sceneId: 's1',
      componentType: 'ANCHOR_SCENE',
      title: '進位概念',
      narrationText: '滿十要進位到十位。',
      cognitiveChunks: ['滿十進一'],
      factGroundingSourceId: 'test-source',
    },
  ],
};

describe('DailyMissionCard', () => {
  it('displays streak, daily goal progress, and allows changing daily goal', () => {
    const onUpdateDailyGoal = vi.fn();
    const onStartLesson = vi.fn();
    const onGoWrongBook = vi.fn();

    render(
      <DailyMissionCard
        todayStats={{
          answeredToday: 6,
          lessonsToday: 1,
          goal: 10,
          goalPercent: 60,
          goalReached: false,
          streakDays: 3,
        }}
        activeGradeLabel="五年級"
        activeSemester={1}
        subjectShortName="數學"
        dueWrongCount={2}
        totalWrongCount={4}
        recommendedNext={{
          stage: SAMPLE_STAGE,
          lesson: SAMPLE_LESSON,
          lessonCompleted: false,
          stars: 0,
        }}
        onStartStage={vi.fn()}
        onStartLesson={onStartLesson}
        onGoWrongBook={onGoWrongBook}
        onGoExamReview={vi.fn()}
        onUpdateDailyGoal={onUpdateDailyGoal}
      />,
    );

    expect(screen.getByText('連續學習 3 天')).toBeInTheDocument();
    expect(screen.getByText(/今日已練習 6 \/ 10 題/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '15題' }));
    expect(onUpdateDailyGoal).toHaveBeenCalledWith(15);

    fireEvent.click(screen.getByRole('button', { name: '先學觀念' }));
    expect(onStartLesson).toHaveBeenCalledWith(SAMPLE_LESSON, SAMPLE_STAGE);

    fireEvent.click(
      screen.getByRole('button', { name: '立即複習（最多 5 題）' }),
    );
    expect(onGoWrongBook).toHaveBeenCalledTimes(1);
  });
});

describe('BattleSummary', () => {
  const baseResult: BattleResult = {
    stageId: SAMPLE_STAGE.id,
    subjectId: 'math',
    stageTitle: SAMPLE_STAGE.title,
    stars: 2,
    xpEarned: 60,
    coinsEarned: 35,
    correctCount: 1,
    totalCount: 2,
    wrongQuestions: [SAMPLE_STAGE.questions[1]],
    solvedWrongIds: [],
    isReviewMode: false,
    battleMode: 'stage',
    attemptOutcomes: [],
    repairedCount: 0,
  };

  it('renders mock-exam messaging, retry button, and wrong question review', () => {
    const onRetry = vi.fn();
    render(
      <BattleSummary
        result={{ ...baseResult, battleMode: 'mock-exam' }}
        stage={SAMPLE_STAGE}
        selectedAvatarId="hero-knight"
        initialXp={0}
        maxCombo={1}
        focusMode={true}
        speechSlowMode={false}
        onRetry={onRetry}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('模擬考完成！')).toBeInTheDocument();
    expect(screen.getByText('15 + 5 = ?')).toBeInTheDocument();
    expect(screen.getByText('✓ 正確答案：20')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: '再練一次同份試卷' });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry button and shows FSRS advancement in wrong-review mode', () => {
    render(
      <BattleSummary
        result={{
          ...baseResult,
          battleMode: 'wrong-review',
          isReviewMode: true,
          wrongQuestions: [],
          solvedWrongIds: ['q1'],
        }}
        stage={SAMPLE_STAGE}
        selectedAvatarId="hero-knight"
        initialXp={0}
        maxCombo={2}
        focusMode={true}
        speechSlowMode={false}
        onRetry={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('冒險大勝利！')).toBeInTheDocument();
    expect(
      screen.getByText(/FSRS 記憶引擎已自動推進下一次複習排程/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /再挑戰一次|再練一次/ }),
    ).not.toBeInTheDocument();
  });
});

describe('BattleArena', () => {
  it('completes a stage battle and reports battleMode and outcomes', () => {
    const onFinishBattle = vi.fn();
    render(
      <BattleArena
        stage={SAMPLE_STAGE}
        selectedAvatarId="hero-knight"
        currentXp={0}
        battleMode="stage"
        focusMode={true}
        onFinishBattle={onFinishBattle}
        onExit={vi.fn()}
      />,
    );

    // Answer Q1 correctly
    fireEvent.click(screen.getByRole('button', { name: /20/ }));
    expect(screen.getByText('12 + 8 = 20。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /下一題/ }));

    // Answer Q2 correctly
    fireEvent.click(screen.getByRole('button', { name: /20/ }));
    fireEvent.click(screen.getByRole('button', { name: /查看結算/ }));

    expect(onFinishBattle).toHaveBeenCalledTimes(1);
    const result = onFinishBattle.mock.calls[0][0] as BattleResult;
    expect(result.battleMode).toBe('stage');
    expect(result.correctCount).toBe(2);
    expect(result.stars).toBe(3);
    expect(screen.getByText('冒險大勝利！')).toBeInTheDocument();
  });

  it('does not eliminate player in mock-exam mode even after 3 wrong answers', () => {
    vi.useFakeTimers();
    const fourQuestionStage: Stage = {
      ...SAMPLE_STAGE,
      id: 'mock-exam-4',
      questions: [
        ...SAMPLE_STAGE.questions,
        {
          id: 'q3',
          prompt: '3 + 4 = ?',
          options: ['6', '7', '8', '9'],
          answerIndex: 1,
          explanation: '3 + 4 = 7。',
        },
        {
          id: 'q4',
          prompt: '9 + 1 = ?',
          options: ['9', '10', '11', '12'],
          answerIndex: 1,
          explanation: '9 + 1 = 10。',
        },
      ],
    };

    const onFinishBattle = vi.fn();
    render(
      <BattleArena
        stage={fourQuestionStage}
        selectedAvatarId="hero-knight"
        currentXp={0}
        battleMode="mock-exam"
        focusMode={true}
        onFinishBattle={onFinishBattle}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('完整診斷（不淘汰）')).toBeInTheDocument();

    // Answer first 3 questions incorrectly
    const wrongOptionNames = [/18/, /19/, /6/];
    for (const wrongName of wrongOptionNames) {
      fireEvent.click(screen.getByRole('button', { name: wrongName }));
      act(() => {
        vi.advanceTimersByTime(1600);
      });
      fireEvent.click(screen.getByRole('button', { name: /下一題/ }));
    }

    // Should not terminate at 3 wrong answers; instead proceeds to 4th item (retry of Q1)
    expect(screen.getByText('第 4 / 7 題')).toBeInTheDocument();
    expect(
      screen.getByText(/即時修復重測（不扣愛心，再想一次就能記牢！）/),
    ).toBeInTheDocument();
    expect(screen.getByText('12 + 8 = ?')).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('Pedagogical Refinements Utilities', () => {
  it('shuffleQuestionOptions preserves options, updates answerIndex, and avoids same position', () => {
    const q = SAMPLE_STAGE.questions[0];
    const shuffled = shuffleQuestionOptions(q, () => 0.42);
    expect(shuffled.options).toHaveLength(4);
    expect(new Set(shuffled.options)).toEqual(new Set(q.options));
    expect(shuffled.options[shuffled.answerIndex]).toBe(q.options[q.answerIndex]);
    expect(shuffled.answerIndex).not.toBe(q.answerIndex);
  });

  it('buildSubjectDiagnostics aggregates tag mastery and handles empty fsrsCards', () => {
    const taggedStage: Stage = {
      ...SAMPLE_STAGE,
      questions: [
        { ...SAMPLE_STAGE.questions[0], tags: ['D-5-1', '整數加法'] },
        { ...SAMPLE_STAGE.questions[1], tags: ['D-5-1', '進位概念'] },
      ],
    };
    const report = buildSubjectDiagnostics(
      [taggedStage],
      undefined,
      { [taggedStage.id]: 1 },
      ['q2'],
    );
    expect(report.totalQuestions).toBe(2);
    expect(report.wrongCount).toBe(1);
    expect(report.dueCount).toBe(1);
    expect(report.weakUnits).toHaveLength(1);
    expect(report.tagSummaries.find((t) => t.tag === '進位概念')?.status).toBe(
      'weak',
    );
  });

  it('dailyStudy protects streak once per week on a 1-day gap and resets on 2+ days', () => {
    const baseProgress = {
      ...DEFAULT_PROGRESS,
      studyStreakDays: 5,
      lastStudyDate: '2026-11-23', // Monday
    };

    // Wednesday (1-day gap): grace applies
    const wednesday = new Date(2026, 10, 25, 10, 0, 0);
    const statsWed = getTodayStudyStats(baseProgress, wednesday);
    expect(statsWed.streakDays).toBe(5);
    expect(statsWed.graceAvailable).toBe(true);

    const recordedWed = recordDailyStudyActivity(
      baseProgress,
      { answered: 1 },
      wednesday,
    );
    expect(recordedWed.studyStreakDays).toBe(6);
    expect(recordedWed.streakGraceUsedWeek).toBeDefined();

    // Friday (another 1-day gap in the same week): grace already used -> resets to 1
    const friday = new Date(2026, 10, 27, 10, 0, 0);
    const recordedFri = recordDailyStudyActivity(
      { ...baseProgress, ...recordedWed },
      { answered: 1 },
      friday,
    );
    expect(recordedFri.studyStreakDays).toBe(1);
  });
});
