import type { Question } from '../../types/quiz';

let seedSeq = 0;

function nextSeed(): number {
  seedSeq = (seedSeq + 1) % 1000;
  return Date.now() * 1000 + seedSeq;
}

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

function buildNumericOptions(
  answer: number,
  extraCandidates: number[] = [],
  unitSuffix = '',
  minValue = 1,
): { options: [string, string, string, string]; answerIndex: number } {
  const effectiveMin = Math.min(minValue, answer);
  const set = new Set<number>([answer]);
  for (const c of extraCandidates) {
    if (Number.isInteger(c) && c >= effectiveMin && c !== answer && set.size < 4) {
      set.add(c);
    }
  }
  const deltas =
    answer >= 100
      ? [-100, -20, -10, -5, -2, -1, 1, 2, 5, 10, 20, 100]
      : [-10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10];
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    guard++;
    const next = answer + pickRandom(deltas);
    if (next >= effectiveMin && next !== answer) {
      set.add(next);
    }
  }
  let fallback = 1;
  while (set.size < 4) {
    const next = answer + fallback;
    if (!set.has(next)) set.add(next);
    fallback++;
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

function toSpeechText(prompt: string): string {
  return prompt
    .replace(/(\d+)\/(\d+)/g, (_, n: string, d: string) => `${d} 分之 ${n}`)
    .replace(/:\s*/g, ' 點 ')
    .replace(/×/g, '乘以')
    .replace(/÷/g, '除以')
    .replace(/ \+ /g, ' 加 ')
    .replace(/ - /g, ' 減 ')
    .replace(/=\s*[?？]/g, '等於多少')
    .replace(/=/g, '等於')
    .replace(/（\s*）/g, '空格')
    .replace(/\(\s*\)/g, '空格')
    .replace(/□/g, '多少')
    .replace(/多少[?？]/g, '多少')
    .replace(/((?:幾|多少|哪|什麼|怎麼|為什麼|誰|嗎|呢)[^?？]*)[?？]/g, '$1')
    .replace(/[?？]/g, '多少');
}

function joinChineseParts(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]}和 ${parts[1]}`;
  return `${parts.slice(0, -1).join('、')}和 ${parts[parts.length - 1]}`;
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
  return {
    id: `${idPrefix}-${seed}-${index}`,
    subjectId: 'math',
    prompt,
    options: built.options,
    answerIndex: built.answerIndex,
    explanation,
    hint,
    speechText: toSpeechText(prompt),
    speechLang: 'zh-TW',
  };
}

function toZhDigit(d: number): string {
  return ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][d];
}

function numberToZhUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  let out = '';
  if (h > 0) out += `${toZhDigit(h)}百`;
  if (t > 0) {
    out += h === 0 && t === 1 ? '十' : `${toZhDigit(t)}十`;
  } else if (h > 0 && o > 0) {
    out += '零';
  }
  if (o > 0) out += toZhDigit(o);
  return out || '零';
}

const COMPARE_OPTIONS = ['＞（大於）', '＜（小於）', '＝（等於）', '無法比較'] as const;

function compareSymbolOption(left: number, right: number): string {
  if (left > right) return COMPARE_OPTIONS[0];
  if (left < right) return COMPARE_OPTIONS[1];
  return COMPARE_OPTIONS[2];
}

// ============================================================================
// 二上（7 個單元）
// ============================================================================

/** 二上第1章：200 以內的數（位值與 1/10/100 元錢幣點數） */
export function generateG2S1U1Numbers200(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 幾個百、幾個十、幾個一（含中間補 0 與十幾個十進百）
      if (randomInt(0, 1) === 0) {
        const tens = randomInt(0, 9);
        const ones = tens === 0 ? randomInt(1, 9) : randomInt(0, 9);
        const ans = 100 + tens * 10 + ones;
        const parts = ['1 個百'];
        if (tens > 0) parts.push(`${tens} 個十`);
        if (ones > 0) parts.push(`${ones} 個一`);
        const desc = joinChineseParts(parts);
        const traps = [
          tens * 10 + ones,
          100 + ones * 10 + tens,
          tens === 0 ? 100 + ones * 10 : 100 + tens,
        ];
        questions.push(
          makeQuestion(
            'g2s1-u1',
            seed,
            i,
            `${desc}合起來是多少？`,
            buildNumericOptions(ans, traps),
            `百位是 1，十位是 ${tens}，個位是 ${ones}，合起來就是 ${ans}。`,
            '先把百位、十位、個位對好，沒有寫到的位置要補 0 喔！',
          ),
        );
      } else {
        const tens = randomInt(11, 19);
        const ones = randomInt(0, 9);
        const ans = tens * 10 + ones;
        const prompt =
          ones === 0
            ? `${tens} 個十合起來是多少？`
            : `${tens} 個十和 ${ones} 個一合起來是多少？`;
        const traps = [tens + ones, 100 + ones, ans - 10, ans + 10];
        questions.push(
          makeQuestion(
            'g2s1-u1',
            seed,
            i,
            prompt,
            buildNumericOptions(ans, traps),
            `10 個十是 100，${tens} 個十就是 ${tens * 10}${ones > 0 ? `，再加上 ${ones} 個一就是 ${ans}` : ''}。`,
            '先想 10 個十是 100，多出來的幾個十再加進去！',
          ),
        );
      }
    } else if (mode === 1) {
      // 1元、10元、100元錢幣點數
      const h = randomInt(0, 1);
      const t = h === 0 ? randomInt(11, 18) : randomInt(0, 9);
      const o = h === 0 || t === 0 ? randomInt(1, 9) : randomInt(0, 9);
      const total = h * 100 + t * 10 + o;
      const pieces: string[] = [];
      if (h > 0) pieces.push(`${h} 張 100 元`);
      if (t > 0) pieces.push(`${t} 個 10 元`);
      if (o > 0) pieces.push(`${o} 個 1 元`);
      const text = joinChineseParts(pieces);
      const traps = [
        h * 100 + o * 10 + t,
        h * 10 + t * 10 + o,
        total + 10,
        Math.max(10, total - 10),
      ];
      questions.push(
        makeQuestion(
          'g2s1-u1',
          seed,
          i,
          `小美存錢筒裡有 ${text}，一共有多少元？`,
          buildNumericOptions(total, traps, ' 元'),
          `100 元有 ${h * 100} 元，10 元有 ${t * 10} 元，1 元有 ${o} 元，合起來一共 ${total} 元。`,
          '先算 100 元和 10 元共有多少，最後再加上 1 元！',
        ),
      );
    } else if (mode === 2) {
      // 讀寫與數序
      if (randomInt(0, 1) === 0) {
        const n = pickRandom([103, 107, 109, 120, 140, 160, 138, 175, 194]);
        const zh = numberToZhUnder1000(n);
        const h = 1;
        const t = Math.floor((n % 100) / 10);
        const o = n % 10;
        const traps = [100 + o * 10 + t, t * 10 + o, n + 10];
        questions.push(
          makeQuestion(
            'g2s1-u1',
            seed,
            i,
            `「${zh}」寫成數字是多少？`,
            buildNumericOptions(n, traps),
            `「${zh}」有 ${h} 個百、${t} 個十和 ${o} 個一，寫成數字是 ${n}。`,
            '看清楚十位和個位各是多少，沒有的位數要記得寫 0！',
          ),
        );
      } else {
        const start = pickRandom([188, 195, 196, 197, 98, 99]);
        const step = pickRandom([1, 2]);
        const addCount = 2;
        const ans = start + step * addCount;
        const seq1 = start + step;
        const traps = [seq1, ans + step, start + 10];
        questions.push(
          makeQuestion(
            'g2s1-u1',
            seed,
            i,
            `${step === 1 ? '一個一個往上數' : '兩個兩個往上數'}：${start}、${seq1}、（ ），括號裡要填哪一個數？`,
            buildNumericOptions(ans, traps),
            `每次多 ${step}：${start} → ${seq1} → ${ans}，所以填 ${ans}。`,
            `算算看 ${seq1} 再往上加 ${step} 是多少！`,
          ),
        );
      }
    } else {
      // 200 以內大小比較
      const base = randomInt(120, 185);
      const askMax = randomInt(0, 1) === 0;
      if (askMax) {
        const ans = base + 12;
        const candidates = [base + 3, base - 5, 99];
        questions.push(
          makeQuestion(
            'g2s1-u1',
            seed,
            i,
            '下面四個數中，哪一個數「最大」？',
            buildNumericOptions(ans, candidates),
            `比大小先看百位，百位一樣再比十位，最大的是 ${ans}。`,
            '三位數一定比二位數大，百位一樣再比十位和個位！',
          ),
        );
      } else {
        const ans = randomInt(86, 99);
        const candidates = [100 + (ans % 10), randomInt(110, 145), randomInt(150, 198)];
        questions.push(
          makeQuestion(
            'g2s1-u1',
            seed,
            i,
            '下面四個數中，哪一個數「最小」？',
            buildNumericOptions(ans, candidates),
            `${ans} 是二位數，其他都是超過 100 的三位數，所以 ${ans} 最小。`,
            '先找找看有沒有沒超過 100 的二位數！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 二上第2章：二位數直式加減與 >、<、= 符號 */
export function generateG2S1U2AddSub2Digits(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 二位數加法（含進位）
      const aOnes = randomInt(4, 9);
      const bOnes = randomInt(10 - aOnes, 9);
      const a = randomInt(2, 8) * 10 + aOnes;
      const b = randomInt(1, 7) * 10 + bOnes;
      const ans = a + b;
      const traps = [ans - 10, ans + 10, ans - 1];
      questions.push(
        makeQuestion(
          'g2s1-u2',
          seed,
          i,
          `算算看，${a} + ${b} = ?`,
          buildNumericOptions(ans, traps),
          `個位 ${aOnes} + ${bOnes} = ${aOnes + bOnes}（進 1 到十位），十位合起來加上進位的 1，答案是 ${ans}。`,
          '個位加個位滿 10，記得要向十位進 1 喔！',
        ),
      );
    } else if (mode === 1) {
      // 二位數減法（含退位）
      const aOnes = randomInt(1, 6);
      const bOnes = randomInt(aOnes + 2, 9);
      const aTens = randomInt(4, 9);
      const bTens = randomInt(1, aTens - 2);
      const a = aTens * 10 + aOnes;
      const b = bTens * 10 + bOnes;
      const ans = a - b;
      const forgotBorrow = ans + 10;
      const reversedOnes = (aTens - bTens) * 10 + (bOnes - aOnes);
      const traps = [forgotBorrow, reversedOnes, ans - 10];
      questions.push(
        makeQuestion(
          'g2s1-u2',
          seed,
          i,
          `算算看，${a} - ${b} = ?`,
          buildNumericOptions(ans, traps),
          `個位 ${aOnes} 不夠減 ${bOnes}，向十位借 1 個十變成 ${10 + aOnes} - ${bOnes} = ${10 + aOnes - bOnes}，十位剩下 ${aTens - 1} - ${bTens} = ${aTens - 1 - bTens}，答案是 ${ans}。`,
          '個位不夠減時，要向十位借 1 個十，十位數字別忘了少 1 喔！',
        ),
      );
    } else if (mode === 2) {
      // ＞、＜、＝ 符號比較
      const isAdd = randomInt(0, 1) === 0;
      const a = randomInt(25, 65);
      const b = isAdd ? randomInt(12, 32) : randomInt(11, a - 10);
      const leftVal = isAdd ? a + b : a - b;
      const relation = randomInt(0, 2); // 0: >, 1: <, 2: =
      const offset = relation === 0 ? -randomInt(2, 9) : relation === 1 ? randomInt(2, 9) : 0;
      const rightVal = leftVal + offset;
      const ans = compareSymbolOption(leftVal, rightVal);
      const distractors = COMPARE_OPTIONS.filter((opt) => opt !== ans);
      const expr = isAdd ? `${a} + ${b}` : `${a} - ${b}`;
      questions.push(
        makeQuestion(
          'g2s1-u2',
          seed,
          i,
          `在（ ）裡要填入哪一個符號？ ${expr} （ ） ${rightVal}`,
          buildStringOptions(ans, distractors),
          `先算出左邊：${expr} = ${leftVal}，再和右邊的 ${rightVal} 比較，所以要填 ${ans}。`,
          '先把左邊算式的答案算出來，再比兩邊誰大、誰小或一樣大！',
        ),
      );
    } else {
      // 二位數加減生活應用
      const isMore = randomInt(0, 1) === 0;
      if (isMore) {
        const a = randomInt(24, 58);
        const diff = randomInt(14, 29);
        const ans = a + diff;
        questions.push(
          makeQuestion(
            'g2s1-u2',
            seed,
            i,
            `小傑有 ${a} 張貼紙，妹妹的貼紙比小傑多 ${diff} 張，妹妹有幾張貼紙？`,
            buildNumericOptions(ans, [a - diff, ans - 10, ans + 10], ' 張'),
            `妹妹比小傑多，所以用加法：${a} + ${diff} = ${ans} 張。`,
            '想想看妹妹比較多還是比較少？比較多要用加法喔！',
          ),
        );
      } else {
        const price = randomInt(52, 88);
        const have = randomInt(24, price - 12);
        const ans = price - have;
        questions.push(
          makeQuestion(
            'g2s1-u2',
            seed,
            i,
            `一個機器人要 ${price} 元，小智存了 ${have} 元，還差幾元才夠買？`,
            buildNumericOptions(ans, [price + have, ans + 10, Math.max(1, ans - 10)], ' 元'),
            `用需要的錢減掉已經存的錢：${price} - ${have} = ${ans} 元。`,
            '求「還差多少元」要用減法算相差！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 二上第3章：認識公分（直尺刻度與長短差） */
export function generateG2S1U3Centimeters(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 直尺非 0 刻度測量
      const start = randomInt(2, 8);
      const length = randomInt(4, 11);
      const end = start + length;
      questions.push(
        makeQuestion(
          'g2s1-u3',
          seed,
          i,
          `用直尺量鉛筆，筆尾對準刻度 ${start}，筆尖對準刻度 ${end}，這枝鉛筆長幾公分？`,
          buildNumericOptions(length, [end, start, end + start], ' 公分'),
          `不是從刻度 0 開始量時，要把後面的刻度減掉前面的刻度：${end} - ${start} = ${length} 公分。`,
          `一格是 1 公分，算算從刻度 ${start} 到刻度 ${end} 之間有幾格！`,
        ),
      );
    } else if (mode === 1) {
      // 兩物長短差
      const longLen = randomInt(14, 28);
      const shortLen = randomInt(6, longLen - 4);
      const diff = longLen - shortLen;
      questions.push(
        makeQuestion(
          'g2s1-u3',
          seed,
          i,
          `藍色彩帶長 ${longLen} 公分，紅色彩帶長 ${shortLen} 公分，藍色彩帶比紅色彩帶長幾公分？`,
          buildNumericOptions(diff, [longLen + shortLen, diff + 10, diff + 2], ' 公分'),
          `求兩條彩帶相差幾公分，用減法：${longLen} - ${shortLen} = ${diff} 公分。`,
          '比長短、算「多幾公分」都要用減法！',
        ),
      );
    } else if (mode === 2) {
      // 長度的合成與分解
      const isAdd = randomInt(0, 1) === 0;
      if (isAdd) {
        const a = randomInt(12, 26);
        const b = randomInt(8, 22);
        const ans = a + b;
        questions.push(
          makeQuestion(
            'g2s1-u3',
            seed,
            i,
            `把 ${a} 公分長的吸管和 ${b} 公分長的吸管接在一起，總共長幾公分？`,
            buildNumericOptions(ans, [Math.abs(a - b), ans + 10, ans - 10], ' 公分'),
            `接在一起變長了，把兩段加起來：${a} + ${b} = ${ans} 公分。`,
            '兩段接起來算總長，要用加法喔！',
          ),
        );
      } else {
        const total = randomInt(25, 45);
        const cut = randomInt(8, total - 8);
        const ans = total - cut;
        questions.push(
          makeQuestion(
            'g2s1-u3',
            seed,
            i,
            `一條緞帶長 ${total} 公分，包裝禮物剪掉 ${cut} 公分後，還剩下幾公分？`,
            buildNumericOptions(ans, [total + cut, ans + 10, Math.max(1, ans - 5)], ' 公分'),
            `剪掉後會變短，用減法：${total} - ${cut} = ${ans} 公分。`,
            '「剪掉後還剩下幾公分」要用減法計算！',
          ),
        );
      }
    } else {
      // 個別單位觀念與生活估測
      if (randomInt(0, 1) === 0) {
        const handCount = randomInt(2, 4);
        const clipCount = handCount * randomInt(3, 4);
        const ans = '手掌比較長';
        const wrongs = ['迴紋針比較長', '兩個一樣長', '無法比較'];
        questions.push(
          makeQuestion(
            'g2s1-u3',
            seed,
            i,
            `量同一張課桌的寬度，用手掌量是 ${handCount} 個手掌長，用迴紋針量是 ${clipCount} 個迴紋針長。手掌和迴紋針哪一個比較長？`,
            buildStringOptions(ans, wrongs),
            `量同一張桌子，用的個數越少（只要 ${handCount} 個），代表那個測量工具越長，所以手掌比較長。`,
            '想想看，大步走和小步走同一段路，誰走的次數會比較少？',
          ),
        );
      } else {
        const items: [string, string, string[]][] = [
          ['一枝新的鉛筆', '18 公分', ['2 公分', '90 公分', '300 公分']],
          ['一塊常見的橡皮擦', '4 公分', ['20 公分', '50 公分', '100 公分']],
          ['一本國語課本', '26 公分', ['3 公分', '80 公分', '200 公分']],
        ];
        const [item, ans, wrongs] = pickRandom(items);
        questions.push(
          makeQuestion(
            'g2s1-u3',
            seed,
            i,
            `估估看，${item}大約長多少？`,
            buildStringOptions(ans, wrongs),
            `用直尺量量看身邊的文具，${item}大約是 ${ans} 最合理。`,
            '想一想我們手上 15 公分或 30 公分的直尺有多長！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 二上第6章：加減兩步驟應用問題 */
export function generateG2S1U6TwoStepAddSub(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 連加兩步驟
      const a = randomInt(14, 38);
      const b = randomInt(12, 28);
      const c = randomInt(10, 25);
      const ans = a + b + c;
      questions.push(
        makeQuestion(
          'g2s1-u6',
          seed,
          i,
          `書櫃上原本有 ${a} 本故事書，老師今天放進 ${b} 本，同學又捐了 ${c} 本，現在共有幾本書？`,
          buildNumericOptions(ans, [a + b, ans - 10, ans + 10], ' 本'),
          `先算 ${a} + ${b} = ${a + b} 本，再加上 ${c} 本：${a + b} + ${c} = ${ans} 本。`,
          '先算前兩個數加起來，再把第三個數加上去！',
        ),
      );
    } else if (mode === 1) {
      // 連減兩步驟
      const total = randomInt(65, 96);
      const a = randomInt(14, 28);
      const b = randomInt(12, 25);
      const ans = total - a - b;
      questions.push(
        makeQuestion(
          'g2s1-u6',
          seed,
          i,
          `阿婆採了 ${total} 顆橘子，送給鄰居 ${a} 顆，又吃掉 ${b} 顆，還剩下幾顆橘子？`,
          buildNumericOptions(ans, [total - a, total - (a - b), ans + 10], ' 顆'),
          `先算送掉後剩下 ${total} - ${a} = ${total - a} 顆，再減吃掉的 ${b} 顆：${total - a} - ${b} = ${ans} 顆。`,
          '分兩步驟減掉送出的和吃掉的，算算還剩幾顆！',
        ),
      );
    } else if (mode === 2) {
      // 先加後減兩步驟
      const a = randomInt(22, 46);
      const b = randomInt(12, 25);
      const c = randomInt(10, a + b - 8);
      const ans = a + b - c;
      questions.push(
        makeQuestion(
          'g2s1-u6',
          seed,
          i,
          `公車上原來有 ${a} 位乘客，到站後上車 ${b} 位，下車 ${c} 位，現在車上有幾位乘客？`,
          buildNumericOptions(ans, [a + b + c, Math.abs(a - b) + c, ans + 10], ' 位'),
          `先算上車後變成 ${a} + ${b} = ${a + b} 位，再減下車的 ${c} 位：${a + b} - ${c} = ${ans} 位。`,
          '上車人數會變多要用加法，下車人數變少要用減法！',
        ),
      );
    } else {
      // 先減後加兩步驟（或帶錢買兩樣找零）
      if (randomInt(0, 1) === 0) {
        const start = randomInt(32, 65);
        const take = randomInt(12, 24);
        const put = randomInt(10, 26);
        const ans = start - take + put;
        questions.push(
          makeQuestion(
            'g2s1-u6',
            seed,
            i,
            `籃子裡有 ${start} 顆彈珠，弟弟拿走 ${take} 顆後，姐姐又放進 ${put} 顆，現在籃子裡有幾顆彈珠？`,
            buildNumericOptions(ans, [start + take + put, Math.max(1, start - take - put), ans + 10], ' 顆'),
            `先算拿走後剩 ${start} - ${take} = ${start - take} 顆，再放進 ${put} 顆：${start - take} + ${put} = ${ans} 顆。`,
            '拿走先用減法，放進去再用加法！',
          ),
        );
      } else {
        const wallet = randomInt(75, 98);
        const p1 = randomInt(22, 38);
        const p2 = randomInt(15, 29);
        const ans = wallet - p1 - p2;
        questions.push(
          makeQuestion(
            'g2s1-u6',
            seed,
            i,
            `小宇帶了 ${wallet} 元去文具店，買了一本 ${p1} 元的筆記本和一枝 ${p2} 元的尺，還剩下幾元？`,
            buildNumericOptions(ans, [p1 + p2, wallet - p1, ans + 10], ' 元'),
            `先算共花了 ${p1} + ${p2} = ${p1 + p2} 元，再用 ${wallet} - ${p1 + p2} = ${ans} 元。`,
            '可以先算買兩樣一共花幾元，再用帶的錢減掉花掉的錢！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 二上第7章：2、4、5、8 的乘法與倍數意義 */
export function generateG2S1U7Multiplication1(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 連加轉乘法與倍數意義
      const base = pickRandom([2, 4, 5, 8]);
      const times = randomInt(3, 7);
      if (randomInt(0, 1) === 0) {
        const sumText = Array.from({ length: times }, () => String(base)).join(' + ');
        const ans = `${base} × ${times}`;
        const wrongs = [`${base} × ${times + 1}`, `${base} × ${times - 1}`, `${base} + ${times}`];
        questions.push(
          makeQuestion(
            'g2s1-u7',
            seed,
            i,
            `連加算式「${sumText}」可以記成哪一個乘法算式？`,
            buildStringOptions(ans, wrongs),
            `有 ${times} 個 ${base} 相加，就是 ${base} 的 ${times} 倍，記成 ${ans}。`,
            `數數看總共有幾個 ${base} 連加在一起！`,
          ),
        );
      } else {
        const ans = base * times;
        questions.push(
          makeQuestion(
            'g2s1-u7',
            seed,
            i,
            `「${base} 的 ${times} 倍」是多少？`,
            buildNumericOptions(ans, [base + times, base * (times + 1), base * (times - 1)]),
            `${base} 的 ${times} 倍就是 ${base} × ${times} = ${ans}。`,
            `想一想 ${base} 的乘法口訣：${base} × ${times}！`,
          ),
        );
      }
    } else if (mode === 1) {
      // 2 和 5 的乘法應用
      const base = pickRandom([2, 5]);
      const times = randomInt(3, 9);
      const ans = base * times;
      const prompt =
        base === 2
          ? `一雙筷子有 2 枝，${times} 雙筷子一共有幾枝？`
          : `一顆茶葉蛋 5 元，買 ${times} 顆共要幾元？`;
      const unit = base === 2 ? ' 枝' : ' 元';
      questions.push(
        makeQuestion(
          'g2s1-u7',
          seed,
          i,
          prompt,
          buildNumericOptions(ans, [base + times, base * (times + 1), base * (times - 1)], unit),
          `每份有 ${base}，共有 ${times} 份：${base} × ${times} = ${ans}${unit}。`,
          `用乘法「${base} × ${times}」來算最快喔！`,
        ),
      );
    } else if (mode === 2) {
      // 4 和 8 的乘法應用
      const base = pickRandom([4, 8]);
      const times = randomInt(2, 9);
      const ans = base * times;
      const prompt =
        base === 4
          ? `一輛小汽車有 4 個輪子，${times} 輛小汽車一共有幾個輪子？`
          : `一隻章魚有 8 隻腳，${times} 隻章魚一共有幾隻腳？`;
      const unit = base === 4 ? ' 個' : ' 隻';
      questions.push(
        makeQuestion(
          'g2s1-u7',
          seed,
          i,
          prompt,
          buildNumericOptions(ans, [base + times, base * (times + 1), base * (times - 1)], unit),
          `${base} × ${times} = ${ans}${unit}。`,
          `想一想 ${base} 的乘法口訣，${base} 的 ${times} 倍是多少？`,
        ),
      );
    } else {
      // 乘法空格反推
      const base = pickRandom([2, 4, 5, 8]);
      const times = randomInt(2, 9);
      const prod = base * times;
      questions.push(
        makeQuestion(
          'g2s1-u7',
          seed,
          i,
          `算式 ${base} × □ = ${prod}，空格裡的數是多少？`,
          buildNumericOptions(times, [times + 1, Math.max(1, times - 1), base + times]),
          `背 ${base} 的乘法口訣：${base} × ${times} = ${prod}，所以空格裡是 ${times}。`,
          `想一想：${base} 乘以多少會等於 ${prod}？`,
        ),
      );
    }
  }
  return questions;
}

/** 二上第8章：幾點幾分與經過幾分鐘 */
export function generateG2S1U8TellingTime(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 報讀鐘面時刻
      const hour = randomInt(1, 11);
      const tick = randomInt(1, 11);
      const min = tick * 5;
      const ans = `${hour} 點 ${min} 分`;
      const altMin = min + 5 >= 60 ? min - 5 : min + 5;
      const wrongs = [
        `${hour + 1} 點 ${min} 分`,
        `${hour} 點 ${tick} 分`,
        `${hour} 點 ${altMin} 分`,
      ];
      questions.push(
        makeQuestion(
          'g2s1-u8',
          seed,
          i,
          `鐘面上，短針指在 ${hour} 和 ${hour + 1} 之間，長針指著數字 ${tick}，現在是幾點幾分？`,
          buildStringOptions(ans, wrongs),
          `短針走過 ${hour} 還沒到 ${hour + 1}，所以是 ${hour} 點；長針指著 ${tick}，是 5 × ${tick} = ${min} 分，合起來是 ${ans}。`,
          '短針看走過哪一個數字，長針一大格要數 5 分鐘喔！',
        ),
      );
    } else if (mode === 1) {
      // 認識鐘面格數與時間關係
      const kind = randomInt(0, 2);
      if (kind === 0) {
        const bigTicks = randomInt(2, 11);
        const ans = bigTicks * 5;
        questions.push(
          makeQuestion(
            'g2s1-u8',
            seed,
            i,
            `鐘面上的長針（分針）從 12 走到 ${bigTicks}，一共走了幾分鐘？`,
            buildNumericOptions(ans, [bigTicks, ans + 5, Math.max(5, ans - 5)], ' 分鐘'),
            `長針走 1 大格是 5 分鐘，從 12 走到 ${bigTicks} 走了 ${bigTicks} 大格：5 × ${bigTicks} = ${ans} 分鐘。`,
            '長針每走 1 大格就是 5 分鐘，5 個 5 個數！',
          ),
        );
      } else if (kind === 1) {
        const h1 = randomInt(1, 7);
        const diff = randomInt(2, 5);
        const h2 = h1 + diff;
        questions.push(
          makeQuestion(
            'g2s1-u8',
            seed,
            i,
            `鐘面上的短針（時針）從 ${h1} 走到 ${h2}，經過了幾小時？`,
            buildNumericOptions(diff, [diff * 5, diff + 1, diff + 2], ' 小時'),
            `短針走 1 大格是 1 小時，從 ${h1} 走到 ${h2} 走了 ${h2} - ${h1} = ${diff} 大格，所以是 ${diff} 小時。`,
            '短針走 1 大格代表經過 1 小時！',
          ),
        );
      } else {
        questions.push(
          makeQuestion(
            'g2s1-u8',
            seed,
            i,
            '長針（分針）在鐘面上走完一圈，一共經過了幾分鐘？',
            buildNumericOptions(60, [12, 24, 30], ' 分鐘'),
            '鐘面一圈共有 12 大格，每一大格有 5 小格，5 × 12 = 60 分鐘（也就是 1 小時）。',
            '數一數鐘面一圈共有 60 個小格，每小格是 1 分鐘！',
          ),
        );
      }
    } else if (mode === 2) {
      // 點數經過幾分鐘（同小時與跨整點）
      if (randomInt(0, 1) === 0) {
        const h = randomInt(7, 11);
        const startM = pickRandom([5, 10, 15, 20, 25]);
        const elapsed = pickRandom([15, 20, 25, 30]);
        const endM = startM + elapsed;
        questions.push(
          makeQuestion(
            'g2s1-u8',
            seed,
            i,
            `小美從 ${h} 點 ${startM} 分開始畫畫，畫到 ${h} 點 ${endM} 分完成，她花了幾分鐘？`,
            buildNumericOptions(elapsed, [elapsed + 5, elapsed - 5, endM], ' 分鐘'),
            `同樣都是 ${h} 點，從 ${startM} 分走到 ${endM} 分，經過了 ${endM} - ${startM} = ${elapsed} 分鐘。`,
            '點數分針走了幾大格，也可以用結束的分減去開始的分！',
          ),
        );
      } else {
        const startH = randomInt(8, 11);
        const startM = pickRandom([40, 45, 50, 55]);
        const elapsed = pickRandom([20, 25, 30]);
        const endH = startH + 1;
        const endM = startM + elapsed - 60;
        const toHour = 60 - startM;
        questions.push(
          makeQuestion(
            'g2s1-u8',
            seed,
            i,
            `故事從 ${startH} 點 ${startM} 分開始講，到 ${endH} 點 ${endM} 分結束，一共講了幾分鐘？`,
            buildNumericOptions(
              elapsed,
              [Math.abs(startM - endM), elapsed + 5, Math.max(5, elapsed - 5)],
              ' 分鐘',
            ),
            `從 ${startH} 點 ${startM} 分到 ${endH} 點整是 ${toHour} 分鐘，再加上後面的 ${endM} 分鐘，一共 ${toHour} + ${endM} = ${elapsed} 分鐘。`,
            `先數從 ${startH} 點 ${startM} 分到 ${endH} 點整過了幾分鐘，再加上 ${endM} 分鐘！`,
          ),
        );
      }
    } else {
      // 推算幾分鐘後的時刻
      const h = randomInt(1, 10);
      const startM = pickRandom([10, 15, 20, 25, 30, 35]);
      const elapsed = pickRandom([10, 15, 20]);
      const totalM = startM + elapsed;
      const ans = `${h} 點 ${totalM} 分`;
      const wrongs = [
        `${h} 點 ${totalM + 5} 分`,
        `${h} 點 ${Math.max(5, totalM - 5)} 分`,
        `${h + 1} 點 ${totalM} 分`,
      ];
      questions.push(
        makeQuestion(
          'g2s1-u8',
          seed,
          i,
          `現在是 ${h} 點 ${startM} 分，再過 ${elapsed} 分鐘會是幾點幾分？`,
          buildStringOptions(ans, wrongs),
          `${startM} 分再往後數 ${elapsed} 分鐘是 ${totalM} 分，所以是 ${ans}。`,
          `把現在的 ${startM} 分加上 ${elapsed} 分！`,
        ),
      );
    }
  }
  return questions;
}

/** 二上第9章：3、6、7、9 與 1、0 的乘法 */
export function generateG2S1U9Multiplication2(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 3 和 6 的乘法應用
      const base = pickRandom([3, 6]);
      const times = randomInt(3, 9);
      const ans = base * times;
      const prompt =
        base === 3
          ? `一輛三輪車有 3 個輪子，${times} 輛三輪車共有幾個輪子？`
          : `一盒雞蛋有 6 顆，買 ${times} 盒共有幾顆雞蛋？`;
      const unit = base === 3 ? ' 個' : ' 顆';
      questions.push(
        makeQuestion(
          'g2s1-u9',
          seed,
          i,
          prompt,
          buildNumericOptions(ans, [base + times, base * (times + 1), base * (times - 1)], unit),
          `${base} × ${times} = ${ans}${unit}。`,
          `用 ${base} 的乘法口訣算算看！`,
        ),
      );
    } else if (mode === 1) {
      // 7 和 9 的乘法應用
      const base = pickRandom([7, 9]);
      const times = randomInt(2, 9);
      const ans = base * times;
      const prompt =
        base === 7
          ? `一個星期有 7 天，${times} 個星期一共有幾天？`
          : `一盒水梨有 9 顆，買 ${times} 盒共有幾顆水梨？`;
      const unit = base === 7 ? ' 天' : ' 顆';
      questions.push(
        makeQuestion(
          'g2s1-u9',
          seed,
          i,
          prompt,
          buildNumericOptions(ans, [base + times, base * (times + 1), base * (times - 1)], unit),
          `${base} × ${times} = ${ans}${unit}。`,
          `背一背 ${base} 的乘法口訣：${base} × ${times} 是多少？`,
        ),
      );
    } else if (mode === 2) {
      // 1 和 0 的乘法意義
      const k = randomInt(3, 9);
      const sub = randomInt(0, 2);
      if (sub === 0) {
        questions.push(
          makeQuestion(
            'g2s1-u9',
            seed,
            i,
            `盤子裡一顆糖果也沒有（0 顆），${k} 個空盤子裡一共有幾顆糖果？`,
            buildNumericOptions(0, [k, 1, 10], ' 顆', 0),
            `0 連加 ${k} 次還是 0，0 × ${k} = 0 顆。`,
            '0 乘以任何數都還是 0 喔！',
          ),
        );
      } else if (sub === 1) {
        questions.push(
          makeQuestion(
            'g2s1-u9',
            seed,
            i,
            `一盒餅乾有 ${k} 片，小明買了 0 盒，他一共買了幾片餅乾？`,
            buildNumericOptions(0, [k, 1, k + 1], ' 片', 0),
            `買 0 盒就是一盒都沒買，${k} × 0 = 0 片。`,
            '任何數乘以 0 都是 0！',
          ),
        );
      } else {
        questions.push(
          makeQuestion(
            'g2s1-u9',
            seed,
            i,
            `每個紙袋放 1 顆橘子，${k} 個紙袋一共有幾顆橘子？`,
            buildNumericOptions(k, [1, 0, k + 1], ' 顆', 0),
            `1 的 ${k} 倍就是 ${k}：1 × ${k} = ${k} 顆。`,
            '1 乘以幾，答案就是幾！',
          ),
        );
      }
    } else {
      // 乘法相差關係（如 7 × 6 比 7 × 4 多多少）
      const base = pickRandom([3, 6, 7, 9]);
      const n = randomInt(2, 7);
      const gap = pickRandom([1, 2]);
      const ans = base * gap;
      questions.push(
        makeQuestion(
          'g2s1-u9',
          seed,
          i,
          `算式「${base} × ${n + gap}」的答案比「${base} × ${n}」多多少？`,
          buildNumericOptions(ans, [gap, base * 3, n + gap]),
          `${base} 的 ${n + gap} 倍比 ${base} 的 ${n} 倍多了 ${gap} 個 ${base}，也就是 ${base} × ${gap} = ${ans}。`,
          `不用整個乘出來，想想看多了幾個 ${base}！`,
        ),
      );
    }
  }
  return questions;
}

// ============================================================================
// 二下（8 個單元）
// ============================================================================

/** 二下第1章：1000 以內的數與大小比較 */
export function generateG2S2U1Numbers1000(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 讀寫與位值組合
      if (randomInt(0, 1) === 0) {
        const n = pickRandom([305, 408, 602, 709, 801, 520, 640, 930, 476, 853]);
        const zh = numberToZhUnder1000(n);
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const o = n % 10;
        const traps = [h * 100 + o * 10 + t, h * 10 + t + o, n + 100];
        questions.push(
          makeQuestion(
            'g2s2-u1',
            seed,
            i,
            `「${zh}」寫成阿拉伯數字是多少？`,
            buildNumericOptions(n, traps),
            `「${zh}」有 ${h} 個百、${t} 個十、${o} 個一，寫作 ${n}。`,
            '唸到「百」就是百位，中間說「零」的位置記得要寫 0！',
          ),
        );
      } else {
        const h = randomInt(2, 7);
        const t = randomInt(11, 16);
        const o = randomInt(1, 9);
        const ans = h * 100 + t * 10 + o;
        questions.push(
          makeQuestion(
            'g2s2-u1',
            seed,
            i,
            `${h} 個百、${t} 個十和 ${o} 個一合起來是多少？`,
            buildNumericOptions(ans, [h * 100 + t + o, (h + 1) * 100 + (t - 10) * 10, ans - 100]),
            `10 個十可以換成 1 個百，所以 ${t} 個十是 1 個百和 ${t - 10} 個十；合起來共 ${h + 1} 個百、${t - 10} 個十和 ${o} 個一，就是 ${ans}。`,
            '10 個十等於 1 個百，先把多的 10 個十進位到百位！',
          ),
        );
      }
    } else if (mode === 1) {
      // 1000、500、100、10、1 元錢幣點數與換幣
      if (randomInt(0, 1) === 0) {
        const has500 = 1;
        const h100 = randomInt(1, 4);
        const t10 = randomInt(2, 8);
        const o1 = randomInt(1, 9);
        const total = has500 * 500 + h100 * 100 + t10 * 10 + o1;
        questions.push(
          makeQuestion(
            'g2s2-u1',
            seed,
            i,
            `1 張 500 元、${h100} 張 100 元、${t10} 個 10 元和 ${o1} 個 1 元，一共是多少元？`,
            buildNumericOptions(
              total,
              [total - 400, total + 100, (has500 + h100) * 100 + o1 * 10 + t10],
              ' 元',
            ),
            `500 + ${h100 * 100} = ${500 + h100 * 100} 元，加上 ${t10 * 10} 元和 ${o1} 元，一共 ${total} 元。`,
            '先把 500 元和幾張 100 元加起來，再加 10 元和 1 元！',
          ),
        );
      } else {
        const items: [string, number, number[]][] = [
          ['1 張 1000 元鈔票可以換成幾張 100 元？', 10, [100, 5, 20]],
          ['1 張 500 元鈔票可以換成幾張 100 元？', 5, [50, 10, 4]],
          ['1 張 1000 元鈔票可以換成幾張 500 元？', 2, [5, 10, 20]],
        ];
        const [prompt, ans, traps] = pickRandom(items);
        questions.push(
          makeQuestion(
            'g2s2-u1',
            seed,
            i,
            prompt,
            buildNumericOptions(ans, traps, ' 張'),
            `${ans} 張合起來剛好一樣多，所以可以換成 ${ans} 張。`,
            '數數看要幾張才剛剛好凑滿這個金額！',
          ),
        );
      }
    } else if (mode === 2) {
      // 1000 以內數序（跨百進退位）
      const cases: [string, number, number[], string][] = [
        ['500 往前數 1 個數是多少？', 499, [490, 409, 501], '500 少 1 就是 499。'],
        ['699 再往後數 1 個數是多少？', 700, [690, 701, 610], '699 多 1 會進位變成 700。'],
        ['990 再多 10 是多少？', 1000, [991, 900, 100], '990 再加上 10 就是 1000。'],
        ['800 少 10 是多少？', 790, [799, 700, 810], '800 退 1 個十變成 790。'],
      ];
      const [prompt, ans, traps, exp] = pickRandom(cases);
      questions.push(
        makeQuestion(
          'g2s2-u1',
          seed,
          i,
          prompt,
          buildNumericOptions(ans, traps),
          exp,
          '注意進位和退位時，百位和十位會不會一起改變！',
        ),
      );
    } else {
      // 1000 以內大小比較
      if (randomInt(0, 1) === 0) {
        const baseH = randomInt(4, 8);
        const ans = baseH * 100 + 92;
        const wrongs = [baseH * 100 + 29, (baseH - 1) * 100 + 99, 99];
        questions.push(
          makeQuestion(
            'g2s2-u1',
            seed,
            i,
            '下面四個數中，哪一個數「最大」？',
            buildNumericOptions(ans, wrongs),
            `三位數先比百位，百位都是 ${baseH} 時再比十位，${ans} 的十位是 9，所以最大。`,
            '先比百位數字誰大，百位一樣再比十位！',
          ),
        );
      } else {
        const h = randomInt(3, 8);
        const t = randomInt(2, 7);
        const o = randomInt(1, 8);
        const leftVal = h * 100 + t * 10 + o;
        const relation = randomInt(0, 2);
        const rightVal =
          relation === 0 ? h * 100 + (t - 1) * 10 + 9 : relation === 1 ? h * 100 + (t + 1) * 10 : leftVal;
        const ans = compareSymbolOption(leftVal, rightVal);
        const distractors = COMPARE_OPTIONS.filter((opt) => opt !== ans);
        questions.push(
          makeQuestion(
            'g2s2-u1',
            seed,
            i,
            `比比看，${leftVal} （ ） ${rightVal}，括號裡要填哪一個符號？`,
            buildStringOptions(ans, distractors),
            `從百位開始比起，${leftVal} 和 ${rightVal} 比較後，應填入 ${ans}。`,
            '從最高位（百位）依序往右比較大小！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 二下第3章：三位數加減與應用 */
export function generateG2S2U3AddSub3Digits(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 三位數加法（兩次進位）
      const aO = randomInt(4, 9);
      const bO = randomInt(10 - aO, 9);
      const aT = randomInt(3, 8);
      const bT = randomInt(10 - aT, 9);
      const aH = randomInt(1, 5);
      const bH = randomInt(1, 8 - aH);
      const a = aH * 100 + aT * 10 + aO;
      const b = bH * 100 + bT * 10 + bO;
      const ans = a + b;
      questions.push(
        makeQuestion(
          'g2s2-u3',
          seed,
          i,
          `算算看，${a} + ${b} = ?`,
          buildNumericOptions(ans, [ans - 100, ans - 10, ans + 100]),
          `從個位加起並記得進位：個位滿 10 進 1 到十位，十位滿 10 再進 1 到百位，答案是 ${ans}。`,
          '對齊直式從右邊個位開始加，十位加完還要加進位的 1 喔！',
        ),
      );
    } else if (mode === 1) {
      // 三位數減法（含十位為 0 的退位）
      const aH = randomInt(4, 8);
      const aO = randomInt(1, 5);
      const a = aH * 100 + aO;
      const bH = randomInt(1, aH - 2);
      const bT = randomInt(2, 8);
      const bO = randomInt(aO + 2, 9);
      const b = bH * 100 + bT * 10 + bO;
      const ans = a - b;
      questions.push(
        makeQuestion(
          'g2s2-u3',
          seed,
          i,
          `算算看，${a} - ${b} = ?`,
          buildNumericOptions(ans, [ans + 10, ans + 100, ans - 10]),
          `個位 ${aO} 不夠減，十位是 0 要先向百位借 1 個百變成 10 個十，再借 1 個十給個位，十位剩 9 個十，算出來是 ${ans}。`,
          '十位是 0 不夠借時，要先向百位借 1，十位借過後會剩下 9 喔！',
        ),
      );
    } else if (mode === 2) {
      // 三位數比較加減應用
      if (randomInt(0, 1) === 0) {
        const a = randomInt(235, 480);
        const diff = randomInt(115, 240);
        const ans = a + diff;
        questions.push(
          makeQuestion(
            'g2s2-u3',
            seed,
            i,
            `書局賣出 ${a} 本故事書，賣出的漫畫書比故事書多 ${diff} 本，賣出幾本漫畫書？`,
            buildNumericOptions(ans, [a - diff, ans - 100, ans + 10], ' 本'),
            `漫畫書比故事書多，要用加法：${a} + ${diff} = ${ans} 本。`,
            '先看清楚是漫畫書比較多還是故事書比較多！',
          ),
        );
      } else {
        const p1 = randomInt(260, 480);
        const p2 = randomInt(180, 390);
        const total = p1 + p2;
        const change = 1000 - total;
        questions.push(
          makeQuestion(
            'g2s2-u3',
            seed,
            i,
            `一個書包 ${p1} 元，一個便當盒 ${p2} 元，兩樣都買拿 1000 元去付錢，可以找回幾元？`,
            buildNumericOptions(change, [total, change + 100, Math.max(10, change - 10)], ' 元'),
            `先算總共要付 ${p1} + ${p2} = ${total} 元，再算找回 1000 - ${total} = ${change} 元。`,
            '先把兩樣東西的價錢加起來，再用 1000 元去減！',
          ),
        );
      }
    } else {
      // 三位數估算
      const h1 = randomInt(2, 5);
      const h2 = randomInt(2, 9 - h1);
      const a = h1 * 100 + pickRandom([-4, -3, -2, 2, 3]);
      const b = h2 * 100 + pickRandom([-4, -3, -2, 2, 3]);
      const ans = (h1 + h2) * 100;
      questions.push(
        makeQuestion(
          'g2s2-u3',
          seed,
          i,
          `一件外套 ${a} 元，一件長褲 ${b} 元，估估看，兩件合起來大約要幾百元？`,
          buildNumericOptions(ans, [ans - 100, ans - 200, ans + 100], ' 元'),
          `${a} 很接近 ${h1 * 100}，${b} 很接近 ${h2 * 100}，大約是 ${h1 * 100} + ${h2 * 100} = ${ans} 元。`,
          `先把 ${a} 和 ${b} 各自看成最接近的幾百再相加！`,
        ),
      );
    }
  }
  return questions;
}

/** 二下第5章：十/幾十/百乘一位數 */
export function generateG2S2U5TenHundredMul(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 10 乘一位數或一位數乘 10
      const k = randomInt(2, 9);
      const ans = 10 * k;
      const prompt =
        randomInt(0, 1) === 0
          ? `一張貼紙 10 元，買 ${k} 張一共要付幾元？`
          : `算算看，${k} × 10 = ?`;
      const unit = prompt.includes('幾元') ? ' 元' : '';
      questions.push(
        makeQuestion(
          'g2s2-u5',
          seed,
          i,
          prompt,
          buildNumericOptions(ans, [10 + k, k, k * 100], unit),
          `10 的 ${k} 倍就是 ${k} 個十，合起來是 ${ans}${unit}。`,
          `10 乘以 ${k}，就是在 ${k} 後面補一個 0！`,
        ),
      );
    } else if (mode === 1) {
      // 幾十乘一位數
      const tens = randomInt(2, 9);
      const k = randomInt(2, 9);
      const a = tens * 10;
      const ans = a * k;
      questions.push(
        makeQuestion(
          'g2s2-u5',
          seed,
          i,
          `一包色紙有 ${a} 張，老師買了 ${k} 包，一共有幾張色紙？`,
          buildNumericOptions(ans, [tens * k, ans * 10, a + k], ' 張'),
          `${a} 是 ${tens} 個十，${tens} 個十 × ${k} = ${tens * k} 個十，也就是 ${ans} 張。`,
          `先算 ${tens} × ${k} = ${tens * k}，再想成 ${tens * k} 個十！`,
        ),
      );
    } else if (mode === 2) {
      // 整百乘一位數（積在 1000 以內）
      const pairs: [number, number][] = [
        [1, 3],
        [1, 6],
        [1, 8],
        [2, 3],
        [2, 4],
        [2, 5],
        [3, 2],
        [3, 3],
        [4, 2],
        [5, 2],
      ];
      const [h, k] = pickRandom(pairs);
      const a = h * 100;
      const ans = a * k;
      questions.push(
        makeQuestion(
          'g2s2-u5',
          seed,
          i,
          `算算看，${a} × ${k} = ?`,
          buildNumericOptions(ans, [h * k, h * k * 10, a + k]),
          `${a} 是 ${h} 個百，${h} 個百 × ${k} = ${h * k} 個百，也就是 ${ans}。`,
          `先算 ${h} × ${k} = ${h * k}，代表有 ${h * k} 個百，後面要補 2 個 0！`,
        ),
      );
    } else {
      // 十幾乘以 2 或 3（二下 5-3）
      const a = randomInt(12, 19);
      const k = pickRandom([2, 3]);
      const ans = a * k;
      const ones = a - 10;
      questions.push(
        makeQuestion(
          'g2s2-u5',
          seed,
          i,
          `一盒點心有 ${a} 個，買 ${k} 盒一共有幾個點心？`,
          buildNumericOptions(ans, [10 * k + ones, a + k, ans + 10], ' 個'),
          `把 ${a} 分成 10 和 ${ones}：10 × ${k} = ${10 * k}，${ones} × ${k} = ${ones * k}，合起來 ${10 * k} + ${ones * k} = ${ans} 個。`,
          `先算 10 × ${k}，再算 ${ones} × ${k}，最後加起來！`,
        ),
      );
    }
  }
  return questions;
}

/** 二下第6章：公尺↔公分換算與加減 */
export function generateG2S2U6MetersCm(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 幾公尺幾公分 → 幾公分（含 1~9 公分補 0 陷阱）
      const m = randomInt(1, 8);
      const cm = pickRandom([4, 7, 9, 15, 28, 40, 65, 80]);
      const ans = m * 100 + cm;
      const traps = [
        m * 10 + cm,
        cm < 10 ? m * 100 + cm * 10 : m * 1000 + cm,
        (m + 1) * 100 + cm,
      ];
      questions.push(
        makeQuestion(
          'g2s2-u6',
          seed,
          i,
          `跳遠跳了 ${m} 公尺 ${cm} 公分，也可以說是多少公分？`,
          buildNumericOptions(ans, traps, ' 公分'),
          `1 公尺 = 100 公分，${m} 公尺是 ${m * 100} 公分，加上 ${cm} 公分就是 ${ans} 公分。`,
          '記住「1 公尺 = 100 公分」，幾公尺就是幾百公分！',
        ),
      );
    } else if (mode === 1) {
      // 公分 → 幾公尺幾公分
      const m = randomInt(1, 7);
      const cm = pickRandom([3, 8, 12, 35, 50, 74]);
      const total = m * 100 + cm;
      const ans = `${m} 公尺 ${cm} 公分`;
      const wrongs = [
        `${m * 10} 公尺 ${cm} 公分`,
        `${m} 公尺 ${cm < 10 ? cm * 10 : cm + 10} 公分`,
        `${m + 1} 公尺 ${cm} 公分`,
      ];
      questions.push(
        makeQuestion(
          'g2s2-u6',
          seed,
          i,
          `教室的黑板長 ${total} 公分，也可以寫成幾公尺幾公分？`,
          buildStringOptions(ans, wrongs),
          `每 100 公分是 1 公尺，${total} 公分分成 ${m * 100} 公分和 ${cm} 公分，就是 ${ans}。`,
          '看百位數字是幾，就是幾公尺，剩下的就是幾公分！',
        ),
      );
    } else if (mode === 2) {
      // 公尺與公分的加減
      if (randomInt(0, 1) === 0) {
        const c1 = randomInt(62, 95);
        const c2 = randomInt(45, 85);
        const sum = c1 + c2;
        const ans = `1 公尺 ${sum - 100} 公分`;
        const wrongs = [
          `1 公尺 ${sum - 90} 公分`,
          `2 公尺 ${sum - 100} 公分`,
          `${sum} 公尺`,
        ];
        questions.push(
          makeQuestion(
            'g2s2-u6',
            seed,
            i,
            `紅繩長 ${c1} 公分，綠繩長 ${c2} 公分，把兩條繩子接起來共長幾公尺幾公分？`,
            buildStringOptions(ans, wrongs),
            `${c1} + ${c2} = ${sum} 公分，滿 100 公分換成 1 公尺，所以是 ${ans}。`,
            '先把兩條公分加起來，滿 100 公分就換成 1 公尺！',
          ),
        );
      } else {
        const m = randomInt(2, 5);
        const cut = randomInt(25, 85);
        const ans = m * 100 - cut;
        questions.push(
          makeQuestion(
            'g2s2-u6',
            seed,
            i,
            `一條 ${m} 公尺長的彩帶，布置教室用掉 ${cut} 公分後，還剩下幾公分？`,
            buildNumericOptions(ans, [m * 10 - cut, ans + 100, ans - 10], ' 公分'),
            `先把 ${m} 公尺換成 ${m * 100} 公分，再減掉用掉的 ${cut} 公分：${m * 100} - ${cut} = ${ans} 公分。`,
            '單位不一樣時，先把「公尺」換成「公分」再相減！',
          ),
        );
      }
    } else {
      // 公尺與公分大小比較
      const baseM = randomInt(2, 5);
      const ans = `${baseM * 100 + 75} 公分`;
      const wrongs = [
        `${baseM} 公尺 ${randomInt(35, 65)} 公分`,
        `${baseM} 公尺 8 公分`,
        `${baseM - 1} 公尺 98 公分`,
      ];
      questions.push(
        makeQuestion(
          'g2s2-u6',
          seed,
          i,
          '下面四條繩子中，哪一條「最長」？',
          buildStringOptions(ans, wrongs),
          `全部換成公分比較：${ans} 等於 ${baseM} 公尺 75 公分，比其他三條都長。`,
          '把「幾公尺幾公分」都先換成「幾公分」來比比看！',
        ),
      );
    }
  }
  return questions;
}

/** 二下第7章：乘與加減兩步驟問題（不含併式） */
export function generateG2S2U7MulAddSub(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 乘加問題（先乘再加）
      const each = randomInt(4, 9);
      const qty = randomInt(3, 8);
      const extra = randomInt(6, 24);
      const prod = each * qty;
      const ans = prod + extra;
      questions.push(
        makeQuestion(
          'g2s2-u7',
          seed,
          i,
          `一枝鉛筆 ${each} 元，小華買了 ${qty} 枝，又買了一個 ${extra} 元的橡皮擦，一共要付幾元？`,
          buildNumericOptions(ans, [(each + extra) * qty, each + qty + extra, prod], ' 元'),
          `先算 ${qty} 枝鉛筆多少元：${each} × ${qty} = ${prod} 元，再加上橡皮擦：${prod} + ${extra} = ${ans} 元。`,
          '第一步先算出買鉛筆共花多少元，第二步再加上橡皮擦的價錢！',
        ),
      );
    } else if (mode === 1) {
      // 乘減問題（先乘再減）
      const each = randomInt(4, 9);
      const qty = randomInt(3, 7);
      const prod = each * qty;
      const wallet = prod < 45 ? 50 : 100;
      const ans = wallet - prod;
      questions.push(
        makeQuestion(
          'g2s2-u7',
          seed,
          i,
          `一顆蘋果 ${each} 元，媽媽買了 ${qty} 顆，付給老闆 ${wallet} 元，可以找回幾元？`,
          buildNumericOptions(ans, [prod, wallet - each - qty, ans + 10], ' 元'),
          `先算 ${qty} 顆蘋果多少元：${each} × ${qty} = ${prod} 元，再算找回：${wallet} - ${prod} = ${ans} 元。`,
          `先用乘法算出總共花了幾元，再用 ${wallet} 元減掉花掉的錢！`,
        ),
      );
    } else if (mode === 2) {
      // 加乘問題（先加再乘）
      const base = randomInt(3, 6);
      const add = randomInt(2, 4);
      const groups = randomInt(3, 7);
      const perPlate = base + add;
      const ans = perPlate * groups;
      questions.push(
        makeQuestion(
          'g2s2-u7',
          seed,
          i,
          `一個盤子裡原本有 ${base} 顆草莓，哥哥又放進去 ${add} 顆。像這樣的盤子共有 ${groups} 盤，總共有幾顆草莓？`,
          buildNumericOptions(
            ans,
            [base * groups + add, base + add * groups, perPlate + groups],
            ' 顆',
          ),
          `先算每一盤現在有幾顆：${base} + ${add} = ${perPlate} 顆，再算 ${groups} 盤：${perPlate} × ${groups} = ${ans} 顆。`,
          '先算「一盤現在有幾顆草莓」，再乘以盤數！',
        ),
      );
    } else {
      // 減乘問題（先減再乘）
      const orig = randomInt(7, 12);
      const less = randomInt(2, 4);
      const groups = randomInt(3, 8);
      const salePrice = orig - less;
      const ans = salePrice * groups;
      questions.push(
        makeQuestion(
          'g2s2-u7',
          seed,
          i,
          `一枝原子筆原價 ${orig} 元，今天特價每枝便宜 ${less} 元，買 ${groups} 枝特價的原子筆一共要幾元？`,
          buildNumericOptions(
            ans,
            [orig * groups - less, (orig + less) * groups, orig * groups],
            ' 元',
          ),
          `先算特價後一枝幾元：${orig} - ${less} = ${salePrice} 元，再算買 ${groups} 枝：${salePrice} × ${groups} = ${ans} 元。`,
          '先算特價後一枝變幾元，再算買多枝一共要付多少錢！',
        ),
      );
    }
  }
  return questions;
}

/** 二下第8章：年月日大小月、星期7天、平閏年天數 */
export function generateG2S2U8CalendarDays(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];
  const bigMonths = [1, 3, 5, 7, 8, 10, 12];
  const smallMonths = [4, 6, 9, 11];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 大小月、年與月、平閏年天數
      const kind = randomInt(0, 3);
      if (kind === 0) {
        const ansMonth = pickRandom(bigMonths);
        const wrongs = shuffle(smallMonths).slice(0, 2);
        wrongs.push(2);
        questions.push(
          makeQuestion(
            'g2s2-u8',
            seed,
            i,
            '下面哪一個月是大月（有 31 天）？',
            buildStringOptions(`${ansMonth} 月`, wrongs.map((m) => `${m} 月`)),
            `大月有 1、3、5、7、8、10、12 月（共 31 天），所以是 ${ansMonth} 月。`,
            '用拳頭口訣數數看，凸起來的月份有 31 天！',
          ),
        );
      } else if (kind === 1) {
        const ansMonth = pickRandom(smallMonths);
        const wrongs = shuffle(bigMonths).slice(0, 2);
        wrongs.push(2);
        questions.push(
          makeQuestion(
            'g2s2-u8',
            seed,
            i,
            '下面哪一個月是小月（有 30 天）？',
            buildStringOptions(`${ansMonth} 月`, wrongs.map((m) => `${m} 月`)),
            `小月有 4、6、9、11 月（共 30 天，2 月只有 28 或 29 天），所以是 ${ansMonth} 月。`,
            '小月只有 30 天，記得 2 月不屬於 30 天的小月喔！',
          ),
        );
      } else if (kind === 2) {
        const years = randomInt(2, 5);
        const ans = years * 12;
        questions.push(
          makeQuestion(
            'g2s2-u8',
            seed,
            i,
            `1 年有 12 個月，那麼 ${years} 年一共有幾個月？`,
            buildNumericOptions(ans, [years * 10, years + 12, ans + 12], ' 個月'),
            `1 年有 12 個月，${years} 年是 12 × ${years} = ${ans} 個月。`,
            '把 1 年 12 個月乘以年數就對了！',
          ),
        );
      } else {
        const sub = randomInt(0, 2);
        if (sub === 0) {
          questions.push(
            makeQuestion(
              'g2s2-u8',
              seed,
              i,
              '平年的一整年一共有幾天？',
              buildNumericOptions(365, [366, 360, 355], ' 天'),
              '平年的 2 月有 28 天，全年一共有 365 天。',
              '平年是 365 天，閏年會多 1 天！',
            ),
          );
        } else if (sub === 1) {
          questions.push(
            makeQuestion(
              'g2s2-u8',
              seed,
              i,
              '閏年的一整年一共有幾天？',
              buildNumericOptions(366, [365, 360, 367], ' 天'),
              '閏年的 2 月有 29 天，比平年多 1 天，所以全年一共有 366 天。',
              '平年 365 天，閏年 2 月多 1 天變成幾天？',
            ),
          );
        } else {
          questions.push(
            makeQuestion(
              'g2s2-u8',
              seed,
              i,
              '平年的 2 月和閏年的 2 月，哪一個天數比較多？多幾天？',
              buildStringOptions('閏年 2 月多 1 天', [
                '平年 2 月多 1 天',
                '兩個月一樣多天',
                '閏年 2 月多 2 天',
              ]),
              '平年 2 月有 28 天，閏年 2 月有 29 天，所以閏年 2 月多 1 天。',
              '想想看 2 月有幾天，平年是 28 天、閏年是 29 天！',
            ),
          );
        }
      }
    } else if (mode === 1) {
      // 星期 7 天換算
      const weeks = randomInt(2, 6);
      const extraDays = randomInt(0, 5);
      const ans = weeks * 7 + extraDays;
      const prompt =
        extraDays === 0
          ? `1 個星期有 7 天，${weeks} 個星期一共有幾天？`
          : `1 個星期有 7 天，${weeks} 個星期又 ${extraDays} 天一共有幾天？`;
      questions.push(
        makeQuestion(
          'g2s2-u8',
          seed,
          i,
          prompt,
          buildNumericOptions(ans, [weeks * 5 + extraDays, ans + 7, weeks * 10 + extraDays], ' 天'),
          `${weeks} 個星期是 7 × ${weeks} = ${weeks * 7} 天${extraDays > 0 ? `，加上 ${extraDays} 天共 ${ans} 天` : ''}。`,
          '1 個星期是 7 天，用 7 的乘法先算出幾個星期的天數！',
        ),
      );
    } else if (mode === 2) {
      // 同月日期點數（含頭尾）
      const month = randomInt(1, 12);
      const startDay = randomInt(3, 15);
      const days = randomInt(4, 10);
      const endDay = startDay + days - 1;
      questions.push(
        makeQuestion(
          'g2s2-u8',
          seed,
          i,
          `學校書展從 ${month} 月 ${startDay} 日開始，到 ${month} 月 ${endDay} 日結束，一共展出幾天？`,
          buildNumericOptions(days, [days - 1, days + 1, endDay], ' 天'),
          `包含 ${startDay} 日和 ${endDay} 日這兩天，共有 ${endDay} - ${startDay} + 1 = ${days} 天。`,
          `手指頭數數看：從 ${startDay} 號數到 ${endDay} 號，別忘了把開始那天也算進去！`,
        ),
      );
    } else {
      // 跨月日期推算（考大小月天數）
      const isSmall = randomInt(0, 1) === 0;
      const month = isSmall ? pickRandom(smallMonths) : pickRandom([1, 3, 5, 7, 8, 10]);
      const monthDays = isSmall ? 30 : 31;
      const startDay = monthDays - randomInt(0, 2);
      const addDays = randomInt(3, 5);
      const nextDay = startDay + addDays - monthDays;
      const nextMonth = month + 1;
      const ans = `${nextMonth} 月 ${nextDay} 日`;
      const wrongs = [
        `${nextMonth} 月 ${nextDay + 1} 日`,
        `${nextMonth} 月 ${nextDay + 2} 日`,
        nextDay > 1 ? `${nextMonth} 月 ${nextDay - 1} 日` : `${month} 月 ${monthDays} 日`,
      ];
      questions.push(
        makeQuestion(
          'g2s2-u8',
          seed,
          i,
          `今天是 ${month} 月 ${startDay} 日，再過 ${addDays} 天是園遊會，園遊會是幾月幾日？`,
          buildStringOptions(ans, wrongs),
          `${month} 月共有 ${monthDays} 天，從 ${startDay} 日往後數 ${addDays} 天會跨到 ${nextMonth} 月，是 ${ans}。`,
          `先想清楚 ${month} 月總共有 30 天還是 31 天，數完這個月再接下個月 1 日！`,
        ),
      );
    }
  }
  return questions;
}

/** 二下第9章：分裝與平分問題 */
export function generateG2S2U9GroupingSharing(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 分裝問題（每幾個裝一盤）
      const perPlate = randomInt(3, 9);
      const plates = randomInt(3, 9);
      const total = perPlate * plates;
      questions.push(
        makeQuestion(
          'g2s2-u9',
          seed,
          i,
          `有 ${total} 顆草莓，每 ${perPlate} 顆裝成 1 盤，一共可以裝成幾盤？`,
          buildNumericOptions(
            plates,
            [plates + 1, plates - 1, perPlate === plates ? plates + 2 : perPlate],
            ' 盤',
          ),
          `每盤裝 ${perPlate} 顆，想一想乘法口訣：${perPlate} × ${plates} = ${total}，所以可以裝成 ${plates} 盤。`,
          `想一想，${perPlate} 顆一盤、拿幾盤剛剛好會有 ${total} 顆？`,
        ),
      );
    } else if (mode === 1) {
      // 平分問題（平分給幾人，每人幾個）
      const people = randomInt(3, 9);
      const each = randomInt(2, 9);
      const total = people * each;
      questions.push(
        makeQuestion(
          'g2s2-u9',
          seed,
          i,
          `老師有 ${total} 張貼紙，平分給 ${people} 位小朋友，每人可以分到幾張貼紙？`,
          buildNumericOptions(
            each,
            [each + 1, each - 1, people === each ? each + 2 : people],
            ' 張',
          ),
          `平分給 ${people} 人，每人分到一樣多：${each} × ${people} = ${total}，所以每人分到 ${each} 張。`,
          `想一想：幾張乘以 ${people} 人會剛好等於 ${total} 張？`,
        ),
      );
    } else if (mode === 2) {
      // 哪一種人數沒辦法剛好平分
      const cases: [number, number, number[]][] = [
        [12, 5, [2, 3, 4]],
        [18, 4, [2, 3, 6]],
        [20, 6, [2, 4, 5]],
        [24, 5, [3, 4, 6]],
      ];
      const [total, bad, goods] = pickRandom(cases);
      questions.push(
        makeQuestion(
          'g2s2-u9',
          seed,
          i,
          `把 ${total} 顆糖果平分給小朋友，下面哪一種人數「沒辦法剛好分完」？`,
          buildStringOptions(`${bad} 人`, goods.map((g) => `${g} 人`)),
          `${goods.map((g) => `${g} 人每人分 ${total / g} 顆`).join('、')}都可以剛好分完；只有平分給 ${bad} 人時會剩下糖果沒辦法剛好分完。`,
          `用乘法想一想，哪一個人數找不到整數乘起來等於 ${total}？`,
        ),
      );
    } else {
      // 分裝幾包後還剩下幾顆
      const perBag = randomInt(4, 8);
      const totalBags = randomInt(4, 7);
      const packedBags = randomInt(2, totalBags - 1);
      const total = perBag * totalBags;
      const ans = total - perBag * packedBags;
      questions.push(
        makeQuestion(
          'g2s2-u9',
          seed,
          i,
          `箱子裡有 ${total} 顆鳳梨酥，每 ${perBag} 顆裝成 1 小盒，裝好 ${packedBags} 小盒後，箱子裡還剩下幾顆？`,
          buildNumericOptions(ans, [perBag * packedBags, totalBags - packedBags, ans + perBag], ' 顆'),
          `裝好 ${packedBags} 小盒用掉 ${perBag} × ${packedBags} = ${perBag * packedBags} 顆，箱子裡還剩 ${total} - ${perBag * packedBags} = ${ans} 顆。`,
          `先算 ${packedBags} 小盒一共裝了幾顆，再算箱子裡還剩幾顆！`,
        ),
      );
    }
  }
  return questions;
}

const FRACTION_ZH_NAME: Record<number, string> = {
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  8: '八',
  10: '十',
};

/** 二下第10章：單位分數 1/2、1/3、1/4、1/8 等意義與比較 */
export function generateG2S2U10UnitFractions(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];
  const denoms = [2, 3, 4, 5, 6, 8, 10];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 平分成 N 份，其中 1 份是 1/N
      const den = pickRandom(denoms);
      const other1 = den === 2 ? 4 : den - 1;
      const other2 = den === 10 ? 8 : den + 1;
      const ans = `1/${den}`;
      const wrongs = [`${den}/1`, `1/${other1}`, `1/${other2}`];
      questions.push(
        makeQuestion(
          'g2s2-u10',
          seed,
          i,
          `把一個圓形披薩平分成 ${den} 塊，其中的 1 塊是多少個披薩？`,
          buildStringOptions(ans, wrongs),
          `一個披薩平分成 ${den} 份，其中的 1 份就是 ${FRACTION_ZH_NAME[den]}分之一，記作 ${ans}。`,
          `平分成 ${den} 份要把 ${den} 寫在橫線下面（分母），1 份寫在上面（分子）！`,
        ),
      );
    } else if (mode === 1) {
      // 單位分數讀法與寫法互換
      const den = pickRandom(denoms);
      const others = shuffle(denoms.filter((d) => d !== den)).slice(0, 2);
      if (randomInt(0, 1) === 0) {
        const ans = `1/${den}`;
        const wrongs = [`${den}/1`, `1/${others[0]}`, `1/${others[1]}`];
        questions.push(
          makeQuestion(
            'g2s2-u10',
            seed,
            i,
            `「${FRACTION_ZH_NAME[den]}分之一」寫成數學分數是哪一個？`,
            buildStringOptions(ans, wrongs),
            `讀的時候從下往上讀，${FRACTION_ZH_NAME[den]}是分母寫在下面，1 是分子寫在上面，記作 ${ans}。`,
            '念作「幾分之一」，「幾」寫在下面，「1」寫在上面！',
          ),
        );
      } else {
        const ans = `${FRACTION_ZH_NAME[den]}分之一`;
        const wrongs = [
          `一分之${FRACTION_ZH_NAME[den]}`,
          `${FRACTION_ZH_NAME[others[0]]}分之一`,
          `${FRACTION_ZH_NAME[others[1]]}分之一`,
        ];
        questions.push(
          makeQuestion(
            'g2s2-u10',
            seed,
            i,
            `分數「1/${den}」應該怎麼讀？`,
            buildStringOptions(ans, wrongs),
            `分數要從分母（下面）讀起，先讀 ${FRACTION_ZH_NAME[den]}，再讀「分之一」，所以讀作「${ans}」。`,
            '讀分數時，要先讀橫線下面的數字喔！',
          ),
        );
      }
    } else if (mode === 2) {
      // 等分概念或分母意義
      if (randomInt(0, 1) === 0) {
        const ans = '把一條蛋糕切出 4 塊一樣大的切片';
        const wrongs = [
          '把一條蛋糕切出一大塊和三小塊',
          '把 10 顆糖果分成 7 顆和 3 顆',
          '把一張色紙隨便撕成兩張',
        ];
        questions.push(
          makeQuestion(
            'g2s2-u10',
            seed,
            i,
            '下面哪一種做法才是「平分」？',
            buildStringOptions(ans, wrongs),
            '每一份的大小或數量都「一樣多、一樣大」，才叫做平分。',
            '平分就是每一份都要「完全一樣大」喔！',
          ),
        );
      } else {
        const den = pickRandom([3, 4, 6, 8]);
        const ans = `平分成 ${den} 份`;
        const wrongs = [
          `拿走其中的 ${den} 份`,
          `一共有 ${den} 個蛋糕`,
          `還剩下 ${den} 塊蛋糕`,
        ];
        questions.push(
          makeQuestion(
            'g2s2-u10',
            seed,
            i,
            `分數「1/${den}」中，橫線下面的「${den}」代表什麼意思？`,
            buildStringOptions(ans, wrongs),
            `橫線下面的分母 ${den} 代表把一個整體「平分成 ${den} 份」，上面的 1 代表拿其中的 1 份。`,
            '橫線下面的數字表示「總共平分成幾份」喔！',
          ),
        );
      }
    } else {
      // 單位分數的大小比較
      const picked = shuffle(denoms).slice(0, 4).sort((a, b) => a - b);
      const askMax = randomInt(0, 1) === 0;
      if (askMax) {
        const ans = `1/${picked[0]}`;
        const wrongs = picked.slice(1).map((d) => `1/${d}`);
        questions.push(
          makeQuestion(
            'g2s2-u10',
            seed,
            i,
            '一樣大的披薩，下面哪一個分數代表的那一塊「最大」？',
            buildStringOptions(ans, wrongs),
            `平分的份數越少，每一塊反而越大，所以 ${ans} 最大。`,
            '想一想，一個披薩只分給 2 個人吃，和分給 8 個人吃，誰吃到的比較大塊？',
          ),
        );
      } else {
        const dSmall = picked[0];
        const dLarge = picked[2];
        const ans = `1/${dSmall} 條`;
        const wrongs = [`1/${dLarge} 條`, '兩段一樣長', '無法比較'];
        questions.push(
          makeQuestion(
            'g2s2-u10',
            seed,
            i,
            `兩條一樣長的彩帶，紅彩帶平分成 ${dSmall} 段拿 1 段（1/${dSmall} 條），藍彩帶平分成 ${dLarge} 段拿 1 段（1/${dLarge} 條），哪一段比較長？`,
            buildStringOptions(ans, wrongs),
            `一樣長的彩帶，平分成 ${dSmall} 段比平分成 ${dLarge} 段的每一段都長，所以 ${ans} 比較長。`,
            '彩帶一樣長時，剪成的段數越少，每一段就會越長喔！',
          ),
        );
      }
    }
  }
  return questions;
}
