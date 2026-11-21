import type { Question } from '../../types/quiz';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function simplifyFraction(n: number, d: number): [number, number] {
  const g = gcd(n, d);
  return [n / g, d / g];
}

function formatFraction(n: number, d: number): string {
  const [sn, sd] = simplifyFraction(n, d);
  return sd === 1 ? String(sn) : `${sn}/${sd}`;
}

function formatMixedFraction(n: number, d: number): string {
  const [sn, sd] = simplifyFraction(n, d);
  if (sd === 1) return String(sn);
  if (sn > sd) {
    const whole = Math.floor(sn / sd);
    const rem = sn % sd;
    return `${whole} 又 ${rem}/${sd}`;
  }
  return `${sn}/${sd}`;
}

/**
 * 以「整數值 × 10^(-decPlaces)」格式化十進位數字，完全避免浮點數誤差。
 * decPlaces > 0 表示小數位數；decPlaces <= 0 表示整數後面補 |decPlaces| 個 0。
 */
function formatScaledDecimal(intVal: number, decPlaces: number): string {
  const cleanInt = Math.round(Math.abs(intVal));
  const sign = intVal < 0 ? '-' : '';
  if (cleanInt === 0) return '0';
  if (decPlaces <= 0) {
    return `${sign}${cleanInt}${'0'.repeat(-decPlaces)}`;
  }
  const raw = String(cleanInt);
  const padded = raw.length <= decPlaces ? `${'0'.repeat(decPlaces + 1 - raw.length)}${raw}` : raw;
  const splitIdx = padded.length - decPlaces;
  const intPart = padded.slice(0, splitIdx);
  const fracPart = padded.slice(splitIdx).replace(/0+$/, '');
  return fracPart === '' ? `${sign}${intPart}` : `${sign}${intPart}.${fracPart}`;
}

function buildNumericOptions(
  answer: number,
  extraCandidates: number[] = [],
  unitSuffix = '',
): { options: [string, string, string, string]; answerIndex: number } {
  const set = new Set<number>([answer]);
  for (const c of extraCandidates) {
    if (Number.isSafeInteger(c) && c > 0 && c !== answer && set.size < 4) {
      set.add(c);
    }
  }
  const baseStep =
    answer >= 100000
      ? Math.pow(10, Math.max(2, String(answer).length - 3))
      : answer >= 1000
        ? 100
        : 1;
  const deltas = [-8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 10, 12];
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    guard++;
    const next = answer + pickRandom(deltas) * baseStep;
    if (Number.isSafeInteger(next) && next > 0 && next !== answer) {
      set.add(next);
    }
  }
  let fallback = baseStep;
  while (set.size < 4) {
    const next = answer + fallback;
    if (!set.has(next)) set.add(next);
    fallback += baseStep;
  }
  const answerText = `${answer}${unitSuffix}`;
  const options = shuffle(Array.from(set).map((v) => `${v}${unitSuffix}`)) as [
    string,
    string,
    string,
    string,
  ];
  return { options, answerIndex: options.indexOf(answerText) };
}

function buildScaledDecimalOptions(
  ansInt: number,
  ansDecPlaces: number,
  extraCandidates: Array<[number, number]> = [],
  unitSuffix = '',
): { options: [string, string, string, string]; answerIndex: number } {
  const ansStr = `${formatScaledDecimal(ansInt, ansDecPlaces)}${unitSuffix}`;
  const set = new Set<string>([ansStr]);
  for (const [cInt, cDec] of extraCandidates) {
    if (Number.isSafeInteger(cInt) && cInt > 0) {
      const formatted = `${formatScaledDecimal(cInt, cDec)}${unitSuffix}`;
      if (formatted !== ansStr && set.size < 4) {
        set.add(formatted);
      }
    }
  }
  const deltas = [-100, -50, -20, -10, -5, -2, -1, 1, 2, 5, 10, 20, 50, 100];
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    guard++;
    const candInt = ansInt + pickRandom(deltas);
    if (candInt > 0) {
      set.add(`${formatScaledDecimal(candInt, ansDecPlaces)}${unitSuffix}`);
    }
  }
  let step = 1;
  while (set.size < 4) {
    set.add(`${formatScaledDecimal(ansInt + step, ansDecPlaces)}${unitSuffix}`);
    step++;
  }
  const options = shuffle(Array.from(set)) as [string, string, string, string];
  return { options, answerIndex: options.indexOf(ansStr) };
}

function buildFractionOptions(
  ansN: number,
  ansD: number,
  extraCandidates: Array<[number, number]> = [],
  unitSuffix = '',
  useMixed = true,
): { options: [string, string, string, string]; answerIndex: number } {
  const fmt = useMixed ? formatMixedFraction : formatFraction;
  const [sn, sd] = simplifyFraction(ansN, ansD);
  const ansKey = `${sn}/${sd}`;
  const ansStr = `${fmt(sn, sd)}${unitSuffix}`;
  const seenKeys = new Set<string>([ansKey]);
  const optionList: string[] = [ansStr];

  for (const [cn, cd] of extraCandidates) {
    if (cn > 0 && cd > 0 && optionList.length < 4) {
      const [csn, csd] = simplifyFraction(cn, cd);
      const key = `${csn}/${csd}`;
      if (!seenKeys.has(key)) {
        const text = `${fmt(csn, csd)}${unitSuffix}`;
        if (!optionList.includes(text)) {
          seenKeys.add(key);
          optionList.push(text);
        }
      }
    }
  }

  let step = 1;
  while (optionList.length < 4) {
    const [fn, fd] = simplifyFraction(sn + step, sd);
    const key = `${fn}/${fd}`;
    if (!seenKeys.has(key)) {
      const text = `${fmt(fn, fd)}${unitSuffix}`;
      if (!optionList.includes(text)) {
        seenKeys.add(key);
        optionList.push(text);
      }
    }
    step++;
  }

  const options = shuffle(optionList) as [string, string, string, string];
  return { options, answerIndex: options.indexOf(ansStr) };
}

function buildStringOptions(
  answer: string,
  distractors: string[],
): { options: [string, string, string, string]; answerIndex: number } {
  const set = new Set<string>([answer]);
  for (const d of distractors) {
    if (d && d !== answer && set.size < 4) {
      set.add(d);
    }
  }
  let extra = 1;
  while (set.size < 4) {
    set.add(`${answer}（選項 ${extra}）`);
    extra++;
  }
  const options = shuffle(Array.from(set)) as [string, string, string, string];
  return { options, answerIndex: options.indexOf(answer) };
}

function formatTimePair(big: number, small: number, bigUnit: string, smallUnit: string): string {
  return small === 0 ? `${big} ${bigUnit}` : `${big} ${bigUnit} ${small} ${smallUnit}`;
}

function buildTimePairOptions(
  ansBig: number,
  ansSmall: number,
  bigUnit: string,
  smallUnit: string,
  base: number,
  candidates: Array<[number, number]>,
): { options: [string, string, string, string]; answerIndex: number } {
  const ansStr = formatTimePair(ansBig, ansSmall, bigUnit, smallUnit);
  const set = new Set<string>([ansStr]);
  for (const [b, s] of candidates) {
    if (b >= 1 && s >= 0 && set.size < 4) {
      set.add(formatTimePair(b, s, bigUnit, smallUnit));
    }
  }
  const fallbacks: Array<[number, number]> = [
    [ansBig + 1, ansSmall],
    [Math.max(1, ansBig - 1), ansSmall],
    [ansBig + 2, ansSmall],
    [ansBig, (ansSmall + 5) % base || 5],
    [ansBig, (ansSmall + 10) % base || 10],
  ];
  for (const [b, s] of fallbacks) {
    if (set.size >= 4) break;
    set.add(formatTimePair(b, s, bigUnit, smallUnit));
  }
  const options = shuffle(Array.from(set)) as [string, string, string, string];
  return { options, answerIndex: options.indexOf(ansStr) };
}

function makeQuestion(
  idPrefix: string,
  seed: number,
  index: number,
  prompt: string,
  built: { options: [string, string, string, string]; answerIndex: number },
  explanation: string,
  hint: string,
): Question {
  const speechText = prompt
    .replace(/([（(]\s*)？(\s*[）)])/g, '$1多少$2')
    .replace(/\?/g, '多少')
    .replace(/？/g, '')
    .replace(/□/g, '多少')
    .replace(/×/g, '乘以')
    .replace(/÷/g, '除以')
    .replace(/:/g, '比')
    .replace(/＝|=/g, '等於')
    .replace(/cm³/g, '立方公分')
    .replace(/m³/g, '立方公尺')
    .replace(/cm²/g, '平方公分')
    .replace(/m²/g, '平方公尺');
  return {
    id: `${idPrefix}-${seed}-${index}`,
    subjectId: 'math',
    prompt,
    options: built.options,
    answerIndex: built.answerIndex,
    explanation,
    hint,
    speechText,
    speechLang: 'zh-TW',
  };
}

const ZH_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

function twoDigitToZh(n: number): string {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensText = tens === 1 ? '十' : `${ZH_DIGITS[tens]}十`;
  return ones === 0 ? tensText : `${tensText}${ZH_DIGITS[ones]}`;
}

