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
  generateG6S2U1MixedOps,
  generateG6S2U2SpeedApps,
  generateG6S2U3PrismCylinder,
  generateG6S2U4BaseComparison,
  generateG6S2U5ProblemSolving,
} from './g6Math.ts';
import {
  generateG5S2U1DecimalPlace,
  generateG5S2U2FractionMulDiv,
  generateG5S2U3CuboidVolume,
  generateG5S2U4Decimals,
  generateG5S2U5LargeUnits,
  generateG5S2U6TimeMulDiv,
  generateG5S2U7Capacity,
  generateG5S2U8RatioPercent,
  generateG5S2U9SurfaceArea,
} from './g5s2Math.ts';
import {
  generateG4S1U1BigNumbers,
  generateG4S1U2Multiplication,
  generateG4S1U4Fractions,
  generateG4S1U5Kilometers,
  generateG4S1U6Division,
  generateG4S1U8TwoStepOps,
  generateG4S1U9TwoPlaceDecimals,
  generateG4S2U1Rounding,
  generateG4S2U2FourOps,
  generateG4S2U4Fractions1,
  generateG4S2U6DecimalMul,
  generateG4S2U7PerimeterArea,
  generateG4S2U8Fractions2,
  generateG4S2U9TimeCalc,
} from './g4Math.ts';
import {
  generateG3S1U1Numbers10000,
  generateG3S1U2AddSub4Digits,
  generateG3S1U3Millimeters,
  generateG3S1U4Multiplication,
  generateG3S1U6Division,
  generateG3S1U7KilogramsGrams,
  generateG3S1U8BasicFractions,
  generateG3S2U1Division,
  generateG3S2U2LitersMl,
  generateG3S2U3FractionAddSub,
  generateG3S2U5TwoStepApps,
  generateG3S2U6OnePlaceDecimals,
  generateG3S2U7TimeAddSub,
  generateG3S2U8MulDivInverse,
  generateG3S2U9AreaSqCm,
} from './g3Math.ts';
import {
  generateG2S1U1Numbers200,
  generateG2S1U2AddSub2Digits,
  generateG2S1U3Centimeters,
  generateG2S1U6TwoStepAddSub,
  generateG2S1U7Multiplication1,
  generateG2S1U8TellingTime,
  generateG2S1U9Multiplication2,
  generateG2S2U1Numbers1000,
  generateG2S2U3AddSub3Digits,
  generateG2S2U5TenHundredMul,
  generateG2S2U6MetersCm,
  generateG2S2U7MulAddSub,
  generateG2S2U8CalendarDays,
  generateG2S2U9GroupingSharing,
  generateG2S2U10UnitFractions,
} from './g2Math.ts';
import {
  generateG1S1U1Numbers10,
  generateG1S1U3OrderCompare,
  generateG1S1U4ComposeDecompose10,
  generateG1S1U6Numbers30,
  generateG1S1U7Add10,
  generateG1S1U8Sub10,
  generateG1S1U9ClockHours,
  generateG1S2U1Numbers50,
  generateG1S2U2CarryAdd18,
  generateG1S2U4BorrowSub18,
  generateG1S2U6Numbers100,
  generateG1S2U7Coins,
  generateG1S2U8AddSub2Digits,
  generateG1S2U9CalendarDate,
} from './g1Math.ts';

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
  'g5s2-math-u1': (count = 6) => generateG5S2U1DecimalPlace(count),
  'g5s2-math-u2': (count = 6) => generateG5S2U2FractionMulDiv(count),
  'g5s2-math-u3': (count = 6) => generateG5S2U3CuboidVolume(count),
  'g5s2-math-u4': (count = 6) => generateG5S2U4Decimals(count),
  'g5s2-math-u5': (count = 6) => generateG5S2U5LargeUnits(count),
  'g5s2-math-u6': (count = 6) => generateG5S2U6TimeMulDiv(count),
  'g5s2-math-u7': (count = 6) => generateG5S2U7Capacity(count),
  'g5s2-math-u8': (count = 6) => generateG5S2U8RatioPercent(count),
  'g5s2-math-u9': (count = 6) => generateG5S2U9SurfaceArea(count),
  'g6s1-math-u1': (count = 6) => generateG6S1U1GcdLcm(count),
  'g6s1-math-u2': (count = 6) => generateG6S1U2FractionDiv(count),
  'g6s1-math-u3': (count = 6) => generateG6S1U3NumberPatterns(count),
  'g6s1-math-u4': (count = 6) => generateG6S1U4DecimalDiv(count),
  'g6s1-math-u5': (count = 6) => generateG6S1U5Ratio(count),
  'g6s1-math-u6': (count = 6) => generateG6S1U6CirclePerimeter(count),
  'g6s1-math-u7': (count = 6) => generateG6S1U7CircleArea(count),
  'g6s1-math-u8': (count = 6) => generateG6S1U8Speed(count),
  'g6s1-math-u9': (count = 6) => generateG6S1U9Scale(count),
  'g6s2-math-u1': (count = 6) => generateG6S2U1MixedOps(count),
  'g6s2-math-u2': (count = 6) => generateG6S2U2SpeedApps(count),
  'g6s2-math-u3': (count = 6) => generateG6S2U3PrismCylinder(count),
  'g6s2-math-u4': (count = 6) => generateG6S2U4BaseComparison(count),
  'g6s2-math-u5': (count = 6) => generateG6S2U5ProblemSolving(count),
  'g4s1-math-u1': (count = 6) => generateG4S1U1BigNumbers(count),
  'g4s1-math-u2': (count = 6) => generateG4S1U2Multiplication(count),
  'g4s1-math-u4': (count = 6) => generateG4S1U4Fractions(count),
  'g4s1-math-u5': (count = 6) => generateG4S1U5Kilometers(count),
  'g4s1-math-u6': (count = 6) => generateG4S1U6Division(count),
  'g4s1-math-u8': (count = 6) => generateG4S1U8TwoStepOps(count),
  'g4s1-math-u9': (count = 6) => generateG4S1U9TwoPlaceDecimals(count),
  'g4s2-math-u1': (count = 6) => generateG4S2U1Rounding(count),
  'g4s2-math-u2': (count = 6) => generateG4S2U2FourOps(count),
  'g4s2-math-u4': (count = 6) => generateG4S2U4Fractions1(count),
  'g4s2-math-u6': (count = 6) => generateG4S2U6DecimalMul(count),
  'g4s2-math-u7': (count = 6) => generateG4S2U7PerimeterArea(count),
  'g4s2-math-u8': (count = 6) => generateG4S2U8Fractions2(count),
  'g4s2-math-u9': (count = 6) => generateG4S2U9TimeCalc(count),
  'g3s1-math-u1': (count = 6) => generateG3S1U1Numbers10000(count),
  'g3s1-math-u2': (count = 6) => generateG3S1U2AddSub4Digits(count),
  'g3s1-math-u3': (count = 6) => generateG3S1U3Millimeters(count),
  'g3s1-math-u4': (count = 6) => generateG3S1U4Multiplication(count),
  'g3s1-math-u6': (count = 6) => generateG3S1U6Division(count),
  'g3s1-math-u7': (count = 6) => generateG3S1U7KilogramsGrams(count),
  'g3s1-math-u8': (count = 6) => generateG3S1U8BasicFractions(count),
  'g3s2-math-u1': (count = 6) => generateG3S2U1Division(count),
  'g3s2-math-u2': (count = 6) => generateG3S2U2LitersMl(count),
  'g3s2-math-u3': (count = 6) => generateG3S2U3FractionAddSub(count),
  'g3s2-math-u5': (count = 6) => generateG3S2U5TwoStepApps(count),
  'g3s2-math-u6': (count = 6) => generateG3S2U6OnePlaceDecimals(count),
  'g3s2-math-u7': (count = 6) => generateG3S2U7TimeAddSub(count),
  'g3s2-math-u8': (count = 6) => generateG3S2U8MulDivInverse(count),
  'g3s2-math-u9': (count = 6) => generateG3S2U9AreaSqCm(count),
  'g2s1-math-u1': (count = 6) => generateG2S1U1Numbers200(count),
  'g2s1-math-u2': (count = 6) => generateG2S1U2AddSub2Digits(count),
  'g2s1-math-u3': (count = 6) => generateG2S1U3Centimeters(count),
  'g2s1-math-u6': (count = 6) => generateG2S1U6TwoStepAddSub(count),
  'g2s1-math-u7': (count = 6) => generateG2S1U7Multiplication1(count),
  'g2s1-math-u8': (count = 6) => generateG2S1U8TellingTime(count),
  'g2s1-math-u9': (count = 6) => generateG2S1U9Multiplication2(count),
  'g2s2-math-u1': (count = 6) => generateG2S2U1Numbers1000(count),
  'g2s2-math-u3': (count = 6) => generateG2S2U3AddSub3Digits(count),
  'g2s2-math-u5': (count = 6) => generateG2S2U5TenHundredMul(count),
  'g2s2-math-u6': (count = 6) => generateG2S2U6MetersCm(count),
  'g2s2-math-u7': (count = 6) => generateG2S2U7MulAddSub(count),
  'g2s2-math-u8': (count = 6) => generateG2S2U8CalendarDays(count),
  'g2s2-math-u9': (count = 6) => generateG2S2U9GroupingSharing(count),
  'g2s2-math-u10': (count = 6) => generateG2S2U10UnitFractions(count),
  'g1s1-math-u1': (count = 6) => generateG1S1U1Numbers10(count),
  'g1s1-math-u3': (count = 6) => generateG1S1U3OrderCompare(count),
  'g1s1-math-u4': (count = 6) => generateG1S1U4ComposeDecompose10(count),
  'g1s1-math-u6': (count = 6) => generateG1S1U6Numbers30(count),
  'g1s1-math-u7': (count = 6) => generateG1S1U7Add10(count),
  'g1s1-math-u8': (count = 6) => generateG1S1U8Sub10(count),
  'g1s1-math-u9': (count = 6) => generateG1S1U9ClockHours(count),
  'g1s2-math-u1': (count = 6) => generateG1S2U1Numbers50(count),
  'g1s2-math-u2': (count = 6) => generateG1S2U2CarryAdd18(count),
  'g1s2-math-u4': (count = 6) => generateG1S2U4BorrowSub18(count),
  'g1s2-math-u6': (count = 6) => generateG1S2U6Numbers100(count),
  'g1s2-math-u7': (count = 6) => generateG1S2U7Coins(count),
  'g1s2-math-u8': (count = 6) => generateG1S2U8AddSub2Digits(count),
  'g1s2-math-u9': (count = 6) => generateG1S2U9CalendarDate(count),
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
