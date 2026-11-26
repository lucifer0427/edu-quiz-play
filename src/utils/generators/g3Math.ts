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

function formatTenths(tenths: number): string {
  const sign = tenths < 0 ? '-' : '';
  const abs = Math.abs(Math.round(tenths));
  const whole = Math.floor(abs / 10);
  const frac = abs % 10;
  return frac === 0 ? `${sign}${whole}` : `${sign}${whole}.${frac}`;
}

function toChinese4Digit(n: number): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const th = Math.floor(n / 1000);
  const hu = Math.floor((n % 1000) / 100);
  const te = Math.floor((n % 100) / 10);
  const on = n % 10;

  let out = `${digits[th]}千`;
  if (hu > 0) {
    out += `${digits[hu]}百`;
  }
  if (te > 0) {
    if (hu === 0) out += '零';
    out += `${digits[te]}十`;
  }
  if (on > 0) {
    if (te === 0) out += '零';
    out += digits[on];
  }
  return out;
}

function buildNumericOptions(
  answer: number,
  extraCandidates: number[] = [],
  unitSuffix = '',
): { options: [string, string, string, string]; answerIndex: number } {
  const set = new Set<number>([answer]);
  for (const c of extraCandidates) {
    if (Number.isInteger(c) && c > 0 && c !== answer && set.size < 4) {
      set.add(c);
    }
  }
  const deltas = [-20, -10, -8, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 8, 10, 20];
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    guard++;
    const next = answer + pickRandom(deltas);
    if (next > 0 && next !== answer) {
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

function buildTenthsOptions(
  answerTenths: number,
  extraTenths: number[] = [],
  unitSuffix = '',
): { options: [string, string, string, string]; answerIndex: number } {
  const answerStr = `${formatTenths(answerTenths)}${unitSuffix}`;
  const set = new Set<string>([answerStr]);
  for (const c of extraTenths) {
    if (Number.isInteger(c) && c > 0) {
      const s = `${formatTenths(c)}${unitSuffix}`;
      if (s !== answerStr && set.size < 4) {
        set.add(s);
      }
    }
  }
  const deltas = [-20, -15, -10, -5, -2, -1, 1, 2, 5, 10, 15, 20];
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    guard++;
    const next = answerTenths + pickRandom(deltas);
    if (next > 0) {
      set.add(`${formatTenths(next)}${unitSuffix}`);
    }
  }
  let step = 1;
  while (set.size < 4) {
    set.add(`${formatTenths(answerTenths + step)}${unitSuffix}`);
    step++;
  }
  const options = shuffle(Array.from(set)) as [string, string, string, string];
  return { options, answerIndex: options.indexOf(answerStr) };
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
    .replace(/\?/g, '多少')
    .replace(/？/g, '多少')
    .replace(/□/g, '空格')
    .replace(/×/g, '乘以')
    .replace(/÷/g, '除以')
    .replace(/:/g, '比');
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

/** 三上第1章：10000 以內的數 */
export function generateG3S1U1Numbers10000(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 讀寫 10000 以內的數（含中間補 0）
      const pattern = randomInt(0, 2);
      const th = randomInt(2, 9);
      let num: number;
      let wrongs: number[];
      if (pattern === 0) {
        const te = randomInt(2, 9);
        const on = randomInt(1, 9);
        num = th * 1000 + te * 10 + on;
        wrongs = [th * 100 + te * 10 + on, th * 1000 + te * 100 + on, th * 10000 + te * 10 + on];
      } else if (pattern === 1) {
        const on = randomInt(1, 9);
        num = th * 1000 + on;
        wrongs = [th * 1000 + on * 10, th * 1000 + on * 100, th * 100 + on];
      } else {
        const hu = randomInt(1, 9);
        const on = randomInt(1, 9);
        num = th * 1000 + hu * 100 + on;
        wrongs = [th * 1000 + hu * 100 + on * 10, th * 100 + hu * 10 + on, th * 1000 + hu * 10 + on];
      }
      const readText = toChinese4Digit(num);
      const built = buildStringOptions(String(num), wrongs.map(String));
      questions.push(
        makeQuestion(
          'g3s1-u1',
          seed,
          i,
          `「${readText}」寫成阿拉伯數字是多少？`,
          built,
          `從高位寫到低位：千、百、十、個位一共四個位置，讀作「零」或沒唸到的數位要補 0，所以是 ${num}。`,
          '先寫出千、百、十、個四個定位，缺的位子記得補 0 喔！',
        ),
      );
    } else if (mode === 1) {
      // 位值與積木合數
      if (randomInt(0, 1) === 0) {
        const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
        const numStr = digits.join('');
        const target = pickRandom([
          { idx: 0, name: '千位', unit: 1000 },
          { idx: 1, name: '百位', unit: 100 },
          { idx: 2, name: '十位', unit: 10 },
          { idx: 3, name: '個位', unit: 1 },
        ]);
        const d = digits[target.idx];
        const ans = d * target.unit;
        const wrongs = [d, d * 10, d * 100, d * 1000].filter((v) => v !== ans);
        const built = buildNumericOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g3s1-u1',
            seed,
            i,
            `在四位數「${numStr}」中，${target.name}上的數字「${d}」代表多少？`,
            built,
            `${d} 在${target.name}上，代表有 ${d} 個 ${target.unit}，合起來是 ${ans}。`,
            '從右邊往左邊數過去：個位、十位、百位、千位！',
          ),
        );
      } else {
        const th = randomInt(2, 9);
        const hu = randomInt(0, 1) === 0 ? 0 : randomInt(1, 9);
        const te = hu === 0 ? randomInt(1, 9) : 0;
        const on = randomInt(1, 9);
        const ans = th * 1000 + hu * 100 + te * 10 + on;
        const wrongs = [
          th * 100 + Math.max(hu, te) * 10 + on,
          th * 1000 + te * 100 + hu * 10 + on,
          th * 1000 + hu * 100 + on * 10 + te,
        ];
        const built = buildNumericOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g3s1-u1',
            seed,
            i,
            `${th} 個千、${hu} 個百、${te} 個十和 ${on} 個一合起來是多少？`,
            built,
            `依序填入千位 ${th}、百位 ${hu}、十位 ${te}、個位 ${on}，合起來就是 ${ans}。`,
            '哪一個位值是 0 個，就在那個數位寫 0 補位！',
          ),
        );
      }
    } else if (mode === 2) {
      // 10000 以內數的大小比較
      const th = randomInt(2, 8);
      const hu = randomInt(3, 7);
      const te = randomInt(2, 8);
      const on = randomInt(1, 9);
      const n1 = (th - 1) * 1000 + 987;
      const n2 = th * 1000 + (hu - 1) * 100 + 95;
      const n3 = th * 1000 + hu * 100 + te * 10 + on;
      const n4 = th * 1000 + (hu + 1) * 100 + randomInt(12, 48);
      const askMax = randomInt(0, 1) === 0;
      const ans = askMax ? n4 : n1;
      const built = buildStringOptions(
        String(ans),
        [n1, n2, n3, n4].filter((v) => v !== ans).map(String),
      );
      questions.push(
        makeQuestion(
          'g3s1-u1',
          seed,
          i,
          askMax ? '下面四個數中，哪一個數「最大」？' : '下面四個數中，哪一個數「最小」？',
          built,
          askMax
            ? `四位數比大小從最高位（千位）比到個位：${n4} 的千位和百位最大，所以最大的是 ${n4}。`
            : `從千位開始比較大小，${n1} 的千位數字最小，所以最小的是 ${n1}。`,
          '比大小時先看有幾位數，位數相同就從最左邊的千位開始往右比！',
        ),
      );
    } else {
      // 錢幣組合（含 10 個百 = 1 千、10 個十 = 1 百進位）
      if (randomInt(0, 1) === 0) {
        const th = randomInt(1, 5);
        const hu = randomInt(11, 16);
        const te = randomInt(2, 8);
        const on = randomInt(1, 9);
        const ans = th * 1000 + hu * 100 + te * 10 + on;
        const forgotCarry = th * 1000 + (hu % 10) * 100 + te * 10 + on;
        const built = buildNumericOptions(ans, [forgotCarry, ans + 1000, ans - 100], ' 元');
        questions.push(
          makeQuestion(
            'g3s1-u1',
            seed,
            i,
            `存錢筒裡有 ${th} 張 1000 元、${hu} 張 100 元、${te} 個 10 元和 ${on} 個 1 元，總共有多少元？`,
            built,
            `10 張 100 元可以換成 1 張 1000 元，所以 ${hu} 張 100 元是 ${hu * 100} 元，加上 ${th * 1000} 元、${te * 10} 元和 ${on} 元，一共 ${ans} 元。`,
            '10 張 100 元等於 1000 元，記得要先換成千元再加起來喔！',
          ),
        );
      } else {
        const th = randomInt(2, 7);
        const hu = randomInt(1, 8);
        const te = randomInt(11, 16);
        const on = randomInt(1, 9);
        const ans = th * 1000 + hu * 100 + te * 10 + on;
        const forgotCarry = th * 1000 + hu * 100 + (te % 10) * 10 + on;
        const built = buildNumericOptions(ans, [forgotCarry, ans + 100, ans + 10], ' 元');
        questions.push(
          makeQuestion(
            'g3s1-u1',
            seed,
            i,
            `小安有 ${th} 張 1000 元、${hu} 張 100 元、${te} 個 10 元和 ${on} 個 1 元，合起來共有多少元？`,
            built,
            `10 個 10 元等於 100 元，${te} 個 10 元是 ${te * 10} 元，全部合起來就是 ${ans} 元。`,
            '10 個 10 元可以換 1 個 100 元，算清楚百位總共有幾個百！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 三上第2章：10000 以內的加減 */
export function generateG3S1U2AddSub4Digits(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 四位數多次進位加法（和 < 10000）
      const aTh = randomInt(1, 4);
      const bTh = randomInt(1, 8 - aTh);
      const aHu = randomInt(4, 8);
      const bHu = randomInt(10 - aHu, 9);
      const aTe = randomInt(4, 8);
      const bTe = randomInt(10 - aTe, 9);
      const aOn = randomInt(3, 8);
      const bOn = randomInt(10 - aOn, 9);
      const a = aTh * 1000 + aHu * 100 + aTe * 10 + aOn;
      const b = bTh * 1000 + bHu * 100 + bTe * 10 + bOn;
      const ans = a + b;
      const built = buildNumericOptions(ans, [ans - 100, ans - 10, ans + 100], ' 本');
      questions.push(
        makeQuestion(
          'g3s1-u2',
          seed,
          i,
          `市立圖書館原本有 ${a} 本故事書，這個月又新購入 ${b} 本，現在總共有幾本故事書？`,
          built,
          `${a} + ${b} = ${ans} 本。直式相加時，個位、十位、百位滿 10 都要記得向前一位進 1 喔！`,
          '對齊數位後從個位開始加，滿 10 就要進位給前一位！',
        ),
      );
    } else if (mode === 1) {
      // 四位數退位減法（含十位或百位為 0 的連續借位）
      const aTh = randomInt(4, 9);
      const aTe = randomInt(0, 3);
      const aOn = randomInt(1, 5);
      const a = aTh * 1000 + aTe * 10 + aOn;
      const bTh = randomInt(1, aTh - 2);
      const bHu = randomInt(3, 9);
      const bTe = randomInt(5, 9);
      const bOn = randomInt(aOn + 2, 9);
      const b = bTh * 1000 + bHu * 100 + bTe * 10 + bOn;
      const ans = a - b;
      const built = buildNumericOptions(ans, [ans + 100, ans + 10, ans - 100], ' 元');
      questions.push(
        makeQuestion(
          'g3s1-u2',
          seed,
          i,
          `爸爸存款有 ${a} 元，買了一張 ${b} 元的書桌後，還剩下多少元？`,
          built,
          `${a} - ${b} = ${ans} 元。遇到 0 不夠減時，要向更前一位借 1，經過的 0 會變成 9！`,
          '0 不夠借位時要繼續往左借，原本的 0 借來 10 再借給右邊 1 個，就剩下 9 囉！',
        ),
      );
    } else if (mode === 2) {
      // 10000 以內加減估算
      const isAdd = randomInt(0, 1) === 0;
      const k1 = isAdd ? randomInt(2, 5) : randomInt(4, 8);
      const k2 = isAdd ? randomInt(1, 4) : randomInt(1, k1 - 2);
      const d1 = pickRandom([-35, -24, -15, 14, 22]);
      const d2 = pickRandom([-28, -18, 12, 25]);
      const a = k1 * 1000 + d1;
      const b = k2 * 1000 + d2;
      const est = (isAdd ? k1 + k2 : k1 - k2) * 1000;
      const built = buildNumericOptions(est, [est - 1000, est + 1000, est + 2000], ' 元');
      questions.push(
        makeQuestion(
          'g3s1-u2',
          seed,
          i,
          isAdd
            ? `一組積木賣 ${a} 元，一台腳踏車賣 ${b} 元，把兩樣價錢都看成整千來估算，大約共要幾千元？`
            : `媽媽帶了 ${a} 元去買東西，花掉 ${b} 元買微波爐，大約還剩下幾千元？`,
          built,
          isAdd
            ? `${a} 大約是 ${k1 * 1000}，${b} 大約是 ${k2 * 1000}，所以大約共要 ${k1 * 1000} + ${k2 * 1000} = ${est} 元。`
            : `${a} 大約是 ${k1 * 1000}，${b} 大約是 ${k2 * 1000}，所以大約還剩 ${k1 * 1000} - ${k2 * 1000} = ${est} 元。`,
          '先把兩個數都看成最接近的整千，再相加或相減！',
        ),
      );
    } else {
      // 加減互逆未知數與驗算
      const subType = randomInt(0, 2);
      if (subType === 0) {
        const b = randomInt(1234, 3456);
        const c = randomInt(1345, 4200);
        const ans = b + c;
        const built = buildNumericOptions(ans, [Math.abs(c - b) + 100, ans + 100, ans - 100]);
        questions.push(
          makeQuestion(
            'g3s1-u2',
            seed,
            i,
            `在算式「□ - ${b} = ${c}」中，□ 應該填入哪一個數？`,
            built,
            `被減數等於差加上減數：□ = ${c} + ${b} = ${ans}。`,
            '減掉原本的數後還剩這些，想找回原來的數要用「加法」算回去！',
          ),
        );
      } else if (subType === 1) {
        const a = randomInt(4500, 8900);
        const c = randomInt(1200, 3200);
        const ans = a - c;
        const built = buildNumericOptions(ans, [a + c, ans + 100, ans - 100]);
        questions.push(
          makeQuestion(
            'g3s1-u2',
            seed,
            i,
            `在算式「${a} - □ = ${c}」中，□ 應該填入哪一個數？`,
            built,
            `減數等於被減數減掉差：□ = ${a} - ${c} = ${ans}。`,
            '從原本的總數裡扣掉剩下的數，就知道中間減掉多少了！',
          ),
        );
      } else {
        const b = randomInt(1350, 2850);
        const diff = randomInt(1420, 3650);
        const a = b + diff;
        const ans = `${diff} + ${b} = ${a}`;
        const built = buildStringOptions(ans, [
          `${a} + ${b} = ${diff}`,
          `${a} + ${diff} = ${b}`,
          `${diff} - ${b} = ${a}`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u2',
            seed,
            i,
            `小美算完減法「${a} - ${b} = ${diff}」後，想用「加法」驗算是否算對，下面哪一個驗算算式是正確的？`,
            built,
            `減法可以用「差 + 減數 = 被減數」來驗算，也就是 ${ans}。`,
            '驗算減法時，要把「剩下的」加上「減掉的」，看看會不會變回原本的數！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 三上第3章：毫米與數線 */
export function generateG3S1U3Millimeters(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 公分 ↔ 毫米換算
      if (randomInt(0, 1) === 0) {
        const cm = randomInt(2, 15);
        const mm = randomInt(1, 9);
        const ans = cm * 10 + mm;
        const built = buildNumericOptions(
          ans,
          [cm * 100 + mm, cm + mm, cm * 10],
          ' 毫米',
        );
        questions.push(
          makeQuestion(
            'g3s1-u3',
            seed,
            i,
            `一枝自動鉛筆長 ${cm} 公分 ${mm} 毫米，換算成毫米是多少毫米？`,
            built,
            `因為 1 公分 = 10 毫米，所以 ${cm} 公分 = ${cm * 10} 毫米，加上 ${mm} 毫米共 ${ans} 毫米。`,
            '記住「1 公分 = 10 毫米」，把公分乘以 10 再加上毫米！',
          ),
        );
      } else {
        const cm = randomInt(3, 12);
        const mm = pickRandom([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v !== cm));
        const total = cm * 10 + mm;
        const ans = `${cm} 公分 ${mm} 毫米`;
        const built = buildStringOptions(ans, [
          `${cm * 10} 公分 ${mm} 毫米`,
          `${mm} 公分 ${cm} 毫米`,
          `${cm + 1} 公分 ${mm} 毫米`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u3',
            seed,
            i,
            `一條橡皮筋長 ${total} 毫米，也可以記成幾公分幾毫米？`,
            built,
            `每 10 毫米是 1 公分，${total} 毫米 = ${cm * 10} 毫米 + ${mm} 毫米 = ${ans}。`,
            '十位以上的數字是公分，個位數字就是剩下的毫米！',
          ),
        );
      }
    } else if (mode === 1) {
      // 長度大小比較
      const baseCm = randomInt(4, 9);
      const lastMm = randomInt(6, 9);
      const maxMm = baseCm * 10 + lastMm;
      const ans = `${maxMm} 毫米`;
      const wrongs = [
        `${baseCm} 公分 ${lastMm - 3} 毫米`,
        `${baseCm - 1} 公分 9 毫米`,
        `${baseCm * 10 + 1} 毫米`,
      ];
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g3s1-u3',
          seed,
          i,
          '下面四個長度中，哪一個「最長」？',
          built,
          `全部換成毫米來比較：${ans} 等於 ${baseCm} 公分 ${lastMm} 毫米，比另外三個長度都長。`,
          '把每個選項都先換算成「毫米」，再比大小就清楚多了！',
        ),
      );
    } else if (mode === 2) {
      // 長度複名數加減（10 毫米進 1 公分／借 1 公分當 10 毫米）
      if (randomInt(0, 1) === 0) {
        const cm1 = randomInt(3, 8);
        const cm2 = randomInt(2, 6);
        const mm1 = randomInt(5, 9);
        const mm2 = randomInt(11 - mm1, 9);
        const ansCm = cm1 + cm2 + 1;
        const ansMm = mm1 + mm2 - 10;
        const ans = `${ansCm} 公分 ${ansMm} 毫米`;
        const built = buildStringOptions(ans, [
          `${cm1 + cm2} 公分 ${mm1 + mm2} 毫米`,
          `${cm1 + cm2} 公分 ${ansMm} 毫米`,
          `${ansCm + 1} 公分 ${ansMm} 毫米`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u3',
            seed,
            i,
            `小晴把兩段彩帶接起來，一段長 ${cm1} 公分 ${mm1} 毫米，另一段長 ${cm2} 公分 ${mm2} 毫米，接起來總長幾公分幾毫米？`,
            built,
            `${mm1} + ${mm2} = ${mm1 + mm2} 毫米，滿 10 毫米進位 1 公分剩 ${ansMm} 毫米；公分部分 ${cm1} + ${cm2} + 1 = ${ansCm} 公分，共 ${ans}。`,
            '毫米相加滿 10 就要進位成 1 公分喔！',
          ),
        );
      } else {
        const cm1 = randomInt(6, 12);
        const cm2 = randomInt(2, 4);
        const mm1 = randomInt(1, 4);
        const mm2 = randomInt(mm1 + 3, 9);
        const ansCm = cm1 - cm2 - 1;
        const ansMm = 10 + mm1 - mm2;
        const ans = `${ansCm} 公分 ${ansMm} 毫米`;
        const w2Mm = mm2 - mm1 !== ansMm ? mm2 - mm1 : ansMm + 2 <= 9 ? ansMm + 2 : ansMm - 2;
        const built = buildStringOptions(ans, [
          `${ansCm} 公分 ${w2Mm} 毫米`,
          `${cm1 - cm2} 公分 ${ansMm} 毫米`,
          `${ansCm + 1} 公分 ${ansMm + 1} 毫米`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u3',
            seed,
            i,
            `一條繩子長 ${cm1} 公分 ${mm1} 毫米，剪掉 ${cm2} 公分 ${mm2} 毫米後，還剩下幾公分幾毫米？`,
            built,
            `${mm1} 毫米不夠減 ${mm2} 毫米，借 1 公分變成 10 毫米：10 + ${mm1} - ${mm2} = ${ansMm} 毫米，公分剩 ${cm1} - 1 - ${cm2} = ${ansCm} 公分，所以剩 ${ans}。`,
            '毫米不夠減時，向公分借 1 公分當成 10 毫米再減！',
          ),
        );
      }
    } else {
      // 數線加減或斷尺測量
      if (randomInt(0, 1) === 0) {
        const start = randomInt(25, 85);
        const step = randomInt(14, 38);
        const moveRight = randomInt(0, 1) === 0;
        const ans = moveRight ? start + step : start - step;
        const wrongOpp = moveRight ? Math.max(1, start - step) : start + step;
        const built = buildNumericOptions(ans, [wrongOpp, ans + 1, ans + 10]);
        questions.push(
          makeQuestion(
            'g3s1-u3',
            seed,
            i,
            moveRight
              ? `在整數數線上，每一小格代表 1，小兔從數字 ${start} 開始往右跳 ${step} 格，會停在數字多少？`
              : `在整數數線上，每一小格代表 1，小兔從數字 ${start} 開始往左跳 ${step} 格，會停在數字多少？`,
            built,
            moveRight
              ? `在數線上往右移動是加法：${start} + ${step} = ${ans}。`
              : `在數線上往左移動是減法：${start} - ${step} = ${ans}。`,
            moveRight ? '數線上往右邊數字會變大，用加法計算！' : '數線上往左邊數字會變小，用減法計算！',
          ),
        );
      } else {
        const startCm = randomInt(2, 5);
        const lenCm = randomInt(4, 8);
        const endMm = randomInt(2, 8);
        const endCm = startCm + lenCm;
        const ans = `${lenCm} 公分 ${endMm} 毫米`;
        const built = buildStringOptions(ans, [
          `${endCm} 公分 ${endMm} 毫米`,
          `${lenCm + 1} 公分 ${endMm} 毫米`,
          `${lenCm - 1} 公分 ${endMm} 毫米`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u3',
            seed,
            i,
            `用斷掉的尺量一枝蠟筆，蠟筆尾端對準刻度 ${startCm} 公分，前端對準刻度 ${endCm} 公分 ${endMm} 毫米，這枝蠟筆實際上有多長？`,
            built,
            `不是從 0 開始量時，要用前端刻度減掉尾端刻度：${endCm} 公分 ${endMm} 毫米 - ${startCm} 公分 = ${ans}。`,
            '沒對齊刻度 0 的時候，記得減掉起點的公分數才是真實長度！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 三上第4章：乘法（二／三位數乘以一位數與估算） */
export function generateG3S1U4Multiplication(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 二位數 × 一位數（含進位）
      const tens = randomInt(2, 9);
      const ones = randomInt(3, 9);
      const a = tens * 10 + ones;
      const b = randomInt(4, 9);
      const ans = a * b;
      const forgotCarry = tens * 10 * b + ((ones * b) % 10);
      const built = buildNumericOptions(ans, [forgotCarry, ans + 10, Math.max(10, ans - 10)], ' 顆');
      questions.push(
        makeQuestion(
          'g3s1-u4',
          seed,
          i,
          `一盒草莓有 ${a} 顆，媽媽買了 ${b} 盒，總共有幾顆草莓？`,
          built,
          `${a} × ${b} = ${ans} 顆。先算個位 ${ones} × ${b} = ${ones * b} 進位到十位，再算 ${tens * 10} × ${b} = ${tens * 10 * b} 合起來。`,
          '列直式算乘法時，個位相乘滿 10 進的數要加到十位上喔！',
        ),
      );
    } else if (mode === 1) {
      // 三位數 × 一位數（含十位為 0 或連續進位）
      const a =
        randomInt(0, 1) === 0
          ? randomInt(2, 7) * 100 + randomInt(3, 9)
          : randomInt(135, 489);
      const b = randomInt(3, 8);
      const ans = a * b;
      const built = buildNumericOptions(ans, [ans + 100, Math.max(100, ans - 100), ans + 10], ' 元');
      questions.push(
        makeQuestion(
          'g3s1-u4',
          seed,
          i,
          `一張火車票價是 ${a} 元，一家 ${b} 口一起搭車，總共要付多少元？`,
          built,
          `${a} × ${b} = ${ans} 元。列直式從個位、十位到百位依序相乘並加上進位。`,
          '三位數乘以一位數時，即使十位是 0 也要記得加上個位進來的數喔！',
        ),
      );
    } else if (mode === 2) {
      // 乘法估算（以整百估算）
      const h = randomInt(2, 7);
      const offset = pickRandom([-8, -5, -3, 2, 4, 6]);
      const price = h * 100 + offset;
      const qty = randomInt(3, 6);
      const est = h * qty * 100;
      const built = buildNumericOptions(est, [est - 100, est + 100, est + 200], ' 元');
      questions.push(
        makeQuestion(
          'g3s1-u4',
          seed,
          i,
          `一套繪本特價 ${price} 元，學校要買 ${qty} 套，把售價看成整百來估算，大約要準備幾百元？`,
          built,
          `${price} 元接近 ${h * 100} 元，${h * 100} × ${qty} = ${est} 元，所以大約是 ${est} 元。`,
          `先把 ${price} 看成最接近的整百（${h * 100}），再乘以 ${qty}！`,
        ),
      );
    } else {
      // 乘法與加減的兩步驟應用
      const price = randomInt(125, 285);
      const qty = randomInt(3, 6);
      const total = price * qty;
      const pay = Math.ceil((total + 150) / 500) * 500;
      const ans = pay - total;
      const built = buildNumericOptions(ans, [total, pay - price, ans + 100], ' 元');
      questions.push(
        makeQuestion(
          'g3s1-u4',
          seed,
          i,
          `一本百科全書賣 ${price} 元，哥哥買了 ${qty} 本，拿出一張 ${pay} 元鈔票給店員，應找回多少元？`,
          built,
          `先算總共花了 ${price} × ${qty} = ${total} 元，再用 ${pay} - ${total} = ${ans} 元。`,
          '先用乘法算出全部買書花多少錢，再用付的錢減去書錢就是找回的錢！',
        ),
      );
    }
  }
  return questions;
}

/** 三上第6章：除法（九九乘法內一位數除法、餘數與奇偶數判別） */
export function generateG3S1U6Division(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 九九乘法內整除（平分與分裝）
      const divisor = randomInt(2, 9);
      const q = randomInt(2, 9);
      const dividend = divisor * q;
      const isSharing = randomInt(0, 1) === 0;
      const unit = isSharing ? ' 顆' : ' 盒';
      const built = buildNumericOptions(q, [q + 1, Math.max(1, q - 1), q + 2], unit);
      questions.push(
        makeQuestion(
          'g3s1-u6',
          seed,
          i,
          isSharing
            ? `老師把 ${dividend} 顆糖果平分給 ${divisor} 位小朋友，每位小朋友可以分到幾顆？`
            : `點心坊做了 ${dividend} 個鳳梨酥，每 ${divisor} 個裝成 1 盒，一共可以裝成幾盒？`,
          built,
          `${dividend} ÷ ${divisor} = ${q}${unit}，想乘法口訣：${divisor} × ${q} = ${dividend}。`,
          `想一想九九乘法表：${divisor} 乘以多少會等於 ${dividend}？`,
        ),
      );
    } else if (mode === 1) {
      // 有餘數的除法與「餘數＜除數」觀念
      if (randomInt(0, 1) === 0) {
        const divisor = randomInt(4, 9);
        const q = randomInt(2, 9);
        const rem = randomInt(1, divisor - 1);
        const dividend = divisor * q + rem;
        const askRem = randomInt(0, 1) === 0;
        if (askRem) {
          const built = buildNumericOptions(rem, [rem + 1, Math.max(1, rem - 1), divisor], ' 顆');
          questions.push(
            makeQuestion(
              'g3s1-u6',
              seed,
              i,
              `籃子裡有 ${dividend} 顆橘子，每 ${divisor} 顆裝成一袋，盡量裝滿後，還剩下幾顆橘子？`,
              built,
              `${dividend} ÷ ${divisor} = ${q} 袋 …… 餘 ${rem} 顆，所以還剩下 ${rem} 顆。`,
              '題目問的是「還剩下幾顆」，記得看除完之後的「餘數」喔！',
            ),
          );
        } else {
          const built = buildNumericOptions(q, [q + 1, Math.max(1, q - 1), q + 2], ' 袋');
          questions.push(
            makeQuestion(
              'g3s1-u6',
              seed,
              i,
              `籃子裡有 ${dividend} 顆橘子，每 ${divisor} 顆裝成一袋，最多可以裝滿幾袋？`,
              built,
              `${dividend} ÷ ${divisor} = ${q} …… 餘 ${rem}，剩下的 ${rem} 顆不夠裝成 1 袋，所以最多裝滿 ${q} 袋。`,
              '算出商和餘數後，「商」就是最多可以裝滿的袋數！',
            ),
          );
        }
      } else {
        const divisor = randomInt(5, 8);
        const ans = `${divisor} 張`;
        const validRems = [1, Math.floor(divisor / 2), divisor - 1].map((v) => `${v} 張`);
        const built = buildStringOptions(ans, validRems);
        questions.push(
          makeQuestion(
            'g3s1-u6',
            seed,
            i,
            `把一疊貼紙平分給 ${divisor} 位小朋友，分到不能再分時，剩下的貼紙「不可能」是下面哪一個數量？`,
            built,
            `除法中餘數一定比除數小，所以剩下的數量只能比 ${divisor} 小（0 到 ${divisor - 1} 張），不可能是 ${divisor} 張（夠再每人分 1 張）。`,
            `想一想：如果還剩下 ${divisor} 張，是不是可以再每人分 1 張呢？`,
          ),
        );
      }
    } else if (mode === 2) {
      // 直式除法同時判斷商與餘數
      const divisor = randomInt(4, 9);
      const q = randomInt(2, 9);
      const rem = randomInt(1, divisor - 1);
      const dividend = divisor * q + rem;
      const ans = `商是 ${q}，餘數是 ${rem}`;
      const w1 = `商是 ${q - 1}，餘數是 ${rem + divisor}`;
      const w2 = `商是 ${q + 1}，餘數是 ${rem}`;
      const w3 =
        q !== rem
          ? `商是 ${rem}，餘數是 ${q}`
          : `商是 ${q}，餘數是 ${rem === 1 ? 2 : rem - 1}`;
      const built = buildStringOptions(ans, [w1, w2, w3]);
      questions.push(
        makeQuestion(
          'g3s1-u6',
          seed,
          i,
          `計算「${dividend} ÷ ${divisor}」的商和餘數分別是多少？`,
          built,
          `${divisor} × ${q} = ${divisor * q}，${dividend} - ${divisor * q} = ${rem}，且餘數 ${rem} < ${divisor}，所以商是 ${q}，餘數是 ${rem}。`,
          `試著用 ${divisor} 的乘法找出最接近但不超過 ${dividend} 的積，再看餘數有沒有比 ${divisor} 小！`,
        ),
      );
    } else {
      // 奇數與偶數判別
      const askEven = randomInt(0, 1) === 0;
      const baseNums = shuffle([11, 24, 37, 46, 53, 68, 75, 82, 91, 104, 128, 139, 142, 157]);
      const evens = baseNums.filter((n) => n % 2 === 0);
      const odds = baseNums.filter((n) => n % 2 === 1);
      const ans = askEven ? evens[0] : odds[0];
      const distractors = askEven ? odds.slice(0, 3) : evens.slice(0, 3);
      const built = buildStringOptions(String(ans), distractors.map(String));
      questions.push(
        makeQuestion(
          'g3s1-u6',
          seed,
          i,
          askEven ? '下面四個數中，哪一個數是「偶數」？' : '下面四個數中，哪一個數是「奇數」？',
          built,
          askEven
            ? `除以 2 沒有餘數（能被 2 整除，個位是 0、2、4、6、8）的數叫做偶數，所以 ${ans} 是偶數。`
            : `除以 2 會餘 1（個位是 1、3、5、7、9）的數叫做奇數，所以 ${ans} 是奇數。`,
          '看數字的「個位數」或試著除以 2：整除的是偶數，餘 1 的是奇數！',
        ),
      );
    }
  }
  return questions;
}

/** 三上第7章：公斤與公克 */
export function generateG3S1U7KilogramsGrams(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 公斤 ↔ 公克換算
      if (randomInt(0, 1) === 0) {
        const kg = randomInt(2, 8);
        const g = pickRandom([25, 40, 75, 80, 150, 305, 650]);
        const ans = kg * 1000 + g;
        const trap1 = kg * 100 + g;
        const trap2 = g < 100 ? kg * 1000 + g * 10 : kg * 1000 + Math.floor(g / 10);
        const built = buildNumericOptions(ans, [trap1, trap2, ans + 1000], ' 公克');
        questions.push(
          makeQuestion(
            'g3s1-u7',
            seed,
            i,
            `一顆大西瓜重 ${kg} 公斤 ${g} 公克，換算成公克是多少公克？`,
            built,
            `因為 1 公斤 = 1000 公克，${kg} 公斤 = ${kg * 1000} 公克，加上 ${g} 公克共 ${ans} 公克。`,
            '記住「1 公斤 = 1000 公克」，把公斤乘以 1000 再加上公克！',
          ),
        );
      } else {
        const kg = randomInt(2, 8);
        const g = pickRandom([30, 55, 80, 120, 405, 750]);
        const total = kg * 1000 + g;
        const ans = `${kg} 公斤 ${g} 公克`;
        const built = buildStringOptions(ans, [
          `${kg * 10} 公斤 ${g} 公克`,
          `${kg} 公斤 ${g < 100 ? g * 10 : Math.floor(g / 10)} 公克`,
          `${kg + 1} 公斤 ${g} 公克`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u7',
            seed,
            i,
            `一個書包重 ${total} 公克，也可以寫成幾公斤幾公克？`,
            built,
            `每 1000 公克是 1 公斤，${total} 公克 = ${kg * 1000} 公克 + ${g} 公克 = ${ans}。`,
            '千位上的數代表「公斤」，百位、十位、個位剩下的就是「公克」！',
          ),
        );
      }
    } else if (mode === 1) {
      // 重量大小比較
      const kg = randomInt(2, 6);
      const heaviest = `${kg * 1000 + 820} 公克`;
      const built = buildStringOptions(heaviest, [
        `${kg} 公斤 750 公克`,
        `${kg} 公斤 95 公克`,
        `${(kg - 1) * 1000 + 980} 公克`,
      ]);
      questions.push(
        makeQuestion(
          'g3s1-u7',
          seed,
          i,
          '下面四個物品的重量中，哪一個「最重」？',
          built,
          `全部換成公克比較：${heaviest} 比 ${kg} 公斤 750 公克（${kg * 1000 + 750} 公克）、${kg} 公斤 95 公克（${kg * 1000 + 95} 公克）和 ${(kg - 1) * 1000 + 980} 公克都重。`,
          '把「幾公斤幾公克」全部換成「公克」來比較最準確！',
        ),
      );
    } else if (mode === 2) {
      // 重量複名數加減（滿 1000 公克進 1 公斤 / 借 1 公斤當 1000 公克）
      if (randomInt(0, 1) === 0) {
        const kg1 = randomInt(1, 4);
        const kg2 = randomInt(1, 3);
        const g1 = pickRandom([550, 620, 750, 840]);
        const g2 = pickRandom([480, 560, 650, 720]);
        const totalG = (kg1 + kg2) * 1000 + g1 + g2;
        const ansKg = Math.floor(totalG / 1000);
        const ansG = totalG % 1000;
        const ans = `${ansKg} 公斤 ${ansG} 公克`;
        const built = buildStringOptions(ans, [
          `${kg1 + kg2} 公斤 ${g1 + g2} 公克`,
          `${kg1 + kg2} 公斤 ${ansG} 公克`,
          `${ansKg + 1} 公斤 ${ansG} 公克`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u7',
            seed,
            i,
            `一袋紅豆重 ${kg1} 公斤 ${g1} 公克，一袋綠豆重 ${kg2} 公斤 ${g2} 公克，兩袋合起來共重幾公斤幾公克？`,
            built,
            `${g1} + ${g2} = ${g1 + g2} 公克，滿 1000 公克進位 1 公斤剩 ${ansG} 公克；公斤部分 ${kg1} + ${kg2} + 1 = ${ansKg} 公斤，共 ${ans}。`,
            '公克相加滿 1000 就要進位成 1 公斤喔！',
          ),
        );
      } else {
        const kg1 = randomInt(4, 7);
        const kg2 = randomInt(1, 2);
        const g1 = pickRandom([150, 220, 340, 410]);
        const g2 = pickRandom([650, 720, 840]);
        const ansKg = kg1 - kg2 - 1;
        const ansG = 1000 + g1 - g2;
        const ans = `${ansKg} 公斤 ${ansG} 公克`;
        const w2G = g2 - g1 !== ansG ? g2 - g1 : ansG + 100;
        const built = buildStringOptions(ans, [
          `${ansKg} 公斤 ${w2G} 公克`,
          `${kg1 - kg2} 公斤 ${ansG} 公克`,
          `${ansKg + 1} 公斤 ${ansG + 100} 公克`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u7',
            seed,
            i,
            `一大包麵粉重 ${kg1} 公斤 ${g1} 公克，做麵包用掉 ${kg2} 公斤 ${g2} 公克後，還剩下幾公斤幾公克？`,
            built,
            `${g1} 公克不夠減 ${g2} 公克，借 1 公斤變成 1000 公克：1000 + ${g1} - ${g2} = ${ansG} 公克，公斤剩 ${kg1} - 1 - ${kg2} = ${ansKg} 公斤，所以剩 ${ans}。`,
            '公克不夠減的時候，跟公斤借 1 公斤當成 1000 公克！',
          ),
        );
      }
    } else {
      // 生活淨重問題（總重減掉容器重）
      const basketG = pickRandom([320, 380, 450]);
      const totalKg = randomInt(2, 4);
      const totalG = pickRandom([120, 180, 240]);
      const netTotalG = totalKg * 1000 + totalG - basketG;
      const ansKg = Math.floor(netTotalG / 1000);
      const ansG = netTotalG % 1000;
      const ans = `${ansKg} 公斤 ${ansG} 公克`;
      const built = buildStringOptions(ans, [
        `${totalKg} 公斤 ${basketG - totalG} 公克`,
        `${totalKg} 公斤 ${ansG} 公克`,
        `${totalKg} 公斤 ${totalG + basketG} 公克`,
      ]);
      questions.push(
        makeQuestion(
          'g3s1-u7',
          seed,
          i,
          `一個空竹籃重 ${basketG} 公克，裝滿蘋果後放在磅秤上共重 ${totalKg} 公斤 ${totalG} 公克，蘋果實際重幾公斤幾公克？`,
          built,
          `總重減去空籃重：借 1 公斤（1000 公克）加 ${totalG} 公克減 ${basketG} 公克得 ${ansG} 公克，公斤剩 ${totalKg - 1} 公斤，所以蘋果重 ${ans}。`,
          '用「水果加籃子的總重」減去「空籃子的重量」，記得借 1 公斤 = 1000 公克！',
        ),
      );
    }
  }
  return questions;
}

/** 三上第8章：認識幾分之幾與同分母比較 */
export function generateG3S1U8BasicFractions(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 幾分之幾與分母分子意義
      if (randomInt(0, 1) === 0) {
        const den = pickRandom([4, 5, 6, 7, 8, 9, 10]);
        const num = randomInt(2, den - 1);
        const ans = `${num}/${den} 個`;
        const built = buildStringOptions(ans, [
          `${den}/${num} 個`,
          `1/${den} 個`,
          `${num}/${den + 1} 個`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u8',
            seed,
            i,
            `把 1 個蔥油餅平分成 ${den} 塊，哥哥吃了其中的 ${num} 塊，他吃了幾個蔥油餅？`,
            built,
            `平分成 ${den} 塊代表分母是 ${den}，吃了 ${num} 塊代表分子是 ${num}，寫成分數是 ${ans}。`,
            '平分成幾份寫在下面的「分母」，拿了幾份寫在上面的「分子」！',
          ),
        );
      } else {
        const den = pickRandom([5, 6, 7, 8, 9, 10]);
        const numCandidates = [2, 3, 4, 5, 6, 7].filter((n) => n < den && n !== den - n);
        const num = pickRandom(numCandidates);
        const built = buildNumericOptions(den, [num, den - num, den + num]);
        questions.push(
          makeQuestion(
            'g3s1-u8',
            seed,
            i,
            `在分數「${num}/${den}」中，代表把 1 個整體平分成幾份的「分母」是哪一個數？`,
            built,
            `分數橫線下面的數字是分母，上面的數字是分子，所以「${num}/${den}」的分母是 ${den}。`,
            '分母在分數的下面，代表整體被平分成幾份！',
          ),
        );
      }
    } else if (mode === 1) {
      // 單位分數的累積與分數和 1 的關係
      if (randomInt(0, 1) === 0) {
        const den = pickRandom([5, 6, 7, 8, 9, 10]);
        const num = randomInt(2, den - 1);
        const ans = `${num}/${den}`;
        const built = buildStringOptions(ans, [
          `1/${den}`,
          `${den}/${num}`,
          `${num}/${den + 1}`,
        ]);
        questions.push(
          makeQuestion(
            'g3s1-u8',
            seed,
            i,
            `${num} 個 1/${den} 合起來是多少？`,
            built,
            `1 個 1/${den} 是 1/${den}，${num} 個 1/${den} 合起來就是 ${ans}。`,
            `有幾個 1/${den}，就把個數寫在分子上，分母不變！`,
          ),
        );
      } else {
        const den = pickRandom([4, 5, 6, 7, 8, 9]);
        const ans = `${den}/${den}`;
        const built = buildStringOptions(ans, [`1/${den}`, `${den - 1}/${den}`, `${den}/1`]);
        questions.push(
          makeQuestion(
            'g3s1-u8',
            seed,
            i,
            '下面哪一個分數和整數「1」一樣大？',
            built,
            `把 1 個整體平分成 ${den} 份，全部的 ${den} 份（${den}/${den}）合起來就是完整的 1。`,
            '當分子和分母一樣大時，就代表全部都拿齊了，等於 1 喔！',
          ),
        );
      }
    } else if (mode === 2) {
      // 同分母分數大小比較
      const den = pickRandom([6, 7, 8, 9, 10, 12]);
      const nums = shuffle(Array.from({ length: den - 1 }, (_, k) => k + 1)).slice(0, 4);
      nums.sort((a, b) => a - b);
      const askMax = randomInt(0, 1) === 0;
      const targetNum = askMax ? nums[3] : nums[0];
      const ans = `${targetNum}/${den}`;
      const wrongs = nums.filter((n) => n !== targetNum).map((n) => `${n}/${den}`);
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g3s1-u8',
          seed,
          i,
          askMax ? '下面四個分數中，哪一個「最大」？' : '下面四個分數中，哪一個「最小」？',
          built,
          askMax
            ? `同分母分數比大小，分子越大分數就越大，所以 ${ans} 最大。`
            : `同分母分數比大小，分子越小分數就越小，所以 ${ans} 最小。`,
          '四個分數的分母都一樣，只要比較上面「分子」的大小就好！',
        ),
      );
    } else {
      // 平分後剩下幾分之幾
      const den = pickRandom([5, 6, 7, 8, 9, 10]);
      const usedCandidates = Array.from({ length: den - 3 }, (_, k) => k + 2).filter(
        (u) => u !== den - u,
      );
      const used = pickRandom(usedCandidates);
      const rem = den - used;
      const ans = `${rem}/${den} 條`;
      const built = buildStringOptions(ans, [
        `${used}/${den} 條`,
        `1/${den} 條`,
        `${rem}/${used} 條`,
      ]);
      questions.push(
        makeQuestion(
          'g3s1-u8',
          seed,
          i,
          `一條彩帶平分成 ${den} 段，做卡片用掉了 ${used} 段，還剩下幾條彩帶？`,
          built,
          `原本有 ${den} 段，用掉 ${used} 段後還剩 ${den} - ${used} = ${rem} 段，所以剩下 ${ans}。`,
          `先算還剩下幾段，再把「剩下的段數」當分子、「總段數」當分母！`,
        ),
      );
    }
  }
  return questions;
}

