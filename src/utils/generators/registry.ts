import type { Question, Stage } from '../../types/quiz';
import { generateMathQuestions } from '../mathGenerator.ts';
import {
  generateG5S1U2FactorsMultiples,
  generateG5S1U4GcdLcm,
  generateG5S1U6FourOps,
  generateG5S1U7Fractions,
  generateG5S1U8Area,
  generateG5S1U9UnitFraction,
} from './g5s1Math.ts';
import {
  generateG6S1U1GcdLcm,
  generateG6S1U2FractionDiv,
  generateG6S1U3NumberPatterns,
  generateG6S1U4DecimalDiv,
  generateG6S1U5Ratio,
  generateG6S1U6CirclePerimeter,
  generateG6S1U7CircleArea,
  generateG6S1U8Speed,
  generateG6S1U9Scale,
} from './g6Math.ts';

export type QuestionGenerator = (count?: number) => Question[];

export const QUESTION_GENERATORS: Record<string, QuestionGenerator> = {
  'math-basic-easy': (count = 6) => generateMathQuestions('easy', count),
  'math-basic-medium': (count = 6) => generateMathQuestions('medium', count),
  'math-basic-hard': (count = 6) => generateMathQuestions('hard', count),
  'g5s1-math-u2': (count = 6) => generateG5S1U2FactorsMultiples(count),
  'g5s1-math-u4': (count = 6) => generateG5S1U4GcdLcm(count),
  'g5s1-math-u6': (count = 6) => generateG5S1U6FourOps(count),
  'g5s1-math-u7': (count = 6) => generateG5S1U7Fractions(count),
  'g5s1-math-u8': (count = 6) => generateG5S1U8Area(count),
  'g5s1-math-u9': (count = 6) => generateG5S1U9UnitFraction(count),
  'g6s1-math-u1': (count = 6) => generateG6S1U1GcdLcm(count),
  'g6s1-math-u2': (count = 6) => generateG6S1U2FractionDiv(count),
  'g6s1-math-u3': (count = 6) => generateG6S1U3NumberPatterns(count),
  'g6s1-math-u4': (count = 6) => generateG6S1U4DecimalDiv(count),
  'g6s1-math-u5': (count = 6) => generateG6S1U5Ratio(count),
  'g6s1-math-u6': (count = 6) => generateG6S1U6CirclePerimeter(count),
  'g6s1-math-u7': (count = 6) => generateG6S1U7CircleArea(count),
  'g6s1-math-u8': (count = 6) => generateG6S1U8Speed(count),
  'g6s1-math-u9': (count = 6) => generateG6S1U9Scale(count),
};

const DEFAULT_DYNAMIC_COUNT = 6;

export function isDynamicStage(stage: Stage): boolean {
  return (
    Boolean(stage.generatorId && QUESTION_GENERATORS[stage.generatorId]) ||
    Boolean(stage.isDynamicMath)
  );
}

export function getStageQuestionCount(stage: Stage): number {
  return isDynamicStage(stage) ? DEFAULT_DYNAMIC_COUNT : stage.questions.length;
}

export function resolveStageQuestions(
  stage: Stage,
  count = DEFAULT_DYNAMIC_COUNT,
): Question[] {
  if (stage.generatorId && QUESTION_GENERATORS[stage.generatorId]) {
    return QUESTION_GENERATORS[stage.generatorId](count);
  }
  if (stage.isDynamicMath) {
    return generateMathQuestions(stage.difficulty, count);
  }
  return stage.questions;
}