/** 五下第1章：數的十進位結構（大數讀寫、10倍與1/10倍移位、位值換算、大數乘除） */
export function generateG5S2U1DecimalPlace(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 大數讀寫（億位、兆位，含中間補 0）
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const t = randomInt(1, 9);
        const y1 = randomInt(1, 9);
        let y2 = randomInt(1, 9);
        while (y2 === y1) y2 = randomInt(1, 9);
        const reading = `${ZH_DIGITS[t]}兆${ZH_DIGITS[y1]}千零${ZH_DIGITS[y2]}億`;
        const ans = `${t}${y1}00${y2}00000000`;
        const wrongs = [
          `${t}${y1}0${y2}00000000`,
          `${t}${y1}00${y2}0000000`,
          `${t}0${y1}00${y2}00000000`,
        ];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `「${reading}」寫成阿拉伯數字是多少？`,
            built,
            `以四位一節分級：兆級是 ${t}、億級是 ${y1}00${y2}、萬級是 0000、個級是 0000，合起來為 ${ans}。`,
            '從右邊每 4 位劃一條分隔線（個、萬、億、兆），空缺的位數記得補 0！',
          ),
        );
      } else if (variant === 1) {
        const t = randomInt(2, 9);
        const y1 = randomInt(1, 9);
        const y2 = randomInt(1, 9);
        const digits = `${t}0${y1}0${y2}00000000`;
        const ans = `${ZH_DIGITS[t]}兆零${ZH_DIGITS[y1]}百零${ZH_DIGITS[y2]}億`;
        const wrongs = [
          `${ZH_DIGITS[t]}兆${ZH_DIGITS[y1]}百零${ZH_DIGITS[y2]}億`,
          `${ZH_DIGITS[t]}兆零${ZH_DIGITS[y1]}百${ZH_DIGITS[y2]}十億`,
          `${ZH_DIGITS[t]}千零${ZH_DIGITS[y1]}十零${ZH_DIGITS[y2]}億`,
        ];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `大數「${digits}」的正確中文讀法是哪一個？`,
            built,
            `從右邊每 4 位一節分開為「${t} | 0${y1}0${y2} | 0000 | 0000」，兆級是 ${t}、億級是 0${y1}0${y2}，讀作「${ans}」。`,
            '每 4 位分成一級：個級、萬級、億級、兆級，中間有連續 0 時要讀出「零」喔！',
          ),
        );
      } else {
        const y = randomInt(12, 89);
        const w1 = randomInt(1, 9);
        const w2 = randomInt(1, 9);
        const reading = `${twoDigitToZh(y)}億${ZH_DIGITS[w1]}千零${ZH_DIGITS[w2]}萬`;
        const ans = `${y}${w1}00${w2}0000`;
        const wrongs = [
          `${y}${w1}0${w2}0000`,
          `${y}0${w1}00${w2}0000`,
          `${y}${w1}00${w2}000`,
        ];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `「${reading}」寫成阿拉伯數字是多少？`,
            built,
            `億級是 ${y}、萬級是 ${w1}00${w2}、個級是 0000，寫成 ${ans}。`,
            '先寫億級，再填滿萬級 4 位數，最後補上個級 4 個 0！',
          ),
        );
      }
    } else if (mode === 1) {
      // 10 倍與 1/10 倍移位（含 100 倍、1000 倍與 1/100、1/1000）
      const baseInt = pickRandom([234, 405, 128, 375, 608, 514, 809, 725]);
      const initDecPlaces = randomInt(1, 3);
      const origStr = formatScaledDecimal(baseInt, initDecPlaces);
      const isMultiply = randomInt(0, 1) === 0;
      const shiftPower = pickRandom([1, 2, 3]);
      const factorLabel = shiftPower === 1 ? '10' : shiftPower === 2 ? '100' : '1000';

      if (isMultiply) {
        const newDecPlaces = initDecPlaces - shiftPower;
        const ansStr = formatScaledDecimal(baseInt, newDecPlaces);
        const built = buildScaledDecimalOptions(baseInt, newDecPlaces, [
          [baseInt, initDecPlaces + shiftPower],
          [baseInt, newDecPlaces + 1],
          [baseInt, newDecPlaces - 1],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `把 ${origStr} 變成原來的 ${factorLabel} 倍（乘以 ${factorLabel}），結果是多少？`,
            built,
            `乘以 ${factorLabel}（10 的 ${shiftPower} 次方）時，小數點向右移動 ${shiftPower} 位，${origStr} → ${ansStr}。`,
            `乘以 ${factorLabel} 會讓數字變大，小數點要向「右」移 ${shiftPower} 位！`,
          ),
        );
      } else {
        const fracLabel = shiftPower === 1 ? '1/10' : shiftPower === 2 ? '1/100' : '1/1000';
        const newDecPlaces = initDecPlaces + shiftPower;
        const ansStr = formatScaledDecimal(baseInt, newDecPlaces);
        const built = buildScaledDecimalOptions(baseInt, newDecPlaces, [
          [baseInt, initDecPlaces - shiftPower],
          [baseInt, newDecPlaces - 1],
          [baseInt, newDecPlaces + 1],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `把 ${origStr} 變成原來的 ${fracLabel} 倍（除以 ${factorLabel}），結果是多少？`,
            built,
            `變為原來的 ${fracLabel} 倍時，小數點向左移動 ${shiftPower} 位，${origStr} → ${ansStr}。`,
            `變成 ${fracLabel} 倍會讓數字變小，小數點要向「左」移 ${shiftPower} 位！`,
          ),
        );
      }
    } else if (mode === 2) {
      // 位值換算（大數位值倍數 & 多位小數位值組成）
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const pairs: Array<[string, string, number, string]> = [
          ['1 兆', '1 億', 10000, '1 兆 = 10000 億'],
          ['1 億', '1 萬', 10000, '1 億 = 10000 萬'],
          ['1 兆', '1 千億', 10, '10 個一千億合起來是 1 兆'],
          ['1 億', '1 千萬', 10, '10 個一千萬合起來是 1 億'],
          ['1 百萬', '1 萬', 100, '1 百萬 = 100 萬'],
        ];
        const [bigUnit, smallUnit, mult, rule] = pickRandom(pairs);
        const k = randomInt(2, 9);
        const ans = k * mult;
        const built = buildNumericOptions(ans, [
          k * (mult * 10),
          Math.max(1, Math.floor((k * mult) / 10)),
          k * 1000,
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `${k} 個「${bigUnit}」合起來，等於多少個「${smallUnit}」？`,
            built,
            `因為 ${rule}，所以 ${k} 個 ${bigUnit} = ${k} × ${mult} = ${ans} 個 ${smallUnit}。`,
            `想想看 1 個 ${bigUnit} 是幾個 ${smallUnit}（十進位每進一級差幾倍）！`,
          ),
        );
      } else if (variant === 1) {
        // 幾個 0.001 / 0.0001
        const cnt = pickRandom([35, 48, 125, 204, 560, 1205, 3040]);
        const decPlaces = pickRandom([3, 4]);
        const unitStr = decPlaces === 3 ? '0.001' : '0.0001';
        const ansStr = formatScaledDecimal(cnt, decPlaces);
        const built = buildScaledDecimalOptions(cnt, decPlaces, [
          [cnt, decPlaces - 1],
          [cnt, decPlaces + 1],
          [cnt, decPlaces - 2],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `${cnt} 個 ${unitStr} 合起來是多少？`,
            built,
            `1 個 ${unitStr} 是 10^(-${decPlaces})，${cnt} 個 ${unitStr} 就是小數點向左移 ${decPlaces} 位，等於 ${ansStr}。`,
            `把 ${cnt} 的最右邊對齊 ${unitStr} 的最後一位數（${decPlaces === 3 ? '千分位' : '萬分位'}）！`,
          ),
        );
      } else {
        // 多位小數裡面有幾個 0.001
        const ans = pickRandom([125, 240, 308, 1045, 2360, 4052]);
        const numStr = formatScaledDecimal(ans, 3);
        const built = buildNumericOptions(ans, [
          ans * 10,
          Math.max(1, Math.floor(ans / 10)),
          ans + 100,
        ], ' 個');
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `小數 ${numStr} 裡面總共是由幾個 0.001 組成的？`,
            built,
            `每 1 個 1 等於 1000 個 0.001，將 ${numStr} 的小數點向右移 3 位，得知共有 ${ans} 個 0.001。`,
            '把小數點向右移動到千分位後面，就能看出全部共有幾個 0.001！',
          ),
        );
      }
    } else {
      // 大數的乘與除（整數末位有多個 0）
      if (randomInt(0, 1) === 0) {
        const [a, b] = pickRandom([
          [25, 4],
          [15, 6],
          [12, 5],
          [35, 2],
          [45, 2],
          [24, 5],
          [18, 5],
          [32, 3],
          [21, 4],
        ]);
        const za = randomInt(3, 4);
        const zb = randomInt(2, 3);
        const aStr = `${a}${'0'.repeat(za)}`;
        const bStr = `${b}${'0'.repeat(zb)}`;
        const prodPrefix = a * b;
        const totalZeros = za + zb;
        const ans = `${prodPrefix}${'0'.repeat(totalZeros)}`;
        const wrongs = [
          `${prodPrefix}${'0'.repeat(totalZeros - 1)}`,
          `${prodPrefix}${'0'.repeat(totalZeros + 1)}`,
          `${prodPrefix}${'0'.repeat(Math.max(1, totalZeros - 2))}`,
        ];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `計算：${aStr} × ${bStr} = ?`,
            built,
            `先算前面的非零數字：${a} × ${b} = ${prodPrefix}，再把末位共 ${za} + ${zb} = ${totalZeros} 個 0 補在後面，結果是 ${ans}。`,
            `先把前面的數字相乘，再數清楚兩個數末位總共有幾個 0 補上去！注意 ${a} × ${b} 本身產生的 0 不要少算囉。`,
          ),
        );
      } else {
        const divPrefix = pickRandom([2, 3, 4, 5, 6, 8, 9]);
        const quotPrefix = pickRandom([12, 15, 24, 25, 32, 45, 60]);
        const divZeros = randomInt(2, 3);
        const quotZeros = randomInt(1, 3);
        const prodPrefix = quotPrefix * divPrefix;
        const dividendStr = `${prodPrefix}${'0'.repeat(quotZeros + divZeros)}`;
        const divisorStr = `${divPrefix}${'0'.repeat(divZeros)}`;
        const ansStr = `${quotPrefix}${'0'.repeat(quotZeros)}`;
        const wrongs = [
          `${quotPrefix}${'0'.repeat(quotZeros + 1)}`,
          `${quotPrefix}${'0'.repeat(Math.max(0, quotZeros - 1))}`,
          `${quotPrefix}${'0'.repeat(quotZeros + 2)}`,
        ];
        const built = buildStringOptions(ansStr, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u1',
            seed,
            i,
            `計算：${dividendStr} ÷ ${divisorStr} = ?`,
            built,
            `被除數和除數同時劃掉 ${divZeros} 個 0，變成 ${prodPrefix}${'0'.repeat(quotZeros)} ÷ ${divPrefix} = ${ansStr}。`,
            `被除數和除數末位可以「同時劃掉相同個數的 0」，算起來既快又不易錯！`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第2章：分數的計算（帶分數/假分數乘法、分數除以整數、乘數與積大小關係） */
export function generateG5S2U2FractionMulDiv(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 整數與帶分數／假分數乘法
      if (randomInt(0, 1) === 0) {
        const mult = pickRandom([4, 6, 8, 9, 10, 12, 15]);
        const whole = randomInt(1, 2);
        const den = pickRandom([3, 4, 5, 6]);
        let num = randomInt(1, den - 1);
        while (gcd(num, den) !== 1) num = randomInt(1, den - 1);
        const impN = whole * den + num;
        const ansN = mult * impN;
        const ansD = den;
        const wrongOnlyFrac: [number, number] = [whole * den + mult * num, den];
        const wrongWholeAdd: [number, number] = [(mult + whole) * den + num, den];
        const wrongDenMul: [number, number] = [impN, den * mult];
        const built = buildFractionOptions(ansN, ansD, [
          wrongOnlyFrac,
          wrongWholeAdd,
          wrongDenMul,
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u2',
            seed,
            i,
            `計算：${mult} × (${whole} 又 ${num}/${den}) = ?（以帶分數或整數作答）`,
            built,
            `先把帶分數化成假分數：${whole} 又 ${num}/${den} = ${impN}/${den}，再乘以 ${mult} 得 ${ansN}/${den} = ${formatMixedFraction(ansN, ansD)}。`,
            '帶分數乘以整數時，可以先把帶分數換成「假分數」再約分相乘！',
          ),
        );
      } else {
        // 生活應用：每份帶分數 × 份數
        const bottles = randomInt(3, 7);
        const whole = randomInt(1, 2);
        const den = pickRandom([3, 4, 5, 6, 8]);
        let num = randomInt(1, den - 1);
        while (gcd(num, den) !== 1) num = randomInt(1, den - 1);
        const impN = whole * den + num;
        const ansN = impN * bottles;
        const ansD = den;
        const built = buildFractionOptions(
          ansN,
          ansD,
          [
            [whole * den + num * bottles, den],
            [ansN + 1, ansD],
            [Math.max(1, ansN - 1), ansD],
          ],
          ' 公升',
        );
        questions.push(
          makeQuestion(
            'g5s2-u2',
            seed,
            i,
            `1 瓶柳橙汁有 ${whole} 又 ${num}/${den} 公升，買 ${bottles} 瓶共有多少公升？（以帶分數或整數作答）`,
            built,
            `(${whole} 又 ${num}/${den}) × ${bottles} = (${impN}/${den}) × ${bottles} = ${ansN}/${den} = ${formatMixedFraction(ansN, ansD)} 公升。`,
            '記得先把帶分數的整數和分數部分一起放大（或先化成假分數再乘）！',
          ),
        );
      }
    } else if (mode === 1) {
      // 帶分數／假分數 × 分數（含約分）
      const cases: Array<[number, number, number, number, number]> = [
        // whole1, n1, d1, n2, d2
        [1, 1, 3, 3, 4],
        [1, 2, 5, 5, 7],
        [2, 1, 4, 2, 3],
        [1, 3, 5, 5, 8],
        [2, 1, 3, 3, 7],
        [1, 1, 2, 4, 5],
        [2, 2, 3, 3, 4],
        [1, 5, 6, 3, 5],
      ];
      const [w1, n1, d1, n2, d2] = pickRandom(cases);
      const imp1 = w1 * d1 + n1;
      const ansN = imp1 * n2;
      const ansD = d1 * d2;
      // 常見錯法：整數部分沒參與乘法，寫成 w1 + (n1*n2)/(d1*d2)
      const wrongIgnoreWhole: [number, number] = [w1 * ansD + n1 * n2, ansD];
      const wrongFlipSecond: [number, number] = [imp1 * d2, d1 * n2];
      const wrongAddNum: [number, number] = [imp1 + n2, ansD];
      const built = buildFractionOptions(ansN, ansD, [
        wrongIgnoreWhole,
        wrongFlipSecond,
        wrongAddNum,
      ]);
      questions.push(
        makeQuestion(
          'g5s2-u2',
          seed,
          i,
          `計算：(${w1} 又 ${n1}/${d1}) × (${n2}/${d2}) = ?（以帶分數、最簡真分數或整數作答）`,
          built,
          `先將帶分數換成假分數：${w1} 又 ${n1}/${d1} = ${imp1}/${d1}，再與 ${n2}/${d2} 分子乘分子、分母乘分母（可先交叉約分），得 ${formatMixedFraction(ansN, ansD)}。`,
          '分數乘法記得「帶分數先化假分數，交叉約分後再相乘」！',
        ),
      );
    } else if (mode === 2) {
      // 分數除以整數（含真分數與帶分數）
      const useMixed = randomInt(0, 1) === 0;
      const divisor = pickRandom([2, 3, 4, 5, 6]);
      if (useMixed) {
        const whole = randomInt(1, 3);
        const den = pickRandom([2, 3, 4, 5]);
        let num = randomInt(1, den - 1);
        while (gcd(num, den) !== 1) num = randomInt(1, den - 1);
        const impN = whole * den + num;
        const ansN = impN;
        const ansD = den * divisor;
        const wrongMulInstead: [number, number] = [impN * divisor, den];
        const wrongOnlyFrac: [number, number] = [whole * den * divisor + num, den * divisor];
        const wrongInvert: [number, number] = [den * divisor, impN];
        const built = buildFractionOptions(
          ansN,
          ansD,
          [wrongMulInstead, wrongOnlyFrac, wrongInvert],
          ' 公尺',
        );
        questions.push(
          makeQuestion(
            'g5s2-u2',
            seed,
            i,
            `把一條長 ${whole} 又 ${num}/${den} 公尺的繩子平分剪成 ${divisor} 段，每段長多少公尺？（以最簡分數作答）`,
            built,
            `先化假分數：${whole} 又 ${num}/${den} = ${impN}/${den}，除以 ${divisor} 等於乘以 1/${divisor}，所以是 (${impN}/${den}) × (1/${divisor}) = ${formatMixedFraction(ansN, ansD)} 公尺。`,
            `「除以整數 ${divisor}」就是「乘以 1/${divisor}」，先把帶分數換成假分數再算！`,
          ),
        );
      } else {
        const den = pickRandom([3, 4, 5, 6, 7, 8]);
        let num = randomInt(2, den - 1);
        while (gcd(num, den) !== 1) num = randomInt(1, den - 1);
        const ansN = num;
        const ansD = den * divisor;
        const wrongMulInstead: [number, number] = [num * divisor, den];
        const wrongAddDen: [number, number] = [num, den + divisor];
        const wrongInvert: [number, number] = [den, num * divisor];
        const built = buildFractionOptions(ansN, ansD, [
          wrongMulInstead,
          wrongAddDen,
          wrongInvert,
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u2',
            seed,
            i,
            `計算：(${num}/${den}) ÷ ${divisor} = ?（以最簡分數作答）`,
            built,
            `分數除以整數等於分母乘以該整數（乘以 1/${divisor}）：(${num}/${den}) × (1/${divisor}) = ${num}/${ansD}${formatMixedFraction(ansN, ansD) !== `${num}/${ansD}` ? ` = ${formatMixedFraction(ansN, ansD)}` : ''}。`,
            `除以 ${divisor} 等於乘以 ${divisor} 分之 1（分母乘以 ${divisor}），能約分要記得約分！`,
          ),
        );
      }
    } else {
      // 被乘數、乘數與積的大小關係
      const base = pickRandom(['3/5', '5/7', '4/9', '1 又 1/4', '2 又 1/3']);
      const askGreater = randomInt(0, 1) === 0;
      const gtMult = pickRandom(['1 又 1/3', '1 又 2/5', '5/4', '4/3']);
      const ltMult1 = pickRandom(['2/3', '3/4', '4/5']);
      const ltMult2 = pickRandom(['1/2', '3/5', '5/6']);
      const eqMult = '1';
      if (askGreater) {
        const ans = `${base} × (${gtMult})`;
        const wrongs = [`${base} × (${ltMult1})`, `${base} × (${ltMult2})`, `${base} × ${eqMult}`];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u2',
            seed,
            i,
            `不用算出答案，下列哪一個算式的積會「大於」${base}？`,
            built,
            `當乘數大於 1（例如 ${gtMult}）時，積會大於被乘數 ${base}；乘數等於 1 時積不變；乘數小於 1 時積會變小。`,
            '看乘數有沒有「大於 1」：真分數小於 1，帶分數或分子大於分母的假分數大於 1！',
          ),
        );
      } else {
        const ans = `${base} × (${ltMult1})`;
        const gtMult2 = pickRandom(['1 又 1/2', '2 又 1/4', '7/5']);
        const wrongs = [`${base} × (${gtMult})`, `${base} × (${gtMult2})`, `${base} × ${eqMult}`];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u2',
            seed,
            i,
            `不用算出答案，下列哪一個算式的積會「小於」${base}？`,
            built,
            `當乘數小於 1（真分數 ${ltMult1}）時，積會小於被乘數 ${base}。`,
            '找找看哪一個算式的「乘數」是小於 1 的真分數！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第3章：長方體與正方體的體積（體積計算、複合體積、cm³ ↔ m³） */
export function generateG5S2U3CuboidVolume(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 長方體或正方體體積計算
      if (randomInt(0, 1) === 0) {
        const l = randomInt(5, 14);
        const w = randomInt(4, 10);
        const h = randomInt(3, 9);
        const ans = l * w * h;
        const surf = 2 * (l * w + w * h + l * h);
        const built = buildNumericOptions(
          ans,
          [surf !== ans ? surf : ans + l, l * w + h, (l + w + h) * 4],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `一個長方體盒子長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分，它的體積是多少立方公分？`,
            built,
            `長方體體積 = 長 × 寬 × 高 = ${l} × ${w} × ${h} = ${ans} 立方公分。`,
            '記得長方體體積公式是「長 × 寬 × 高」喔！',
          ),
        );
      } else {
        const s = pickRandom([4, 5, 7, 8, 9, 10, 12]);
        const ans = s * s * s;
        const surf = 6 * s * s;
        const built = buildNumericOptions(
          ans,
          [surf, s * s, s * 12],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `一個每條邊長都是 ${s} 公分的正方體魔術方塊，它的體積是多少立方公分？`,
            built,
            `正方體體積 = 邊長 × 邊長 × 邊長 = ${s} × ${s} × ${s} = ${ans} 立方公分。`,
            '正方體長、寬、高都相等，把邊長連乘三次！',
          ),
        );
      }
    } else if (mode === 1) {
      // 簡單複合形體體積（疊加或切角）
      if (randomInt(0, 1) === 0) {
        const l1 = randomInt(10, 16);
        const w1 = randomInt(6, 10);
        const h1 = randomInt(4, 8);
        const l2 = randomInt(4, l1 - 3);
        const w2 = randomInt(3, w1 - 1);
        const h2 = randomInt(3, 7);
        const v1 = l1 * w1 * h1;
        const v2 = l2 * w2 * h2;
        const ans = v1 + v2;
        const built = buildNumericOptions(
          ans,
          [v1 - v2, v1, l1 * w1 * (h1 + h2)],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `用兩個長方體上下堆疊成階梯狀積木：下層長 ${l1} 公分、寬 ${w1} 公分、高 ${h1} 公分；上層長 ${l2} 公分、寬 ${w2} 公分、高 ${h2} 公分，總體積是多少立方公分？`,
            built,
            `下層體積 = ${l1} × ${w1} × ${h1} = ${v1} 立方公分；上層體積 = ${l2} × ${w2} × ${h2} = ${v2} 立方公分；總體積 = ${v1} + ${v2} = ${ans} 立方公分。`,
            '把複合形體拆成上下兩個長方體，分別算出體積再相加！',
          ),
        );
      } else {
        const l = randomInt(10, 16);
        const w = randomInt(8, 12);
        const h = randomInt(6, 10);
        const cl = randomInt(3, 6);
        const cw = randomInt(3, 5);
        const ch = randomInt(2, h - 1);
        const bigV = l * w * h;
        const cutV = cl * cw * ch;
        const ans = bigV - cutV;
        const built = buildNumericOptions(
          ans,
          [bigV + cutV, bigV, ans - cutV],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `從一個長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的大長方體角落，切掉一個長 ${cl} 公分、寬 ${cw} 公分、高 ${ch} 公分的小長方體後，剩下的體積是多少立方公分？`,
            built,
            `大長方體體積 = ${l} × ${w} × ${h} = ${bigV} 立方公分；切掉的部分 = ${cl} × ${cw} × ${ch} = ${cutV} 立方公分；剩下 = ${bigV} - ${cutV} = ${ans} 立方公分。`,
            '先算完整大長方體的體積，再減掉被切掉的小長方體體積！',
          ),
        );
      }
    } else if (mode === 2) {
      // cm³ ↔ m³ 換算（1 立方公尺 = 1000000 立方公分）
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const m = randomInt(2, 9);
        const ans = m * 1000000;
        const built = buildNumericOptions(
          ans,
          [m * 100, m * 10000, m * 100000],
          ' cm³',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `${m} m³ 等於多少 cm³？（1 立方公尺 = 1000000 立方公分）`,
            built,
            `1 公尺 = 100 公分，所以 1 立方公尺 = 100 × 100 × 100 = 1000000 立方公分。${m} m³ = ${ans} cm³。`,
            '長、寬、高各乘以 100，合起來要乘以 1000000（6 個 0）喔！',
          ),
        );
      } else if (variant === 1) {
        const mTenths = pickRandom([15, 24, 30, 45, 50, 80]);
        const cm3 = mTenths * 100000;
        const mStr = formatScaledDecimal(mTenths, 1);
        const built = buildScaledDecimalOptions(
          mTenths,
          1,
          [
            [mTenths, 0],
            [mTenths, 2],
            [mTenths, -1],
          ],
          ' m³',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `${cm3} cm³ 換算成 m³ 是多少？`,
            built,
            `1 m³ = 1000000 cm³，將 ${cm3} 除以 1000000（小數點向左移 6 位）得 ${mStr} m³。`,
            '把立方公分換成立方公尺要除以 1000000（小數點向左移 6 位）！',
          ),
        );
      } else {
        const lCm = pickRandom([100, 200, 300]);
        const wCm = pickRandom([100, 150, 200]);
        const hCm = pickRandom([100, 200]);
        const ansTenths = Math.round((lCm * wCm * hCm) / 100000);
        const ansStr = formatScaledDecimal(ansTenths, 1);
        const built = buildScaledDecimalOptions(
          ansTenths,
          1,
          [
            [ansTenths, 0],
            [ansTenths, -1],
            [ansTenths + 10, 1],
          ],
          ' 立方公尺',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `一個長方體貨櫃長 ${lCm} 公分、寬 ${wCm} 公分、高 ${hCm} 公分，體積是多少立方公尺？`,
            built,
            `先換成公尺：長 ${formatScaledDecimal(lCm, 2)} 公尺、寬 ${formatScaledDecimal(wCm, 2)} 公尺、高 ${formatScaledDecimal(hCm, 2)} 公尺，相乘得 ${ansStr} 立方公尺。`,
            '先把公分換成公尺（除以 100）再相乘，算起來最簡單！',
          ),
        );
      }
    } else {
      // 反推高／邊長或邊長放大倍數
      if (randomInt(0, 1) === 0) {
        const l = randomInt(5, 12);
        const w = randomInt(4, 10);
        const h = randomInt(3, 9);
        const vol = l * w * h;
        const built = buildNumericOptions(
          h,
          [l * w, h * 2, Math.max(1, vol - l * w)],
          ' 公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `一個長方體的體積是 ${vol} 立方公分，已知長是 ${l} 公分、寬是 ${w} 公分，高是多少公分？`,
            built,
            `長 × 寬 = ${l} × ${w} = ${l * w} 平方公分，高 = 體積 ÷ (長 × 寬) = ${vol} ÷ ${l * w} = ${h} 公分。`,
            '用總體積除以「長 × 寬」，就能反推出高是多少！',
          ),
        );
      } else {
        const k = pickRandom([2, 3, 4]);
        const ans = k * k * k;
        const built = buildNumericOptions(ans, [k, k * 3, k * k], ' 倍');
        questions.push(
          makeQuestion(
            'g5s2-u3',
            seed,
            i,
            `把一個正方體的每條邊長都變成原來的 ${k} 倍，它的體積會變成原來的幾倍？`,
            built,
            `正方體體積 = 邊長 × 邊長 × 邊長，每邊都變成 ${k} 倍，體積會變成 ${k} × ${k} × ${k} = ${ans} 倍。`,
            '長、寬、高各自變成幾倍，把三個倍數乘起來！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第4章：小數（三位小數加減、小數乘整數與小數、小數點移位） */
export function generateG5S2U4Decimals(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 三位小數加減（整數放大 1000 倍）
      const isAdd = randomInt(0, 1) === 0;
      const a1000 = randomInt(2105, 6895);
      let b1000 = randomInt(1055, isAdd ? 3495 : a1000 - 300);
      if (a1000 % 10 === 0 && b1000 % 10 === 0) b1000 += 3;
      const ans1000 = isAdd ? a1000 + b1000 : a1000 - b1000;
      const aStr = formatScaledDecimal(a1000, 3);
      const bStr = formatScaledDecimal(b1000, 3);
      const ansStr = formatScaledDecimal(ans1000, 3);
      const built = buildScaledDecimalOptions(ans1000, 3, [
        [ans1000 + 100, 3],
        [Math.max(10, ans1000 - 100), 3],
        [ans1000 + 10, 3],
      ]);
      questions.push(
        makeQuestion(
          'g5s2-u4',
          seed,
          i,
          `計算三位小數：${aStr} ${isAdd ? '+' : '-'} ${bStr} = ?`,
          built,
          `把小數點對齊後進行${isAdd ? '加法' : '減法'}計算，${aStr} ${isAdd ? '+' : '-'} ${bStr} = ${ansStr}。`,
          '小數加減法最重要就是「小數點上下對齊」，再從最右邊千分位算起！',
        ),
      );
    } else if (mode === 1) {
      // 小數乘以整數 或 整數乘以小數
      const aScaled = pickRandom([125, 235, 308, 415, 1025, 245, 36]);
      const decA = aScaled >= 1000 ? 3 : 2;
      const intB = pickRandom([4, 6, 8, 12, 15, 24]);
      const prodScaled = aScaled * intB;
      const aStr = formatScaledDecimal(aScaled, decA);
      const ansStr = formatScaledDecimal(prodScaled, decA);
      const askIntFirst = randomInt(0, 1) === 0;
      const expr = askIntFirst ? `${intB} × ${aStr}` : `${aStr} × ${intB}`;
      const built = buildScaledDecimalOptions(prodScaled, decA, [
        [prodScaled, decA - 1],
        [prodScaled, decA + 1],
        [prodScaled + Math.pow(10, decA), decA],
      ]);
      questions.push(
        makeQuestion(
          'g5s2-u4',
          seed,
          i,
          `計算：${expr} = ?`,
          built,
          `先當成整數相乘：${aScaled} × ${intB} = ${prodScaled}，因為共有 ${decA} 位小數，點上小數點後得到 ${ansStr}。`,
          `先把小數點拿掉當整數乘，算出結果後再從右邊數 ${decA} 位點上小數點！`,
        ),
      );
    } else if (mode === 2) {
      // 小數乘以小數（整數放大後點小數點）
      const aScaled = pickRandom([12, 15, 24, 25, 32, 35, 45, 125]);
      const decA = aScaled >= 100 ? 2 : 1;
      const bScaled = pickRandom([4, 6, 8, 12, 15, 25, 35]);
      const decB = bScaled >= 10 ? 2 : 1;
      const totalDec = decA + decB;
      const prodScaled = aScaled * bScaled;
      const aStr = formatScaledDecimal(aScaled, decA);
      const bStr = formatScaledDecimal(bScaled, decB);
      const ansStr = formatScaledDecimal(prodScaled, totalDec);
      const built = buildScaledDecimalOptions(prodScaled, totalDec, [
        [prodScaled, totalDec - 1],
        [prodScaled, totalDec + 1],
        [prodScaled, Math.max(0, totalDec - 2)],
      ]);
      questions.push(
        makeQuestion(
          'g5s2-u4',
          seed,
          i,
          `計算：${aStr} × ${bStr} = ?`,
          built,
          `先算整數乘法 ${aScaled} × ${bScaled} = ${prodScaled}；被乘數有 ${decA} 位小數、乘數有 ${decB} 位小數，積共有 ${totalDec} 位小數，所以是 ${ansStr}。`,
          `積的小數位數等於「被乘數小數位數 + 乘數小數位數」，先算整數積再向左數出小數位數（去掉末尾 0）！`,
        ),
      );
    } else {
      // 小數點移位與小數/整數除法
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const base = pickRandom([48, 305, 126, 75, 409]);
        const initDec = randomInt(2, 3);
        const origStr = formatScaledDecimal(base, initDec);
        const shiftRight = randomInt(0, 1) === 0;
        const steps = randomInt(1, 2);
        const newDec = shiftRight ? initDec - steps : initDec + steps;
        const ansStr = formatScaledDecimal(base, newDec);
        const built = buildScaledDecimalOptions(base, newDec, [
          [base, shiftRight ? initDec + steps : initDec - steps],
          [base, newDec + 1],
          [base, newDec - 1],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u4',
            seed,
            i,
            `將 ${origStr} 的小數點向${shiftRight ? '右' : '左'}移動 ${steps} 位後，會變成哪一個數？`,
            built,
            `小數點向${shiftRight ? '右' : '左'}移動 ${steps} 位，相當於${shiftRight ? '乘以' : '除以'} ${steps === 1 ? 10 : 100}，${origStr} 變成 ${ansStr}。`,
            `向「右」移位數字變大，向「左」移位數字變小，數清楚移動幾位、不夠時補 0！`,
          ),
        );
      } else if (variant === 1) {
        const aInt = pickRandom([24, 32, 45, 16, 28]);
        const bInt = pickRandom([15, 25, 12, 35]);
        const prodInt = aInt * bInt;
        const decA = randomInt(1, 2);
        const decB = randomInt(1, 2);
        const totalDec = decA + decB;
        const aStr = formatScaledDecimal(aInt, decA);
        const bStr = formatScaledDecimal(bInt, decB);
        const ansStr = formatScaledDecimal(prodInt, totalDec);
        const built = buildScaledDecimalOptions(prodInt, totalDec, [
          [prodInt, totalDec - 1],
          [prodInt, totalDec + 1],
          [prodInt, Math.max(0, totalDec - 2)],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u4',
            seed,
            i,
            `已知 ${aInt} × ${bInt} = ${prodInt}，那麼 ${aStr} × ${bStr} 是多少？`,
            built,
            `${aStr} 有 ${decA} 位小數、${bStr} 有 ${decB} 位小數，共 ${totalDec} 位小數，把 ${prodInt} 的小數點向左移 ${totalDec} 位得到 ${ansStr}。`,
            `直接把 ${prodInt} 往左數 ${totalDec} 位點上小數點，再去掉尾端的 0！`,
          ),
        );
      } else {
        // 整數除以整數（商為有限小數）
        const divCases: Array<[number, number, number, number]> = [
          // dividend, divisor, ansScaled, decPlaces
          [3, 4, 75, 2],
          [5, 8, 625, 3],
          [7, 8, 875, 3],
          [9, 4, 225, 2],
          [3, 8, 375, 3],
          [7, 20, 35, 2],
          [9, 25, 36, 2],
        ];
        const [dd, dr, ansScaled, dec] = pickRandom(divCases);
        const ansStr = formatScaledDecimal(ansScaled, dec);
        const built = buildScaledDecimalOptions(ansScaled, dec, [
          [ansScaled, dec - 1],
          [ansScaled, dec + 1],
          [ansScaled + 25, dec],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u4',
            seed,
            i,
            `計算整數除以整數（商用小數表示）：${dd} ÷ ${dr} = ?`,
            built,
            `將 ${dd} 寫成 ${dd}.000 後除以 ${dr}，直式除法可得商為 ${ansStr}。`,
            `整數除以整數不夠除時，在被除數後面補 0 並點上小數點繼續除！`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第5章：生活中的大單位（公噸↔公斤、公畝/公頃/平方公里↔平方公尺換算） */
export function generateG5S2U5LargeUnits(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 公噸 ↔ 公斤（1 公噸 = 1000 公斤）
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const tonsHundredths = pickRandom([150, 240, 305, 450, 620, 85, 45]);
        const ansKg = tonsHundredths * 10;
        const tonStr = formatScaledDecimal(tonsHundredths, 2);
        const built = buildNumericOptions(
          ansKg,
          [ansKg * 10, Math.max(1, Math.floor(ansKg / 10)), tonsHundredths],
          ' 公斤',
        );
        questions.push(
          makeQuestion(
            'g5s2-u5',
            seed,
            i,
            `${tonStr} 公噸等於多少公斤？`,
            built,
            `1 公噸 = 1000 公斤，將 ${tonStr} 的小數點向右移 3 位（× 1000），得到 ${ansKg} 公斤。`,
            '記得「1 公噸 = 1000 公斤」，公噸換公斤要乘以 1000！',
          ),
        );
      } else if (variant === 1) {
        const kg = pickRandom([850, 1250, 2400, 3050, 4600, 7500]);
        const built = buildScaledDecimalOptions(
          kg,
          3,
          [
            [kg, 2],
            [kg, 1],
            [kg, 4],
          ],
          ' 公噸',
        );
        questions.push(
          makeQuestion(
            'g5s2-u5',
            seed,
            i,
            `一隻非洲象重 ${kg} 公斤，換算成公噸是多少公噸？`,
            built,
            `1000 公斤 = 1 公噸，${kg} ÷ 1000 = ${formatScaledDecimal(kg, 3)} 公噸。`,
            '公斤換公噸要除以 1000（小數點向左移 3 位）！',
          ),
        );
      } else {
        const t = randomInt(2, 5);
        const kg = pickRandom([150, 250, 350, 450, 600, 750]);
        const addKg = pickRandom([400, 500, 650, 850]);
        const totalKg = t * 1000 + kg + addKg;
        const built = buildScaledDecimalOptions(
          totalKg,
          3,
          [
            [totalKg, 2],
            [t * 1000 + kg, 3],
            [totalKg + 1000, 3],
          ],
          ' 公噸',
        );
        questions.push(
          makeQuestion(
            'g5s2-u5',
            seed,
            i,
            `一輛空卡車重 ${t} 公噸 ${kg} 公斤，載了 ${addKg} 公斤的貨物後，總重是多少公噸？`,
            built,
            `先換成公斤：${t} 公噸 ${kg} 公斤 = ${t * 1000 + kg} 公斤，加上貨物 ${addKg} 公斤 = ${totalKg} 公斤 = ${formatScaledDecimal(totalKg, 3)} 公噸。`,
            '先全部換成公斤加起來，最後再除以 1000 換成公噸！',
          ),
        );
      }
    } else if (mode === 1) {
      // 公畝、公頃 ↔ 平方公尺
      const variant = randomInt(0, 1);
      if (variant === 0) {
        // 公畝 ↔ 平方公尺（1 公畝 = 100 平方公尺）
        if (randomInt(0, 1) === 0) {
          const areTenths = pickRandom([35, 42, 60, 85, 125]);
          const ansM2 = areTenths * 10;
          const areStr = formatScaledDecimal(areTenths, 1);
          const built = buildNumericOptions(
            ansM2,
            [ansM2 * 10, ansM2 * 100, Math.max(1, Math.floor(ansM2 / 10))],
            ' 平方公尺',
          );
          questions.push(
            makeQuestion(
              'g5s2-u5',
              seed,
              i,
              `${areStr} 公畝等於多少平方公尺？`,
              built,
              `1 公畝 = 100 平方公尺，${areStr} × 100 = ${ansM2} 平方公尺。`,
              '1 公畝是邊長 10 公尺的正方形面積，等於 100 平方公尺！',
            ),
          );
        } else {
          const m2 = pickRandom([450, 820, 1200, 3500, 6400]);
          const built = buildScaledDecimalOptions(
            m2,
            2,
            [
              [m2, 1],
              [m2, 3],
              [m2, 4],
            ],
            ' 公畝',
          );
          questions.push(
            makeQuestion(
              'g5s2-u5',
              seed,
              i,
              `社區小公園的面積是 ${m2} 平方公尺，等於多少公畝？`,
              built,
              `100 平方公尺 = 1 公畝，${m2} ÷ 100 = ${formatScaledDecimal(m2, 2)} 公畝。`,
              '平方公尺換成公畝要除以 100（小數點向左移 2 位）！',
            ),
          );
        }
      } else {
        // 公頃 ↔ 平方公尺（1 公頃 = 10000 平方公尺）
        if (randomInt(0, 1) === 0) {
          const haTenths = pickRandom([15, 24, 30, 45, 72]);
          const ansM2 = haTenths * 1000;
          const haStr = formatScaledDecimal(haTenths, 1);
          const built = buildNumericOptions(
            ansM2,
            [ansM2 * 10, Math.max(1, Math.floor(ansM2 / 10)), Math.max(1, Math.floor(ansM2 / 100))],
            ' 平方公尺',
          );
          questions.push(
            makeQuestion(
              'g5s2-u5',
              seed,
              i,
              `一座農場面積是 ${haStr} 公頃，等於多少平方公尺？`,
              built,
              `1 公頃 = 10000 平方公尺，${haStr} × 10000 = ${ansM2} 平方公尺。`,
              '1 公頃是邊長 100 公尺的正方形面積，等於 10000 平方公尺！',
            ),
          );
        } else {
          const m2 = pickRandom([15000, 28000, 35000, 60000, 42000]);
          const built = buildScaledDecimalOptions(
            m2,
            4,
            [
              [m2, 2],
              [m2, 3],
              [m2, 5],
            ],
            ' 公頃',
          );
          questions.push(
            makeQuestion(
              'g5s2-u5',
              seed,
              i,
              `${m2} 平方公尺等於多少公頃？`,
              built,
              `10000 平方公尺 = 1 公頃，${m2} ÷ 10000 = ${formatScaledDecimal(m2, 4)} 公頃。`,
              '平方公尺換成公頃要除以 10000（小數點向左移 4 位）！',
            ),
          );
        }
      }
    } else if (mode === 2) {
      // 平方公里 ↔ 平方公尺 / 公頃 / 公畝
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const km2 = randomInt(2, 8);
        const ansM2 = km2 * 1000000;
        const built = buildNumericOptions(
          ansM2,
          [km2 * 1000, km2 * 10000, km2 * 100000],
          ' 平方公尺',
        );
        questions.push(
          makeQuestion(
            'g5s2-u5',
            seed,
            i,
            `${km2} 平方公里等於多少平方公尺？`,
            built,
            `1 公里 = 1000 公尺，1 平方公里 = 1000 × 1000 = 1000000 平方公尺，所以 ${km2} 平方公里 = ${ansM2} 平方公尺。`,
            '1 平方公里等於 1000 公尺 × 1000 公尺 = 1000000 平方公尺！',
          ),
        );
      } else if (variant === 1) {
        const km2Tenths = pickRandom([15, 24, 35, 48, 60, 85]);
        const ansHa = km2Tenths * 10;
        const km2Str = formatScaledDecimal(km2Tenths, 1);
        const built = buildNumericOptions(
          ansHa,
          [ansHa * 10, Math.max(1, Math.floor(ansHa / 10)), ansHa * 100],
          ' 公頃',
        );
        questions.push(
          makeQuestion(
            'g5s2-u5',
            seed,
            i,
            `國家公園某區面積是 ${km2Str} 平方公里，等於多少公頃？`,
            built,
            `1 平方公里 = 100 公頃，${km2Str} × 100 = ${ansHa} 公頃。`,
            '面積大單位口訣：1 平方公里 = 100 公頃 = 10000 公畝！',
          ),
        );
      } else {
        const m2 = pickRandom([500000, 1500000, 2400000, 3200000]);
        const built = buildScaledDecimalOptions(
          m2,
          6,
          [
            [m2, 4],
            [m2, 5],
            [m2, 3],
          ],
          ' 平方公里',
        );
        questions.push(
          makeQuestion(
            'g5s2-u5',
            seed,
            i,
            `${m2} 平方公尺等於多少平方公里？`,
            built,
            `1 平方公里 = 1000000 平方公尺，${m2} ÷ 1000000 = ${formatScaledDecimal(m2, 6)} 平方公里。`,
            '平方公尺換成平方公里要除以 1000000（小數點向左移 6 位）！',
          ),
        );
      }
    } else {
      // 大單位生活應用題
      if (randomInt(0, 1) === 0) {
        const l = pickRandom([120, 150, 200, 250, 300]);
        const w = pickRandom([40, 50, 60, 80]);
        const areaM2 = l * w;
        const askHa = areaM2 >= 10000 && randomInt(0, 1) === 0;
        if (askHa) {
          const built = buildScaledDecimalOptions(
            areaM2,
            4,
            [
              [areaM2, 2],
              [areaM2, 3],
              [areaM2, 0],
            ],
            ' 公頃',
          );
          questions.push(
            makeQuestion(
              'g5s2-u5',
              seed,
              i,
              `一塊長 ${l} 公尺、寬 ${w} 公尺的長方形稻田，面積是多少公頃？`,
              built,
              `面積 = ${l} × ${w} = ${areaM2} 平方公尺；除以 10000 換成公頃，得 ${formatScaledDecimal(areaM2, 4)} 公頃。`,
              '先用長 × 寬算出平方公尺數，再除以 10000 換成公頃！',
            ),
          );
        } else {
          const ansAre = areaM2 / 100;
          const built = buildNumericOptions(
            ansAre,
            [areaM2, ansAre * 10, Math.max(1, Math.floor(ansAre / 10))],
            ' 公畝',
          );
          questions.push(
            makeQuestion(
              'g5s2-u5',
              seed,
              i,
              `一塊長 ${l} 公尺、寬 ${w} 公尺的長方形菜園，面積是多少公畝？`,
              built,
              `面積 = ${l} × ${w} = ${areaM2} 平方公尺；1 公畝 = 100 平方公尺，${areaM2} ÷ 100 = ${ansAre} 公畝。`,
              '先算出平方公尺數，再除以 100 換成公畝！',
            ),
          );
        }
      } else {
        const capTons = pickRandom([2, 3, 4, 5]);
        const boxKg = pickRandom([20, 25, 40, 50]);
        const ans = (capTons * 1000) / boxKg;
        const built = buildNumericOptions(
          ans,
          [Math.max(1, Math.floor(ans / 10)), ans * 10, ans + 10],
          ' 箱',
        );
        questions.push(
          makeQuestion(
            'g5s2-u5',
            seed,
            i,
            `一台貨車限重 ${capTons} 公噸，每箱貨物重 ${boxKg} 公斤，最多可以載運幾箱貨物？`,
            built,
            `${capTons} 公噸 = ${capTons * 1000} 公斤，${capTons * 1000} ÷ ${boxKg} = ${ans} 箱。`,
            '先把「公噸」換成「公斤」（× 1000），再除以每箱的公斤數！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第6章：時間的乘除（日時分秒複名數乘除法與應用） */
export function generateG5S2U6TimeMulDiv(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 複名數時間乘法（含 24 進位或 60 進位）
      const variant = randomInt(0, 2);
      if (variant === 0) {
        // 日與小時
        const d = randomInt(1, 3);
        const h = pickRandom([8, 9, 10, 14, 15, 16, 18]);
        const n = pickRandom([3, 4, 5]);
        const actualH = ((d * 24 + h) * n) % 24 === 0 ? h + 1 : h;
        const finalTotal = (d * 24 + actualH) * n;
        const ansD = Math.floor(finalTotal / 24);
        const ansH = finalTotal % 24;
        const ans = formatTimePair(ansD, ansH, '日', '小時');
        const built = buildTimePairOptions(ansD, ansH, '日', '小時', 24, [
          [d * n + Math.floor((actualH * n) / 10), (actualH * n) % 10],
          [d * n + Math.floor((actualH * n) / 60), (actualH * n) % 60],
          [ansD + 1, ansH],
          [Math.max(1, ansD - 1), ansH],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u6',
            seed,
            i,
            `計算時間乘法：${d} 日 ${actualH} 小時 × ${n} = ?`,
            built,
            `${actualH} × ${n} = ${actualH * n} 小時 = ${Math.floor((actualH * n) / 24)} 日 ${(actualH * n) % 24} 小時；${d} × ${n} = ${d * n} 日，合起來共 ${ans}。`,
            '1 日 = 24 小時，小時滿 24 要進位成日喔！',
          ),
        );
      } else if (variant === 1) {
        // 小時與分
        const hr = randomInt(1, 4);
        const m = pickRandom([24, 28, 35, 42, 46, 52]);
        const n = pickRandom([3, 4, 5]);
        const actualM = (m * n) % 60 === 0 ? m + 1 : m;
        const totalM = (hr * 60 + actualM) * n;
        const ansHr = Math.floor(totalM / 60);
        const ansM = totalM % 60;
        const ans = formatTimePair(ansHr, ansM, '小時', '分');
        const built = buildTimePairOptions(ansHr, ansM, '小時', '分', 60, [
          [hr * n + Math.floor((actualM * n) / 100), (actualM * n) % 100],
          [Math.max(1, ansHr - 1), ansM],
          [ansHr + 1, ansM],
          [ansHr, (ansM + 10) % 60 || 15],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u6',
            seed,
            i,
            `計算時間乘法：${hr} 小時 ${actualM} 分 × ${n} = ?`,
            built,
            `${actualM} × ${n} = ${actualM * n} 分 = ${Math.floor((actualM * n) / 60)} 小時 ${(actualM * n) % 60} 分；加上 ${hr} × ${n} = ${hr * n} 小時，共 ${ans}。`,
            '1 小時 = 60 分鐘，分鐘滿 60 才進位 1 小時，不要當成 100 進位喔！',
          ),
        );
      } else {
        // 分與秒
        const min = randomInt(2, 6);
        const sec = pickRandom([25, 32, 38, 44, 48]);
        const n = pickRandom([3, 4, 5, 6]);
        const actualSec = (sec * n) % 60 === 0 ? sec + 1 : sec;
        const totalS = (min * 60 + actualSec) * n;
        const ansMin = Math.floor(totalS / 60);
        const ansSec = totalS % 60;
        const ans = formatTimePair(ansMin, ansSec, '分', '秒');
        const built = buildTimePairOptions(ansMin, ansSec, '分', '秒', 60, [
          [min * n + Math.floor((actualSec * n) / 100), (actualSec * n) % 100],
          [ansMin + 1, ansSec],
          [Math.max(1, ansMin - 1), ansSec],
          [ansMin, (ansSec + 10) % 60 || 12],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u6',
            seed,
            i,
            `計算時間乘法：${min} 分 ${actualSec} 秒 × ${n} = ?`,
            built,
            `${actualSec} × ${n} = ${actualSec * n} 秒 = ${Math.floor((actualSec * n) / 60)} 分 ${(actualSec * n) % 60} 秒；加上 ${min} × ${n} = ${min * n} 分，共 ${ans}。`,
            '1 分鐘 = 60 秒，秒數滿 60 要進位成幾分幾秒！',
          ),
        );
      }
    } else if (mode === 1) {
      // 時間等分除（複名數 ÷ 整數，必有跨單位借位）
      if (randomInt(0, 1) === 0) {
        // 分・秒 ÷ n
        const n = pickRandom([3, 4, 5]);
        const qMin = randomInt(1, 4);
        const qSec = pickRandom([25, 28, 34, 35, 42, 46, 48]);
        const totalSec = (qMin * 60 + qSec) * n;
        const dMin = Math.floor(totalSec / 60);
        const dSec = totalSec % 60;
        const ans = formatTimePair(qMin, qSec, '分', '秒');
        const built = buildTimePairOptions(qMin, qSec, '分', '秒', 60, [
          [Math.max(1, Math.floor(dMin / n)), Math.floor(dSec / n) || 12],
          [qMin, Math.min(59, Math.floor((100 + dSec) / n))],
          [qMin + 1, qSec],
          [qMin, (qSec + 10) % 60 || 15],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u6',
            seed,
            i,
            `計算時間除法：${dMin} 分 ${dSec} 秒 ÷ ${n} = ?`,
            built,
            `${dMin} ÷ ${n} = ${Math.floor(dMin / n)} 分……餘 ${dMin % n} 分；餘下的 ${dMin % n} 分換成 ${(dMin % n) * 60} 秒，加上 ${dSec} 秒共有 ${(dMin % n) * 60 + dSec} 秒，再除以 ${n} 得 ${qSec} 秒，合起來是 ${ans}。`,
            '分不夠除時，借位 1 分變成「60 秒」加到秒數再一起除！',
          ),
        );
      } else {
        // 日・小時 ÷ n
        const n = pickRandom([2, 3, 4]);
        const qD = randomInt(1, 3);
        const qH = pickRandom([14, 15, 16, 18, 20]);
        const totalH = (qD * 24 + qH) * n;
        const dD = Math.floor(totalH / 24);
        const dH = totalH % 24;
        const ans = formatTimePair(qD, qH, '日', '小時');
        const built = buildTimePairOptions(qD, qH, '日', '小時', 24, [
          [qD, Math.min(23, Math.floor((60 + dH) / n))],
          [Math.max(1, Math.floor(dD / n)), Math.floor(dH / n) || 4],
          [qD + 1, qH],
          [qD, (qH + 4) % 24 || 6],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u6',
            seed,
            i,
            `計算時間除法：${dD} 日 ${dH} 小時 ÷ ${n} = ?`,
            built,
            `${dD} ÷ ${n} = ${Math.floor(dD / n)} 日……餘 ${dD % n} 日；餘下的 ${dD % n} 日 = ${(dD % n) * 24} 小時，加上 ${dH} 小時共 ${(dD % n) * 24 + dH} 小時，除以 ${n} 得 ${qH} 小時，答案是 ${ans}。`,
            '1 日 = 24 小時！日不夠除而餘下時，要把餘數乘以 24 換成小時！',
          ),
        );
      }
    } else if (mode === 2) {
      // 包含除：總時間 ÷ 每次時間 = 次數／個數
      const unitMin = randomInt(2, 5);
      const unitSec = pickRandom([15, 20, 30, 40, 45]);
      const unitTotal = unitMin * 60 + unitSec;
      const k = randomInt(3, 8);
      const grandTotal = unitTotal * k;
      const totMin = Math.floor(grandTotal / 60);
      const totSec = grandTotal % 60;
      const totStr = totSec === 0 ? `${totMin} 分` : `${totMin} 分 ${totSec} 秒`;
      const built = buildNumericOptions(k, [k - 1, k + 1, k + 2], ' 個');
      questions.push(
        makeQuestion(
          'g5s2-u6',
          seed,
          i,
          `機器製作 1 個零件需要 ${unitMin} 分 ${unitSec} 秒，連續運作了 ${totStr}，一共可以完成幾個零件？`,
          built,
          `先全部換成秒：1 個零件需 ${unitTotal} 秒，總時間 ${totStr} = ${grandTotal} 秒；${grandTotal} ÷ ${unitTotal} = ${k} 個。`,
          '先將兩個時間都換成相同的最小單位（秒）再相除！',
        ),
      );
    } else {
      // 生活應用題
      if (randomInt(0, 1) === 0) {
        const h = randomInt(1, 2);
        const m = pickRandom([15, 20, 25, 35, 45]);
        const days = 7;
        const totalM = (h * 60 + m) * days;
        const ansH = Math.floor(totalM / 60);
        const ansM = totalM % 60;
        const ans = formatTimePair(ansH, ansM, '小時', '分');
        const built = buildTimePairOptions(ansH, ansM, '小時', '分', 60, [
          [h * days, ansM],
          [ansH + 1, ansM],
          [Math.max(1, ansH - 1), (ansM + 15) % 60 || 15],
          [ansH, (ansM + 20) % 60 || 20],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u6',
            seed,
            i,
            `小晴每天練琴 ${h} 小時 ${m} 分，連續練習一星期（7 天）共練了多少時間？`,
            built,
            `(${h} 小時 ${m} 分) × 7：分鐘 = ${m * 7} 分 = ${Math.floor((m * 7) / 60)} 小時 ${(m * 7) % 60} 分，加上 ${h * 7} 小時，共 ${ans}。`,
            '用每天的時間乘以 7 天，分鐘滿 60 記得進位成小時！',
          ),
        );
      } else {
        const gaps = randomInt(4, 7);
        const m = randomInt(4, 9);
        const s = pickRandom([15, 20, 30, 45]);
        const totalSec = (m * 60 + s) * gaps;
        const ansMin = Math.floor(totalSec / 60);
        const ansSec = totalSec % 60;
        const ans = formatTimePair(ansMin, ansSec, '分', '秒');
        const wrongWithPlus1Total = (m * 60 + s) * (gaps + 1);
        const built = buildTimePairOptions(ansMin, ansSec, '分', '秒', 60, [
          [Math.floor(wrongWithPlus1Total / 60), wrongWithPlus1Total % 60],
          [m * gaps, s],
          [ansMin + 2, ansSec],
          [Math.max(1, ansMin - 1), ansSec],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u6',
            seed,
            i,
            `捷運每 ${m} 分 ${s} 秒開出一班列車，從第 1 班發車到第 ${gaps + 1} 班發車，一共經過了多少時間？`,
            built,
            `從第 1 班到第 ${gaps + 1} 班共有 ${gaps} 個間隔，(${m} 分 ${s} 秒) × ${gaps} = ${ans}。`,
            `先數一數第 1 班到第 ${gaps + 1} 班中間共有幾個「時間間隔」喔！`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第7章：容積（公升/毫升/立方公分換算、有蓋與無蓋容器容積、不規則物體體積） */
export function generateG5S2U7Capacity(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 公升 / 毫升 / 立方公分 / 立方公尺換算
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const literTenths = pickRandom([15, 24, 35, 42, 68, 85]);
        const ansCm3 = literTenths * 100;
        const literStr = formatScaledDecimal(literTenths, 1);
        const built = buildNumericOptions(
          ansCm3,
          [ansCm3 * 10, Math.max(1, Math.floor(ansCm3 / 10)), literTenths],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u7',
            seed,
            i,
            `${literStr} 公升的水，體積是多少立方公分？`,
            built,
            `1 公升 = 1000 毫升 = 1000 立方公分，所以 ${literStr} 公升 = ${literStr} × 1000 = ${ansCm3} 立方公分。`,
            '記住：1 毫升 = 1 立方公分，1 公升 = 1000 立方公分！',
          ),
        );
      } else if (variant === 1) {
        const l = pickRandom([20, 25, 30, 40, 50]);
        const w = pickRandom([15, 20, 25]);
        const h = pickRandom([10, 12, 16, 20]);
        const cm3 = l * w * h;
        const built = buildScaledDecimalOptions(
          cm3,
          3,
          [
            [cm3, 2],
            [cm3, 0],
            [cm3 + 1000, 3],
          ],
          ' 公升',
        );
        questions.push(
          makeQuestion(
            'g5s2-u7',
            seed,
            i,
            `一個長方體水箱裡面長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分，最多可以裝幾公升的水？`,
            built,
            `水箱容積 = ${l} × ${w} × ${h} = ${cm3} 立方公分 = ${cm3} 毫升 = ${formatScaledDecimal(cm3, 3)} 公升。`,
            '先算出裡面的立方公分數，再除以 1000 換成公升！',
          ),
        );
      } else {
        const m3Tenths = pickRandom([12, 25, 34, 48, 60]);
        const ansL = m3Tenths * 100;
        const m3Str = formatScaledDecimal(m3Tenths, 1);
        const built = buildNumericOptions(
          ansL,
          [ansL * 10, ansL * 100, Math.max(1, Math.floor(ansL / 10))],
          ' 公升',
        );
        questions.push(
          makeQuestion(
            'g5s2-u7',
            seed,
            i,
            `游泳池注入 ${m3Str} 立方公尺的水，等於注入多少公升的水？`,
            built,
            `1 立方公尺 = 1000000 立方公分 = 1000 公升，所以 ${m3Str} 立方公尺 = ${ansL} 公升。`,
            '1 立方公尺的水剛好是 1000 公升（1 度水）！',
          ),
        );
      }
    } else if (mode === 1) {
      // 無蓋長方體容器容積（扣除厚度：長寬各減 2t，高只減 1t）
      const t = pickRandom([1, 2]);
      const innerL = randomInt(8, 14);
      const innerW = randomInt(6, 12);
      const innerH = randomInt(5, 10);
      const outerL = innerL + 2 * t;
      const outerW = innerW + 2 * t;
      const outerH = innerH + t;
      const ans = innerL * innerW * innerH;
      const wrongWithLid = innerL * innerW * Math.max(1, innerH - t);
      const wrongNoSub = outerL * outerW * outerH;
      const wrongSingleSub = (outerL - t) * (outerW - t) * (outerH - t);
      const built = buildNumericOptions(
        ans,
        [wrongWithLid, wrongNoSub, wrongSingleSub],
        ' 立方公分',
      );
      questions.push(
        makeQuestion(
          'g5s2-u7',
          seed,
          i,
          `用厚 ${t} 公分的木板做成一個「無蓋」長方體木盒，外面長 ${outerL} 公分、寬 ${outerW} 公分、高 ${outerH} 公分，這個木盒的容積是多少立方公分？`,
          built,
          `無蓋容器計算內部長寬高：內長 = ${outerL} - ${2 * t} = ${innerL}，內寬 = ${outerW} - ${2 * t} = ${innerW}，因為沒有蓋子，內高只扣底部厚度 = ${outerH} - ${t} = ${innerH}。容積 = ${innerL} × ${innerW} × ${innerH} = ${ans} 立方公分。`,
          '無蓋盒子：長、寬各減 2 個厚度，高沒有蓋子所以「只減 1 個厚度」！',
        ),
      );
    } else if (mode === 2) {
      // 有蓋長方體或正方體容器容積（長寬高各減 2t）
      if (randomInt(0, 1) === 0) {
        const t = pickRandom([1, 2]);
        const innerL = randomInt(8, 14);
        const innerW = randomInt(6, 12);
        const innerH = randomInt(6, 10);
        const outerL = innerL + 2 * t;
        const outerW = innerW + 2 * t;
        const outerH = innerH + 2 * t;
        const ans = innerL * innerW * innerH;
        const wrongLidless = innerL * innerW * (outerH - t);
        const wrongNoSub = outerL * outerW * outerH;
        const wrongSingleSub = (outerL - t) * (outerW - t) * (outerH - t);
        const built = buildNumericOptions(
          ans,
          [wrongLidless, wrongNoSub, wrongSingleSub],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u7',
            seed,
            i,
            `用厚 ${t} 公分的木板做成一個「有蓋」長方體儲藏箱，外面長 ${outerL} 公分、寬 ${outerW} 公分、高 ${outerH} 公分，它的容積是多少立方公分？`,
            built,
            `有蓋容器上下左右前後都有厚度，內長 = ${innerL}、內寬 = ${innerW}、內高 = ${outerH} - ${2 * t} = ${innerH}。容積 = ${innerL} × ${innerW} × ${innerH} = ${ans} 立方公分。`,
            '有蓋容器連蓋子和底面都有厚度，所以長、寬、高全部都要減「2 個厚度」！',
          ),
        );
      } else {
        const t = pickRandom([1, 2]);
        const innerS = pickRandom([6, 8, 10, 12]);
        const outerS = innerS + 2 * t;
        const ans = innerS * innerS * innerS;
        const wrongLidless = innerS * innerS * (outerS - t);
        const wrongNoSub = outerS * outerS * outerS;
        const wrongSingleSub = (outerS - t) * (outerS - t) * (outerS - t);
        const built = buildNumericOptions(
          ans,
          [wrongLidless, wrongNoSub, wrongSingleSub],
          ' 毫升',
        );
        questions.push(
          makeQuestion(
            'g5s2-u7',
            seed,
            i,
            `一個「有蓋」正方體玻璃箱，外面邊長 ${outerS} 公分，玻璃厚度 ${t} 公分，這個箱子的容積是多少毫升？`,
            built,
            `裡面邊長 = ${outerS} - ${t} × 2 = ${innerS} 公分，容積 = ${innerS} × ${innerS} × ${innerS} = ${ans} 立方公分 = ${ans} 毫升。`,
            '先減掉兩側玻璃厚度算出裡面邊長，算出立方公分就等於毫升數！',
          ),
        );
      }
    } else {
      // 不規則物體體積（排水法 / 水位高度差）
      const l = pickRandom([10, 12, 15, 20]);
      const w = pickRandom([8, 10, 12]);
      const h1 = randomInt(6, 12);
      const dh = randomInt(2, 5);
      const h2 = h1 + dh;
      if (randomInt(0, 1) === 0) {
        const ans = l * w * dh;
        const built = buildNumericOptions(
          ans,
          [l * w * h2, l * w * h1, l * w * (dh + 1)],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u7',
            seed,
            i,
            `一個長方體魚缸裡面長 ${l} 公分、寬 ${w} 公分，原本水深 ${h1} 公分。放進一顆完全沉入水中的石頭後，水位上升到 ${h2} 公分（水未溢出），這顆石頭的體積是多少立方公分？`,
            built,
            `上升的水柱體積等於石頭體積：上升高度 = ${h2} - ${h1} = ${dh} 公分，體積 = ${l} × ${w} × ${dh} = ${ans} 立方公分。`,
            '石頭體積 = 魚缸底面積 ×「水位上升的高度」！',
          ),
        );
      } else {
        const stoneV = l * w * dh;
        const built = buildNumericOptions(dh, [h1 + dh, dh * 2, dh + 1], ' 公分');
        questions.push(
          makeQuestion(
            'g5s2-u7',
            seed,
            i,
            `在裡面長 ${l} 公分、寬 ${w} 公分的長方體水箱中放入一個體積 ${stoneV} 立方公分的鐵塊（完全沉入水中且水沒滿出），水面會上升幾公分？`,
            built,
            `水面上升高度 = 物體體積 ÷ 容器底面積 = ${stoneV} ÷ (${l} × ${w}) = ${stoneV} ÷ ${l * w} = ${dh} 公分。`,
            '用鐵塊的體積除以水箱裡面的底面積（長 × 寬），就是水位上升的高度！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第8章：比率與百分率（比率與百分率互換、打折、加成應用） */
export function generateG5S2U8RatioPercent(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 比率與百分率互換
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const pct = pickRandom([8, 12, 24, 35, 45, 65, 75, 84]);
        const decStr = formatScaledDecimal(pct, 2);
        const ans = `${pct}%`;
        const wrongs = [
          `${formatScaledDecimal(pct, 1)}%`,
          `${pct * 10}%`,
          `${formatScaledDecimal(pct, 2)}%`,
        ];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `將小數比率 ${decStr} 換算成百分率是多少？`,
            built,
            `小數換成百分率只要乘以 100 再加上 %：${decStr} × 100% = ${ans}。`,
            '把小數點向右移 2 位，再補上「%」符號！',
          ),
        );
      } else if (variant === 1) {
        const fracCases: Array<[number, number, number]> = [
          [3, 4, 75],
          [3, 5, 60],
          [7, 20, 35],
          [9, 25, 36],
          [13, 50, 26],
          [7, 10, 70],
          [3, 20, 15],
        ];
        const [n, d, pct] = pickRandom(fracCases);
        const ans = `${pct}%`;
        const candidates = [n, pct + 10, pct - 10, pct + 5, pct - 5, n * 10 + d]
          .filter((v) => v > 0 && v < 100 && v !== pct)
          .map((v) => `${v}%`);
        const built = buildStringOptions(ans, candidates);
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `把分數比率 ${n}/${d} 換算成百分率是多少？`,
            built,
            `將分母擴分成 100：${n}/${d} = ${pct}/100 = ${ans}。`,
            '把分母擴分變成 100，分子的數字就是百分之多少！',
          ),
        );
      } else {
        const pct = pickRandom([5, 8, 15, 32, 45, 78, 90]);
        const built = buildScaledDecimalOptions(pct, 2, [
          [pct, 1],
          [pct, 3],
          [pct, 0],
        ]);
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `把百分率 ${pct}% 寫成小數是多少？`,
            built,
            `${pct}% = ${pct}/100 = ${formatScaledDecimal(pct, 2)}（小數點向左移 2 位）。`,
            '去掉「%」符號並除以 100（小數點向左移動 2 位）！',
          ),
        );
      }
    } else if (mode === 1) {
      // 打折應用
      const discounts: Array<[string, number]> = [
        ['九折', 90],
        ['八五折', 85],
        ['八折', 80],
        ['七五折', 75],
        ['七折', 70],
        ['六折', 60],
      ];
      const [label, pct] = pickRandom(discounts);
      const price = pickRandom([400, 600, 800, 1000, 1200, 1600, 2000]);
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const salePrice = (price * pct) / 100;
        const saved = price - salePrice;
        const built = buildNumericOptions(
          salePrice,
          [saved, price + saved, Math.floor(salePrice / 10)],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `一件原價 ${price} 元的運動外套，週年慶打 ${label} 出售，售價是多少元？`,
            built,
            `打 ${label} 表示以原價的 ${pct}% 出售：${price} × ${pct}% = ${salePrice} 元。`,
            `打 ${label} 就是原價乘以 ${formatScaledDecimal(pct, 2)}（${pct}%）！`,
          ),
        );
      } else if (variant === 1) {
        const salePrice = (price * pct) / 100;
        const saved = price - salePrice;
        const built = buildNumericOptions(
          saved,
          [salePrice, price, saved + 100],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `一雙定價 ${price} 元的球鞋打 ${label} 特價，買這雙鞋可以比原價「省下」多少元？`,
            built,
            `省下的比率是 1 - ${pct}% = ${100 - pct}%，省下 ${price} × ${100 - pct}% = ${saved} 元（售價是 ${salePrice} 元）。`,
            '看清楚題目問的是「省下多少元」，不是售價喔！',
          ),
        );
      } else {
        const salePrice = (price * pct) / 100;
        const built = buildNumericOptions(
          price,
          [salePrice, Math.round((salePrice * pct) / 100), price + 200],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `一本精裝書打 ${label} 後的售價是 ${salePrice} 元，這本書的原價是多少元？`,
            built,
            `原價 × ${pct}% = ${salePrice}，所以原價 = ${salePrice} ÷ ${formatScaledDecimal(pct, 2)} = ${price} 元。`,
            `打 ${label} 後是原價的 ${pct}%，求原價要用售價除以 ${formatScaledDecimal(pct, 2)}！`,
          ),
        );
      }
    } else if (mode === 2) {
      // 加成應用
      const markups: Array<[string, number]> = [
        ['一成', 10],
        ['一成五', 15],
        ['二成', 20],
        ['二成五', 25],
        ['三成', 30],
        ['四成', 40],
      ];
      const [label, pct] = pickRandom(markups);
      const cost = pickRandom([200, 400, 500, 800, 1000, 1200]);
      const markupAmt = (cost * pct) / 100;
      const sellingPrice = cost + markupAmt;
      const discounted = cost - markupAmt;
      if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(
          sellingPrice,
          [markupAmt, discounted, cost + pct],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `水果行以每箱 ${cost} 元的成本批發蓮霧，想要「加 ${label}」當作定價，每箱定價是多少元？`,
            built,
            `加 ${label} 就是加上 ${pct}%：${cost} × (1 + ${pct}%) = ${cost} + ${markupAmt} = ${sellingPrice} 元。`,
            `「1 成 = 10%」，加 ${label} 要把成本乘以 (100% + ${pct}%)！`,
          ),
        );
      } else {
        const built = buildNumericOptions(
          sellingPrice,
          [markupAmt, discounted, cost + pct],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `一家餐廳的餐點價格為 ${cost} 元，結帳時須另加 ${label}（${pct}%）的服務費，總共要付多少元？`,
            built,
            `服務費 = ${cost} × ${pct}% = ${markupAmt} 元，總金額 = ${cost} + ${markupAmt} = ${sellingPrice} 元。`,
            `先算出 ${pct}% 的服務費是多少元，再加上原本的餐費！`,
          ),
        );
      }
    } else {
      // 百分率生活綜合應用（命中率／出席率／缺席人數）
      if (randomInt(0, 1) === 0) {
        const total = pickRandom([20, 25, 40, 50]);
        const step = 100 / total;
        const hits = randomInt(Math.floor(total * 0.4), Math.floor(total * 0.9));
        const pct = Math.round(hits * step);
        const candidates = [100 - pct, hits, pct + 10, pct - 10, pct + 5, pct - 5]
          .filter((v) => v > 0 && v < 100 && v !== pct)
          .map((v) => `${v}%`);
        const built = buildStringOptions(`${pct}%`, candidates);
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `小傑練習投籃共投了 ${total} 球，投進了 ${hits} 球，他的進球命中率是多少？`,
            built,
            `命中率 = 進球數 ÷ 總球數 = ${hits} ÷ ${total} = ${pct}/100 = ${pct}%。`,
            '進球率就是「投進球數 ÷ 總投球數」，再換成百分率！',
          ),
        );
      } else {
        const total = pickRandom([200, 300, 400, 500]);
        const pct = pickRandom([85, 88, 90, 92, 95, 96]);
        const present = (total * pct) / 100;
        const absent = total - present;
        const built = buildNumericOptions(
          absent,
          [present, 100 - pct, absent + 10],
          ' 人',
        );
        questions.push(
          makeQuestion(
            'g5s2-u8',
            seed,
            i,
            `快樂國小全校有 ${total} 位學生，今天的出席率是 ${pct}%，今天有幾位學生「缺席」？`,
            built,
            `出席率 ${pct}% 代表缺席率是 100% - ${pct}% = ${100 - pct}%，缺席人數 = ${total} × ${100 - pct}% = ${absent} 人（出席 ${present} 人）。`,
            '題目問的是「缺席」人數，可以先算出缺席率（100% - 出席率）再乘總人數！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 五下第9章：表面積（長方體、正方體、簡單複合體表面積與切開合併變化） */
export function generateG5S2U9SurfaceArea(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 正方體表面積（直接求面積或反推邊長）
      if (randomInt(0, 1) === 0) {
        const s = pickRandom([3, 4, 5, 7, 8, 9, 10, 12]);
        const ans = 6 * s * s;
        const built = buildNumericOptions(
          ans,
          [s * s, 4 * s * s, s * s * s],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `一個邊長為 ${s} 公分的正方體紙盒，它的表面積是多少平方公分？`,
            built,
            `正方體有 6 個完全一樣的正方形面，表面積 = (${s} × ${s}) × 6 = ${s * s} × 6 = ${ans} 平方公分。`,
            '先算出 1 個正方形面的面積，再乘以 6 個面！',
          ),
        );
      } else {
        const s = randomInt(4, 11);
        const sa = 6 * s * s;
        const built = buildNumericOptions(s, [s * s, Math.max(2, s - 2), s * 2], ' 公分');
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `已知一個正方體的表面積是 ${sa} 平方公分，這個正方體的邊長是多少公分？`,
            built,
            `1 個面的面積 = ${sa} ÷ 6 = ${s * s} 平方公分；因為 ${s} × ${s} = ${s * s}，所以邊長是 ${s} 公分。`,
            '先把表面積除以 6 算出 1 個面的面積，再想哪一個數自己乘自己等於那個面積！',
          ),
        );
      }
    } else if (mode === 1) {
      // 長方體表面積（有蓋或無蓋）
      const l = randomInt(6, 12);
      let w = randomInt(4, 9);
      while (w === l) w = randomInt(4, 9);
      let h = randomInt(3, 8);
      while (h === w || h === l) h = randomInt(3, 8);

      if (randomInt(0, 2) !== 0) {
        const half = l * w + w * h + l * h;
        const sa = 2 * half;
        const vol = l * w * h;
        const built = buildNumericOptions(
          sa,
          [half, vol !== sa ? vol : sa + l * w, sa + 2 * l * w],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `一個長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的長方體禮盒，表面積是多少平方公分？`,
            built,
            `長方體表面積 = 2 × (長×寬 + 寬×高 + 長×高) = 2 × (${l * w} + ${w * h} + ${l * h}) = 2 × ${half} = ${sa} 平方公分。`,
            '把前面、側面、上面 3 種不同的面面積加起來，再乘以 2！',
          ),
        );
      } else {
        const sa = l * w + 2 * (l * h + w * h);
        const fullSa = 2 * (l * w + l * h + w * h);
        const built = buildNumericOptions(
          sa,
          [fullSa, l * w + l * h + w * h, 2 * (l * h + w * h)],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `要做一個長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的「無蓋」長方體紙盒（只算外面 5 個面），至少需要多少平方公分的紙板？`,
            built,
            `無蓋只有 1 個底面（${l}×${w}=${l * w}）加上 4 個側面（2×${l}×${h} + 2×${w}×${h} = ${2 * (l * h + w * h)}），共 ${sa} 平方公分。`,
            '無蓋紙盒少掉上面那個面，總共只算 5 個面的面積喔！',
          ),
        );
      }
    } else if (mode === 2) {
      // 簡單複合形體表面積
      if (randomInt(0, 1) === 0) {
        const k = pickRandom([2, 3]);
        const s = pickRandom([3, 4, 5, 6, 8]);
        const faces = 6 * k - 2 * (k - 1); // k=2 -> 10, k=3 -> 14
        const sa = faces * s * s;
        const wrongAll = 6 * k * s * s;
        const wrongSub1 = (6 * k - (k - 1)) * s * s;
        const wrongSubMore = (faces - 2) * s * s;
        const built = buildNumericOptions(
          sa,
          [wrongAll, wrongSub1, wrongSubMore],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `把 ${k} 個邊長都是 ${s} 公分的正方體積木橫向排成一列緊密黏合（每個接縫遮住 2 個面），這個長方體的表面積是多少平方公分？`,
            built,
            `原來共有 ${6 * k} 個面，黏合 ${k - 1} 處會遮住 ${2 * (k - 1)} 個面，露出 ${faces} 個正方形面；表面積 = ${faces} × (${s} × ${s}) = ${sa} 平方公分。`,
            '兩個正方體貼合在一起時，貼合處有「2 個面」會被擋住看不見喔！',
          ),
        );
      } else {
        const L = randomInt(8, 12);
        const W = randomInt(6, 10);
        const H = randomInt(4, 7);
        const s = randomInt(2, Math.min(L, W) - 2);
        const baseSa = 2 * (L * W + W * H + L * H);
        const ans = baseSa + 4 * s * s;
        const wrongAddAll = baseSa + 6 * s * s;
        const wrongAdd5 = baseSa + 5 * s * s;
        const wrongSub = baseSa - s * s;
        const built = buildNumericOptions(
          ans,
          [wrongAddAll, wrongAdd5, wrongSub],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `在一個長 ${L} 公分、寬 ${W} 公分、高 ${H} 公分的長方體頂面中央，疊放一個邊長 ${s} 公分的小正方體黏牢，整個複合形體的表面積是多少平方公分？`,
            built,
            `下層長方體表面積 = ${baseSa} 平方公分；疊上小正方體後，原本被遮住的面積剛好由小正方體的頂面補回，所以總表面積只多出小正方體的 4 個側面：${baseSa} + 4 × (${s}×${s}) = ${ans} 平方公分。`,
            '小正方體放上去後，重疊處會遮掉 2 個小正方形面，也就是總表面積只比下層長方體多出小正方體的 4 個側面！',
          ),
        );
      }
    } else {
      // 觀察表面積：切開或合併後表面積的變化
      if (randomInt(0, 1) === 0) {
        const l = randomInt(6, 12);
        const w = randomInt(4, 9);
        const h = randomInt(4, 8);
        const cuts = randomInt(1, 2);
        const inc = 2 * cuts * l * w;
        const built = buildNumericOptions(
          inc,
          [cuts * l * w, inc + l * w, 2 * (l * h + w * h)],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `把一個長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的長方體木塊，平行於「長 ${l} 公分 × 寬 ${w} 公分」的面切 ${cuts} 刀分成 ${cuts + 1} 塊，總表面積會「增加」多少平方公分？`,
            built,
            `每切 1 刀會多出 2 個「${l} × ${w}」的切面，切 ${cuts} 刀共增加 ${2 * cuts} 個切面，增加面積 = ${2 * cuts} × (${l} × ${w}) = ${inc} 平方公分。`,
            '想一想：把木塊切開 1 刀，左右兩邊會同時多出「2 個」新切面！',
          ),
        );
      } else {
        const l = randomInt(6, 12);
        const w = randomInt(4, 9);
        const h = randomInt(4, 8);
        const dec = 2 * w * h;
        const built = buildNumericOptions(
          dec,
          [w * h, 2 * l * w, 4 * w * h],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g5s2-u9',
            seed,
            i,
            `將兩個長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的相同長方體，把「寬 ${w} 公分 × 高 ${h} 公分」的面緊密黏合在一起，總表面積會比原來兩個分開時「減少」多少平方公分？`,
            built,
            `兩個長方體各有 1 個「${w} × ${h}」的面被黏住遮蔽，所以總表面積減少 2 × (${w} × ${h}) = ${dec} 平方公分。`,
            '兩個面黏在一起後，兩邊各有 1 個面不見了，一共減少 2 個貼合面！',
          ),
        );
      }
    }
  }
  return questions;
}
