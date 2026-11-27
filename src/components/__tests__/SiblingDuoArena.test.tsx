import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Grade, Question } from '../../types/quiz';
import { SiblingDuoArena } from '../SiblingDuoArena';
import {
  buildFallbackMathQuestions,
  resolveSubjectsForGrade,
} from '../duo/duoQuestionLoader';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function makeMockQuestions(count = 6): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-q-${i + 1}`,
    prompt: `模擬搶答題 #${i + 1}：1 + ${i + 1} = ?`,
    options: [
      String(i + 2), // index 0 is always correct
      String(i + 3),
      String(i + 4),
      String(i + 5),
    ] as [string, string, string, string],
    answerIndex: 0,
    explanation: `答案是 ${i + 2}`,
  }));
}

describe('SiblingDuoArena gameplay & duoQuestionLoader', () => {
  it('resolveSubjectsForGrade maps lower-grade science/social to life and mixed appropriately', () => {
    expect(resolveSubjectsForGrade(2, 'science')).toEqual(['life', 'math']);
    expect(resolveSubjectsForGrade(1, 'social')).toEqual(['life', 'math']);
    expect(resolveSubjectsForGrade(2, 'mixed')).toEqual([
      'math',
      'mandarin',
      'english',
      'life',
    ]);
    expect(resolveSubjectsForGrade(5, 'mixed')).toEqual([
      'math',
      'mandarin',
      'english',
      'science',
      'social',
    ]);
    expect(buildFallbackMathQuestions(2, 6)).toHaveLength(6);
  });

  it('Speed Buzz-In Duel: locks wrong player, allows opponent steal, awards combo +3, supports keyboard shortcuts, and finishes with +50 coins', async () => {
    vi.useFakeTimers();
    const onAwardCoins = vi.fn();
    const mockQs = makeMockQuestions(4);
    const loader = vi.fn(async (_g: Grade) => mockQs);

    render(
      <SiblingDuoArena
        open
        defaultNameA="哥哥"
        defaultNameB="妹妹"
        defaultGradeA={5}
        defaultGradeB={2}
        questionLoader={loader}
        onAwardCoins={onAwardCoins}
        onClose={vi.fn()}
      />,
    );

    // Switch to Speed Duel mode and start
    fireEvent.click(screen.getByText('同題即時搶答'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '開始即時搶答賽！' }));
    });

    // Loader should use the lower grade (2) for fair shared questions
    expect(loader).toHaveBeenCalledWith(2, 'math');
    expect(screen.getByText(/第 1 \/ 4 題/)).toBeInTheDocument();

    // Round 1: Player A answers WRONG (option index 1) -> locked, message tells Player B to answer
    const panelA = screen.getByTestId('speed-panel-A');
    const panelB = screen.getByTestId('speed-panel-B');
    fireEvent.click(within(panelA).getByText('3'));
    expect(screen.getByText('哥哥 答錯 -1 分！換 妹妹 補答！')).toBeInTheDocument();
    expect(within(panelA).getByText('本題鎖定')).toBeInTheDocument();

    // Player B steals with correct answer (option index 0 -> "2") -> +2 points
    fireEvent.click(within(panelB).getByText('2'));
    expect(screen.getByText('妹妹 搶答成功！+2 分')).toBeInTheDocument();
    expect(within(panelB).getByText('積分：2 / 10')).toBeInTheDocument();

    // Advance to Round 2 (900ms)
    act(() => {
      vi.advanceTimersByTime(950);
    });
    expect(screen.getByText(/第 2 \/ 4 題/)).toBeInTheDocument();

    // Round 2: Player B uses keyboard shortcut '7' (option 0, correct) -> combo 2 -> +3 points!
    act(() => {
      fireEvent.keyDown(window, { key: '7' });
    });
    expect(screen.getByText('妹妹 搶答成功！+3 分（連擊加分！）')).toBeInTheDocument();
    expect(within(panelB).getByText('積分：5 / 10')).toBeInTheDocument();

    // Advance to Round 3
    act(() => {
      vi.advanceTimersByTime(950);
    });
    expect(screen.getByText(/第 3 \/ 4 題/)).toBeInTheDocument();

    // Round 3: Let 12s countdown expire -> timeout message
    for (let s = 0; s < 12; s++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(
      screen.getByText('時間到！無人搶答成功，直接進入下一題'),
    ).toBeInTheDocument();

    // Advance to Round 4 (last question)
    act(() => {
      vi.advanceTimersByTime(950);
    });
    expect(screen.getByText(/第 4 \/ 4 題/)).toBeInTheDocument();

    // Player A answers correctly via keyboard '1' -> +2 points, game finishes after 700ms
    act(() => {
      fireEvent.keyDown(window, { key: '1' });
    });
    act(() => {
      vi.advanceTimersByTime(750);
    });

    expect(onAwardCoins).toHaveBeenCalledWith(50);
    expect(screen.getByText('恭喜 妹妹 獲勝！')).toBeInTheDocument();
  });

  it('Fair Versus mode finishes when a player reaches 5 correct answers and awards +30 coins', async () => {
    vi.useFakeTimers();
    const onAwardCoins = vi.fn();
    const mockQs = makeMockQuestions(6);
    const loader = vi.fn(async () => mockQs);

    render(
      <SiblingDuoArena
        open
        defaultNameA="小明"
        defaultNameB="小華"
        questionLoader={loader}
        onAwardCoins={onAwardCoins}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('公平競速賽'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '開始雙人對戰！' }));
    });

    // Player A answers 5 questions right in a row
    for (let i = 0; i < 5; i++) {
      const panelA = screen.getByTestId('duo-panel-A');
      const correctBtn = within(panelA).getByText(String(i + 2));
      fireEvent.click(correctBtn);
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(onAwardCoins).toHaveBeenCalledWith(30);
    expect(screen.getByText('恭喜 小明 獲勝！')).toBeInTheDocument();
  });
});
