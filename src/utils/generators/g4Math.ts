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
    .replace(/÷/g, '除以');
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
