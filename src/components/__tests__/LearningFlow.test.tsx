import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LessonScript } from '../../types/lesson';
import type { Stage } from '../../types/quiz';
import { extractHanziCharacters } from '../../data/hanziVocab';
import {
  evaluateBadges,
  findNewlyEarnedBadges,
} from '../../utils/badges';
import {
  getTodayStudyStats,
  recordDailyStudyActivity,
} from '../../utils/dailyStudy';
import { buildSubjectDiagnostics } from '../../utils/learningDiagnostics';
import {
  decodeProgressSyncCode,
  DEFAULT_PROGRESS,
  encodeProgressSyncCode,
} from '../../utils/progressImport';
import { shuffleQuestionOptions } from '../../utils/questionUtils';
import {
  decodeCustomStageFromHash,
  encodeCustomStageToHash,
} from '../../utils/storage';
import { BattleArena } from '../BattleArena';
import { BattleSummary, type BattleResult } from '../BattleSummary';
import { DailyMissionCard } from '../DailyMissionCard';
import { EyeCareModal } from '../EyeCareModal';
import { HeroShop } from '../HeroShop';
import { LessonPlayer } from '../LessonPlayer';
import { MathToolsModal } from '../MathToolsModal';
import { ProfileSelectorModal } from '../ProfileSelectorModal';
import { SiblingDuoArena } from '../SiblingDuoArena';
import { StageCard } from '../StageCard';
import { WrongBook } from '../WrongBook';

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

  it('decodeCustomStageFromHash validates per-question structure and rejects invalid payloads', () => {
    const validHash = encodeCustomStageToHash(SAMPLE_STAGE);
    const decoded = decodeCustomStageFromHash(`#${validHash}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.questions).toHaveLength(2);

    // Payload with invalid answerIndex and malformed options should be rejected
    const badStage = {
      title: '壞掉的題庫',
      questions: [
        { prompt: 'Q1', options: ['A', 'B'], answerIndex: 0 },
        { prompt: 'Q2', options: ['A', 'B', 'C', 'D'], answerIndex: 9 },
      ],
    };
    const badJson = JSON.stringify(badStage);
    const badB64 = btoa(unescape(encodeURIComponent(badJson)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    expect(decodeCustomStageFromHash(`#quiz=${badB64}`)).toBeNull();
  });
});

describe('LessonPlayer & WrongBook', () => {
  it('LessonPlayer renders scene content and triggers onCompleteAndStartQuiz on the last scene', () => {
    const onCompleteAndStartQuiz = vi.fn();
    render(
      <LessonPlayer
        lesson={SAMPLE_LESSON}
        stage={SAMPLE_STAGE}
        alreadyCompleted={false}
        onCompleteAndStartQuiz={onCompleteAndStartQuiz}
        onCompleteAndExit={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('進位概念')).toBeInTheDocument();
    expect(screen.getByText('第 1 / 1 幕')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /進入實戰驗證/ }));
    expect(onCompleteAndStartQuiz).toHaveBeenCalledTimes(1);
  });

  it('WrongBook caps micro-quiz review at 5 due questions', () => {
    const onStartWrongReview = vi.fn();
    const snapshots: Record<string, Stage['questions'][number] & { subjectId?: 'math'; stageTitle?: string }> = {};
    const wrongIds: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const id = `wrong-q-${i}`;
      wrongIds.push(id);
      snapshots[id] = {
        id,
        prompt: `錯題 ${i}`,
        options: ['1', '2', '3', '4'],
        answerIndex: 0,
        explanation: '解析',
        subjectId: 'math',
        stageTitle: '單元一',
      };
    }

    render(
      <WrongBook
        progress={{
          ...DEFAULT_PROGRESS,
          wrongQuestionIds: wrongIds,
          wrongQuestionSnapshots: snapshots,
        }}
        onRemoveWrongId={vi.fn()}
        onStartWrongReview={onStartWrongReview}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /啟動今日複習戰 \(5 題\)/ }),
    );
    expect(onStartWrongReview).toHaveBeenCalledTimes(1);
    const reviewStage = onStartWrongReview.mock.calls[0][0] as Stage;
    expect(reviewStage.questions).toHaveLength(5);
  });
});