/** 三下第1章：二／三位數除以一位數 */
export function generateG3S2U1Division(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 二位數 ÷ 一位數
      const divisor = randomInt(3, 8);
      const q = randomInt(11, Math.floor(94 / divisor));
      const hasRem = randomInt(0, 1) === 1;
      const rem = hasRem ? randomInt(1, divisor - 1) : 0;
      const dividend = divisor * q + rem;
      if (hasRem && randomInt(0, 1) === 0) {
        const built = buildNumericOptions(rem, [rem + 1, Math.max(1, rem - 1), q], ' 顆');
        questions.push(
          makeQuestion(
            'g3s2-u1',
            seed,
            i,
            `果園採收了 ${dividend} 顆檸檬，每 ${divisor} 顆裝成 1 袋，盡量裝滿後，還剩下幾顆檸檬？`,
            built,
            `${dividend} ÷ ${divisor} = ${q} 袋 …… 餘 ${rem} 顆，所以還剩下 ${rem} 顆。`,
            '用直式算出商和餘數，剩下的顆數就是「餘數」喔！',
          ),
        );
      } else {
        const built = buildNumericOptions(q, [q + 1, Math.max(2, q - 1), q + 10], ' 袋');
        questions.push(
          makeQuestion(
            'g3s2-u1',
            seed,
            i,
            `果園採收了 ${dividend} 顆檸檬，每 ${divisor} 顆裝成 1 袋，最多可以裝滿幾袋？`,
            built,
            hasRem
              ? `${dividend} ÷ ${divisor} = ${q} …… 餘 ${rem}，餘數不夠裝 1 袋，最多裝滿 ${q} 袋。`
              : `${dividend} ÷ ${divisor} = ${q} 袋，剛好全部裝完。`,
            '十位先除，有餘數就和個位合起來繼續除！',
          ),
        );
      }
    } else if (mode === 1) {
      // 三位數 ÷ 一位數整除（含商中間有 0）
      if (randomInt(0, 1) === 0) {
        const divisor = randomInt(3, 8);
        const hundreds = randomInt(1, Math.floor(9 / divisor));
        const ones = randomInt(2, 9);
        const q = hundreds * 100 + ones;
        const dividend = divisor * q;
        const forgotZero = hundreds * 10 + ones;
        const built = buildNumericOptions(q, [forgotZero, q + 10, q - 10], ' 盒');
        questions.push(
          makeQuestion(
            'g3s2-u1',
            seed,
            i,
            `工廠生產了 ${dividend} 塊餅乾，每 ${divisor} 塊裝成 1 小盒，總共可以裝成幾小盒？`,
            built,
            `${dividend} ÷ ${divisor} = ${q} 盒。十位不夠除時要在商的十位寫 0 補位，不能漏掉喔！`,
            '十位數字比除數小、不夠除的時候，商的十位要記得寫 0！',
          ),
        );
      } else {
        const divisor = randomInt(4, 9);
        const q = randomInt(35, Math.min(180, Math.floor(980 / divisor)));
        const dividend = divisor * q;
        const built = buildNumericOptions(q, [q + 10, Math.max(10, q - 10), q + 1], ' 張');
        questions.push(
          makeQuestion(
            'g3s2-u1',
            seed,
            i,
            `老師買了 ${dividend} 張色紙，平分給 ${divisor} 個班級，每個班級可以分到幾張？`,
            built,
            `${dividend} ÷ ${divisor} = ${q} 張。`,
            '如果百位不夠除，就連同十位一起除，商從十位寫起！',
          ),
        );
      }
    } else if (mode === 2) {
      // 三位數 ÷ 一位數（有餘數，問商與餘數）
      const divisor = randomInt(4, 9);
      const q = randomInt(25, Math.floor(960 / divisor));
      const rem = randomInt(1, divisor - 1);
      const dividend = divisor * q + rem;
      const ans = `商是 ${q}，餘數是 ${rem}`;
      const built = buildStringOptions(ans, [
        `商是 ${q - 1}，餘數是 ${rem + divisor}`,
        `商是 ${q + 1}，餘數是 ${rem}`,
        `商是 ${q}，餘數是 ${rem === 1 ? 2 : rem - 1}`,
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u1',
          seed,
          i,
          `計算「${dividend} ÷ ${divisor}」的商和餘數分別是多少？`,
          built,
          `${divisor} × ${q} = ${divisor * q}，${dividend} - ${divisor * q} = ${rem}，所以商是 ${q}，餘數是 ${rem}。`,
          '用除法直式仔細算完每一位，最後檢查餘數有沒有比除數小！',
        ),
      );
    } else {
      // 三位數 ÷ 一位數（全部裝完最少需要幾個＝商進 1）
      const divisor = randomInt(5, 9);
      const q = randomInt(18, Math.floor(450 / divisor));
      const rem = randomInt(1, divisor - 1);
      const dividend = divisor * q + rem;
      const ans = q + 1;
      const built = buildNumericOptions(ans, [q, q - 1, q + 2], ' 頂');
      questions.push(
        makeQuestion(
          'g3s2-u1',
          seed,
          i,
          `三年級有 ${dividend} 位小朋友去露營，每頂帳篷最多住 ${divisor} 人，最少要搭幾頂帳篷才能讓大家都住進去？`,
          built,
          `${dividend} ÷ ${divisor} = ${q} 頂 …… 餘 ${rem} 人，剩下的 ${rem} 人也需要 1 頂帳篷，所以至少要 ${q} + 1 = ${ans} 頂。`,
          '除不盡剩下的同學也不能被留在外面，要多加 1 頂帳篷喔！',
        ),
      );
    }
  }
  return questions;
}

