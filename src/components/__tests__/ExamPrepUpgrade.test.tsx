import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  MockExamRecord,
  PlayerProgress,
  QuizPack,
  Stage,
} from '../../types/quiz';
import { buildExamSprintSummary } from '../../utils/examPlanner';
import { DEFAULT_PROGRESS, normalizeProgress } from '../../utils/progressImport';
import { extractSpellingWords } from '../EnglishSpellingModal';
import { MockExamArena } from '../MockExamArena';

const mockExamStage: Stage = {
  id: 'mock-test-1',
  subjectId: 'math',
  title: '五年級上學期 數學・期中模擬複習',
  description: '測試模擬考',
  difficulty: 'medium',
  monsterId: 'flameDragon',
  monsterName: '段考大魔王',
  monsterHp: 120,
  questions: [
    {
      id: 'mq-1',
      prompt: '25 × 4 等於多少？',
      options: ['80', '100', '120', '150'],
      answerIndex: 1,
      explanation: '25 乘以 4 等於 100。',
      stageTitle: '第2章 因數與倍數',
    },
    {
      id: 'mq-2',
      prompt: '12 和 18 的最大公因數是多少？',
      options: ['3', '6', '9', '12'],
      answerIndex: 1,
      explanation: '12 和 18 的公因數有 1, 2, 3, 6，最大是 6。',
      stageTitle: '第2章 因數與倍數',
    },
  ],
};

