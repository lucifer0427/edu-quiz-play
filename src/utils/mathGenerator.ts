import type { Difficulty, Question } from '../types/quiz';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildNumericOptions(answer: number): {
  options: [string, string, string, string];
  answerIndex: number;
} {
  const candidates = new Set<number>([answer]);
  const offsets = [-10, -3, -2, -1, 1, 2, 3, 4, 5, 10];

  let guard = 0;
  while (candidates.size < 4 && guard < 40) {
    guard++;
    const delta = offsets[randomInt(0, offsets.length - 1)];
    const candidate = answer + delta;
    if (candidate >= 0 && candidate !== answer) {
      candidates.add(candidate);
    }
  }

  let fallback = 1;
  while (candidates.size < 4) {
    const candidate = answer + fallback;
    if (!candidates.has(candidate)) {
      candidates.add(candidate);
    }
    fallback++;
  }

  const shuffled = shuffle(Array.from(candidates)).map(String) as [
    string,
    string,
    string,
    string,
  ];
  return {
    options: shuffled,
    answerIndex: shuffled.indexOf(String(answer)),
  };
}

function createEasyQuestion(index: number, seed: number): Question {
  const mode = randomInt(0, 2);
  let prompt = '';
  let answer = 0;
  let explanation = '';
  let hint = '';

  if (mode === 0) {
    const a = randomInt(12, 68);
    const b = randomInt(5, 29);
    answer = a + b;
    prompt = `${a} + ${b} = ?`;
    explanation = `把個位數和十位數分開加，或從 ${a} 往上數 ${b}，得到 ${answer}。`;
    hint = `可以先算個位數 ${(a % 10) + (b % 10)} 看看有沒有進位！`;
  } else if (mode === 1) {
    const a = randomInt(35, 95);
    const b = randomInt(8, a - 5);
    answer = a - b;
    prompt = `${a} - ${b} = ?`;
    explanation = `${a} 減掉 ${b}，結果是 ${answer}。可以用「${answer} + ${b} = ${a}」來驗算喔！`;
    hint = `從 ${a} 往下扣掉 ${b}，不夠減記得跟十位借 10。`;
  } else {
    const apples = randomInt(10, 30);
    const extra = randomInt(4, 15);
    const isAdd = randomInt(0, 1) === 0;
    if (isAdd) {
      answer = apples + extra;
      prompt = `小勇者原本有 ${apples} 顆魔法果實，又撿到 ${extra} 顆，現在總共有幾顆？`;
      explanation = `原本的加上新撿到的：${apples} + ${extra} = ${answer} 顆。`;
      hint = '「又撿到」表示數量變多，要用加法喔！';
    } else {
      answer = apples - extra;
      prompt = `背包裡有 ${apples} 顆星星糖，分給夥伴 ${extra} 顆後，還剩下幾顆？`;
      explanation = `分出去會變少，所以用減法：${apples} - ${extra} = ${answer} 顆。`;
      hint = '「分給別人還剩多少」要用減法計算！';
    }
  }

  const { options, answerIndex } = buildNumericOptions(answer);
  return {
    id: `dyn-math-easy-${seed}-${index}`,
    prompt,
    options,
    answerIndex,
    explanation,
    hint,
    speechText: prompt.replace('?', '多少'),
    speechLang: 'zh-TW',
  };
}

function createMediumQuestion(index: number, seed: number): Question {
  const mode = randomInt(0, 2);
  let prompt = '';
  let answer = 0;
  let explanation = '';
  let hint = '';

  if (mode === 0) {
    const a = randomInt(2, 9);
    const b = randomInt(2, 9);
    answer = a * b;
    prompt = `${a} × ${b} = ?`;
    explanation = `九九乘法口訣：${a} 乘以 ${b} 等於 ${answer}，也就是 ${a} 連加 ${b} 次。`;
    hint = `想一想「${a} 的乘法口訣」到第 ${b} 句！`;
  } else if (mode === 1) {
    const groups = randomInt(3, 9);
    const each = randomInt(4, 9);
    answer = groups * each;
    prompt = `一盒鉛筆有 ${each} 枝，老師買了 ${groups} 盒，一共有幾枝鉛筆？`;
    explanation = `每盒 ${each} 枝，共 ${groups} 盒：${each} × ${groups} = ${answer} 枝。`;
    hint = `每盒數量都一樣，可以用乘法 ${each} × ${groups} 快速算出來！`;
  } else {
    const a = randomInt(3, 8);
    const b = randomInt(2, 7);
    const c = randomInt(4, 15);
    answer = a * b + c;
    prompt = `${a} × ${b} + ${c} = ?`;
    explanation = `記得「先乘除、後加減」：先算 ${a} × ${b} = ${a * b}，再加上 ${c} 等於 ${answer}。`;
    hint = `要先算乘法 ${a} × ${b}，再把答案加上 ${c} 喔！`;
  }

  const { options, answerIndex } = buildNumericOptions(answer);
  return {
    id: `dyn-math-medium-${seed}-${index}`,
    prompt,
    options,
    answerIndex,
    explanation,
    hint,
    speechText: prompt.replace('?', '多少').replace('×', '乘以'),
    speechLang: 'zh-TW',
  };
}

function createHardQuestion(index: number, seed: number): Question {
  const mode = randomInt(0, 2);
  let prompt = '';
  let answer = 0;
  let explanation = '';
  let hint = '';

  if (mode === 0) {
    const divisor = randomInt(3, 9);
    const quotient = randomInt(4, 12);
    const dividend = divisor * quotient;
    const addend = randomInt(10, 35);
    answer = quotient + addend;
    prompt = `${dividend} ÷ ${divisor} + ${addend} = ?`;
    explanation = `先算除法：${dividend} ÷ ${divisor} = ${quotient}，再算 ${quotient} + ${addend} = ${answer}。`;
    hint = `先算左邊的除法 ${dividend} ÷ ${divisor} 吧！`;
  } else if (mode === 1) {
    const a = randomInt(6, 15);
    const b = randomInt(3, 8);
    const mult = randomInt(2, 5);
    answer = (a + b) * mult;
    prompt = `(${a} + ${b}) × ${mult} = ?`;
    explanation = `有括號要先算括號裡面：${a} + ${b} = ${a + b}，再算 ${a + b} × ${mult} = ${answer}。`;
    hint = '看到小括號 () 一定要最先算裡面喔！';
  } else {
    const a = randomInt(120, 480);
    const b = randomInt(110, 390);
    answer = a + b;
    prompt = `${a} + ${b} = ?`;
    explanation = `三位數直式加法：個位、十位、百位對齊相加，${a} + ${b} = ${answer}。`;
    hint = '可以先把百位數相加，再補上十位和個位！';
  }

  const { options, answerIndex } = buildNumericOptions(answer);
  return {
    id: `dyn-math-hard-${seed}-${index}`,
    prompt,
    options,
    answerIndex,
    explanation,
    hint,
    speechText: prompt
      .replace('?', '多少')
      .replace('×', '乘以')
      .replace('÷', '除以'),
    speechLang: 'zh-TW',
  };
}

export function generateMathQuestions(
  level: Difficulty,
  count: number,
): Question[] {
  const seed = Date.now();
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    if (level === 'easy') {
      questions.push(createEasyQuestion(i, seed));
    } else if (level === 'medium') {
      questions.push(createMediumQuestion(i, seed));
    } else {
      questions.push(createHardQuestion(i, seed));
    }
  }
  return questions;
}