/** 三下第2章：公升與毫升 */
export function generateG3S2U2LitersMl(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 公升 ↔ 毫升換算
      if (randomInt(0, 1) === 0) {
        const l = randomInt(2, 9);
        const ml = pickRandom([25, 45, 80, 150, 305, 750]);
        const ans = l * 1000 + ml;
        const trap1 = l * 100 + ml;
        const trap2 = ml < 100 ? l * 1000 + ml * 10 : l * 1000 + Math.floor(ml / 10);
        const built = buildNumericOptions(ans, [trap1, trap2, ans + 1000], ' 毫升');
        questions.push(
          makeQuestion(
            'g3s2-u2',
            seed,
            i,
            `一個大水桶可以裝 ${l} 公升 ${ml} 毫升的水，換算成毫升是多少毫升？`,
            built,
            `因為 1 公升 = 1000 毫升，${l} 公升 = ${l * 1000} 毫升，加上 ${ml} 毫升共 ${ans} 毫升。`,
            '記住「1 公升 = 1000 毫升」，把公升乘以 1000 再加毫升！',
          ),
        );
      } else {
        const l = randomInt(2, 8);
        const ml = pickRandom([35, 70, 120, 405, 850]);
        const total = l * 1000 + ml;
        const ans = `${l} 公升 ${ml} 毫升`;
        const built = buildStringOptions(ans, [
          `${l * 10} 公升 ${ml} 毫升`,
          `${l} 公升 ${ml < 100 ? ml * 10 : Math.floor(ml / 10)} 毫升`,
          `${l + 1} 公升 ${ml} 毫升`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u2',
            seed,
            i,
            `一壺冬瓜茶有 ${total} 毫升，也可以記成幾公升幾毫升？`,
            built,
            `每 1000 毫升是 1 公升，${total} 毫升 = ${l * 1000} 毫升 + ${ml} 毫升 = ${ans}。`,
            '千位上的數就是幾「公升」，剩下的百位、十位、個位是「毫升」！',
          ),
        );
      }
    } else if (mode === 1) {
      // 容量大小比較
      const l = randomInt(2, 5);
      const ans = `${l * 1000 + 850} 毫升`;
      const built = buildStringOptions(ans, [
        `${l} 公升 720 毫升`,
        `${l} 公升 95 毫升`,
        `${(l - 1) * 1000 + 990} 毫升`,
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u2',
          seed,
          i,
          '下面四個容器裝的水量中，哪一個「最多」？',
          built,
          `全部換成毫升來比較：${ans} 比 ${l} 公升 720 毫升（${l * 1000 + 720} 毫升）、${l} 公升 95 毫升（${l * 1000 + 95} 毫升）和 ${(l - 1) * 1000 + 990} 毫升都多。`,
          '先把「幾公升幾毫升」通通換算成「毫升」再比大小！',
        ),
      );
    } else if (mode === 2) {
      // 容量複名數加減
      if (randomInt(0, 1) === 0) {
        const l1 = randomInt(1, 4);
        const l2 = randomInt(1, 3);
        const ml1 = pickRandom([450, 580, 650, 760]);
        const ml2 = pickRandom([580, 640, 720, 850]);
        const total = (l1 + l2) * 1000 + ml1 + ml2;
        const ansL = Math.floor(total / 1000);
        const ansMl = total % 1000;
        const ans = `${ansL} 公升 ${ansMl} 毫升`;
        const built = buildStringOptions(ans, [
          `${l1 + l2} 公升 ${ml1 + ml2} 毫升`,
          `${l1 + l2} 公升 ${ansMl} 毫升`,
          `${ansL + 1} 公升 ${ansMl} 毫升`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u2',
            seed,
            i,
            `水壺裡原本有 ${l1} 公升 ${ml1} 毫升的開水，又倒進 ${l2} 公升 ${ml2} 毫升，現在水壺裡共有幾公升幾毫升的開水？`,
            built,
            `${ml1} + ${ml2} = ${ml1 + ml2} 毫升，滿 1000 毫升進位 1 公升剩 ${ansMl} 毫升，加上 ${l1} + ${l2} 公升共 ${ans}。`,
            '毫升相加滿 1000 就要進位成 1 公升喔！',
          ),
        );
      } else {
        const l1 = randomInt(4, 7);
        const l2 = randomInt(1, 2);
        const ml1 = pickRandom([150, 240, 320, 410]);
        const ml2 = pickRandom([650, 740, 850]);
        const ansL = l1 - l2 - 1;
        const ansMl = 1000 + ml1 - ml2;
        const ans = `${ansL} 公升 ${ansMl} 毫升`;
        const w2Ml = ml2 - ml1 !== ansMl ? ml2 - ml1 : ansMl + 100;
        const built = buildStringOptions(ans, [
          `${ansL} 公升 ${w2Ml} 毫升`,
          `${l1 - l2} 公升 ${ansMl} 毫升`,
          `${ansL + 1} 公升 ${ansMl + 100} 毫升`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u2',
            seed,
            i,
            `一桶紅茶有 ${l1} 公升 ${ml1} 毫升，園遊會賣出 ${l2} 公升 ${ml2} 毫升後，還剩下幾公升幾毫升？`,
            built,
            `${ml1} 毫升不夠減 ${ml2} 毫升，借 1 公升當 1000 毫升：1000 + ${ml1} - ${ml2} = ${ansMl} 毫升，公升剩 ${l1} - 1 - ${l2} = ${ansL} 公升，所以剩 ${ans}。`,
            '毫升不夠減時，向公升借 1 公升變成 1000 毫升來減！',
          ),
        );
      }
    } else {
      // 容量乘除應用
      if (randomInt(0, 1) === 0) {
        const perBottle = pickRandom([350, 450, 650, 750, 850]);
        const qty = pickRandom([3, 5, 7]);
        const total = perBottle * qty;
        const ansL = Math.floor(total / 1000);
        const ansMl = total % 1000;
        const ans = `${ansL} 公升 ${ansMl} 毫升`;
        const altL = ansL > 1 ? ansL - 1 : ansL + 2;
        const altMl = ansMl >= 900 ? ansMl - 100 : ansMl + 100;
        const built = buildStringOptions(ans, [
          `${ansL + 1} 公升 ${ansMl} 毫升`,
          `${altL} 公升 ${ansMl} 毫升`,
          `${ansL} 公升 ${altMl} 毫升`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u2',
            seed,
            i,
            `1 瓶豆漿有 ${perBottle} 毫升，爸爸買了 ${qty} 瓶，一共是多少公升多少毫升？`,
            built,
            `先算總共有 ${perBottle} × ${qty} = ${total} 毫升，每 1000 毫升是 1 公升，所以是 ${ans}。`,
            '先用乘法算出總共有多少毫升，再把千位換成公升！',
          ),
        );
      } else {
        const cups = pickRandom([4, 5, 6]);
        const perCup = randomInt(3, 8) * 100 + 50;
        const total = cups * perCup;
        const l = Math.floor(total / 1000);
        const ml = total % 1000;
        const built = buildNumericOptions(
          perCup,
          [perCup + 50, perCup - 50, Math.floor(total / 10)],
          ' 毫升',
        );
        questions.push(
          makeQuestion(
            'g3s2-u2',
            seed,
            i,
            `一大壺果汁有 ${l} 公升 ${ml} 毫升，平分倒進 ${cups} 個水杯，每個水杯有幾毫升果汁？`,
            built,
            `先把 ${l} 公升 ${ml} 毫升換成 ${total} 毫升，再平分除以 ${cups}：${total} ÷ ${cups} = ${perCup} 毫升。`,
            '先把容量全部換算成「毫升」，再除以杯數喔！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 三下第3章：同分母分數加減 */
export function generateG3S2U3FractionAddSub(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 同分母分數加法（和 < 1，不約分）
      const den = pickRandom([5, 6, 7, 8, 9, 10, 12]);
      const a = randomInt(1, Math.floor(den / 2));
      const b = randomInt(1, den - a - 1);
      const sum = a + b;
      const ans = `${sum}/${den}`;
      const diffNum = Math.abs(a - b);
      const w2 = diffNum > 0 ? `${diffNum}/${den}` : `${sum + 1}/${den}`;
      const w3 = sum + 1 <= den ? `${sum + 1}/${den}` : `${sum - 1}/${den}`;
      const built = buildStringOptions(ans, [
        `${sum}/${den * 2}`,
        w2 !== w3 ? w2 : `${Math.max(1, sum - 1)}/${den}`,
        w3,
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u3',
          seed,
          i,
          `計算 ${a}/${den} + ${b}/${den} 的結果是多少？`,
          built,
          `同分母分數相加，分母維持 ${den} 不變，只把分子相加：${a} + ${b} = ${sum}，所以是 ${ans}。`,
          '分母不用相加！想成「幾個 1/分母 加上 幾個 1/分母」就好囉！',
        ),
      );
    } else if (mode === 1) {
      // 同分母分數減法
      const den = pickRandom([5, 6, 7, 8, 9, 10, 12]);
      const a = randomInt(3, den - 1);
      const b = randomInt(1, a - 1);
      const diff = a - b;
      const ans = `${diff}/${den}`;
      const w1 = `${a + b}/${den}`;
      const w2 = diff > 1 ? `${diff - 1}/${den}` : `${diff + 1}/${den}`;
      const w3 = `${diff}/${den + 1}`;
      const built = buildStringOptions(ans, [w1, w2, w3]);
      questions.push(
        makeQuestion(
          'g3s2-u3',
          seed,
          i,
          `計算 ${a}/${den} - ${b}/${den} 的結果是多少？`,
          built,
          `同分母分數相減，分母 ${den} 不變，分子相減：${a} - ${b} = ${diff}，所以是 ${ans}。`,
          `分母保持 ${den} 不變，只要把分子 ${a} 減去 ${b}！`,
        ),
      );
    } else if (mode === 2) {
      // 1 減分數 / 加到 1
      const den = pickRandom([5, 6, 7, 8, 9, 10]);
      const bCandidates = Array.from({ length: den - 1 }, (_, k) => k + 1).filter(
        (v) => v !== den - v,
      );
      const b = pickRandom(bCandidates);
      const rem = den - b;
      const ans = `${rem}/${den} 張`;
      const built = buildStringOptions(ans, [
        `${b}/${den} 張`,
        `${rem}/${den + 1} 張`,
        `${rem + 1 <= den && rem + 1 !== b ? rem + 1 : Math.max(1, rem - 1)}/${den} 張`,
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u3',
          seed,
          i,
          `1 張圓形色紙，做紙花剪掉了 ${b}/${den} 張，還剩下幾張色紙？`,
          built,
          `把整數 1 想成 ${den}/${den}，${den}/${den} - ${b}/${den} = ${ans}。`,
          `把 1 張色紙看成「${den}/${den} 張」，再減掉用掉的 ${b}/${den} 張！`,
        ),
      );
    } else {
      // 同分母分數加減應用（還剩下幾盒）
      const den = pickRandom([6, 7, 8, 9, 10]);
      const a = randomInt(1, 2);
      const b = randomInt(1, den - a - 2);
      const eaten = a + b;
      const rem = den - eaten;
      const ans = `${rem}/${den} 盒`;
      const altNum = eaten !== rem ? eaten : Math.max(1, rem - 1);
      const thirdNum = rem + 1 !== altNum && rem + 1 !== eaten ? rem + 1 : Math.max(1, rem - 1);
      const finalThirdNum = thirdNum !== altNum && thirdNum !== rem ? thirdNum : rem + 2;
      const built = buildStringOptions(ans, [
        `${altNum}/${den} 盒`,
        `${eaten}/${den * 2} 盒`,
        `${finalThirdNum}/${den} 盒`,
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u3',
          seed,
          i,
          `一盒麻糬共有 ${den} 顆，哥哥吃了 ${a}/${den} 盒，妹妹吃了 ${b}/${den} 盒，這盒麻糬還剩下幾盒？`,
          built,
          `兩人一共吃了 ${a}/${den} + ${b}/${den} = ${eaten}/${den} 盒；從 1 盒（${den}/${den} 盒）減掉後還剩下 ${ans}。`,
          `先把兄妹吃的合起來，再用 ${den}/${den} 減去吃掉的！`,
        ),
      );
    }
  }
  return questions;
}

/** 三下第5章：兩步驟應用問題 */
export function generateG3S2U5TwoStepApps(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 先加減後除
      if (randomInt(0, 1) === 0) {
        const perBox = randomInt(4, 9);
        const q = randomInt(6, 15);
        const total = perBox * q;
        const a = randomInt(12, total - 12);
        const b = total - a;
        const built = buildNumericOptions(q, [q + 1, Math.max(2, q - 1), total], ' 盒');
        questions.push(
          makeQuestion(
            'g3s2-u5',
            seed,
            i,
            `烘焙坊烤了 ${a} 個原味麵包和 ${b} 個草莓麵包，全部每 ${perBox} 個裝成 1 盒，共可以裝成幾盒？`,
            built,
            `先算全部共有 ${a} + ${b} = ${total} 個麵包，再算 ${total} ÷ ${perBox} = ${q} 盒。`,
            '先把兩種麵包加起來算出總數，再用除法分裝！',
          ),
        );
      } else {
        const kids = randomInt(4, 9);
        const q = randomInt(5, 12);
        const keep = randomInt(8, 20);
        const total = kids * q + keep;
        const built = buildNumericOptions(q, [q + 2, Math.max(2, q - 1), total - keep], ' 顆');
        questions.push(
          makeQuestion(
            'g3s2-u5',
            seed,
            i,
            `老師買了 ${total} 顆糖果，先自己留下 ${keep} 顆，剩下的平分給 ${kids} 位小朋友，每位小朋友分到幾顆？`,
            built,
            `先算剩下 ${total} - ${keep} = ${total - keep} 顆，再平分給 ${kids} 人：${total - keep} ÷ ${kids} = ${q} 顆。`,
            '先扣掉老師留下的糖果，再把剩下的平分給小朋友！',
          ),
        );
      }
    } else if (mode === 1) {
      // 先除後加減
      const n = randomInt(3, 8);
      const unitPrice = randomInt(16, 36);
      const totalDrink = n * unitPrice;
      const milkPrice = randomInt(22, 48);
      const ans = unitPrice + milkPrice;
      const built = buildNumericOptions(
        ans,
        [totalDrink + milkPrice, ans + 10, Math.max(10, ans - 10)],
        ' 元',
      );
      questions.push(
        makeQuestion(
          'g3s2-u5',
          seed,
          i,
          `${n} 瓶綠茶共賣 ${totalDrink} 元，1 瓶鮮奶賣 ${milkPrice} 元，買 1 瓶綠茶和 1 瓶鮮奶一共要多少元？`,
          built,
          `先算 1 瓶綠茶 ${totalDrink} ÷ ${n} = ${unitPrice} 元，再加上 1 瓶鮮奶：${unitPrice} + ${milkPrice} = ${ans} 元。`,
          '先用除法算出「1 瓶」綠茶的價錢，再和鮮奶加起來！',
        ),
      );
    } else if (mode === 2) {
      // 乘法兩步驟（連乘問題）
      const packs = randomInt(3, 6);
      const perPack = randomInt(6, 12);
      const boxes = randomInt(3, 6);
      const ans = packs * perPack * boxes;
      const built = buildNumericOptions(
        ans,
        [packs * perPack + boxes, perPack * boxes, ans + perPack],
        ' 包',
      );
      questions.push(
        makeQuestion(
          'g3s2-u5',
          seed,
          i,
          `一箱海苔裡面有 ${packs} 盒，每盒有 ${perPack} 包，合作社進貨 ${boxes} 箱，總共有幾包海苔？`,
          built,
          `先算 1 箱有 ${packs} × ${perPack} = ${packs * perPack} 包，${boxes} 箱共有 ${packs * perPack} × ${boxes} = ${ans} 包。`,
          '先用乘法算出 1 箱有幾包，再乘以箱數！',
        ),
      );
    } else {
      // 先加減後乘 或 先乘後減
      if (randomInt(0, 1) === 0) {
        const shirt = randomInt(120, 240);
        const pants = randomInt(150, 260);
        const qty = randomInt(3, 5);
        const ans = (shirt + pants) * qty;
        const built = buildNumericOptions(
          ans,
          [shirt * qty + pants, shirt + pants * qty, ans + 100],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g3s2-u5',
            seed,
            i,
            `一件上衣 ${shirt} 元，一條短褲 ${pants} 元，媽媽買了 ${qty} 套（每套包含 1 件上衣和 1 條短褲），總共要付多少元？`,
            built,
            `先算 1 套衣服是 ${shirt} + ${pants} = ${shirt + pants} 元，買 ${qty} 套共 ${shirt + pants} × ${qty} = ${ans} 元。`,
            '先算出「1 套（上衣加短褲）」多少元，再乘以購買的套數！',
          ),
        );
      } else {
        const price = randomInt(65, 135);
        const qty = randomInt(3, 6);
        const cost = price * qty;
        const pay = cost + randomInt(6, 25) * 10;
        const ans = pay - cost;
        const built = buildNumericOptions(ans, [cost, pay - price, ans + 50], ' 元');
        questions.push(
          makeQuestion(
            'g3s2-u5',
            seed,
            i,
            `一本筆記本 ${price} 元，小宇買了 ${qty} 本，付給老闆 ${pay} 元，老闆應該找回多少元？`,
            built,
            `先算 ${qty} 本筆記本共 ${price} × ${qty} = ${cost} 元，再算找回 ${pay} - ${cost} = ${ans} 元。`,
            '先用乘法算出全部花了多少錢，再用付的錢減掉總價！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 三下第6章：一位小數 */
export function generateG3S2U6OnePlaceDecimals(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 0.1 化聚與讀寫
      const sub = randomInt(0, 2);
      if (sub === 0) {
        const whole = randomInt(1, 5);
        const frac = randomInt(2, 9);
        const tenths = whole * 10 + frac;
        const ans = formatTenths(tenths);
        const built = buildStringOptions(ans, [`0.${tenths}`, String(tenths), `${whole}.0${frac}`]);
        questions.push(
          makeQuestion(
            'g3s2-u6',
            seed,
            i,
            `${tenths} 個 0.1 合起來是多少？`,
            built,
            `10 個 0.1 是 1，所以 ${tenths} 個 0.1 是 ${whole} 和 ${frac} 個 0.1，記作 ${ans}。`,
            '每 10 個 0.1 就是 1，把十位當整數部分、個位寫在十分位！',
          ),
        );
      } else if (sub === 1) {
        const whole = randomInt(1, 6);
        const frac = randomInt(1, 9);
        const tenths = whole * 10 + frac;
        const decStr = formatTenths(tenths);
        const built = buildNumericOptions(tenths, [frac, whole, tenths * 10], ' 個');
        questions.push(
          makeQuestion(
            'g3s2-u6',
            seed,
            i,
            `一位小數「${decStr}」是由多少個 0.1 合起來的？`,
            built,
            `1 等於 10 個 0.1，所以 ${whole} 是 ${whole * 10} 個 0.1，加上 ${frac} 個 0.1，總共是 ${tenths} 個 0.1。`,
            `把「${whole}」看成 ${whole * 10} 個 0.1，再加上十分位的 ${frac} 個 0.1！`,
          ),
        );
      } else {
        const cm = randomInt(1, 8);
        const mm = randomInt(1, 9);
        const tenths = cm * 10 + mm;
        const built = buildTenthsOptions(
          tenths,
          [cm + mm * 10, cm * 10 + mm + 10, cm * 10],
          ' 公分',
        );
        questions.push(
          makeQuestion(
            'g3s2-u6',
            seed,
            i,
            `一根鐵釘長 ${cm} 公分 ${mm} 毫米，用「公分」作單位記成小數是多少公分？`,
            built,
            `1 毫米 = 0.1 公分，${mm} 毫米 = 0.${mm} 公分，加上 ${cm} 公分就是 ${formatTenths(tenths)} 公分。`,
            '因為 1 公分 = 10 毫米，所以 1 毫米就是 0.1 公分！',
          ),
        );
      }
    } else if (mode === 1) {
      // 一位小數大小比較
      const whole = randomInt(2, 6);
      const t1 = whole * 10 - 2;
      const t2 = whole * 10;
      const t3 = whole * 10 + 3;
      const t4 = whole * 10 + 7;
      const askMax = randomInt(0, 1) === 0;
      const ans = formatTenths(askMax ? t4 : t1);
      const wrongs = [t1, t2, t3, t4]
        .filter((t) => formatTenths(t) !== ans)
        .map(formatTenths);
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g3s2-u6',
          seed,
          i,
          askMax ? '下面四個數中，哪一個「最大」？' : '下面四個數中，哪一個「最小」？',
          built,
          askMax
            ? `比小數大小先看整數部分，整數相同再比十分位，所以 ${ans} 最大。`
            : `先比較整數部分，${ans} 的整數部分只有 ${whole - 1}，比另外三個數都小。`,
          '先比小數點左邊的整數部分，一樣大再比十分位！',
        ),
      );
    } else if (mode === 2) {
      // 一位小數進位加法（整數放大 10 倍運算）
      if (randomInt(0, 1) === 0) {
        const aW = randomInt(1, 4);
        const aF = randomInt(4, 9);
        const bW = randomInt(1, 3);
        const bFCandidates = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
          (f) => aF + f > 10 && (aF + f) % 10 !== 0,
        );
        const bF = pickRandom(bFCandidates);
        const aT = aW * 10 + aF;
        const bT = bW * 10 + bF;
        const sumT = aT + bT;
        const built = buildTenthsOptions(
          sumT,
          [sumT - 10, sumT + 10, sumT - 1],
          ' 公升',
        );
        questions.push(
          makeQuestion(
            'g3s2-u6',
            seed,
            i,
            `大瓶柳橙汁有 ${formatTenths(aT)} 公升，小瓶柳橙汁有 ${formatTenths(bT)} 公升，兩瓶合起來共有幾公升？`,
            built,
            `對齊小數點相加：${formatTenths(aT)} + ${formatTenths(bT)} = ${formatTenths(sumT)} 公升（十分位滿 10 個 0.1 進位 1）。`,
            '列直式時要對齊小數點，十分位滿 10 就進位 1 到個位！',
          ),
        );
      } else {
        const aW = randomInt(2, 6);
        const bW = randomInt(1, 3);
        const bF = randomInt(2, 9);
        const aT = aW * 10;
        const bT = bW * 10 + bF;
        const sumT = aT + bT;
        const trapMisalign = bW * 10 + bF + aW;
        const built = buildTenthsOptions(sumT, [trapMisalign, sumT + 10, sumT - 10]);
        questions.push(
          makeQuestion(
            'g3s2-u6',
            seed,
            i,
            `計算 ${aW} + ${formatTenths(bT)} 的結果是多少？`,
            built,
            `整數 ${aW} 的個位要對齊 ${formatTenths(bT)} 的個位（也就是 ${aW}.0），合起來是 ${formatTenths(sumT)}。`,
            `先把整數 ${aW} 想成 ${aW}.0，對齊小數點後再加！`,
          ),
        );
      }
    } else {
      // 一位小數借位減法（含整數減小數）
      if (randomInt(0, 1) === 0) {
        const whole = randomInt(3, 8);
        const bW = randomInt(1, whole - 2);
        const bF = randomInt(2, 9);
        const aT = whole * 10;
        const bT = bW * 10 + bF;
        const diffT = aT - bT;
        const trapForgotBorrow = (whole - bW) * 10 + bF;
        const built = buildTenthsOptions(diffT, [trapForgotBorrow, diffT + 10, diffT + 1], ' 公尺');
        questions.push(
          makeQuestion(
            'g3s2-u6',
            seed,
            i,
            `一條長 ${whole} 公尺的繩子，剪掉 ${formatTenths(bT)} 公尺後，還剩下幾公尺？`,
            built,
            `把 ${whole} 寫成 ${whole}.0 對齊小數點，向個位借 1 變成 10 個 0.1 再減去 ${formatTenths(bT)}，得到 ${formatTenths(diffT)} 公尺。`,
            `先把 ${whole} 寫成 ${whole}.0 對齊小數點，十分位 0 不夠減就向個位借 1！`,
          ),
        );
      } else {
        const aW = randomInt(4, 8);
        const aF = randomInt(1, 4);
        const bW = randomInt(1, 2);
        const bF = randomInt(aF + 2, 9);
        const aT = aW * 10 + aF;
        const bT = bW * 10 + bF;
        const diffT = aT - bT;
        const trapBackwards = (aW - bW) * 10 + (bF - aF);
        const built = buildTenthsOptions(diffT, [trapBackwards, diffT + 10, diffT - 1]);
        questions.push(
          makeQuestion(
            'g3s2-u6',
            seed,
            i,
            `計算 ${formatTenths(aT)} - ${formatTenths(bT)} 的結果是多少？`,
            built,
            `十分位 ${aF} 不夠減 ${bF}，向個位借 1 當成 10 個 0.1：1${aF} - ${bF} = ${diffT % 10}，個位 ${aW - 1} - ${bW} = ${Math.floor(diffT / 10)}，結果是 ${formatTenths(diffT)}。`,
            '十分位不夠減時，向個位借 1 當作 10 個 0.1 再減喔！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 三下第7章：時間的換算與加減 */
export function generateG3S2U7TimeAddSub(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 日/時/分/秒 單位換算
      const sub = randomInt(0, 2);
      if (sub === 0) {
        const d = randomInt(2, 4);
        const h = randomInt(3, 18);
        const ans = d * 24 + h;
        const built = buildNumericOptions(ans, [d * 10 + h, d * 12 + h, d * 60 + h], ' 小時');
        questions.push(
          makeQuestion(
            'g3s2-u7',
            seed,
            i,
            `太空任務總共經過了 ${d} 日 ${h} 小時，換算成小時是多少小時？`,
            built,
            `因為 1 日 = 24 小時，${d} 日 = 24 × ${d} = ${d * 24} 小時，加上 ${h} 小時共 ${ans} 小時。`,
            '記得「1 日 = 24 小時」，不是 12 或 60 喔！',
          ),
        );
      } else if (sub === 1) {
        const h = randomInt(2, 5);
        const m = randomInt(12, 48);
        const ans = h * 60 + m;
        const built = buildNumericOptions(ans, [h * 100 + m, h * 24 + m, ans - 60], ' 分鐘');
        questions.push(
          makeQuestion(
            'g3s2-u7',
            seed,
            i,
            `音樂會一共表演了 ${h} 小時 ${m} 分鐘，總共是多少分鐘？`,
            built,
            `因為 1 小時 = 60 分鐘，${h} 小時 = 60 × ${h} = ${h * 60} 分鐘，加上 ${m} 分鐘共 ${ans} 分鐘。`,
            '記住「1 小時 = 60 分鐘」，把小時乘以 60 再加上分鐘！',
          ),
        );
      } else {
        const m = randomInt(2, 6);
        const s = randomInt(15, 50);
        const ans = m * 60 + s;
        const built = buildNumericOptions(ans, [m * 100 + s, m * 24 + s, ans + 60], ' 秒');
        questions.push(
          makeQuestion(
            'g3s2-u7',
            seed,
            i,
            `小傑跑完校慶趣味競賽花了 ${m} 分 ${s} 秒，一共是幾秒？`,
            built,
            `因為 1 分鐘 = 60 秒，${m} 分 = 60 × ${m} = ${m * 60} 秒，加上 ${s} 秒共 ${ans} 秒。`,
            '記住「1 分鐘 = 60 秒」，把分鐘乘以 60 再加上秒！',
          ),
        );
      }
    } else if (mode === 1) {
      // 時間量複名數加減（60 進位）
      if (randomInt(0, 1) === 0) {
        const h1 = randomInt(1, 3);
        const h2 = randomInt(1, 2);
        const m1 = randomInt(35, 52);
        const m2 = randomInt(25, 45);
        const total = (h1 + h2) * 60 + m1 + m2;
        const ansH = Math.floor(total / 60);
        const ansM = total % 60;
        const ans = `${ansH} 小時 ${ansM} 分鐘`;
        const built = buildStringOptions(ans, [
          `${h1 + h2} 小時 ${m1 + m2} 分鐘`,
          `${h1 + h2} 小時 ${ansM} 分鐘`,
          `${ansH + 1} 小時 ${ansM} 分鐘`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u7',
            seed,
            i,
            `小安上午看書花了 ${h1} 小時 ${m1} 分鐘，下午畫圖花了 ${h2} 小時 ${m2} 分鐘，一共花了幾小時幾分鐘？`,
            built,
            `${m1} + ${m2} = ${m1 + m2} 分鐘，滿 60 分鐘進位 1 小時剩 ${ansM} 分鐘，加上 ${h1} + ${h2} 小時共 ${ans}。`,
            '時間是 60 進位：分鐘相加滿 60 就要進位成 1 小時！',
          ),
        );
      } else {
        const h1 = randomInt(4, 6);
        const h2 = randomInt(1, 2);
        const m1 = randomInt(10, 22);
        const m2 = randomInt(35, 52);
        const ansH = h1 - h2 - 1;
        const ansM = 60 + m1 - m2;
        const ans = `${ansH} 小時 ${ansM} 分鐘`;
        const w2M = m2 - m1 !== ansM ? m2 - m1 : ansM + 5;
        const built = buildStringOptions(ans, [
          `${ansH} 小時 ${w2M} 分鐘`,
          `${h1 - h2} 小時 ${ansM} 分鐘`,
          `${ansH + 1} 小時 ${ansM + 10} 分鐘`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u7',
            seed,
            i,
            `哥哥練習書法花了 ${h1} 小時 ${m1} 分鐘，妹妹練習花了 ${h2} 小時 ${m2} 分鐘，哥哥比妹妹多花幾小時幾分鐘？`,
            built,
            `${m1} 分鐘不夠減 ${m2} 分鐘，借 1 小時當成 60 分鐘：60 + ${m1} - ${m2} = ${ansM} 分鐘，小時剩 ${h1} - 1 - ${h2} = ${ansH} 小時，相差 ${ans}。`,
            '分鐘不夠減時，向小時借 1 小時當作 60 分鐘再減！',
          ),
        );
      }
    } else if (mode === 2) {
      // 開始時刻 + 經過時間 = 結束時刻
      const sh = randomInt(1, 4);
      const sm = randomInt(32, 50);
      const durH = randomInt(1, 2);
      const durM = randomInt(30, 45);
      const totalMins = (sh + durH) * 60 + sm + durM;
      const eh = Math.floor(totalMins / 60);
      const em = totalMins % 60;
      const ans = `下午 ${eh} 時 ${em} 分`;
      const built = buildStringOptions(ans, [
        `下午 ${sh + durH} 時 ${em} 分`,
        `下午 ${eh + 1} 時 ${em} 分`,
        `下午 ${eh} 時 ${em + 10} 分`,
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u7',
          seed,
          i,
          `動畫電影在下午 ${sh} 時 ${sm} 分開始播放，片長 ${durH} 小時 ${durM} 分鐘，電影在下午幾時幾分結束？`,
          built,
          `${sm} 分 + ${durM} 分 = ${sm + durM} 分（進位 1 小時剩 ${em} 分），${sh} + ${durH} + 1 = ${eh} 時，所以在 ${ans} 結束。`,
          '把開始時刻加上經過的時間，分鐘滿 60 就進位 1 小時！',
        ),
      );
    } else {
      // 跨上午到下午求經過時間
      const sh = randomInt(9, 10);
      const sm = pickRandom([35, 40, 45]);
      const eh12 = randomInt(1, 3);
      const eh24 = eh12 + 12;
      const em = pickRandom([18, 22, 26]);
      const total = eh24 * 60 + em - (sh * 60 + sm);
      const durH = Math.floor(total / 60);
      const durM = total % 60;
      const ans = `${durH} 小時 ${durM} 分鐘`;
      const built = buildStringOptions(ans, [
        `${durH + 1} 小時 ${durM} 分鐘`,
        `${durH} 小時 ${sm - em} 分鐘`,
        `${durH - 1} 小時 ${durM} 分鐘`,
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u7',
          seed,
          i,
          `小美上午 ${sh} 時 ${sm} 分進入美術館，一直待到下午 ${eh12} 時 ${em} 分才離開，她一共在美術館待了幾小時幾分鐘？`,
          built,
          `先把下午 ${eh12} 時 ${em} 分用 24 時制記成 ${eh24} 時 ${em} 分，再減去 ${sh} 時 ${sm} 分（借 1 小時當 60 分），得到 ${ans}。`,
          '跨過中午 12 時的時候，先把下午的時刻加 12 換成 24 時制再相減！',
        ),
      );
    }
  }
  return questions;
}

/** 三下第8章：乘除互逆求未知數與驗算 */
export function generateG3S2U8MulDivInverse(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 乘法求未知數：□ × b = c
      const b = randomInt(4, 9);
      const ans = randomInt(12, 36);
      const c = ans * b;
      const built = buildNumericOptions(ans, [ans + 10, Math.max(2, ans - 2), c - b]);
      questions.push(
        makeQuestion(
          'g3s2-u8',
          seed,
          i,
          `在算式「□ × ${b} = ${c}」中，□ 應該填入哪一個數？`,
          built,
          `利用乘除互逆：積除以乘數等於被乘數，所以 □ = ${c} ÷ ${b} = ${ans}。`,
          `想一想：哪一個數乘以 ${b} 會等於 ${c}？用除法 ${c} ÷ ${b} 算算看！`,
        ),
      );
    } else if (mode === 1) {
      // 除法求未知數：□ ÷ b = q 或 a ÷ □ = q
      if (randomInt(0, 1) === 0) {
        const b = randomInt(4, 9);
        const q = randomInt(12, 28);
        const ans = b * q;
        const built = buildNumericOptions(ans, [ans + b, Math.max(10, ans - b), b + q]);
        questions.push(
          makeQuestion(
            'g3s2-u8',
            seed,
            i,
            `在算式「□ ÷ ${b} = ${q}」中，□ 應該填入哪一個數？`,
            built,
            `利用乘除互逆：被除數 = 除數 × 商，所以 □ = ${b} × ${q} = ${ans}。`,
            `平分成 ${b} 份每份是 ${q}，原來的總數要用「乘法」算出來！`,
          ),
        );
      } else {
        const q = randomInt(4, 9);
        const ans = randomInt(11, 26);
        const a = ans * q;
        const built = buildNumericOptions(ans, [ans + 2, Math.max(2, ans - 2), q * 2]);
        questions.push(
          makeQuestion(
            'g3s2-u8',
            seed,
            i,
            `在算式「${a} ÷ □ = ${q}」中，□ 應該填入哪一個數？`,
            built,
            `除數等於被除數除以商：□ = ${a} ÷ ${q} = ${ans}。`,
            `總數是 ${a}，要除以多少才會得到 ${q}？用 ${a} ÷ ${q} 算算看！`,
          ),
        );
      }
    } else if (mode === 2) {
      // 有餘數除法求被除數與驗算
      const b = randomInt(5, 9);
      const q = randomInt(12, 25);
      const rem = randomInt(2, b - 1);
      const dividend = b * q + rem;
      if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(
          dividend,
          [b * q - rem, b * q, b * rem + q],
          ' 顆',
        );
        questions.push(
          makeQuestion(
            'g3s2-u8',
            seed,
            i,
            `老師把一袋糖果平分給 ${b} 位小朋友，每人分到 ${q} 顆，還剩下 ${rem} 顆，這袋糖果原本有幾顆？`,
            built,
            `原本的數量 = 除數 × 商 + 餘數 = ${b} × ${q} + ${rem} = ${b * q} + ${rem} = ${dividend} 顆。`,
            '先用乘法算出已經分出去的糖果，再加上剩下的餘數！',
          ),
        );
      } else {
        const ans = `${b} × ${q} + ${rem} = ${dividend}`;
        const built = buildStringOptions(ans, [
          `${b} × ${q} - ${rem} = ${dividend}`,
          `${b} × ${rem} + ${q} = ${dividend}`,
          `${dividend} × ${b} + ${rem} = ${q}`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u8',
            seed,
            i,
            `小宇計算除法「${dividend} ÷ ${b} = ${q} …… ${rem}」，下面哪一個算式可以用來驗算他是否算對？`,
            built,
            `有餘數的除法要用「除數 × 商 + 餘數 = 被除數」來驗算，也就是 ${ans}。`,
            '驗算時要把「除數乘以商」再加上「餘數」，看是不是等於原本的被除數！',
          ),
        );
      }
    } else {
      // 乘除互換關係與乘法估算
      if (randomInt(0, 1) === 0) {
        const a = randomInt(24, 135);
        const b = randomInt(4, 9);
        const c = a * b;
        const built = buildNumericOptions(a, [b, a + b, a + 10]);
        questions.push(
          makeQuestion(
            'g3s2-u8',
            seed,
            i,
            `已知「${a} × ${b} = ${c}」，利用乘除互逆的關係，算式「${c} ÷ ${b}」的答案是多少？`,
            built,
            `因為 ${a} × ${b} = ${c}，反過來把 ${c} 除以 ${b} 就會剛好回到 ${a}。`,
            '乘除互逆時，不用重新直式除法，直接從已知的乘法算式就能看出答案喔！',
          ),
        );
      } else {
        const h = randomInt(2, 6);
        const offset = pickRandom([-9, -6, -3, 2, 5, 8]);
        const price = h * 100 + offset;
        const qty = randomInt(3, 6);
        const est = h * qty * 100;
        const built = buildNumericOptions(est, [est - 100, est + 100, est + 200], ' 元');
        questions.push(
          makeQuestion(
            'g3s2-u8',
            seed,
            i,
            `一件運動上衣特價 ${price} 元，社團要購買 ${qty} 件，把價錢看成整百來估算，大約共要付幾百元？`,
            built,
            `${price} 元最接近 ${h * 100} 元，${h * 100} × ${qty} = ${est} 元。`,
            `先把 ${price} 元看成最接近的整百（${h * 100} 元），再乘以件數！`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 三下第9章：平方公分面積計算與拼補 */
export function generateG3S2U9AreaSqCm(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 平方公分板長方形方格計數（保證面積 ≠ 周長）
      const rows = randomInt(4, 7);
      const cols = randomInt(rows + 1, 11);
      const area = cols * rows;
      const perimeterTrap = (cols + rows) * 2;
      const built = buildNumericOptions(
        area,
        [perimeterTrap, cols + rows, area + cols],
        ' 平方公分',
      );
      questions.push(
        makeQuestion(
          'g3s2-u9',
          seed,
          i,
          `在 1 平方公分的方格紙上畫了一個長方形，每排有 ${cols} 格，一共有 ${rows} 排，這個長方形的面積是多少？`,
          built,
          `1 格是 1 平方公分，每排 ${cols} 格共 ${rows} 排，共有 ${cols} × ${rows} = ${area} 格，面積是 ${area} 平方公分。`,
          '數格子算面積時，算算看「1 排有幾格」乘以「共有幾排」！',
        ),
      );
    } else if (mode === 1) {
      // 拼補半格算面積（2 個半格 = 1 平方公分）
      const full = randomInt(6, 18);
      const halves = pickRandom([2, 4, 6, 8]);
      const ans = full + halves / 2;
      const built = buildNumericOptions(
        ans,
        [full + halves, full + halves * 2, full],
        ' 平方公分',
      );
      questions.push(
        makeQuestion(
          'g3s2-u9',
          seed,
          i,
          `在 1 平方公分方格板上畫了一個圖形，裡面包含 ${full} 個完整的方格和 ${halves} 個「半格」（2 個半格剛好拼成 1 平方公分），這個圖形的面積是多少？`,
          built,
          `${halves} 個半格可以拼成 ${halves} ÷ 2 = ${halves / 2} 平方公分，加上 ${full} 個整格，總面積是 ${ans} 平方公分。`,
          '每 2 個半格可以拼成 1 個完整的 1 平方公分喔！',
        ),
      );
    } else if (mode === 2) {
      // 複合圖形面積計算（剪角拼補或拼接）
      if (randomInt(0, 1) === 0) {
        const w = randomInt(7, 10);
        const h = randomInt(5, 8);
        const cw = randomInt(2, 3);
        const ch = randomInt(2, 3);
        const fullArea = w * h;
        const cutArea = cw * ch;
        const ans = fullArea - cutArea;
        const built = buildNumericOptions(
          ans,
          [fullArea + cutArea, fullArea, (w - cw) * (h - ch)],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g3s2-u9',
            seed,
            i,
            `一張紙卡在平方公分板上原本每排有 ${w} 格、共 ${h} 排，從角落剪掉一塊每排 ${cw} 格、共 ${ch} 排的小長方形後，剩下的面積是多少？`,
            built,
            `原本共有 ${w} × ${h} = ${fullArea} 平方公分，剪掉 ${cw} × ${ch} = ${cutArea} 平方公分後，剩下 ${fullArea} - ${cutArea} = ${ans} 平方公分。`,
            '先算出原本大長方形有幾格，再減掉被剪掉那塊的格數！',
          ),
        );
      } else {
        const a = randomInt(8, 16);
        const c = randomInt(4, 7);
        const r = randomInt(2, 4);
        const b = c * r;
        const ans = a + b;
        const built = buildNumericOptions(ans, [a + c + r, Math.abs(a - b) + 4, ans + c], ' 平方公分');
        questions.push(
          makeQuestion(
            'g3s2-u9',
            seed,
            i,
            `甲圖形的面積是 ${a} 平方公分，乙圖形在平方公分板上每排有 ${c} 格、共 ${r} 排，把甲、乙兩圖形不重疊拼在一起，合起來的面積是多少？`,
            built,
            `先算乙圖形面積為 ${c} × ${r} = ${b} 平方公分，再把兩塊加起來：${a} + ${b} = ${ans} 平方公分。`,
            '先把乙圖形的格數算出來，再和甲圖形的面積相加！',
          ),
        );
      }
    } else {
      // 反求排數或數格子比較面積
      if (randomInt(0, 1) === 0) {
        const cols = randomInt(4, 9);
        const rows = pickRandom([3, 4, 5, 6, 7, 8].filter((r) => r !== cols));
        const total = cols * rows;
        const built = buildNumericOptions(
          rows,
          [cols, rows + 2, Math.max(2, rows - 1)],
          ' 排',
        );
        questions.push(
          makeQuestion(
            'g3s2-u9',
            seed,
            i,
            `用 ${total} 張 1 平方公分的小正方形紙卡排成一個長方形，已知每一排排了 ${cols} 張，一共排了幾排？`,
            built,
            `總面積除以每一排的張數等於排數：${total} ÷ ${cols} = ${rows} 排。`,
            `想一想：${cols} 張排一排，乘以幾排才會剛好等於 ${total} 張？`,
          ),
        );
      } else {
        const base = randomInt(10, 16);
        const ans = `${base + 2} 個整格和 4 個半格`;
        const built = buildStringOptions(ans, [
          `${base + 3} 個整格`,
          `${base + 1} 個整格和 2 個半格`,
          `${base} 個整格和 2 個半格`,
        ]);
        questions.push(
          makeQuestion(
            'g3s2-u9',
            seed,
            i,
            '下面四個在 1 平方公分方格紙上畫出的圖形中，哪一個的面積「最大」？',
            built,
            `每 2 個半格算 1 平方公分：${ans} 等於 ${base + 2} + 2 = ${base + 4} 平方公分，比 ${base + 3}、${base + 2} 和 ${base + 1} 平方公分都大。`,
            '把「2 個半格」先換成 1 個整格，再比較哪一個圖形的總格數最多！',
          ),
        );
      }
    }
  }
  return questions;
}

// ============================================================
// 三上 第5章：角與形狀
// ============================================================
export function generateG3S1U5AnglesAndShapes(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const built = buildStringOptions('1 個頂點和 2 條直直的邊', [
        '2 個頂點和 1 條彎彎的邊',
        '3 個頂點和 3 條邊',
        '1 個圓心和 1 條半徑',
      ]);
      questions.push(
        makeQuestion(
          'g3s1-u5',
          seed,
          i,
          '在幾何圖形裡，一個「角」是由哪些部分組成的？',
          built,
          '角是由「1 個頂點」和從頂點出發的「2 條直邊」所組成的。',
          '想想看用兩枝直尺拼成一個尖尖的角，有幾個頂點和幾條邊？',
        ),
      );
    } else if (type === 1) {
      const kind = pickRandom([
        { name: '正方形', rightAngles: 4, extra: '4 條邊都一樣長，且有 4 個直角' },
        { name: '長方形', rightAngles: 4, extra: '兩組對邊分別等長，且有 4 個直角' },
      ]);
      const built = buildNumericOptions(kind.rightAngles, [2, 3, 6], ' 個');
      questions.push(
        makeQuestion(
          'g3s1-u5',
          seed,
          i,
          `用三角板的直角比一比，一個「${kind.name}」的內部一共有幾個直角？`,
          built,
          `${kind.name}的定義是：${kind.extra}，所以共有 4 個直角。`,
          '用三角板的直角量量看四個角落！',
        ),
      );
    } else {
      const built = buildStringOptions('張開的程度越大，角就越大（和邊畫得多長無關）', [
        '兩條邊畫得越長，角就一定越大',
        '頂點畫得越大顆，角就越大',
        '直角比鈍角還要大',
      ]);
      questions.push(
        makeQuestion(
          'g3s1-u5',
          seed,
          i,
          '比較兩個角的大小時，下列哪一個觀念是「正確」的？',
          built,
          '角的大小只看「兩條邊張開的程度」，和邊畫得有多長沒有關係！張開越大、角就越大。',
          '把兩把扇子打開，角的大小是看扇子張開的角度，還是扇骨的長度呢？',
        ),
      );
    }
  }
  return questions;
}

// ============================================================
// 三上 第9章：列表與規律
// ============================================================
export function generateG3S1U9TablesAndPatterns(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const a = randomInt(15, 30);
      const b = randomInt(10, 25);
      const c = randomInt(8, 20);
      const d = randomInt(12, 28);
      const total = a + b + c + d;
      const built = buildNumericOptions(total, [total + 10, total - 5, a + b + c], ' 件');
      questions.push(
        makeQuestion(
          'g3s1-u9',
          seed,
          i,
          `文具店統計今天賣出的商品數量：鉛筆 ${a} 件、橡皮擦 ${b} 件、直尺 ${c} 件、筆記本 ${d} 件。這四種文具一共賣出幾件？`,
          built,
          `把表格裡的四種數量加起來：${a} + ${b} + ${c} + ${d} = ${total} 件。`,
          '把表格中每一項的數量全部加起來！',
        ),
      );
    } else if (type === 1) {
      const start = randomInt(4, 15);
      const step = pickRandom([4, 5, 6, 7, 8, 9]);
      const seq = [start, start + step, start + 2 * step, start + 3 * step];
      const ans = start + 4 * step;
      const built = buildNumericOptions(ans, [ans + step, ans - 2, seq[3] + 1]);
      questions.push(
        makeQuestion(
          'g3s1-u9',
          seed,
          i,
          `觀察這排數列的規律：「${seq.join('、')}、□」，請問空格 □ 裡應該填入哪一個數？`,
          built,
          `每往右一個數都固定加 ${step}，所以 ${seq[3]} + ${step} = ${ans}。`,
          `算算看相鄰兩個數之間相差多少！`,
        ),
      );
    } else {
      const idx = randomInt(12, 20);
      const cycle = ['紅', '黃', '藍'];
      const ans = `${cycle[(idx - 1) % 3]}色`;
      const others = ['紅色', '黃色', '藍色', '綠色'].filter((x) => x !== ans).slice(0, 3);
      const built = buildStringOptions(ans, others);
      questions.push(
        makeQuestion(
          'g3s1-u9',
          seed,
          i,
          `氣球按照「紅、黃、藍、紅、黃、藍……」的規律排成一排，請問第 ${idx} 顆氣球是什麼顏色？`,
          built,
          `每 3 顆氣球為一組循環：${idx} ÷ 3 = ${Math.floor(idx / 3)} 餘 ${idx % 3}（餘 1 是紅、餘 2 是黃、整除是藍），所以第 ${idx} 顆是${ans}。`,
          `每 3 顆重複一次，用 ${idx} 除以 3 看餘數！`,
        ),
      );
    }
  }
  return questions;
}

