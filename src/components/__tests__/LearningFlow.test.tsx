import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LessonScript } from '../../types/lesson';
import type { Stage } from '../../types/quiz';
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
});
