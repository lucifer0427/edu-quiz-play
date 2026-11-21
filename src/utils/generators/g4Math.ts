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

function formatHundredths(hundredths: number): string {
  const sign = hundredths < 0 ? '-' : '';
  const abs = Math.abs(Math.round(hundredths));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return `${sign}${whole}`;
  if (frac % 10 === 0) return `${sign}${whole}.${frac / 10}`;
  return `${sign}${whole}.${String(frac).padStart(2, '0')}`;
}

function formatHundredthsFixed2(hundredths: number): string {
  const abs = Math.abs(Math.round(hundredths));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${whole}.${String(frac).padStart(2, '0')}`;
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

function buildHundredthsOptions(
  answerHundredths: number,
  extraHundredths: number[] = [],
  unitSuffix = '',
  fixed2 = false,
): { options: [string, string, string, string]; answerIndex: number } {
  const fmt = fixed2 ? formatHundredthsFixed2 : formatHundredths;
  const answerStr = `${fmt(answerHundredths)}${unitSuffix}`;
  const set = new Set<string>([answerStr]);
  for (const c of extraHundredths) {
    if (Number.isInteger(c) && c > 0) {
      const s = `${fmt(c)}${unitSuffix}`;
      if (s !== answerStr && set.size < 4) {
        set.add(s);
      }
    }
  }
  const deltas = [-100, -50, -20, -10, -5, 5, 10, 20, 50, 100];
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    guard++;
    const next = answerHundredths + pickRandom(deltas);
    if (next > 0) {
      set.add(`${fmt(next)}${unitSuffix}`);
    }
  }
  let step = 1;
  while (set.size < 4) {
    set.add(`${fmt(answerHundredths + step)}${unitSuffix}`);
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
    .replace(/□/g, '多少')
    .replace(/×/g, '乘以')
    .replace(/÷/g, '除以')
    .replace(/:/g, '比')
    .replace(/≈/g, '大約等於');
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

/** 四上第1章：一億以內的數 */
export function generateG4S1U1BigNumbers(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 中文大數讀法轉阿拉伯數字（含中間補 0）
      const cases: [string, string, string[]][] = [
        ['三千零八萬五千零一十二', '30085012', ['30805012', '30085120', '300085012']],
        ['六千五百萬零四百零九', '65000409', ['6500409', '65040900', '60500409']],
        ['四百零二萬零七十', '4020070', ['402070', '4200070', '40200070']],
        ['九千零一十萬八千', '90108000', ['90018000', '9108000', '90100800']],
        ['七千萬零三百二十', '70000320', ['7000320', '70032000', '70000302']],
        ['五千二百萬零六十八', '52000068', ['5200068', '52006800', '50200068']],
      ];
      const [readText, ans, wrongs] = pickRandom(cases);
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g4s1-u1',
          seed,
          i,
          `「${readText}」寫成阿拉伯數字是多少？`,
          built,
          `把數字以「萬位」分界：萬級與個級各佔 4 位數，空缺的位置要補 0，合起來就是 ${ans}。`,
          '先畫出四位一節的定位板，從萬級寫完再補滿個級的四位數喔！',
        ),
      );
    } else if (mode === 1) {
      // 大數位值辨識
      const digits = shuffle([2, 3, 4, 5, 6, 7, 8, 9]);
      const targetPos = pickRandom([
        { idx: 0, placeName: '千萬位', unit: 10000000 },
        { idx: 1, placeName: '百萬位', unit: 1000000 },
        { idx: 2, placeName: '十萬位', unit: 100000 },
        { idx: 3, placeName: '萬位', unit: 10000 },
      ]);
      const numStr = digits.slice(0, 8).join('');
      const d = digits[targetPos.idx];
      const ans = String(d * targetPos.unit);
      const wrongs = [
        String(d * (targetPos.unit / 10)),
        String(d * (targetPos.unit * 10)),
        String(d),
      ];
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g4s1-u1',
          seed,
          i,
          `在八位數「${numStr}」中，${targetPos.placeName}上的數字「${d}」代表多少？`,
          built,
          `${d} 在${targetPos.placeName}上，代表有 ${d} 個 ${targetPos.unit}，合起來就是 ${ans}。`,
          '從右邊往左邊數：個、十、百、千、萬、十萬、百萬、千萬！',
        ),
      );
    } else if (mode === 2) {
      // 大數大小比較
      const wan = randomInt(2500, 6800);
      const tail = randomInt(100, 999);
      const biggest = wan * 10000 + tail * 10 + 9;
      const w1 = (wan - randomInt(10, 50)) * 10000 + 9999;
      const w2 = wan * 10000 + Math.max(100, tail * 10 - 100);
      const w3 = Math.floor(biggest / 10); // 少一位數常見陷阱
      const built = buildStringOptions(String(biggest), [String(w1), String(w2), String(w3)]);
      questions.push(
        makeQuestion(
          'g4s1-u1',
          seed,
          i,
          '下面四個數中，哪一個數「最大」？',
          built,
          `比大小先比位數多寡，位數相同再從最高位（千萬位）依序往右比較，最大的是 ${biggest}。`,
          '先數數看每個選項總共有幾位數，位數一樣再從最左邊開始比！',
        ),
      );
    } else {
      // 整萬／整千大數加減
      const aWan = randomInt(320, 780);
      const bWan = randomInt(120, 290);
      const isAdd = randomInt(0, 1) === 0;
      const a = aWan * 10000;
      const b = bWan * 10000;
      const ans = isAdd ? a + b : a - b;
      const wrongs = [
        isAdd ? a - b : a + b,
        Math.floor(ans / 10),
        ans + 100000,
      ];
      const built = buildStringOptions(`${ans} 元`, wrongs.map((v) => `${v} 元`));
      questions.push(
        makeQuestion(
          'g4s1-u1',
          seed,
          i,
          isAdd
            ? `市立圖書館去年購書預算 ${aWan} 萬元，今年再增加 ${bWan} 萬元，今年總預算共有多少元？`
            : `學校修繕工程預算共 ${aWan} 萬元，第一期已經花掉 ${bWan} 萬元，還剩下多少元？`,
          built,
          isAdd
            ? `${aWan} 萬 + ${bWan} 萬 = ${aWan + bWan} 萬元 = ${ans} 元（1 萬有 4 個 0）。`
            : `${aWan} 萬 - ${bWan} 萬 = ${aWan - bWan} 萬元 = ${ans} 元（1 萬有 4 個 0）。`,
          '先算有多少「萬」，最後別忘了「萬」後面要加上 4 個 0 才是元喔！',
        ),
      );
    }
  }
  return questions;
}

/** 四上第2章：乘法 */
export function generateG4S1U2Multiplication(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 四位數 × 一位數
      const a = randomInt(1234, 4895);
      const b = randomInt(3, 9);
      const ans = a * b;
      const built = buildNumericOptions(ans, [ans + 100, Math.max(100, ans - 100), ans + 10], ' 元');
      questions.push(
        makeQuestion(
          'g4s1-u2',
          seed,
          i,
          `一台平板電腦售價 ${a} 元，學校一次買了 ${b} 台，總共要付多少元？`,
          built,
          `${a} × ${b} = ${ans} 元。列直式計算時要注意每一位的進位喔！`,
          '把四位數寫在上面、一位數寫在下面，從個位開始依序乘並記得進位！',
        ),
      );
    } else if (mode === 1) {
      // 二／三位數 × 二位數
      const a = randomInt(125, 348);
      const b = randomInt(14, 36);
      const ans = a * b;
      const bTens = Math.floor(b / 10);
      const bOnes = b % 10;
      const forgotShift = a * bOnes + a * bTens; // 常見錯誤：十位相乘沒對齊十位
      const built = buildNumericOptions(
        ans,
        [forgotShift, ans + a, Math.max(100, ans - a)],
        ' 顆',
      );
      questions.push(
        makeQuestion(
          'g4s1-u2',
          seed,
          i,
          `果園將柳丁裝箱，每箱裝 ${a} 顆，一共裝了 ${b} 箱，總共裝了幾顆柳丁？`,
          built,
          `${a} × ${b} = ${ans} 顆。用十位數字 ${bTens} 去乘時，積要對齊十位寫起。`,
          '二位數乘法分成兩層算：先算個位乘、再算十位乘（十位對齊十位），最後加起來！',
        ),
      );
    } else if (mode === 2) {
      // 整十／整百乘法規律（末位補 0）
      const p = pickRandom([12, 15, 24, 25, 32, 35, 45]);
      const q = pickRandom([2, 3, 4, 6, 8]);
      const z1 = pickRandom([10, 100]);
      const z2 = pickRandom([10, 100]);
      const a = p * z1;
      const b = q * z2;
      const ans = a * b;
      const built = buildNumericOptions(ans, [Math.floor(ans / 10), ans * 10, p * q * z1]);
      questions.push(
        makeQuestion(
          'g4s1-u2',
          seed,
          i,
          `利用乘法規律計算 ${a} × ${b} 的積是多少？`,
          built,
          `先算前面的非零部分：${p} × ${q} = ${p * q}，再把兩個數末尾共 ${Math.log10(z1) + Math.log10(z2)} 個 0 補在後面，得到 ${ans}。`,
          `先算 ${p} × ${q}，再數數看兩個乘數後面總共有幾個 0 補上去！`,
        ),
      );
    } else {
      // 三位數 × 二位數（或二位數 × 三位數）比較／應用
      const perDay = randomInt(215, 450);
      const days = randomInt(21, 31);
      const ans = perDay * days;
      const built = buildNumericOptions(
        ans,
        [ans + perDay, Math.max(100, ans - perDay), ans + 1000],
        ' 個',
      );
      questions.push(
        makeQuestion(
          'g4s1-u2',
          seed,
          i,
          `麵包工廠每天生產 ${perDay} 個菠蘿麵包，連續生產 ${days} 天，總共生產幾個麵包？`,
          built,
          `${perDay} × ${days} = ${ans} 個。`,
          `把每天生產的 ${perDay} 個乘以 ${days} 天就對了！`,
        ),
      );
    }
  }
  return questions;
}

/** 四上第4章：假分數與帶分數 */
export function generateG4S1U4Fractions(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 假分數辨識
      const den = pickRandom([5, 6, 7, 8, 9]);
      const num = den + randomInt(0, 4);
      const ans = `${num}/${den}`;
      const proper1 = `${randomInt(1, den - 2)}/${den}`;
      const proper2 = `${den - 1}/${den}`;
      const mixed = `1 又 1/${den}`;
      const built = buildStringOptions(ans, [proper1, proper2, mixed]);
      questions.push(
        makeQuestion(
          'g4s1-u4',
          seed,
          i,
          '下列哪一個是「假分數」？',
          built,
          `分子大於或等於分母的分數叫做假分數，所以 ${ans} 是假分數（帶整數的「${mixed}」則是帶分數）。`,
          '假分數沒有帶整數部分，而且分子「大於或等於」分母！',
        ),
      );
    } else if (mode === 1) {
      // 假分數換成帶分數
      const den = pickRandom([3, 4, 5, 6, 7, 8]);
      const whole = randomInt(2, 5);
      const rem = randomInt(1, den - 1);
      const num = whole * den + rem;
      const ans = `${whole} 又 ${rem}/${den}`;
      const w1 = `${whole - 1} 又 ${rem}/${den}`;
      const w2 = `${whole} 又 ${den - rem === rem ? rem + 1 : den - rem}/${den}`;
      const w3 = `${rem} 又 ${whole}/${den}`;
      const built = buildStringOptions(ans, [w1, w2, w3]);
      questions.push(
        makeQuestion(
          'g4s1-u4',
          seed,
          i,
          `把假分數 ${num}/${den} 換成帶分數是多少？`,
          built,
          `${num} ÷ ${den} = ${whole} …… 餘 ${rem}，商 ${whole} 當整數部分、餘數 ${rem} 當分子，所以是 ${ans}。`,
          `用分子 ${num} 除以分母 ${den}，商就是整數、餘數就是新的分子！`,
        ),
      );
    } else if (mode === 2) {
      // 帶分數換成假分數
      const den = pickRandom([4, 5, 6, 7, 8, 9]);
      const whole = randomInt(2, 5);
      const rem = randomInt(1, den - 1);
      const num = whole * den + rem;
      const ans = `${num}/${den}`;
      const w1 = `${whole * rem + den}/${den}`;
      const w2 = `${num + 1}/${den}`;
      const w3 = `${whole + rem}/${den}`;
      const built = buildStringOptions(ans, [w1, w2, w3]);
      questions.push(
        makeQuestion(
          'g4s1-u4',
          seed,
          i,
          `把帶分數 ${whole} 又 ${rem}/${den} 換成假分數是多少？`,
          built,
          `整數 ${whole} 等於 (${whole} × ${den})/${den} = ${whole * den}/${den}，再加上 ${rem}/${den} 等於 ${ans}。`,
          `先算「整數 × 分母 + 分子」當作新分子，分母維持 ${den} 不變！`,
        ),
      );
    } else {
      // 同分母分數比較（帶分數與假分數混比）
      const den = pickRandom([4, 5, 6, 7, 8]);
      const baseWhole = randomInt(2, 4);
      const rem = randomInt(1, den - 2);
      const biggestNum = baseWhole * den + rem + 1;
      const ans = `${biggestNum}/${den}`;
      const c1 = `${baseWhole} 又 ${rem}/${den}`;
      const c2 = `${baseWhole * den + rem - 1}/${den}`;
      const c3 = `${baseWhole - 1} 又 ${den - 1}/${den}`;
      const built = buildStringOptions(ans, [c1, c2, c3]);
      questions.push(
        makeQuestion(
          'g4s1-u4',
          seed,
          i,
          '下面四個分數中，哪一個分數「最大」？',
          built,
          `全部換成假分數來比較：${ans} = ${baseWhole} 又 ${rem + 1}/${den}，大於 ${c1}（${baseWhole * den + rem}/${den}）及其他選項。`,
          '把帶分數都先換成同分母的假分數，再比較分子大小最清楚！',
        ),
      );
    }
  }
  return questions;
}

/** 四上第5章：公里 */
export function generateG4S1U5Kilometers(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 幾公里幾公尺 -> 公尺
      const km = randomInt(2, 9);
      const m = pickRandom([35, 60, 80, 105, 240, 508, 750]);
      const ans = km * 1000 + m;
      const trap1 = km * 100 + m; // 常見錯誤：1 公里誤當 100 公尺
      const trap2 = m < 100 ? km * 1000 + m * 10 : km * 1000 + Math.floor(m / 10);
      const built = buildNumericOptions(ans, [trap1, trap2, ans + 1000], ' 公尺');
      questions.push(
        makeQuestion(
          'g4s1-u5',
          seed,
          i,
          `桃園自行車道這段長 ${km} 公里 ${m} 公尺，換算成公尺是多少公尺？`,
          built,
          `因為 1 公里 = 1000 公尺，所以 ${km} 公里 = ${km * 1000} 公尺，加上 ${m} 公尺共 ${ans} 公尺。`,
          '記住「1 公里 = 1000 公尺」，公里要換公尺就乘以 1000！',
        ),
      );
    } else if (mode === 1) {
      // 公尺 -> 幾公里幾公尺
      const km = randomInt(3, 8);
      const m = pickRandom([45, 90, 120, 305, 650, 805]);
      const totalM = km * 1000 + m;
      const ans = `${km} 公里 ${m} 公尺`;
      const wrongs = [
        `${km * 10} 公里 ${m} 公尺`,
        `${km} 公里 ${m * 10} 公尺`,
        `${km + 1} 公里 ${m} 公尺`,
      ];
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g4s1-u5',
          seed,
          i,
          `從學校到公園的路程是 ${totalM} 公尺，也可以寫成幾公里幾公尺？`,
          built,
          `每 1000 公尺是 1 公里，${totalM} 公尺 = ${km * 1000} 公尺 + ${m} 公尺 = ${ans}。`,
          '把千位以上的數字看成「公里」，剩下的百位、十位、個位就是「公尺」！',
        ),
      );
    } else if (mode === 2) {
      // 公里加減複名數應用
      const km1 = randomInt(2, 5);
      const m1 = pickRandom([450, 580, 650, 720, 840]);
      const km2 = randomInt(1, 3);
      const m2 = pickRandom([380, 460, 550, 620]);
      const totalM = (km1 + km2) * 1000 + m1 + m2;
      const ansKm = Math.floor(totalM / 1000);
      const ansM = totalM % 1000;
      const ans = `${ansKm} 公里 ${ansM} 公尺`;
      const built = buildStringOptions(ans, [
        `${km1 + km2} 公里 ${m1 + m2} 公尺`,
        `${ansKm - 1} 公里 ${ansM + 100} 公尺`,
        `${ansKm + 1} 公里 ${ansM} 公尺`,
      ]);
      questions.push(
        makeQuestion(
          'g4s1-u5',
          seed,
          i,
          `小安早上去健行，去程走了 ${km1} 公里 ${m1} 公尺，回程走了另一條路線長 ${km2} 公里 ${m2} 公尺，他總共走了多遠？`,
          built,
          `${m1} + ${m2} = ${m1 + m2} 公尺（滿 1000 公尺進位 1 公里剩 ${ansM} 公尺），加上 ${km1} + ${km2} = ${km1 + km2} 公里，共 ${ans}。`,
          '公尺相加滿 1000 就要進位成 1 公里喔！',
        ),
      );
    } else {
      // 長度大小比較
      const baseKm = randomInt(3, 6);
      const longestM = baseKm * 1000 + 850;
      const ans = `${longestM} 公尺`;
      const wrongs = [
        `${baseKm} 公里 ${randomInt(400, 750)} 公尺`,
        `${baseKm - 1} 公里 980 公尺`,
        `${baseKm * 1000 + 250} 公尺`,
      ];
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g4s1-u5',
          seed,
          i,
          '下面四段路程中，哪一段「最長」？',
          built,
          `全部統一換算成公尺比較：${ans} 等於 ${baseKm} 公里 850 公尺，比其餘三段路程都長。`,
          '把「幾公里幾公尺」全部換成「公尺」來比大小最不容易錯！',
        ),
      );
    }
  }
  return questions;
}

/** 四上第6章：除法 */
export function generateG4S1U6Division(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 四位數除以一位數
      const divisor = randomInt(4, 9);
      const q = randomInt(320, 980);
      const dividend = divisor * q;
      const built = buildNumericOptions(q, [q + 10, Math.max(100, q - 10), q + 100], ' 箱');
      questions.push(
        makeQuestion(
          'g4s1-u6',
          seed,
          i,
          `工廠生產了 ${dividend} 顆電池，每 ${divisor} 顆裝成 1 小盒，總共可以裝成幾小盒？`,
          built,
          `${dividend} ÷ ${divisor} = ${q} 箱。`,
          `用總數量 ${dividend} 除以每盒裝的 ${divisor} 顆！`,
        ),
      );
    } else if (mode === 1) {
      // 除以二位數（含餘數或商）
      const divisor = randomInt(18, 45);
      const q = randomInt(12, 34);
      const rem = randomInt(3, divisor - 2);
      const dividend = divisor * q + rem;
      const askRem = randomInt(0, 1) === 0;
      if (askRem) {
        const built = buildNumericOptions(rem, [rem + 2, Math.max(1, rem - 2), q], ' 顆');
        questions.push(
          makeQuestion(
            'g4s1-u6',
            seed,
            i,
            `烘焙坊烤了 ${dividend} 顆小泡芙，每 ${divisor} 顆裝成 1 袋，盡量裝滿後，還剩下幾顆小泡芙？`,
            built,
            `${dividend} ÷ ${divisor} = ${q} 袋 …… 餘 ${rem} 顆，所以還剩下 ${rem} 顆。`,
            '這題問的是「還剩下幾顆」，記得看除完之後的「餘數」喔！',
          ),
        );
      } else {
        const built = buildNumericOptions(q, [q + 1, q - 1, q + 2], ' 袋');
        questions.push(
          makeQuestion(
            'g4s1-u6',
            seed,
            i,
            `烘焙坊烤了 ${dividend} 顆手工餅乾，每 ${divisor} 顆裝成 1 袋，最多可以裝滿幾袋？`,
            built,
            `${dividend} ÷ ${divisor} = ${q} …… 餘 ${rem}，餘數不夠再裝 1 袋，所以最多裝滿 ${q} 袋。`,
            '用直式算出商和餘數，「商」就是最多可以裝滿的袋數！',
          ),
        );
      }
    } else if (mode === 2) {
      // 除以三位數（商為一位數或二位數）
      const divisor = randomInt(115, 245);
      const q = randomInt(12, 28);
      const dividend = divisor * q;
      const built = buildNumericOptions(q, [q + 1, q - 1, q + 10], ' 份');
      questions.push(
        makeQuestion(
          'g4s1-u6',
          seed,
          i,
          `圖書館收到 ${dividend} 元的購書捐款，如果全部買每套 ${divisor} 元的自然百科全書，剛好可以買幾套？`,
          built,
          `${dividend} ÷ ${divisor} = ${q} 份，可以先估商試乘看看！`,
          `把除數 ${divisor} 看成大約 ${Math.round(divisor / 100) * 100} 來估商，會更快找到答案喔！`,
        ),
      );
    } else {
      // 多個 0 的簡化除法（特別檢驗餘數要補 0）
      const divisorDigit = pickRandom([4, 6, 7, 8, 9]);
      const zeros = pickRandom([100, 1000]);
      const divisor = divisorDigit * zeros;
      const q = randomInt(3, 8);
      const remDigit = randomInt(1, divisorDigit - 1);
      const dividend = divisor * q + remDigit * zeros;
      const trueRem = remDigit * zeros;
      const built = buildNumericOptions(trueRem, [remDigit, remDigit * 10, q * zeros]);
      questions.push(
        makeQuestion(
          'g4s1-u6',
          seed,
          i,
          `使用末位去 0 簡化計算 ${dividend} ÷ ${divisor} 時，得到的「餘數」應該是哪一個數？`,
          built,
          `先同除以 ${zeros} 算出 ${dividend / zeros} ÷ ${divisorDigit} = ${q} 餘 ${remDigit}；商不變仍是 ${q}，但餘數必須把剛才劃掉的 0 補回來，所以餘數是 ${trueRem}！`,
          '簡化除法時，「商」不變，但「餘數」一定要記得補回被劃掉的 0 喔！',
        ),
      );
    }
  }
  return questions;
}

/** 四上第8章：兩步驟問題與併式 */
export function generateG4S1U8TwoStepOps(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 先乘後減／先乘後加（與由左至右錯誤算式對比）
      const total = randomInt(180, 350);
      const price = randomInt(12, 28);
      const qty = randomInt(3, 6);
      const ans = total - price * qty;
      const wrongLeftToRight = (total - price) * qty;
      const wrongAdd = total + price * qty;
      const built = buildNumericOptions(ans, [wrongLeftToRight, wrongAdd, ans + price]);
      questions.push(
        makeQuestion(
          'g4s1-u8',
          seed,
          i,
          `算式「${total} - ${price} × ${qty}」的計算結果是多少？`,
          built,
          `依照四則混合約定「先乘除後加減」，要先算 ${price} × ${qty} = ${price * qty}，再算 ${total} - ${price * qty} = ${ans}。`,
          '式子裡同時有減號和乘號時，哪一個要先算？',
        ),
      );
    } else if (mode === 1) {
      // 有括號的算式先算
      const b = randomInt(18, 45);
      const c = randomInt(4, 9);
      const q = randomInt(6, 15);
      const a = b + c * q;
      const ans = q;
      const wrongNoParen = a - Math.floor(b / c);
      const built = buildNumericOptions(ans, [wrongNoParen > 0 ? wrongNoParen : ans + 5, ans + c, ans + 2]);
      questions.push(
        makeQuestion(
          'g4s1-u8',
          seed,
          i,
          `算式「(${a} - ${b}) ÷ ${c}」的結果是多少？`,
          built,
          `有括號時「括號裡面要先算」：先算 ${a} - ${b} = ${a - b}，再算 ${a - b} ÷ ${c} = ${ans}。`,
          '記得運算規則第一條：「括號內的最優先計算」！',
        ),
      );
    } else if (mode === 2) {
      // 乘除混合（由左往右算）vs 有括號分母
      const perBox = pickRandom([4, 6, 8]);
      const boxes = pickRandom([3, 4, 5]);
      const q = randomInt(5, 12);
      const total = perBox * boxes * q;
      const built = buildNumericOptions(q, [q * boxes, q * perBox, q + 4], ' 條');
      questions.push(
        makeQuestion(
          'g4s1-u8',
          seed,
          i,
          `媽媽把 ${total} 顆糖果平分給 ${boxes} 個小隊，每個小隊有 ${perBox} 位小朋友，平均每位小朋友分到幾顆？下列算式答案是多少？(${total} ÷ ${boxes} ÷ ${perBox})`,
          built,
          `連除算式由左往右算（或先算總人數 ${boxes} × ${perBox} = ${boxes * perBox} 再除）：${total} ÷ ${boxes} ÷ ${perBox} = ${q}。`,
          '連除算式可以從左往右一步一步算！',
        ),
      );
    } else {
      // 應用情境選正確併式
      const wallet = pickRandom([200, 300, 500]);
      const pen = randomInt(18, 35);
      const countPens = randomInt(3, 6);
      const ansExpr = `${wallet} - ${pen} × ${countPens}`;
      const wrongs = [
        `(${wallet} - ${pen}) × ${countPens}`,
        `${wallet} - ${pen} + ${countPens}`,
        `${pen} × ${countPens} - ${wallet}`,
      ];
      const built = buildStringOptions(ansExpr, wrongs);
      questions.push(
        makeQuestion(
          'g4s1-u8',
          seed,
          i,
          `小傑帶了 ${wallet} 元去買文具，買了 ${countPens} 支每支 ${pen} 元的原子筆後，還剩下多少元？用一個算式記下來是哪一個？`,
          built,
          `先算出買筆共花了 ${pen} × ${countPens} 元，再用 ${wallet} 元減掉花掉的錢，併式記為「${ansExpr}」。`,
          '因為先乘除後加減，減掉買多支筆的總價不需要多加括號喔！',
        ),
      );
    }
  }
  return questions;
}

/** 四上第9章：二位小數 */
export function generateG4S1U9TwoPlaceDecimals(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 小數化聚（有多少個 0.01）
      const hundredths = randomInt(105, 489);
      const decimalStr = formatHundredthsFixed2(hundredths);
      const built = buildNumericOptions(
        hundredths,
        [Math.floor(hundredths / 10), hundredths * 10, hundredths + 10],
        ' 個',
      );
      questions.push(
        makeQuestion(
          'g4s1-u9',
          seed,
          i,
          `「${decimalStr}」這個二位小數是由多少個 0.01 合起來的？`,
          built,
          `1 是 100 個 0.01，0.1 是 10 個 0.01，所以 ${decimalStr} 一共是由 ${hundredths} 個 0.01 合起來的。`,
          '把小數點去掉（乘以 100），就能看出共有幾個 0.01 囉！',
        ),
      );
    } else if (mode === 1) {
      // 長度與二位小數換算（公分 ↔ 公尺）
      const meters = randomInt(1, 7);
      const cm = randomInt(2, 9); // 故意用個位數公分，考補 0 陷阱 e.g. 3.05
      const hundredths = meters * 100 + cm;
      const ans = `${formatHundredthsFixed2(hundredths)} 公尺`;
      const wrongs = [
        `${meters}.${cm} 公尺`, // 常見錯誤：3.5 公尺其實是 3 公尺 50 公分
        `0.${meters}${cm} 公尺`,
        `${meters}0.${cm} 公尺`,
      ];
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g4s1-u9',
          seed,
          i,
          `跳遠成績是 ${meters} 公尺 ${cm} 公分，用「公尺」作單位記成二位小數是多少？`,
          built,
          `1 公分 = 0.01 公尺，${cm} 公分 = 0.0${cm} 公尺，加上 ${meters} 公尺就是 ${ans}（注意 ${meters}.${cm} 公尺是 ${meters} 公尺 ${cm}0 公分）。`,
          `1 公分是 0.01 公尺，要寫在「百分位」，十分位別忘了補 0！`,
        ),
      );
    } else if (mode === 2) {
      // 二位小數直式加減（對齊小數點）
      const isAdd = randomInt(0, 1) === 0;
      if (isAdd) {
        const a = randomInt(125, 385);
        const b = randomInt(10, 95); // 一位或二位小數相加，例如 2.45 + 0.8 = 3.25 or 2.45 + 0.08
        const aStr = formatHundredthsFixed2(a);
        const bStr = formatHundredths(b);
        const sum = a + b;
        const trapMisalign = a + Math.floor(b / 10);
        const built = buildHundredthsOptions(sum, [trapMisalign, sum + 10, sum + 100]);
        questions.push(
          makeQuestion(
            'g4s1-u9',
            seed,
            i,
            `計算 ${aStr} + ${bStr} 的結果是多少？`,
            built,
            `直式計算小數加法要對齊「小數點」再相加：${aStr} + ${bStr} = ${formatHundredths(sum)}。`,
            '直式對齊時不是靠右對齊，而是要「對齊小數點」再補 0 相加！',
          ),
        );
      } else {
        const whole = randomInt(3, 8);
        const a = whole * 100;
        const b = randomInt(112, 289);
        const diff = a - b;
        const bStr = formatHundredthsFixed2(b);
        const trap = whole * 100 - b + 100;
        const built = buildHundredthsOptions(diff, [trap, diff + 10, Math.max(10, diff - 10)]);
        questions.push(
          makeQuestion(
            'g4s1-u9',
            seed,
            i,
            `計算 ${whole} - ${bStr} 的結果是多少？`,
            built,
            `把整數 ${whole} 寫成 ${whole}.00 對齊小數點再借位減去 ${bStr}，得到 ${formatHundredths(diff)}。`,
            `先把整數 ${whole} 想成 ${whole}.00，對齊小數點後再相減喔！`,
          ),
        );
      }
    } else {
      // 二位小數比較大小（如 2.5 vs 2.48 vs 2.09）
      const base = randomInt(1, 5);
      const tenths = randomInt(4, 8);
      const ans = `${base}.${tenths}`;
      const w1 = `${base}.${tenths - 1}9`;
      const w2 = `${base}.0${tenths + 1}`;
      const w3 = `${base - 1}.99`;
      const built = buildStringOptions(ans, [w1, w2, w3]);
      questions.push(
        makeQuestion(
          'g4s1-u9',
          seed,
          i,
          '下面四個小數中，哪一個數「最大」？',
          built,
          `比較小數要先看整數部分，再比十分位、最後比百分位：${ans}（${ans}0）的十分位是 ${tenths}，比 ${w1}、${w2} 和 ${w3} 都大。`,
          '位數不一樣長沒關係，從整數、十分位依序比過去（或補 0 成兩位小數來比）！',
        ),
      );
    }
  }
  return questions;
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

function formatMixedOrProper(totalNum: number, den: number): string {
  const whole = Math.floor(totalNum / den);
  const rem = totalNum % den;
  if (rem === 0) return String(whole);
  if (whole === 0) return `${rem}/${den}`;
  return `${whole} 又 ${rem}/${den}`;
}

function formatThousandths(thousandths: number): string {
  const abs = Math.abs(Math.round(thousandths));
  const whole = Math.floor(abs / 1000);
  const frac = abs % 1000;
  if (frac === 0) return String(whole);
  const fracStr = String(frac).padStart(3, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

function buildDistinctMixedFractionOptions(
  answerNum: number,
  den: number,
  candidateNums: number[],
  unitSuffix = '',
): { options: [string, string, string, string]; answerIndex: number } {
  const set = new Set<number>([answerNum]);
  for (const c of candidateNums) {
    if (Number.isInteger(c) && c > 0 && c !== answerNum && set.size < 4) {
      set.add(c);
    }
  }
  const offsets = [1, -1, 2, -2, den, -den, den + 1];
  for (const d of offsets) {
    if (set.size >= 4) break;
    const cand = answerNum + d;
    if (cand > 0 && !set.has(cand)) {
      set.add(cand);
    }
  }
  let step = 3;
  while (set.size < 4) {
    const cand = answerNum + step;
    if (!set.has(cand)) set.add(cand);
    step++;
  }
  const ansText = `${formatMixedOrProper(answerNum, den)}${unitSuffix}`;
  const options = shuffle(
    Array.from(set).map((n) => `${formatMixedOrProper(n, den)}${unitSuffix}`),
  ) as [string, string, string, string];
  return { options, answerIndex: options.indexOf(ansText) };
}

/** 四下第1章：概數 */
export function generateG4S2U1Rounding(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 無條件捨去法
      const place = pickRandom([
        { name: '百位', unit: 100 },
        { name: '千位', unit: 1000 },
        { name: '萬位', unit: 10000 },
      ]);
      const q = randomInt(12, 85);
      const remLead = randomInt(5, 9);
      const tail = randomInt(1, place.unit / 10 - 1);
      const n = q * place.unit + remLead * (place.unit / 10) + tail;
      const ans = q * place.unit;
      const trapUp = (q + 1) * place.unit;
      const trapDown = (q - 1) * place.unit;
      const trapLowerPlace = q * place.unit + remLead * (place.unit / 10);

      const useWordProblem = place.unit <= 1000 && Math.floor(i / 4) % 2 === 1;
      if (useWordProblem) {
        const built = buildNumericOptions(ans, [trapUp, trapDown, trapLowerPlace], ' 顆');
        questions.push(
          makeQuestion(
            'g4s2-u1',
            seed,
            i,
            `工廠生產了 ${n} 顆糖果，每 ${place.unit} 顆裝成一大箱，最多可以裝滿幾顆糖果？（用無條件捨去法取概數到${place.name}）`,
            built,
            `用無條件捨去法取概數到${place.name}，把${place.name}後面的數字全部捨去變成 0，所以 ${n} ≈ ${ans}，最多裝滿 ${ans} 顆。`,
            `無條件捨去法只看要取到哪一位，後面的數字不管多大都要直接變成 0！`,
          ),
        );
      } else {
        const built = buildNumericOptions(ans, [trapUp, trapDown, trapLowerPlace]);
        questions.push(
          makeQuestion(
            'g4s2-u1',
            seed,
            i,
            `用「無條件捨去法」將 ${n} 取概數到${place.name}，${n} ≈ ？`,
            built,
            `無條件捨去法取到${place.name}時，要把${place.name}右邊的所有數字都捨去補 0，因此 ${n} ≈ ${ans}。`,
            `找到${place.name}的位置，它右邊的數字全部都捨去改寫成 0！`,
          ),
        );
      }
    } else if (mode === 1) {
      // 無條件進入法
      const place = pickRandom([
        { name: '百位', unit: 100 },
        { name: '千位', unit: 1000 },
        { name: '萬位', unit: 10000 },
      ]);
      const q = randomInt(12, 85);
      const remLead = randomInt(1, 4);
      const tail = randomInt(1, place.unit / 10 - 1);
      const n = q * place.unit + remLead * (place.unit / 10) + tail;
      const ans = (q + 1) * place.unit;
      const trapFloor = q * place.unit;
      const trapOver = (q + 2) * place.unit;
      const trapLowerPlace = q * place.unit + remLead * (place.unit / 10);

      const useWordProblem = place.unit <= 1000 && Math.floor(i / 4) % 2 === 1;
      if (useWordProblem) {
        const built = buildNumericOptions(ans, [trapFloor, trapOver, trapLowerPlace], ' 元');
        questions.push(
          makeQuestion(
            'g4s2-u1',
            seed,
            i,
            `買一台售價 ${n} 元的相機，如果全部只用 ${place.unit} 元鈔票付款，最少要付多少元才夠？（用無條件進入法取概數到${place.name}）`,
            built,
            `因為${place.name}後面還有餘數不能少給，用無條件進入法取概數到${place.name}，進位 1 個${place.name}後變成 ${ans} 元。`,
            `無條件進入法只要後面不是全 0，不管數字是不是小於 5，都要往指定位數進 1！`,
          ),
        );
      } else {
        const built = buildNumericOptions(ans, [trapFloor, trapOver, trapLowerPlace]);
        questions.push(
          makeQuestion(
            'g4s2-u1',
            seed,
            i,
            `用「無條件進入法」將 ${n} 取概數到${place.name}，${n} ≈ ？`,
            built,
            `${n} 在${place.name}後面還有數字不為 0，用無條件進入法要往${place.name}進 1，後面補 0，得到 ${ans}。`,
            `只要指定位數右邊還有不為 0 的數字，無條件進入法就要往左進 1 喔！`,
          ),
        );
      }
    } else if (mode === 2) {
      // 四捨五入法（含 4 捨 / 5 入關鍵數位）
      const place = pickRandom([
        { name: '百位', unit: 100, nextName: '十位' },
        { name: '千位', unit: 1000, nextName: '百位' },
        { name: '萬位', unit: 10000, nextName: '千位' },
      ]);
      const q = randomInt(15, 85);
      const decideDigit = pickRandom([2, 4, 5, 6, 8]);
      const tail = randomInt(1, place.unit / 10 - 1);
      const n = q * place.unit + decideDigit * (place.unit / 10) + tail;
      const roundUp = decideDigit >= 5;
      const ans = roundUp ? (q + 1) * place.unit : q * place.unit;
      const trapOpposite = roundUp ? q * place.unit : (q + 1) * place.unit;
      const trapLowerPlace = q * place.unit + decideDigit * (place.unit / 10);
      const trapExtra = roundUp ? (q + 2) * place.unit : (q - 1) * place.unit;
      const built = buildNumericOptions(ans, [trapOpposite, trapLowerPlace, trapExtra]);
      questions.push(
        makeQuestion(
          'g4s2-u1',
          seed,
          i,
          `用「四捨五入法」將 ${n} 取概數到${place.name}，大約是多少？`,
          built,
          `取到${place.name}要看下一位（${place.nextName}）的數字「${decideDigit}」：${
            roundUp
              ? `${decideDigit} 大於或等於 5，所以要進位成 ${ans}`
              : `${decideDigit} 小於 5，所以要捨去變成 ${ans}`
          }。`,
          `用四捨五入法取到${place.name}，要檢查「${place.nextName}」是不是 5 以上喔！`,
        ),
      );
    } else {
      // 概數應用：先取概數再計算 vs 反向推估範圍
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const qa = randomInt(12, 45);
        const qb = randomInt(10, 35);
        const ra = pickRandom([185, 342, 468, 535, 724, 891]);
        const rb = pickRandom([214, 429, 573, 682, 816]);
        const a = qa * 1000 + ra;
        const b = qb * 1000 + rb;
        const roundA = Math.round(a / 1000) * 1000;
        const roundB = Math.round(b / 1000) * 1000;
        const ans = roundA + roundB;
        const built = buildNumericOptions(ans, [ans + 1000, ans - 1000, a + b], ' 元');
        questions.push(
          makeQuestion(
            'g4s2-u1',
            seed,
            i,
            `一臺電視售價 ${a} 元，一臺洗衣機售價 ${b} 元，先用四捨五入法取概數到千位，再算一算兩樣商品大約共需要多少元？`,
            built,
            `${a} ≈ ${roundA}，${b} ≈ ${roundB}，先取概數再相加：${roundA} + ${roundB} = ${ans} 元。`,
            '先把兩個價錢各自四捨五入到千位，再把兩個概數加起來！',
          ),
        );
      } else {
        const target = randomInt(3, 8) * 1000;
        const ans = pickRandom([target - randomInt(120, 480), target + randomInt(120, 480)]);
        const trapLow = target - randomInt(520, 880);
        const trapBoundary = target + 500;
        const trapHigh = target + randomInt(1050, 1450);
        const built = buildNumericOptions(ans, [trapLow, trapBoundary, trapHigh]);
        questions.push(
          makeQuestion(
            'g4s2-u1',
            seed,
            i,
            `某個整數用「四捨五入法」取概數到千位後大約是 ${target}，這個整數原本可能是下面哪一個數？`,
            built,
            `四捨五入到千位是 ${target} 的數，範圍在 ${target - 500} 到 ${target + 499} 之間；只有 ${ans} 在範圍內（注意 ${trapBoundary} 的百位是 5，會進位成 ${target + 1000}）。`,
            `想一想哪個數「四捨五入到千位」會得到 ${target}？注意百位是 5 時要進位喔！`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 四下第2章：四則運算 */
export function generateG4S2U2FourOps(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 多步驟含括號四則混合
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const a = randomInt(25, 60);
        const b = randomInt(3, 8);
        const c = randomInt(14, 24);
        const d = randomInt(4, 9);
        const ans = a + b * (c - d);
        const trapNoParen = a + b * c - d;
        const trapLeftToRight = (a + b) * (c - d);
        const built = buildNumericOptions(ans, [trapNoParen, trapLeftToRight, ans + b]);
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `計算算式「${a} + ${b} × (${c} - ${d})」的結果是多少？`,
            built,
            `先算括號內 ${c} - ${d} = ${c - d}，再算乘法 ${b} × ${c - d} = ${b * (c - d)}，最後算加法 ${a} + ${b * (c - d)} = ${ans}。`,
            '運算順序：有括號先算括號裡面，再先乘除、後加減！',
          ),
        );
      } else {
        const a = randomInt(12, 30);
        const b = randomInt(8, 22);
        const c = randomInt(4, 9);
        const d = randomInt(10, 35);
        const ans = (a + b) * c - d;
        const trapNoParen = a + b * c - d;
        const trapSign = (a + b) * c + d;
        const built = buildNumericOptions(ans, [trapNoParen, ans - c, trapSign]);
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `計算算式「(${a} + ${b}) × ${c} - ${d}」的結果是多少？`,
            built,
            `先算括號內 ${a} + ${b} = ${a + b}，接著乘以 ${c} 得 ${(a + b) * c}，最後減去 ${d} 等於 ${ans}。`,
            '括號裡的加法要優先算，算完再乘、最後才減！',
          ),
        );
      }
    } else if (mode === 1) {
      // 結合律與連減簡算
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const [p1, p2, prod] = pickRandom([
          [25, 4, 100],
          [125, 8, 1000],
          [50, 2, 100],
          [25, 8, 200],
        ] as const);
        let mid = randomInt(13, 47);
        if (mid % 10 === 0) mid += 3;
        const ans = mid * prod;
        const built = buildNumericOptions(ans, [
          mid * (prod / 10),
          (mid + 1) * prod,
          (mid - 1) * prod,
        ]);
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `利用乘法交換律與結合律簡算：${p1} × ${mid} × ${p2} 的結果是多少？`,
            built,
            `先把好算的 ${p1} 和 ${p2} 結合相乘：(${p1} × ${p2}) × ${mid} = ${prod} × ${mid} = ${ans}。`,
            `找找看哪兩個數乘起來會變成整百或整千（例如 25 × 4 = 100、125 × 8 = 1000）！`,
          ),
        );
      } else {
        const a = randomInt(11, 18) * 10 + randomInt(2, 8);
        const b = 300 - a;
        const total = randomInt(520, 960);
        const ans = total - 300;
        const trapFlip = total - a + b;
        const built = buildNumericOptions(ans, [trapFlip, ans + 100, ans - 100]);
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `利用連減的運算性質簡算：${total} - ${a} - ${b} 的結果是多少？`,
            built,
            `連續減去兩個數等於減去這兩個數的和：${total} - (${a} + ${b}) = ${total} - 300 = ${ans}。`,
            `觀察後面的 ${a} 和 ${b}，把它們先加起來湊成整百，再一起減掉！`,
          ),
        );
      }
    } else if (mode === 2) {
      // 分配律簡算
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        let k1 = randomInt(23, 77);
        if (k1 === 50) k1 = 53;
        const k2 = 100 - k1;
        const m = randomInt(12, 48);
        const ans = 100 * m;
        const built = buildNumericOptions(ans, [10 * m, 101 * m, 99 * m]);
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `利用分配律簡算：${k1} × ${m} + ${k2} × ${m} 的結果是多少？`,
            built,
            `兩項都有相同的乘數「${m}」，運用分配律合併計算：(${k1} + ${k2}) × ${m} = 100 × ${m} = ${ans}。`,
            `把共同的乘數 ${m} 提出來，先算 ${k1} + ${k2} 有多簡單！`,
          ),
        );
      } else {
        const k2 = randomInt(14, 48);
        const k1 = 100 + k2;
        const m = randomInt(13, 39);
        const ans = 100 * m;
        const built = buildNumericOptions(ans, [10 * m, (k1 + k2) * m, 101 * m]);
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `利用分配律簡算：${k1} × ${m} - ${k2} × ${m} 的結果是多少？`,
            built,
            `兩項都有「× ${m}」，運用乘法對減法的分配律：(${k1} - ${k2}) × ${m} = 100 × ${m} = ${ans}。`,
            `先算 (${k1} - ${k2}) 等於多少，再乘以 ${m} 就能秒殺！`,
          ),
        );
      }
    } else {
      // 由左而右規則與應用併式
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const b = randomInt(3, 7);
        const c = randomInt(3, 6);
        const k = randomInt(2, 6);
        const a = b * c * k;
        const ans = k * c * c;
        const built = buildNumericOptions(ans, [k, k * c, ans + c]);
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `算式「${a} ÷ ${b} × ${c}」的計算結果是多少？`,
            built,
            `算式裡只有乘除法且沒有括號時，必須「由左而右」依序算：先算 ${a} ÷ ${b} = ${c * k}，再算 ${c * k} × ${c} = ${ans}（不能先算後面的 ${b} × ${c}）。`,
            '只有乘和除的時候，一定要乖乖從左邊算到右邊喔！',
          ),
        );
      } else {
        const price = randomInt(45, 85);
        const discount = randomInt(5, 15);
        const qty = randomInt(4, 9);
        const extra = randomInt(20, 60);
        const ans = (price - discount) * qty + extra;
        const trapNoParen = price * qty - discount + extra;
        const trapAddDisc = (price + discount) * qty + extra;
        const trapLessQty = ans - (price - discount);
        const built = buildNumericOptions(
          ans,
          [trapNoParen, trapAddDisc, trapLessQty],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g4s2-u2',
            seed,
            i,
            `原價每盒 ${price} 元的彩色筆，週年慶每盒便宜 ${discount} 元。老師買了 ${qty} 盒，又加買一本 ${extra} 元的筆記本，總共要付多少元？`,
            built,
            `列出併式計算：(${price} - ${discount}) × ${qty} + ${extra} = ${price - discount} × ${qty} + ${extra} = ${ans} 元。`,
            '先算特價後每盒幾元（要加括號），乘上盒數後再加上筆記本的價錢！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 四下第4章：分數（一） */
export function generateG4S2U4Fractions1(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 同分母帶分數／假分數加法（含進位）
      const den = pickRandom([5, 6, 7, 8, 9, 10]);
      const w1 = randomInt(1, 3);
      const r1 = randomInt(2, den - 1);
      const w2 = randomInt(1, 3);
      const r2 = randomInt(den - r1 + 1, den - 1);
      const num1 = w1 * den + r1;
      const num2 = w2 * den + r2;
      const ansTotal = num1 + num2;
      const useImproperFirst = Math.floor(i / 4) % 2 === 1;
      const firstLabel = useImproperFirst ? `${num1}/${den}` : `${w1} 又 ${r1}/${den}`;
      const built = buildDistinctMixedFractionOptions(ansTotal, den, [
        ansTotal - den,
        ansTotal + 1,
        ansTotal + den,
      ]);
      questions.push(
        makeQuestion(
          'g4s2-u4',
          seed,
          i,
          `計算 ${firstLabel} + ${w2} 又 ${r2}/${den} 的結果是多少？`,
          built,
          `${useImproperFirst ? `先把假分數 ${num1}/${den} 換成帶分數 ${w1} 又 ${r1}/${den}，` : ''}整數相加 ${w1} + ${w2} = ${w1 + w2}，分子相加 ${r1} + ${r2} = ${r1 + r2}（滿 ${den} 進 1 剩 ${r1 + r2 - den}），合起來是 ${formatMixedOrProper(ansTotal, den)}。`,
          '整數和整數加、分數和分數加；分子滿分母時記得要進位成 1 喔！',
        ),
      );
    } else if (mode === 1) {
      // 同分母帶分數減法（含向整數借 1）
      const den = pickRandom([5, 6, 7, 8, 9]);
      const w1 = randomInt(3, 6);
      const w2 = randomInt(1, w1 - 2);
      const useWhole = Math.floor(i / 4) % 2 === 1;
      const r1 = useWhole ? 0 : randomInt(1, den - 3);
      const r2 = randomInt(r1 + 1, den - 1);
      const total1 = w1 * den + r1;
      const total2 = w2 * den + r2;
      const ansTotal = total1 - total2;
      const trapNoBorrow = (w1 - w2) * den + (r2 - r1);
      const firstLabel = useWhole ? `${w1}` : `${w1} 又 ${r1}/${den}`;
      const built = buildDistinctMixedFractionOptions(ansTotal, den, [
        ansTotal + den,
        trapNoBorrow,
        ansTotal + 1,
      ]);
      questions.push(
        makeQuestion(
          'g4s2-u4',
          seed,
          i,
          `計算 ${firstLabel} - ${w2} 又 ${r2}/${den} 的結果是多少？`,
          built,
          `分數部分不夠減時，向整數 ${w1} 借 1 變成 ${den}/${den}：${firstLabel} = ${w1 - 1} 又 ${den + r1}/${den}，再減去 ${w2} 又 ${r2}/${den}，得到 ${formatMixedOrProper(ansTotal, den)}。`,
          `不夠減時向整數借 1（換成 ${den}/${den}）加到分子，別忘了整數部分要少 1！`,
        ),
      );
    } else if (mode === 2) {
      // 真分數／假分數的整數倍
      const den = pickRandom([4, 5, 6, 7, 8, 9, 10]);
      const num =
        Math.floor(i / 4) % 2 === 0 ? randomInt(2, den - 1) : den + randomInt(1, 3);
      let k = randomInt(3, 7);
      if ((num * k) % den === 0) k += 1;
      const ansTotal = num * k;
      const built = buildDistinctMixedFractionOptions(
        ansTotal,
        den,
        [num + k, ansTotal + den, (k - 1) * num],
        ' 公升',
      );
      questions.push(
        makeQuestion(
          'g4s2-u4',
          seed,
          i,
          `一瓶柳橙汁有 ${num}/${den} 公升，媽媽買了 ${k} 瓶，一共有多少公升？`,
          built,
          `分數乘以整數時，分母不變、分子乘以整數：(${num} × ${k})/${den} = ${ansTotal}/${den}，換成帶分數是 ${formatMixedOrProper(ansTotal, den)} 公升。`,
          '分數的整數倍只要把「分子」乘以整數，分母維持不變，最後再換成帶分數！',
        ),
      );
    } else {
      // 帶分數的整數倍
      const den = pickRandom([4, 5, 6, 7, 8]);
      const w = randomInt(1, 3);
      const r = randomInt(1, den - 1);
      const k = randomInt(2, 5);
      const improperNum = w * den + r;
      const ansTotal = improperNum * k;
      const built = buildDistinctMixedFractionOptions(
        ansTotal,
        den,
        [w * den + k * r, k * w * den + r, ansTotal + den],
        ' 公尺',
      );
      questions.push(
        makeQuestion(
          'g4s2-u4',
          seed,
          i,
          `一條緞帶長 ${w} 又 ${r}/${den} 公尺，布置教室用了 ${k} 條，一共用了多長的緞帶？`,
          built,
          `整數與分數都要乘以 ${k}（或先換成假分數 ${improperNum}/${den} 再乘以 ${k}）：${ansTotal}/${den} = ${formatMixedOrProper(ansTotal, den)} 公尺。`,
          '把帶分數換成假分數再乘以整數，或者整數和分數分別乘以倍數再進位合併！',
        ),
      );
    }
  }
  return questions;
}

/** 四下第6章：小數乘法 */
export function generateG4S2U6DecimalMul(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 一位小數 × 一位整數
      let tenths = randomInt(12, 68);
      if (tenths % 10 === 0) tenths += randomInt(1, 9);
      const m = randomInt(3, 9);
      const ansHundredths = tenths * 10 * m;
      const aStr = formatHundredths(tenths * 10);
      const built = buildHundredthsOptions(
        ansHundredths,
        [tenths * m, tenths * 100 * m, ansHundredths + 100],
        ' 公升',
      );
      questions.push(
        makeQuestion(
          'g4s2-u6',
          seed,
          i,
          `一個水壺可以裝 ${aStr} 公升的水，${m} 個相同的水壺共可裝多少公升的水？`,
          built,
          `${aStr} 是 ${tenths} 個 0.1，${tenths} × ${m} = ${tenths * m} 個 0.1，也就是 ${formatHundredths(ansHundredths)} 公升。`,
          '先當成整數乘法來算，乘數有 1 位小數，積就從右邊數 1 位點上小數點！',
        ),
      );
    } else if (mode === 1) {
      // 二位小數 × 一位整數（含百分位補 0 與末尾去 0）
      const whole = randomInt(1, 3);
      const frac = pickRandom([4, 8, 15, 25, 35, 42, 65, 75, 84]);
      const hundredths = whole * 100 + frac;
      const m = randomInt(3, 9);
      const ansHundredths = hundredths * m;
      const aStr = formatHundredthsFixed2(hundredths);
      const extraTraps =
        frac < 10
          ? [
              (whole * 100 + frac * 10) * m,
              ansHundredths * 10,
              ansHundredths * 100,
              ansHundredths + 100,
            ]
          : [ansHundredths * 10, ansHundredths * 100, ansHundredths + 100];
      const built = buildHundredthsOptions(ansHundredths, extraTraps, ' 元');
      questions.push(
        makeQuestion(
          'g4s2-u6',
          seed,
          i,
          `計算二位小數乘法：${aStr} × ${m} 的結果是多少元？`,
          built,
          `${aStr} 是 ${hundredths} 個 0.01，${hundredths} × ${m} = ${ansHundredths} 個 0.01，從右邊數兩位點小數點${ansHundredths % 10 === 0 ? '（小數末尾的 0 可以省略）' : ''}，得到 ${formatHundredths(ansHundredths)} 元。`,
          '先用整數算出積，因為被乘數是「二位小數」，所以積要從右往左數 2 位點上小數點！',
        ),
      );
    } else if (mode === 2) {
      // 一位小數 × 二位整數
      let tenths = randomInt(12, 48);
      if (tenths % 10 === 0) tenths += randomInt(1, 9);
      const m = randomInt(12, 34);
      const ansHundredths = tenths * 10 * m;
      const aStr = formatHundredths(tenths * 10);
      const built = buildHundredthsOptions(
        ansHundredths,
        [tenths * m, tenths * 100 * m, ansHundredths + 100],
        ' 公斤',
      );
      questions.push(
        makeQuestion(
          'g4s2-u6',
          seed,
          i,
          `一包白米重 ${aStr} 公斤，學校營養午餐買了 ${m} 包，總共重多少公斤？`,
          built,
          `先算整數乘法 ${tenths} × ${m} = ${tenths * m}，再點上一位小數點，得到 ${formatHundredths(ansHundredths)} 公斤。`,
          '用二位數去乘一位小數時，直式先照整數對齊相乘，最後再從右邊數 1 位點小數點！',
        ),
      );
    } else {
      // 二位小數 × 二位整數 / 小數點位置推算
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        let hundredths = randomInt(105, 385);
        if (hundredths % 10 === 0) hundredths += randomInt(1, 9);
        const m = randomInt(12, 24);
        const ansHundredths = hundredths * m;
        const aStr = formatHundredthsFixed2(hundredths);
        const built = buildHundredthsOptions(
          ansHundredths,
          [ansHundredths * 10, ansHundredths * 100, ansHundredths + 100],
          ' 公尺',
        );
        questions.push(
          makeQuestion(
            'g4s2-u6',
            seed,
            i,
            `工程隊每天鋪設 ${aStr} 公尺的步道，連續鋪設 ${m} 天，一共鋪設了幾公尺？`,
            built,
            `先算 ${hundredths} × ${m} = ${ansHundredths}，再點兩位小數點得到 ${formatHundredths(ansHundredths)} 公尺。`,
            `先當作 ${hundredths} × ${m} 計算，最後把積從右往左數兩位點上小數點！`,
          ),
        );
      } else {
        let intA = randomInt(14, 48);
        if (intA % 10 === 0) intA += 3;
        let intB = randomInt(12, 28);
        if (intB % 10 === 0) intB += 4;
        const prod = intA * intB;
        const decStr = formatHundredthsFixed2(intA);
        const ansStr = formatHundredths(prod);
        const built = buildStringOptions(ansStr, [
          formatThousandths(prod),
          formatHundredths(prod * 10),
          String(prod),
        ]);
        questions.push(
          makeQuestion(
            'g4s2-u6',
            seed,
            i,
            `已知 ${intA} × ${intB} = ${prod}，不用重新直式計算，請問 ${decStr} × ${intB} 的答案是多少？`,
            built,
            `${decStr} 是 ${intA} 的 0.01 倍（縮小 100 倍），乘數 ${intB} 不變，所以積也要從右往左退 2 位點小數點，等於 ${ansStr}。`,
            `被乘數變成了二位小數，積就要從 ${prod} 的右邊往左數幾位點小數點呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 四下第7章：周長與面積 */
export function generateG4S2U7PerimeterArea(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 長方形／正方形周長與面積公式
      const sub = Math.floor(i / 4) % 2;
      const askArea = i % 2 === 0;
      if (sub === 0) {
        const l = randomInt(9, 24);
        const w = randomInt(5, l - 2);
        if (askArea) {
          const ans = l * w;
          const built = buildNumericOptions(
            ans,
            [2 * (l + w), l + w, (l + 1) * w],
            ' 平方公分',
          );
          questions.push(
            makeQuestion(
              'g4s2-u7',
              seed,
              i,
              `一張長方形卡片長 ${l} 公分、寬 ${w} 公分，這張卡片的「面積」是多少平方公分？`,
              built,
              `長方形面積 = 長 × 寬 = ${l} × ${w} = ${ans} 平方公分（注意 ${2 * (l + w)} 是周長，不是面積）。`,
              '題目問的是「面積」，記得用「長 × 寬」喔！',
            ),
          );
        } else {
          const ans = 2 * (l + w);
          const built = buildNumericOptions(ans, [l * w, l + w, 2 * l + w], ' 公分');
          questions.push(
            makeQuestion(
              'g4s2-u7',
              seed,
              i,
              `一個長方形畫框長 ${l} 公分、寬 ${w} 公分，這個畫框的「周長」是多少公分？`,
              built,
              `長方形周長 = (長 + 寬) × 2 = (${l} + ${w}) × 2 = ${ans} 公分。`,
              '周長是四條邊加起來，長方形有 2 條長和 2 條寬，記得加起來要乘以 2！',
            ),
          );
        }
      } else {
        const side = randomInt(7, 22);
        if (askArea) {
          const ans = side * side;
          const built = buildNumericOptions(
            ans,
            [4 * side, 2 * side, (side + 1) * side],
            ' 平方公分',
          );
          questions.push(
            makeQuestion(
              'g4s2-u7',
              seed,
              i,
              `一張邊長 ${side} 公分的正方形色紙，它的「面積」是多少平方公分？`,
              built,
              `正方形面積 = 邊長 × 邊長 = ${side} × ${side} = ${ans} 平方公分。`,
              '面積是「邊長 × 邊長」，小心不要算成 4 × 邊長的周長喔！',
            ),
          );
        } else {
          const ans = 4 * side;
          const built = buildNumericOptions(ans, [side * side, 2 * side, side + 4], ' 公分');
          questions.push(
            makeQuestion(
              'g4s2-u7',
              seed,
              i,
              `一個邊長 ${side} 公分的正方形地墊，它的「周長」是多少公分？`,
              built,
              `正方形周長 = 邊長 × 4 = ${side} × 4 = ${ans} 公分。`,
              '正方形四條邊一樣長，周長就是「邊長 × 4」！',
            ),
          );
        }
      }
    } else if (mode === 1) {
      // 反求邊長與由周長推算面積
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const w = randomInt(6, 16);
        const l = w + randomInt(3, 12);
        const p = 2 * (l + w);
        const built = buildNumericOptions(w, [p - l, p - 2 * l, w + 2], ' 公分');
        questions.push(
          makeQuestion(
            'g4s2-u7',
            seed,
            i,
            `一個長方形花圃的周長是 ${p} 公分，已知長是 ${l} 公分，請問寬是多少公分？`,
            built,
            `周長的一半就是「長 + 寬」：${p} ÷ 2 = ${l + w} 公分，所以寬 = ${l + w} - ${l} = ${w} 公分。`,
            '先把周長除以 2 得到「1 條長 + 1 條寬」，再減掉長就得到寬囉！',
          ),
        );
      } else {
        const side = randomInt(6, 18);
        const p = 4 * side;
        const ans = side * side;
        const built = buildNumericOptions(ans, [side, p * p, 2 * side], ' 平方公分');
        questions.push(
          makeQuestion(
            'g4s2-u7',
            seed,
            i,
            `用一條長 ${p} 公分的繩子剛好圍成一個正方形，這個正方形的面積是多少平方公分？`,
            built,
            `先用周長反求邊長：${p} ÷ 4 = ${side} 公分；再算面積：${side} × ${side} = ${ans} 平方公分。`,
            '先用周長除以 4 找出正方形的邊長，再把邊長 × 邊長算出面積！',
          ),
        );
      }
    } else if (mode === 2) {
      // 平方公尺 ↔ 平方公分
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const l = randomInt(3, 7);
        const w = randomInt(2, 5);
        const areaM2 = l * w;
        const ans = areaM2 * 10000;
        const built = buildNumericOptions(
          ans,
          [areaM2 * 100, areaM2 * 1000, areaM2],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g4s2-u7',
            seed,
            i,
            `教室佈告欄是一個長 ${l} 公尺、寬 ${w} 公尺的長方形，面積是多少平方公分？`,
            built,
            `面積是 ${l} × ${w} = ${areaM2} 平方公尺；因為 1 平方公尺 = 100 公分 × 100 公分 = 10000 平方公分，所以 ${areaM2} 平方公尺 = ${ans} 平方公分。`,
            '先算出幾平方公尺，再記住「1 平方公尺 = 10000 平方公分」（後面補 4 個 0）！',
          ),
        );
      } else {
        const areaM2 = randomInt(3, 25);
        const cm2 = areaM2 * 10000;
        const built = buildNumericOptions(
          areaM2,
          [areaM2 * 10, areaM2 * 100, areaM2 * 1000],
          ' 平方公尺',
        );
        questions.push(
          makeQuestion(
            'g4s2-u7',
            seed,
            i,
            `一幅大型壁畫的面積是 ${cm2} 平方公分，換算成平方公尺是多少平方公尺？`,
            built,
            `因為 10000 平方公分 = 1 平方公尺，把 ${cm2} 去掉 4 個 0（除以 10000），得到 ${areaM2} 平方公尺。`,
            '1 平方公尺 = 10000 平方公分，平方公分換平方公尺要去掉 4 個 0！',
          ),
        );
      }
    } else {
      // 簡單複合圖形的面積
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const w = randomInt(9, 15);
        const l = w + randomInt(3, 10);
        const s = randomInt(5, w - 3);
        const ans = l * w - s * s;
        const built = buildNumericOptions(
          ans,
          [l * w + s * s, l * w - 4 * s, l * w],
          ' 平方公尺',
        );
        questions.push(
          makeQuestion(
            'g4s2-u7',
            seed,
            i,
            `一塊長 ${l} 公尺、寬 ${w} 公尺的長方形草地，中間開闢了一個邊長 ${s} 公尺的正方形水池，剩下草地的面積是多少平方公尺？`,
            built,
            `用全部長方形面積扣掉水池面積：(${l} × ${w}) - (${s} × ${s}) = ${l * w} - ${s * s} = ${ans} 平方公尺。`,
            '先算整塊大長方形的面積，再減掉中間正方形水池的面積！',
          ),
        );
      } else {
        const l1 = randomInt(12, 20);
        const w1 = randomInt(8, 12);
        const s2 = randomInt(5, 8);
        const ans = l1 * w1 + s2 * s2;
        const built = buildNumericOptions(
          ans,
          [l1 * w1 + 4 * s2, l1 * w1 - s2 * s2, l1 * w1 + s2],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g4s2-u7',
            seed,
            i,
            `把一張長 ${l1} 公分、寬 ${w1} 公分的長方形色紙，和一張邊長 ${s2} 公分的正方形色紙不重疊地拼成一個 L 形，總面積是多少平方公分？`,
            built,
            `兩張紙沒有重疊，總面積就是兩塊面積相加：(${l1} × ${w1}) + (${s2} × ${s2}) = ${l1 * w1} + ${s2 * s2} = ${ans} 平方公分。`,
            '把 L 形分割成「長方形」和「正方形」兩塊，各自算出面積再加起來！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 四下第8章：分數（二） */
export function generateG4S2U8Fractions2(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 等值分數（擴分選等值與填空格）
      const [n, d] = pickRandom([
        [1, 2],
        [1, 3],
        [2, 3],
        [1, 4],
        [3, 4],
        [2, 5],
        [3, 5],
        [4, 5],
        [1, 6],
        [5, 6],
      ] as const);
      const k = randomInt(3, 6);
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const ansN = n * k;
        const ansD = d * k;
        const ans = `${ansN}/${ansD}`;
        const trapPairs: [number, number][] = [];
        const addTrap = (cn: number, cd: number) => {
          if (cn <= 0 || cd <= 0 || trapPairs.length >= 3) return;
          if (cn * d === n * cd) return;
          if (trapPairs.some(([pn, pd]) => cn * pd === pn * cd)) return;
          trapPairs.push([cn, cd]);
        };
        addTrap(n * k, d * (k + 1));
        addTrap(n + k, d + k);
        addTrap(n * k + 1, d * k);
        addTrap(n * k - 1, d * k);
        addTrap(n * k, d * k + 1);
        addTrap(n * k + 2, d * k);
        const built = buildStringOptions(
          ans,
          trapPairs.map(([cn, cd]) => `${cn}/${cd}`),
        );
        questions.push(
          makeQuestion(
            'g4s2-u8',
            seed,
            i,
            `下列哪一個分數和「${n}/${d}」相等（是它的等值分數）？`,
            built,
            `把分子和分母同時乘以相同的非零整數 ${k}，得到的分數大小不變：(${n} × ${k})/(${d} × ${k}) = ${ans}。`,
            '等值分數必須把分子和分母「同乘（或同除）」相同的數，不能用加的喔！',
          ),
        );
      } else {
        const ans = n * k;
        const built = buildNumericOptions(ans, [n + k, ans + 1, ans + d]);
        questions.push(
          makeQuestion(
            'g4s2-u8',
            seed,
            i,
            `要讓等值分數「${n}/${d} = □/${d * k}」成立，□ 裡面應該填多少？`,
            built,
            `分母從 ${d} 變成 ${d * k} 是乘以 ${k}，所以分子 ${n} 也要乘以 ${k}：${n} × ${k} = ${ans}。`,
            `先看看分母 ${d} 乘以幾會變成 ${d * k}，分子就跟著乘以相同的倍數！`,
          ),
        );
      }
    } else if (mode === 1) {
      // 簡單異分母分數大小比較
      const sets: { items: [number, number][]; commonDen: number }[] = [
        { items: [[11, 12], [5, 6], [3, 4], [2, 3]], commonDen: 12 },
        { items: [[5, 6], [3, 4], [2, 3], [7, 12]], commonDen: 12 },
        { items: [[7, 8], [3, 4], [5, 8], [1, 2]], commonDen: 8 },
        { items: [[3, 4], [5, 8], [1, 2], [3, 8]], commonDen: 8 },
        { items: [[9, 10], [4, 5], [7, 10], [1, 2]], commonDen: 10 },
        { items: [[4, 5], [7, 10], [3, 5], [1, 2]], commonDen: 10 },
        { items: [[5, 6], [2, 3], [1, 2], [1, 3]], commonDen: 6 },
        { items: [[7, 10], [3, 5], [1, 2], [2, 5]], commonDen: 10 },
      ];
      const chosen = pickRandom(sets);
      const askMax = Math.floor(i / 4) % 2 === 0;
      const targetIdx = askMax ? 0 : 3;
      const ansPair = chosen.items[targetIdx];
      const ans = `${ansPair[0]}/${ansPair[1]}`;
      const wrongs = chosen.items
        .filter((_, idx) => idx !== targetIdx)
        .map(([fn, fd]) => `${fn}/${fd}`);
      const built = buildStringOptions(ans, wrongs);
      const expandedList = chosen.items
        .map(([fn, fd]) => `${fn}/${fd} = ${(fn * chosen.commonDen) / fd}/${chosen.commonDen}`)
        .join('、');
      questions.push(
        makeQuestion(
          'g4s2-u8',
          seed,
          i,
          `下面四個分數中，哪一個分數「${askMax ? '最大' : '最小'}」？`,
          built,
          `全部通分成同分母 ${chosen.commonDen} 來比較：${expandedList}，所以${askMax ? '最大' : '最小'}的是 ${ans}。`,
          `先把四個分數都通分成「分母為 ${chosen.commonDen}」的等值分數，再比分子大小！`,
        ),
      );
    } else if (mode === 2) {
      // 分母 2/4/5/10/100 換小數 ＆ 小數換分數
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const fracToDec: [string, number, number[]][] = [
          ['1/2', 50, [12, 20, 5]],
          ['1/4', 25, [14, 40, 20]],
          ['3/4', 75, [34, 43, 30]],
          ['1/5', 20, [15, 50, 2]],
          ['2/5', 40, [25, 52, 4]],
          ['3/5', 60, [35, 53, 6]],
          ['4/5', 80, [45, 54, 8]],
          ['7/10', 70, [7, 17, 700]],
          ['3/100', 3, [30, 300, 13]],
          ['7/100', 7, [70, 700, 17]],
          ['1 又 1/4', 125, [114, 140, 150]],
          ['1 又 3/4', 175, [134, 143, 130]],
          ['2 又 3/5', 260, [235, 230, 250]],
        ];
        const [fracLabel, ansHundredths, traps] = pickRandom(fracToDec);
        const built = buildHundredthsOptions(ansHundredths, traps);
        questions.push(
          makeQuestion(
            'g4s2-u8',
            seed,
            i,
            `把分數「${fracLabel}」換成小數是多少？`,
            built,
            `把分母擴分成 10 或 100，或用分子除以分母：${fracLabel} = ${formatHundredths(ansHundredths)}。`,
            '先把分數擴分成十分之幾（0.1 的倍數）或百分之幾（0.01 的倍數），就很容易寫成小數！',
          ),
        );
      } else {
        const decToFrac: [string, string, string[]][] = [
          ['0.5', '1/2', ['1/5', '5/100', '2/5']],
          ['0.25', '1/4', ['2/5', '1/25', '1/2']],
          ['0.75', '3/4', ['7/5', '3/5', '7/10']],
          ['0.4', '2/5', ['1/4', '4/100', '5/2']],
          ['0.6', '3/5', ['1/6', '6/100', '2/3']],
          ['0.08', '8/100', ['8/10', '1/8', '18/100']],
          ['0.03', '3/100', ['3/10', '1/3', '13/100']],
          ['0.3', '3/10', ['3/100', '1/3', '30/10']],
        ];
        const [decLabel, ansFrac, wrongs] = pickRandom(decToFrac);
        const built = buildStringOptions(ansFrac, wrongs);
        questions.push(
          makeQuestion(
            'g4s2-u8',
            seed,
            i,
            `把小數「${decLabel}」換成分數，下列哪一個是正確的？`,
            built,
            `一位小數分母是 10、二位小數分母是 100（再依需要約分），因此 ${decLabel} = ${ansFrac}。`,
            '看小數點後面有幾位：1 位是「十分之幾」、2 位是「百分之幾」，再比對等值分數！',
          ),
        );
      }
    } else {
      // 簡單異分母分數加減（分母為倍數關係）
      const denPairs: [number, number][] = [
        [2, 4],
        [3, 6],
        [4, 8],
        [5, 10],
        [3, 12],
        [6, 12],
      ];
      const [dSmall, dLarge] = pickRandom(denPairs);
      const factor = dLarge / dSmall;
      const isAdd = randomInt(0, 1) === 0;
      const validPairs: [number, number, number][] = [];
      for (let n1 = 1; n1 < dSmall; n1++) {
        if (gcd(n1, dSmall) !== 1) continue;
        for (let n2 = 1; n2 < dLarge; n2++) {
          if (gcd(n2, dLarge) !== 1) continue;
          const ansN = isAdd ? n1 * factor + n2 : n1 * factor - n2;
          if (ansN >= 1 && ansN < dLarge && gcd(ansN, dLarge) === 1) {
            validPairs.push([n1, n2, ansN]);
          }
        }
      }
      const [n1, n2, ansN] =
        validPairs.length > 0 ? pickRandom(validPairs) : [1, 1, isAdd ? 3 : 1];
      const useLarge = validPairs.length > 0 ? dLarge : 4;
      const useSmall = validPairs.length > 0 ? dSmall : 2;
      const useFactor = useLarge / useSmall;
      const ansStr = `${ansN}/${useLarge}`;

      const distractorPairs: [number, number][] = [];
      const addTrapIfValid = (cn: number, cd: number) => {
        if (cn <= 0 || cd <= 0) return;
        if (cn * useLarge === ansN * cd) return;
        if (distractorPairs.some(([pn, pd]) => cn * pd === pn * cd)) return;
        if (distractorPairs.length < 3) distractorPairs.push([cn, cd]);
      };
      if (isAdd) {
        addTrapIfValid(n1 + n2, useSmall + useLarge);
      } else {
        addTrapIfValid(Math.abs(n1 - n2) || 1, useLarge);
      }
      for (let cn = 1; cn < useLarge && distractorPairs.length < 3; cn++) {
        addTrapIfValid(cn, useLarge);
      }
      let extraN = useLarge + 1;
      while (distractorPairs.length < 3) {
        addTrapIfValid(extraN, useLarge);
        extraN++;
      }

      const built = buildStringOptions(
        ansStr,
        distractorPairs.map(([cn, cd]) => `${cn}/${cd}`),
      );
      const opSign = isAdd ? '+' : '-';
      questions.push(
        makeQuestion(
          'g4s2-u8',
          seed,
          i,
          `計算異分母分數：${n1}/${useSmall} ${opSign} ${n2}/${useLarge} 的結果是多少？`,
          built,
          `先把 ${n1}/${useSmall} 擴分成同分母 ${useLarge}：${n1}/${useSmall} = ${n1 * useFactor}/${useLarge}，再${isAdd ? '相加' : '相減'}得 ${ansStr}。`,
          `先把分母 ${useSmall} 擴分成和 ${useLarge} 一樣的同分母，再計算分子！`,
        ),
      );
    }
  }
  return questions;
}