describe('MockExamArena', () => {
  it('supports flagging, answering, and renders unit breakdown & score on submit', () => {
    const onFinishExam = vi.fn();
    const onRetryWrongOnly = vi.fn();
    const onExit = vi.fn();

    render(
      <MockExamArena
        stage={mockExamStage}
        grade={5}
        semester={1}
        timeLimitSec={900}
        onFinishExam={onFinishExam}
        onRetryWrongOnly={onRetryWrongOnly}
        onExit={onExit}
      />,
    );

    expect(screen.getByText(/真實段考模式 · 已作答 0\/2/)).toBeInTheDocument();
    expect(screen.getByText('25 × 4 等於多少？')).toBeInTheDocument();

    // 答對第 1 題 (100)
    fireEvent.click(screen.getByRole('button', { name: /100/ }));
    expect(screen.getByText(/真實段考模式 · 已作答 1\/2/)).toBeInTheDocument();

    // 下一題並答錯第 2 題 (選 3)
    fireEvent.click(screen.getByRole('button', { name: '下一題' }));
    expect(screen.getByText('12 和 18 的最大公因數是多少？')).toBeInTheDocument();

    // 標記待檢查再交卷
    fireEvent.click(screen.getByRole('button', { name: '標記待檢查' }));
    fireEvent.click(screen.getByRole('button', { name: '檢查並交卷' }));

    // 會先跳出待檢查確認框
    expect(screen.getByText('交卷前再確認一下！')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '確定交卷' }));

    expect(onFinishExam).toHaveBeenCalledTimes(1);
    const payload = onFinishExam.mock.calls[0][0];
    expect(payload.record.score).toBe(50);
    expect(payload.wrongQuestions).toHaveLength(1);
    expect(screen.getByText('真實段考成績單')).toBeInTheDocument();
    expect(screen.getByText(/各單元掌握度診斷/)).toBeInTheDocument();
  });

  it('compares score against pre-submission previousRecord even after parent prepends the new record', () => {
    const oldRecord: MockExamRecord = {
      id: 'mock-old',
      takenAt: '2026-11-20T10:00:00.000Z',
      grade: 5,
      semester: 1,
      subjectId: 'math',
      title: '舊模擬考',
      score: 30,
      correctCount: 3,
      totalCount: 10,
      durationSec: 200,
      unitBreakdown: [],
    };
    let latestPrev: MockExamRecord = oldRecord;

    const { rerender } = render(
      <MockExamArena
        stage={mockExamStage}
        grade={5}
        semester={1}
        previousRecord={latestPrev}
        onFinishExam={(payload) => {
          latestPrev = payload.record;
        }}
        onRetryWrongOnly={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    // Answer Q1 correctly (100), Q2 wrong -> 50 points (+20 vs oldRecord 30)
    fireEvent.click(screen.getByRole('button', { name: /100/ }));
    fireEvent.click(screen.getByRole('button', { name: '下一題' }));
    fireEvent.click(screen.getByRole('button', { name: '檢查並交卷' }));
    fireEvent.click(screen.getByRole('button', { name: '確定交卷' }));

    // Simulate parent re-rendering with the newly prepended record as previousRecord
    rerender(
      <MockExamArena
        stage={mockExamStage}
        grade={5}
        semester={1}
        previousRecord={latestPrev}
        onFinishExam={vi.fn()}
        onRetryWrongOnly={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('比上次進步 +20 分')).toBeInTheDocument();
  });
});

describe('examPlanner', () => {
  it('computes sprint phase, readiness percent, and priority task across subjects', () => {
    const now = new Date('2026-11-27T10:00:00');
    const progress: PlayerProgress = {
      ...DEFAULT_PROGRESS,
      stageStars: {
        'm-u1': 3,
        'm-u2': 1,
      },
      wrongQuestionIds: ['q-m2-1'],
    };

    const mathPack: QuizPack = {
      packId: '115-s1-g5-math',
      academicYear: 115,
      semester: 1,
      grade: 5,
      subjectId: 'math',
      stages: [
        {
          id: 'm-u1',
          subjectId: 'math',
          title: '單元1',
          description: '',
          difficulty: 'easy',
          monsterId: 'mathCube',
          monsterName: '魔方',
          monsterHp: 100,
          questions: [
            {
              id: 'q-m1-1',
              prompt: '1+1?',
              options: ['1', '2', '3', '4'],
              answerIndex: 1,
              explanation: '2',
            },
          ],
        },
        {
          id: 'm-u2',
          subjectId: 'math',
          title: '單元2',
          description: '',
          difficulty: 'easy',
          monsterId: 'mathCube',
          monsterName: '魔方',
          monsterHp: 100,
          questions: [
            {
              id: 'q-m2-1',
              prompt: '2+2?',
              options: ['2', '3', '4', '5'],
              answerIndex: 2,
              explanation: '4',
            },
          ],
        },
      ],
    };

    const summary = buildExamSprintSummary(
      {
        title: '五上期末考',
        examDate: '2026-11-29', // 2 days left -> wrong-clear
        preset: 'all',
        subjectIds: ['math'],
      },
      { math: mathPack },
      progress,
      now,
    );

    expect(summary.daysLeft).toBe(2);
    expect(summary.phase).toBe('wrong-clear');
    expect(summary.totalWrongInScope).toBe(1);
    expect(summary.priorityTask?.stage.id).toBe('m-u2');
    expect(summary.overallReadinessPercent).toBeGreaterThan(0);
  });
});

describe('progressImport & EnglishSpellingModal helpers', () => {
  it('preserves and sanitizes new optional fields in normalizeProgress', () => {
    const normalized = normalizeProgress({
      nickname: '小翔',
      xp: 120,
      coins: 80,
      wrongMistakeCounts: { q1: 3.7, bad: -2 },
      wrongReasonTags: {
        q1: 'concept',
        // @ts-expect-error testing runtime sanitization of invalid tag
        q2: 'invalid-tag',
      },
      mockExamHistory: [
        {
          id: 'mock-1',
          takenAt: '2026-11-27T10:00:00.000Z',
          grade: 5,
          semester: 1,
          subjectId: 'math',
          title: '五上數學模擬考',
          score: 140,
          correctCount: 9,
          totalCount: 10,
          durationSec: 320,
          unitBreakdown: [],
        },
      ],
    });

    expect(normalized.wrongMistakeCounts?.q1).toBe(3);
    expect(normalized.wrongMistakeCounts?.bad).toBeUndefined();
    expect(normalized.wrongReasonTags?.q1).toBe('concept');
    expect(normalized.wrongReasonTags?.q2).toBeUndefined();
    expect(normalized.mockExamHistory).toHaveLength(1);
    expect(normalized.mockExamHistory?.[0].score).toBe(100);
  });

  it('extracts unique single English words for spelling tiles', () => {
    const words = extractSpellingWords([
      {
        id: 'e1',
        prompt: '70 的英文',
        options: ['seventy', 'seventeen', 'sixty', 'sixteen'],
        answerIndex: 0,
        explanation: '',
      },
      {
        id: 'e2',
        prompt: '句子題',
        options: ['How are you?', 'I am fine.', 'Good', 'Bye'],
        answerIndex: 0,
        explanation: '',
      },
    ]);

    expect(words).toHaveLength(1);
    expect(words[0].word).toBe('seventy');
  });
});