describe('Engagement, Hanzi & Deep Teaching Features', () => {
  it('extractHanziCharacters filters punctuation/ASCII and deduplicates CJK characters', () => {
    expect(extractHanziCharacters('春、風123 abc 春雨花草！')).toEqual([
      '春',
      '風',
      '雨',
      '花',
      '草',
    ]);
  });

  it('evaluateBadges and findNewlyEarnedBadges work on empty and progressed saves', () => {
    const emptyBadges = evaluateBadges(DEFAULT_PROGRESS);
    expect(emptyBadges.length).toBeGreaterThanOrEqual(10);
    expect(emptyBadges.every((b) => !b.unlocked)).toBe(true);

    const progressed = {
      ...DEFAULT_PROGRESS,
      completedLessonIds: ['l1'],
      practicedHanzi: {
        春: { count: 1 },
        風: { count: 1 },
        雨: { count: 1 },
        花: { count: 1 },
        草: { count: 1 },
      },
    };
    const newlyEarned = findNewlyEarnedBadges(progressed).map((b) => b.id);
    expect(newlyEarned).toContain('first-lesson');
    expect(newlyEarned).toContain('hanzi-starter');
  });

  it('HeroShop renders Badges Wall and allows redeeming affordable Family Rewards', () => {
    const onRedeem = vi.fn();
    render(
      <HeroShop
        progress={{ ...DEFAULT_PROGRESS, coins: 180 }}
        onSelectAvatar={vi.fn()}
        onUnlockAvatar={vi.fn()}
        onUpdateNickname={vi.fn()}
        onRedeemFamilyReward={onRedeem}
      />,
    );

    expect(
      screen.getByText(/冒險成就徽章牆/),
    ).toBeInTheDocument();
    const redeemBtn = screen.getByRole('button', { name: '花費 150 金幣兌換' });
    fireEvent.click(redeemBtn);
    expect(onRedeem).toHaveBeenCalledTimes(1);

    // 200 coin reward should be disabled when coins = 180
    expect(
      screen.getByRole('button', { name: /需要 200 金幣（還差 20）/ }),
    ).toBeDisabled();
  });

  it('BattleArena offers Just-In-Time concept review button when answered wrong', () => {
    render(
      <BattleArena
        stage={SAMPLE_STAGE}
        selectedAvatarId="hero-knight"
        currentXp={0}
        battleMode="stage"
        focusMode={true}
        onFinishBattle={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    // Pick wrong option '18'
    fireEvent.click(screen.getByRole('button', { name: /18/ }));
    expect(
      screen.getByRole('button', { name: /回看本單元觀念圖解/ }),
    ).toBeInTheDocument();
  });

  it('BattleArena opens MathScratchpad when toggled on a math stage', () => {
    render(
      <BattleArena
        stage={SAMPLE_STAGE}
        selectedAvatarId="hero-knight"
        currentXp={0}
        battleMode="stage"
        focusMode={true}
        onFinishBattle={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /計算草稿板/ }));
    expect(
      screen.getByText(/數學計算草稿板（支援平板手指／Apple Pencil/),
    ).toBeInTheDocument();
  });

  it('BattleArena supports English listening mode by hiding prompt text until revealed', () => {
    const englishStage: Stage = {
      ...SAMPLE_STAGE,
      id: 'en-stage-1',
      subjectId: 'english',
      questions: [
        {
          id: 'en-q1',
          prompt: 'What color is the apple?',
          options: ['Red', 'Blue', 'Green', 'Yellow'],
          answerIndex: 0,
          explanation: 'Apples are often red.',
          speechText: 'What color is the apple?',
          speechLang: 'en-US',
        },
      ],
    };

    render(
      <BattleArena
        stage={englishStage}
        selectedAvatarId="hero-knight"
        currentXp={0}
        battleMode="stage"
        focusMode={true}
        onFinishBattle={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('What color is the apple?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /聽力模式/ }));
    expect(
      screen.queryByText('What color is the apple?'),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/英語聽力挑戰中/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '偷看題目文字' }));
    expect(screen.getByText('What color is the apple?')).toBeInTheDocument();
  });

  it('HeroShop gates parent reward creation behind ParentGateModal', () => {
    render(
      <HeroShop
        progress={{ ...DEFAULT_PROGRESS, parentPin: '2468' }}
        onSelectAvatar={vi.fn()}
        onUnlockAvatar={vi.fn()}
        onUpdateNickname={vi.fn()}
        onRedeemFamilyReward={vi.fn()}
        onUpdateFamilyRewards={vi.fn()}
      />,
    );

    expect(screen.queryByText('家長新增獎勵：')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /家長管理鎖/ }));
    expect(screen.getByText('家長管理驗證')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('輸入 4 碼數字密碼'), {
      target: { value: '2468' },
    });
    fireEvent.click(screen.getByRole('button', { name: '確認解鎖' }));
    expect(screen.getByText('家長新增獎勵：')).toBeInTheDocument();
  });

  it('StageCard renders Hanzi practice button for Mandarin stages', () => {
    const onPracticeHanzi = vi.fn();
    const mandarinStage: Stage = {
      ...SAMPLE_STAGE,
      id: 'mandarin-u1',
      subjectId: 'mandarin',
    };
    render(
      <StageCard
        stage={mandarinStage}
        earnedStars={0}
        onStartStage={vi.fn()}
        onPracticeHanzi={onPracticeHanzi}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /練寫本單元國字/ }));
    expect(onPracticeHanzi).toHaveBeenCalledWith(mandarinStage);
  });

  it('encodeProgressSyncCode & decodeProgressSyncCode round-trips Chinese nicknames cleanly', () => {
    const sample = {
      ...DEFAULT_PROGRESS,
      nickname: '五年級大寶',
      defaultGrade: 5 as const,
      coins: 320,
    };
    const code = encodeProgressSyncCode(sample);
    expect(code.startsWith('EQP1:')).toBe(true);
    const decoded = decodeProgressSyncCode(code);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.progress.nickname).toBe('五年級大寶');
      expect(decoded.progress.defaultGrade).toBe(5);
      expect(decoded.progress.coins).toBe(320);
    }
  });

  it('ProfileSelectorModal displays dual-child grades and creates grade-bound profile', () => {
    const onCreate = vi.fn();
    render(
      <ProfileSelectorModal
        open={true}
        profiles={[
          {
            id: 'default',
            nickname: '大寶',
            selectedAvatarId: 'hero-knight',
            defaultGrade: 5,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'p2',
            nickname: '二寶',
            selectedAvatarId: 'hero-mage',
            defaultGrade: 2,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]}
        activeProfileId="default"
        onSelectProfile={vi.fn()}
        onCreateProfile={onCreate}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('5 年級專屬')).toBeInTheDocument();
    expect(screen.getByText('2 年級專屬')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /新增孩子學習檔案/ }));
    fireEvent.change(
      screen.getByPlaceholderText('輸入暱稱（例如：弟弟、姊姊）'),
      { target: { value: '小寶' } },
    );
    fireEvent.click(screen.getByRole('button', { name: '建立並進入' }));
    expect(onCreate).toHaveBeenCalledWith('小寶', 2);
  });

  it('MathToolsModal switches between 9x9 blitz and interactive clock', () => {
    render(
      <MathToolsModal open={true} onAwardCoins={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText('九九乘法 60 秒快閃挑戰')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /互動時鐘教具/ }));
    expect(screen.getByText('3 點 15 分')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+15 分' }));
    expect(screen.getByText('3 點 30 分')).toBeInTheDocument();
  });

  it('SiblingDuoArena renders setup with co-op and versus modes', () => {
    render(
      <SiblingDuoArena open={true} onAwardCoins={vi.fn()} onClose={vi.fn()} />,
    );
    expect(
      screen.getByText('雙寶同機合作 / 跨年級公平 PK'),
    ).toBeInTheDocument();
    expect(screen.getByText('合作打魔王（推薦）')).toBeInTheDocument();
    expect(screen.getByText('公平 PK 競速賽')).toBeInTheDocument();
  });

  it('EyeCareModal renders countdown and skip action', () => {
    const onSkip = vi.fn();
    render(
      <EyeCareModal open={true} onComplete={vi.fn()} onSkip={onSkip} />,
    );
    expect(screen.getByText('護眼休息時間到囉！')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '先略過這次提醒' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('WrongBook renders print A4 button and Review Lesson button', () => {
    const onOpenLesson = vi.fn();
    render(
      <WrongBook
        progress={{
          ...DEFAULT_PROGRESS,
          wrongQuestionIds: [SAMPLE_STAGE.questions[0].id],
          wrongQuestionSnapshots: {
            [SAMPLE_STAGE.questions[0].id]: {
              ...SAMPLE_STAGE.questions[0],
              subjectId: 'math',
              stageTitle: '單元一：整數加法',
            },
          },
        }}
        onRemoveWrongId={vi.fn()}
        onStartWrongReview={vi.fn()}
        onOpenLessonForQuestion={onOpenLesson}
      />,
    );

    expect(
      screen.getByRole('button', { name: /列印 A4 錯題卷/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /回看微課/ }));
    expect(onOpenLesson).toHaveBeenCalledWith('math', '單元一：整數加法');
  });
});