// ============================================================
// 三下 第4章：圓
// ============================================================
export function generateG3S2U4Circles(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const r = randomInt(3, 14);
      const d = r * 2;
      const askDiameter = randomInt(0, 1) === 0;
      const ans = askDiameter ? d : r;
      const built = buildNumericOptions(ans, [askDiameter ? r : d, ans + 2, ans + 4], ' 公分');
      questions.push(
        makeQuestion(
          'g3s2-u4',
          seed,
          i,
          askDiameter
            ? `一個圓的半徑是 ${r} 公分，請問這個圓的「直徑」是多少公分？`
            : `一個圓的直徑是 ${d} 公分，請問這個圓的「半徑」是多少公分？`,
          built,
          askDiameter
            ? `直徑是半徑的 2 倍：${r} × 2 = ${d} 公分。`
            : `半徑是直徑的一半：${d} ÷ 2 = ${r} 公分。`,
          '記住口訣：「直徑 ＝ 半徑 × 2」！',
        ),
      );
    } else if (type === 1) {
      const r = randomInt(4, 9);
      const built = buildNumericOptions(r, [r * 2, r + 2, r - 1], ' 公分');
      questions.push(
        makeQuestion(
          'g3s2-u4',
          seed,
          i,
          `用圓規畫圓時，把圓規兩腳張開的距離調成 ${r} 公分，畫出來的圓「半徑」是多少公分？`,
          built,
          `圓規針尖固定在圓心，筆尖到針尖的距離就是圓的半徑，所以半徑是 ${r} 公分。`,
          '圓規兩腳張開的距離，就是從圓心到圓周的距離（半徑）喔！',
        ),
      );
    } else {
      const built = buildStringOptions('圓上最長的直線段就是直徑，而且會通過圓心', [
        '一個圓只有 1 條半徑和 1 條直徑',
        '圓的半徑越長，畫出來的圓反而越小',
        '直徑不用通過圓心，只要連接圓周上兩點就好',
      ]);
      questions.push(
        makeQuestion(
          'g3s2-u4',
          seed,
          i,
          '關於「圓」的性質，下列哪一句敘述是「正確」的？',
          built,
          '圓有無限多條半徑和直徑，直徑一定會通過圓心，也是圓內最長的線段。',
          '想想看圓的直徑一定要經過哪一個點？',
        ),
      );
    }
  }
  return questions;
}

