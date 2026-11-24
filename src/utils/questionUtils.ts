import type { Question } from '../types/quiz.ts';

/**
 * 隨機洗牌四選一題目的選項順序並同步更新 answerIndex，
 * 避免學童在回合內錯題重測時僅憑「上次正確選項的位置」作答（位置記憶假象）。
 */
export function shuffleQuestionOptions(
  question: Question,
  randomFn: () => number = Math.random,
): Question {
  const entries = question.options.map((text, idx) => ({
    text,
    isCorrect: idx === question.answerIndex,
  }));

  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  let nextAnswerIndex = entries.findIndex((item) => item.isCorrect);

  // 若洗牌後答案剛好仍在原位，與相鄰不同位置交換一次以確保位置改變
  if (nextAnswerIndex === question.answerIndex && entries.length > 1) {
    const swapIdx = (nextAnswerIndex + 1) % entries.length;
    [entries[nextAnswerIndex], entries[swapIdx]] = [
      entries[swapIdx],
      entries[nextAnswerIndex],
    ];
    nextAnswerIndex = swapIdx;
  }

  return {
    ...question,
    options: [
      entries[0]?.text ?? '',
      entries[1]?.text ?? '',
      entries[2]?.text ?? '',
      entries[3]?.text ?? '',
    ],
    answerIndex: nextAnswerIndex >= 0 ? nextAnswerIndex : question.answerIndex,
  };
}