/** 四下第9章：時間的計算 */
export function generateG4S2U9TimeCalc(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 12時制↔24時制 與 日時/時分換算
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const h12 = randomInt(1, 11);
        const h24 = h12 + 12;
        const m = randomInt(10, 55);
        if (i % 2 === 0) {
          const ans = `下午 ${h12} 時 ${m} 分`;
          const built = buildStringOptions(ans, [
            `上午 ${h12} 時 ${m} 分`,
            `下午 ${h12 === 11 ? 9 : h12 + 1} 時 ${m} 分`,
            `下午 ${h12 === 1 ? 3 : h12 - 1} 時 ${m} 分`,
          ]);
          questions.push(
            makeQuestion(
              'g4s2-u9',
              seed,
              i,
              `火車時刻表寫著「${h24} 時 ${m} 分」開出，改用 12 時制表示是什麼時候？`,
              built,
              `24 時制超過 12 時代表是「下午」，把時數減掉 12：${h24} - 12 = ${h12}，所以是${ans}。`,
              '超過 12 時的時間屬於「下午」，用 24 時制的時數減去 12 就能換成 12 時制！',
            ),
          );
        } else {
          const ans = `${h24} 時 ${m} 分`;
          const built = buildStringOptions(ans, [
            `${h12} 時 ${m} 分`,
            `${h24 === 23 ? 21 : h24 + 1} 時 ${m} 分`,
            `${h24 - 2} 時 ${m} 分`,
          ]);
          questions.push(
            makeQuestion(
              'g4s2-u9',
              seed,
              i,
              `博物館最後入場時間是「下午 ${h12} 時 ${m} 分」，改用 24 時制表示是什麼時候？`,
              built,
              `下午的時刻換成 24 時制要把時數加上 12：${h12} + 12 = ${h24}，所以是 ${ans}。`,
              '「下午」換成 24 時制，記得把小時數加上 12 喔！',
            ),
          );
        }
      } else {
        const useDays = randomInt(0, 1) === 0;
        if (useDays) {
          const days = randomInt(2, 5);
          const hrs = randomInt(3, 19);
          const ans = days * 24 + hrs;
          const built = buildNumericOptions(
            ans,
            [days * 12 + hrs, days * 10 + hrs, ans + 24],
            ' 小時',
          );
          questions.push(
            makeQuestion(
              'g4s2-u9',
              seed,
              i,
              `太空實驗任務一共持續了 ${days} 日 ${hrs} 小時，換算成小時是多少小時？`,
              built,
              `1 日 = 24 小時，${days} 日 = 24 × ${days} = ${days * 24} 小時，再加上 ${hrs} 小時等於 ${ans} 小時。`,
              '記住「1 日 = 24 小時」，不是 12 小時也不是 10 小時喔！',
            ),
          );
        } else {
          const hrs = randomInt(2, 5);
          const mins = randomInt(10, 50);
          const ans = hrs * 60 + mins;
          const built = buildNumericOptions(
            ans,
            [hrs * 100 + mins, hrs * 24 + mins, ans + 60],
            ' 分鐘',
          );
          questions.push(
            makeQuestion(
              'g4s2-u9',
              seed,
              i,
              `長途客運從台北開往高雄共開了 ${hrs} 小時 ${mins} 分鐘，換算成分鐘是多少分鐘？`,
              built,
              `1 小時 = 60 分鐘，${hrs} 小時 = 60 × ${hrs} = ${hrs * 60} 分鐘，加上 ${mins} 分鐘共 ${ans} 分鐘。`,
              '時間是 60 進位：1 小時 = 60 分鐘，先把小時乘以 60 再加分鐘！',
            ),
          );
        }
      }
    } else if (mode === 1) {
      // 跨午經過時間（上午 → 下午，含分鐘借位）
      const h1 = randomInt(8, 11);
      const m1 = randomInt(32, 54);
      const h2_12 = randomInt(1, 5);
      const h2_24 = h2_12 + 12;
      let m2 = randomInt(5, 28);
      if (m1 - m2 === 30) m2 += 1;
      const totalMin = h2_24 * 60 + m2 - (h1 * 60 + m1);
      const durH = Math.floor(totalMin / 60);
      const durM = totalMin % 60;
      const ans = `${durH} 小時 ${durM} 分鐘`;
      const built = buildStringOptions(ans, [
        `${durH + 1} 小時 ${durM} 分鐘`,
        `${durH + 1} 小時 ${m1 - m2} 分鐘`,
        `${durH >= 2 ? durH - 1 : durH + 2} 小時 ${durM} 分鐘`,
      ]);
      questions.push(
        makeQuestion(
          'g4s2-u9',
          seed,
          i,
          `自然生態園遊會從上午 ${h1} 時 ${m1} 分開始，一直到下午 ${h2_12} 時 ${m2} 分結束，活動共進行了幾小時幾分鐘？`,
          built,
          `先把結束時刻換成 24 時制（${h2_24} 時 ${m2} 分），再用「結束時刻 - 開始時刻」：${m2} 分不夠減 ${m1} 分，借 1 小時當 60 分，得到 ${ans}。`,
          '先將「下午」換成 24 時制再相減，分鐘不夠減時記得借 1 小時 = 60 分鐘！',
        ),
      );
    } else if (mode === 2) {
      // 跨午時刻推算（上午時刻 + 經過時間 → 下午時刻）
      const startH = randomInt(9, 11);
      const startM = randomInt(25, 50);
      const addH = randomInt(3, 5);
      const addM = randomInt(60 - startM + 5, 55);
      const endTotal = (startH + addH) * 60 + startM + addM;
      const endH24 = Math.floor(endTotal / 60);
      const endM = endTotal % 60;
      const endH12 = endH24 - 12;
      const ans = `下午 ${endH12} 時 ${endM} 分`;
      const built = buildStringOptions(ans, [
        `上午 ${endH12} 時 ${endM} 分`,
        `下午 ${endH12 + 1} 時 ${endM} 分`,
        `下午 ${endH12} 時 ${endM + 10} 分`,
      ]);
      questions.push(
        makeQuestion(
          'g4s2-u9',
          seed,
          i,
          `麵包師傅在上午 ${startH} 時 ${startM} 分開始揉麵團，經過 ${addH} 小時 ${addM} 分鐘的發酵與烘烤後出爐，請問出爐是 12 時制的什麼時候？`,
          built,
          `${startM} + ${addM} = ${startM + addM} 分（滿 60 分進 1 小時剩 ${endM} 分），小時共有 ${startH} + ${addH} + 1 = ${endH24} 時，即 24 時制的 ${endH24} 時 ${endM} 分，也就是${ans}。`,
          '分鐘加起來滿 60 要進位成 1 小時，超過 12 時就換成「下午」並把時數減 12！',
        ),
      );
    } else {
      // 跨日時間計算（跨日經過時間 & 跨日推算時刻）
      const sub = Math.floor(i / 4) % 2;
      if (sub === 0) {
        const startH12 = randomInt(8, 11);
        const startH24 = startH12 + 12;
        const startM = randomInt(32, 54);
        const endH = randomInt(5, 10);
        let endM = randomInt(5, 28);
        if (startM - endM === 30) endM += 1;
        const day1Rem = 24 * 60 - (startH24 * 60 + startM);
        const day2Elap = endH * 60 + endM;
        const totalMin = day1Rem + day2Elap;
        const durH = Math.floor(totalMin / 60);
        const durM = totalMin % 60;
        const ans = `${durH} 小時 ${durM} 分鐘`;
        const built = buildStringOptions(ans, [
          `${durH + 1} 小時 ${durM} 分鐘`,
          `${durH + 1} 小時 ${startM - endM} 分鐘`,
          `${durH - 2} 小時 ${durM} 分鐘`,
        ]);
        questions.push(
          makeQuestion(
            'g4s2-u9',
            seed,
            i,
            `一艘郵輪於 5 月 10 日晚上 ${startH12} 時 ${startM} 分從港口出發，在 5 月 11 日上午 ${endH} 時 ${endM} 分抵達目的地，這趟航行共花了幾小時幾分鐘？`,
            built,
            `分段計算：5 月 10 日 ${startH24} 時 ${startM} 分到午夜 24 時經過 ${Math.floor(day1Rem / 60)} 小時 ${day1Rem % 60} 分，加上 5 月 11 日經過的 ${endH} 小時 ${endM} 分，合計 ${ans}。`,
            '跨日計算可以「先算第一天到午夜 24 時經過多久，再加上第二天經過的時間」！',
          ),
        );
      } else {
        const startH12 = randomInt(7, 9);
        const startH24 = startH12 + 12;
        const startM = randomInt(20, 45);
        const durH = randomInt(8, 11);
        const durM = randomInt(60 - startM + 5, 50);
        const totalMin = startH24 * 60 + startM + durH * 60 + durM;
        const endH = Math.floor(totalMin / 60) - 24;
        const endM = totalMin % 60;
        const ans = `7 月 16 日上午 ${endH} 時 ${endM} 分`;
        const built = buildStringOptions(ans, [
          `7 月 15 日上午 ${endH} 時 ${endM} 分`,
          `7 月 16 日下午 ${endH} 時 ${endM} 分`,
          `7 月 16 日上午 ${endH + 1} 時 ${endM} 分`,
        ]);
        questions.push(
          makeQuestion(
            'g4s2-u9',
            seed,
            i,
            `天文觀測營從 7 月 15 日晚上 ${startH12} 時 ${startM} 分開始，經過 ${durH} 小時 ${durM} 分鐘後結束，請問活動在什麼時候結束？`,
            built,
            `先把 7 月 15 日晚上 ${startH12} 時 ${startM} 分換成 24 時制的 ${startH24} 時 ${startM} 分，加上 ${durH} 小時 ${durM} 分鐘得到 ${endH + 24} 時 ${endM} 分；扣掉 1 日（24 時）進位到隔天，即 ${ans}。`,
            '時數加起來超過 24 時就跨到隔天（日期加 1），再把多出的時數減掉 24！',
          ),
        );
      }
    }
  }
  return questions;
}
