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

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function simplifyFraction(n: number, d: number): [number, number] {
  const g = gcd(n, d);
  return [n / g, d / g];
}

function formatFraction(n: number, d: number): string {
  const [sn, sd] = simplifyFraction(n, d);
  return sd === 1 ? String(sn) : `${sn}/${sd}`;
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
  const deltas = [-6, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 10, 12];
  let guard = 0;
  while (set.size < 4 && guard < 60) {
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
    set.add(`${answer}（選項${extra}）`);
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
  return {
    id: `${idPrefix}-${seed}-${index}`,
    subjectId: 'math',
    prompt,
    options: built.options,
    answerIndex: built.answerIndex,
    explanation,
    hint,
    speechText: prompt.replace('?', '多少').replace('×', '乘以').replace('÷', '除以'),
    speechLang: 'zh-TW',
  };
}

function getAllFactors(n: number): number[] {
  const factors: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) factors.push(i);
  }
  return factors;
}

export function generateG5S1U2FactorsMultiples(count = 6): Question[] {
  const seed = Date.now();
  const results: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const base = randomInt(6, 14);
      const mult = randomInt(3, 8);
      const ans = base * mult;
      const nonMultiples: number[] = [];
      for (const delta of [-3, -2, -1, 1, 2, 3, 4, 5]) {
        const cand = ans + delta;
        if (cand > 1 && cand % base !== 0) nonMultiples.push(cand);
      }
      results.push(
        makeQuestion(
          'dyn-g5s1-u2',
          seed,
          i,
          `下列哪一個數是 ${base} 的倍數？`,
          buildNumericOptions(ans, nonMultiples),
          `${ans} ÷ ${base} = ${mult}，可以整除，所以 ${ans} 是 ${base} 的倍數！`,
          `找找看哪一個數除以 ${base} 會沒有餘數。`,
        ),
      );
    } else if (mode === 1) {
      const target = pickRandom([24, 30, 36, 42, 48, 54, 60, 72]);
      const factors = getAllFactors(target).filter((f) => f > 1 && f < target);
      const ans = pickRandom(factors);
      const nonFactors: number[] = [];
      for (let c = 2; c < target; c++) {
        if (target % c !== 0 && Math.abs(c - ans) <= 6) nonFactors.push(c);
      }
      results.push(
        makeQuestion(
          'dyn-g5s1-u2',
          seed,
          i,
          `下列哪一個數是 ${target} 的因數？`,
          buildNumericOptions(ans, nonFactors),
          `${target} ÷ ${ans} = ${target / ans}，能整除 ${target} 的正整數就是它的因數！`,
          `試著用 ${target} 除以各選項，能整除的就是因數。`,
        ),
      );
    } else if (mode === 2) {
      const target = pickRandom([12, 16, 18, 20, 24, 28, 30, 36]);
      const factors = getAllFactors(target);
      const ans = factors.length;
      results.push(
        makeQuestion(
          'dyn-g5s1-u2',
          seed,
          i,
          `數字 ${target} 一共有幾個因數？`,
          buildNumericOptions(ans, [ans - 2, ans - 1, ans + 1, ans + 2], ' 個'),
          `${target} 的因數有 ${factors.join('、')}，共有 ${ans} 個因數。`,
          '用乘法算式一對一對找，別漏掉 1 和自己喔！',
        ),
      );
    } else {
      const total = pickRandom([24, 28, 32, 36, 40, 45, 48]);
      const valid = getAllFactors(total).filter((f) => f >= 3 && f <= 12);
      const ans = pickRandom(valid);
      const bad: number[] = [];
      for (let c = 3; c <= 14; c++) {
        if (total % c !== 0) bad.push(c);
      }
      results.push(
        makeQuestion(
          'dyn-g5s1-u2',
          seed,
          i,
          `老師有 ${total} 顆糖果，想平分裝成幾袋且剛好分完不剩下，每袋可以裝幾顆？`,
          buildNumericOptions(ans, bad, ' 顆'),
          `${total} ÷ ${ans} = ${total / ans} 袋剛好分完；${ans} 是 ${total} 的因數。`,
          `每袋顆數必須能整除 ${total} 喔！`,
        ),
      );
    }
  }
  return results;
}

export function generateG5S1U4GcdLcm(count = 6): Question[] {
  const seed = Date.now();
  const results: Question[] = [];
  const coprimePairs: Array<[number, number]> = [
    [2, 3],
    [2, 5],
    [3, 4],
    [3, 5],
    [4, 5],
    [3, 7],
  ];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    const [x, y] = pickRandom(coprimePairs);
    const g = randomInt(2, 6);
    const a = g * x;
    const b = g * y;

    if (mode === 0) {
      results.push(
        makeQuestion(
          'dyn-g5s1-u4',
          seed,
          i,
          `${a} 和 ${b} 的最大公因數是多少？`,
          buildNumericOptions(g, [g * 2, g + 1, Math.max(1, g - 1), a]),
          `${a} = ${g} × ${x}，${b} = ${g} × ${y}，且 ${x} 與 ${y} 互質，所以最大公因數是 ${g}。`,
          '先列出兩數各自的因數，找共同且最大的那一個！',
        ),
      );
    } else if (mode === 1) {
      const ans = lcm(a, b);
      results.push(
        makeQuestion(
          'dyn-g5s1-u4',
          seed,
          i,
          `${a} 和 ${b} 的最小公倍數是多少？`,
          buildNumericOptions(ans, [g, a * b, ans + g, Math.max(a, b)]),
          `${a} 與 ${b} 的最小公倍數 = ${g} × ${x} × ${y} = ${ans}。`,
          '用短除法或把較大數的倍數一個個檢查能不能被另一個數整除！',
        ),
      );
    } else if (mode === 2) {
      const ans = lcm(a, b);
      results.push(
        makeQuestion(
          'dyn-g5s1-u4',
          seed,
          i,
          `甲公車每 ${a} 分鐘發一班車，乙公車每 ${b} 分鐘發一班車。兩車同時從總站出發後，最快幾分鐘後會再次同時發車？`,
          buildNumericOptions(ans, [a + b, g, a * b, ans * 2], ' 分鐘'),
          `再次同時發車的時間是 ${a} 和 ${b} 的最小公倍數：${ans} 分鐘。`,
          '「再次同時出現」要找兩數的最小公倍數喔！',
        ),
      );
    } else {
      results.push(
        makeQuestion(
          'dyn-g5s1-u4',
          seed,
          i,
          `園遊會準備了 ${a} 個飯糰和 ${b} 瓶果汁，要平均分裝進禮盒且全部裝完不剩，最多可以裝成幾盒？`,
          buildNumericOptions(g, [g * 2, x + y, Math.min(a, b), lcm(a, b)], ' 盒'),
          `最多能裝的盒數是 ${a} 和 ${b} 的最大公因數：${g} 盒（每盒有 ${x} 個飯糰與 ${y} 瓶果汁）。`,
          '「最多能平分成幾組」要找兩數的最大公因數！',
        ),
      );
    }
  }
  return results;
}

export function generateG5S1U6FourOps(count = 6): Question[] {
  const seed = Date.now();
  const results: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const a = randomInt(4, 9);
      const b = randomInt(5, 12);
      const c = randomInt(3, 8);
      const d = randomInt(4, 9);
      const ans = a * b + c * d;
      results.push(
        makeQuestion(
          'dyn-g5s1-u6',
          seed,
          i,
          `計算：${a} × ${b} + ${c} × ${d} = ?`,
          buildNumericOptions(ans, [
            (a * b + c) * d,
            a * (b + c) * d,
            ans + 10,
            Math.max(1, ans - 10),
          ]),
          `先乘除後加減：${a} × ${b} = ${a * b}，${c} × ${d} = ${c * d}，相加得 ${ans}。`,
          '把兩組乘法分別算出來再相加！',
        ),
      );
    } else if (mode === 1) {
      const k = randomInt(12, 29);
      const a = randomInt(21, 79);
      const b = 100 - a;
      const ans = 100 * k;
      results.push(
        makeQuestion(
          'dyn-g5s1-u6',
          seed,
          i,
          `利用分配律計算：${a} × ${k} + ${b} × ${k} = ?`,
          buildNumericOptions(ans, [ans - k, ans + k, (a + b) * (k + 1), a * k]),
          `利用乘法分配律：(${a} + ${b}) × ${k} = 100 × ${k} = ${ans}。`,
          `兩邊都有「× ${k}」，可以先把 ${a} 和 ${b} 加起來喔！`,
        ),
      );
    } else if (mode === 2) {
      const pairs: Array<[number, number]> = [
        [2, 5],
        [4, 5],
        [5, 4],
        [3, 4],
        [2, 6],
        [5, 6],
      ];
      const [a, b] = pickRandom(pairs);
      const q = randomInt(6, 25);
      const total = q * a * b;
      results.push(
        makeQuestion(
          'dyn-g5s1-u6',
          seed,
          i,
          `計算連除算式：${total} ÷ ${a} ÷ ${b} = ?`,
          buildNumericOptions(q, [q * b, q * a, Math.round(total / (a + b)), q + 2]),
          `連續除以兩數等於除以兩數的積：${total} ÷ (${a} × ${b}) = ${total} ÷ ${a * b} = ${q}。`,
          `先把除數 ${a} 和 ${b} 乘起來，算起來更快！`,
        ),
      );
    } else {
      const avg = randomInt(82, 95);
      const d1 = randomInt(-6, -2);
      const d2 = randomInt(2, 6);
      const d3 = -(d1 + d2);
      const s1 = avg + d1;
      const s2 = avg + d2;
      const s3 = avg + d3;
      results.push(
        makeQuestion(
          'dyn-g5s1-u6',
          seed,
          i,
          `小勇者三次測驗分數分別是 ${s1} 分、${s2} 分、${s3} 分，平均是幾分？`,
          buildNumericOptions(avg, [avg - 2, avg + 2, avg + 3, Math.max(60, avg - 3)], ' 分'),
          `先算總分：(${s1} + ${s2} + ${s3}) = ${avg * 3}，再除以 3 次得平均 ${avg} 分。`,
          '平均 = 總和 ÷ 個數！',
        ),
      );
    }
  }
  return results;
}

export function generateG5S1U7Fractions(count = 6): Question[] {
  const seed = Date.now();
  const results: Question[] = [];
  const baseFracs: Array<[number, number]> = [
    [1, 2],
    [1, 3],
    [2, 3],
    [3, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 6],
  ];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const [p, q] = pickRandom(baseFracs);
      const k = randomInt(2, 6);
      const ans = `${p}/${q}`;
      const distractors = [`${p + 1}/${q}`, `${p}/${q + 1}`, `${p + 1}/${q + 2}`];
      results.push(
        makeQuestion(
          'dyn-g5s1-u7',
          seed,
          i,
          `把分數 ${p * k}/${q * k} 約分成最簡分數，結果是多少？`,
          buildStringOptions(ans, distractors),
          `分子與分母同除以最大公因數 ${k}：(${p * k}÷${k}) / (${q * k}÷${k}) = ${ans}。`,
          `找找看分子 ${p * k} 和分母 ${q * k} 的最大公因數！`,
        ),
      );
    } else if (mode === 1) {
      const [p, q] = pickRandom(baseFracs);
      const k = randomInt(3, 7);
      const ans = p * k;
      results.push(
        makeQuestion(
          'dyn-g5s1-u7',
          seed,
          i,
          `擴分找等值分數：${p}/${q} = ( ？ )/${q * k}，括號裡應該填多少？`,
          buildNumericOptions(ans, [p + k, q * k - p, ans + 1, Math.max(1, ans - 1)]),
          `分母從 ${q} 變成 ${q * k} 是乘以 ${k}，分子也要乘以 ${k}：${p} × ${k} = ${ans}。`,
          `看看分母放大了幾倍，分子也要放大一樣的倍數！`,
        ),
      );
    } else if (mode === 2) {
      const pairs: Array<[[number, number], [number, number]]> = [
        [[2, 3], [3, 5]],
        [[3, 4], [5, 6]],
        [[3, 5], [4, 7]],
        [[5, 8], [2, 3]],
        [[4, 9], [1, 2]],
        [[5, 6], [7, 8]],
      ];
      const [f1, f2] = pickRandom(pairs);
      const [n1, d1] = f1;
      const [n2, d2] = f2;
      const common = lcm(d1, d2);
      const v1 = n1 * (common / d1);
      const v2 = n2 * (common / d2);
      const larger = v1 > v2 ? `${n1}/${d1}` : `${n2}/${d2}`;
      const smaller = v1 > v2 ? `${n2}/${d2}` : `${n1}/${d1}`;
      results.push(
        makeQuestion(
          'dyn-g5s1-u7',
          seed,
          i,
          `比較 ${n1}/${d1} 和 ${n2}/${d2} 的大小，下列敘述哪一個正確？`,
          buildStringOptions(`${larger} 比 ${smaller} 大`, [
            `${smaller} 比 ${larger} 大`,
            `${n1}/${d1} 和 ${n2}/${d2} 一樣大`,
            '分母越大分數一定越大',
          ]),
          `通分成分母 ${common}：${n1}/${d1} = ${v1}/${common}，${n2}/${d2} = ${v2}/${common}，所以 ${larger} 比 ${smaller} 大。`,
          `先把兩個分數通分成分母都是 ${common} 再比分子大小！`,
        ),
      );
    } else {
      const addPairs: Array<[[number, number], [number, number], boolean]> = [
        [[1, 2], [1, 3], true],
        [[1, 3], [1, 4], true],
        [[2, 3], [1, 6], true],
        [[3, 4], [1, 6], false],
        [[5, 6], [1, 4], false],
        [[2, 3], [1, 4], false],
      ];
      const [f1, f2, isAdd] = pickRandom(addPairs);
      const [n1, d1] = f1;
      const [n2, d2] = f2;
      const common = lcm(d1, d2);
      const v1 = n1 * (common / d1);
      const v2 = n2 * (common / d2);
      const resN = isAdd ? v1 + v2 : v1 - v2;
      const ans = formatFraction(resN, common);
      const op = isAdd ? '+' : '-';
      const wrongNaive = isAdd
        ? formatFraction(n1 + n2, d1 + d2)
        : formatFraction(Math.max(1, Math.abs(n1 - n2)), Math.max(2, Math.abs(d1 - d2)));
      results.push(
        makeQuestion(
          'dyn-g5s1-u7',
          seed,
          i,
          `計算異分母分數：${n1}/${d1} ${op} ${n2}/${d2} = ?（請用最簡分數表示）`,
          buildStringOptions(ans, [
            wrongNaive,
            formatFraction(resN + 1, common),
            formatFraction(Math.max(1, resN - 1), common),
          ]),
          `通分成 ${common} 為分母：${v1}/${common} ${op} ${v2}/${common} = ${resN}/${common}${ans !== `${resN}/${common}` ? ` = ${ans}` : ''}。`,
          `先通分成共同分母 ${common} 再把分子${isAdd ? '相加' : '相減'}！`,
        ),
      );
    }
  }
  return results;
}

export function generateG5S1U8Area(count = 6): Question[] {
  const seed = Date.now();
  const results: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const base = randomInt(6, 16);
      const height = randomInt(4, 12);
      const ans = base * height;
      results.push(
        makeQuestion(
          'dyn-g5s1-u8',
          seed,
          i,
          `一個平行四邊形的底是 ${base} 公分、高是 ${height} 公分，面積是多少平方公分？`,
          buildNumericOptions(
            ans,
            [Math.round(ans / 2), (base + height) * 2, ans + base],
            ' 平方公分',
          ),
          `平行四邊形面積 = 底 × 高 = ${base} × ${height} = ${ans} 平方公分。`,
          '平行四邊形沿著高剪下可以拼成長方形，面積公式是「底 × 高」！',
        ),
      );
    } else if (mode === 1) {
      const base = randomInt(3, 9) * 2;
      const height = randomInt(5, 13);
      const ans = (base * height) / 2;
      results.push(
        makeQuestion(
          'dyn-g5s1-u8',
          seed,
          i,
          `一個三角形的底是 ${base} 公分、高是 ${height} 公分，面積是多少平方公分？`,
          buildNumericOptions(
            ans,
            [base * height, base + height, ans + height],
            ' 平方公分',
          ),
          `三角形面積 = 底 × 高 ÷ 2 = ${base} × ${height} ÷ 2 = ${ans} 平方公分。`,
          '兩個全等三角形可以拼成一個平行四邊形，記得要「÷ 2」喔！',
        ),
      );
    } else if (mode === 2) {
      const top = randomInt(4, 10);
      const bottom = randomInt(top + 2, top + 10);
      const sum = top + bottom;
      const height = sum % 2 === 0 ? randomInt(4, 11) : randomInt(2, 5) * 2;
      const ans = (sum * height) / 2;
      results.push(
        makeQuestion(
          'dyn-g5s1-u8',
          seed,
          i,
          `一個梯形的上底是 ${top} 公分、下底是 ${bottom} 公分、高是 ${height} 公分，面積是多少平方公分？`,
          buildNumericOptions(
            ans,
            [sum * height, Math.round((top * bottom * height) / 2), ans + sum],
            ' 平方公分',
          ),
          `梯形面積 = (上底 + 下底) × 高 ÷ 2 = (${top} + ${bottom}) × ${height} ÷ 2 = ${ans} 平方公分。`,
          '先把上底加下底，乘以高後再除以 2！',
        ),
      );
    } else {
      const base = randomInt(5, 12);
      const height = randomInt(4, 10);
      const area = (base * height) / 2;
      const validArea = Number.isInteger(area) ? area : ((base * 2) * height) / 2;
      const validBase = Number.isInteger(area) ? base : base * 2;
      results.push(
        makeQuestion(
          'dyn-g5s1-u8',
          seed,
          i,
          `已知一個三角形的面積是 ${validArea} 平方公分、底是 ${validBase} 公分，它的高是幾公分？`,
          buildNumericOptions(
            height,
            [Math.max(1, Math.round(height / 2)), height * 2, height + 2],
            ' 公分',
          ),
          `三角形的高 = 面積 × 2 ÷ 底 = ${validArea} × 2 ÷ ${validBase} = ${height} 公分。`,
          '面積公式反推：先把面積乘以 2，再除以底！',
        ),
      );
    }
  }
  return results;
}

export function generateG5S1U9UnitFraction(count = 6): Question[] {
  const seed = Date.now();
  const results: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const b = randomInt(4, 11);
      let a = randomInt(2, b - 1);
      while (gcd(a, b) !== 1) {
        a = randomInt(1, b - 1);
      }
      const ans = `${a}/${b}`;
      results.push(
        makeQuestion(
          'dyn-g5s1-u9',
          seed,
          i,
          `把 ${a} 塊蔥油餅平分給 ${b} 個人，每人分到幾塊？（用分數表示）`,
          buildStringOptions(ans, [`${b}/${a}`, `1/${b}`, `${a}/${b + 1}`]),
          `整數相除可用分數表示：被除數 ÷ 除數 = 被除數/除數，所以 ${a} ÷ ${b} = ${ans} 塊。`,
          '記得「分子是被除數、分母是除數」喔！',
        ),
      );
    } else if (mode === 1) {
      const d = randomInt(3, 8);
      const ans = randomInt(4, 14);
      const total = d * ans;
      results.push(
        makeQuestion(
          'dyn-g5s1-u9',
          seed,
          i,
          `計算：${total} × 1/${d} = ?`,
          buildNumericOptions(ans, [ans + 2, Math.max(1, ans - 2), total - d, ans * 2]),
          `整數乘以幾分之一等於除以分母：${total} × 1/${d} = ${total} ÷ ${d} = ${ans}。`,
          `算「${total} 的 ${d} 分之一」就是把 ${total} 分成 ${d} 等分！`,
        ),
      );
    } else if (mode === 2) {
      const n = randomInt(3, 9) * 2;
      const ans = n / 2;
      results.push(
        makeQuestion(
          'dyn-g5s1-u9',
          seed,
          i,
          `「${n} × 1/2」的結果與下列哪一個算式相同，且等於多少？`,
          buildStringOptions(`${n} ÷ 2 = ${ans}`, [
            `${n} × 2 = ${n * 2}`,
            `${n} ÷ 1/2 = ${n * 2}`,
            `${n} - 2 = ${n - 2}`,
          ]),
          `乘以 1/2 和除以 2 的結果完全相同：${n} × 1/2 = ${n} ÷ 2 = ${ans}。`,
          '把一個數變成原本的一半（× 1/2），就是除以 2！',
        ),
      );
    } else {
      const d = pickRandom([3, 4, 5, 6, 8]);
      const part = randomInt(3, 12);
      const total = d * part;
      results.push(
        makeQuestion(
          'dyn-g5s1-u9',
          seed,
          i,
          `一條彩帶長 ${total} 公尺，做美勞用去整條的 1/${d}，還剩下幾公尺？`,
          buildNumericOptions(
            total - part,
            [part, total - d, Math.max(1, total - part - 2)],
            ' 公尺',
          ),
          `先算用去的長度：${total} × 1/${d} = ${part} 公尺；剩下的長度 = ${total} - ${part} = ${total - part} 公尺。`,
          '題目問的是「還剩下幾公尺」，別忘了用全長減掉用去的長度喔！',
        ),
      );
    }
  }
  return results;
}

// ============================================================
// 五上 第1章：折線圖
// ============================================================
export function generateG5S1U1LineChart(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const results: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const built = buildStringOptions('一週每天的氣溫變化趨勢', [
        '班上同學最喜歡的寵物種類人數',
        '各班級捐出的二手書數量比較',
        '圖書館各類書籍的百分比構成',
      ]);
      results.push(
        makeQuestion(
          'dyn-g5s1-u1',
          seed,
          i,
          '下列哪一項統計資料「最適合」用「折線圖」來呈現？',
          built,
          '折線圖最適合呈現「數量隨時間連續變化的趨勢」，如氣溫、身高或每日銷量變化。',
          '找找看哪一個選項和「時間變化趨勢」有關！',
        ),
      );
    } else if (type === 1) {
      const base = randomInt(20, 26);
      const d1 = randomInt(2, 5);
      const d2 = randomInt(1, 3);
      const t2 = base + d1;
      const t3 = t2 + d2;
      const built = buildNumericOptions(d1, [d2, d1 + d2, t2], ' 度');
      results.push(
        makeQuestion(
          'dyn-g5s1-u1',
          seed,
          i,
          `氣溫折線圖顯示：上午 8 時 ${base} 度、上午 10 時 ${t2} 度、中午 12 時 ${t3} 度。哪一段時間的線段「比較陡峭（上升幅度較大）」，上升了幾度？`,
          built,
          `8 時到 10 時上升 ${t2} - ${base} = ${d1} 度；10 時到 12 時上升 ${t3} - ${t2} = ${d2} 度，較陡峭的上升了 ${d1} 度。`,
          '分別算出兩段時間的溫度差，較大的那一段折線更陡峭！',
        ),
      );
    } else {
      const v1 = randomInt(150, 250);
      const v2 = v1 + randomInt(30, 80);
      const built = buildStringOptions('先用「省略符號（波浪線）」省略 0 到一定數值之間的空白刻度，再設定適當間隔', [
        '把折線圖上的點全部塗掉只留數字',
        '故意把縱軸數字從大到小倒著寫',
        '不需要寫任何刻度單位，直接畫線就好',
      ]);
      results.push(
        makeQuestion(
          'dyn-g5s1-u1',
          seed,
          i,
          `當折線圖的數值都集中在 ${v1} 到 ${v2} 之間時，為了讓變化趨勢更清楚，畫縱軸時可以怎麼處理？`,
          built,
          '當資料數值都很大時，在縱軸下方畫上「省略符號（波浪線）」省略前面空白，能讓數據變化更明顯！',
          '想想看怎麼把 0 到最小值之間的空白縮短！',
        ),
      );
    }
  }
  return results;
}

// ============================================================
// 五上 第3章：平面圖形
// ============================================================
export function generateG5S1U3PlaneFigures(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const results: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const a = randomInt(4, 7);
      const b = randomInt(5, 8);
      const cGood = a + b - randomInt(2, 3);
      const good = `${a} 公分、${b} 公分、${cGood} 公分`;
      const built = buildStringOptions(good, [
        `${a} 公分、${b} 公分、${a + b} 公分`,
        `${a} 公分、${b} 公分、${a + b + 3} 公分`,
        `2 公分、${b} 公分、${b + 3} 公分`,
      ]);
      results.push(
        makeQuestion(
          'dyn-g5s1-u3',
          seed,
          i,
          '下列哪一組長度的木棒「可以」圍成一個三角形？',
          built,
          `三角形「任意兩邊之和大於第三邊」：${a} + ${b} = ${a + b} > ${cGood}，所以「${good}」可以圍成三角形。`,
          '檢查「較短兩邊加起來」有沒有「大於」最長的那一邊！',
        ),
      );
    } else if (type === 1) {
      const sides = pickRandom([
        { name: '五邊形', n: 5 },
        { name: '六邊形', n: 6 },
        { name: '八邊形', n: 8 },
      ]);
      const ans = (sides.n - 2) * 180;
      const built = buildNumericOptions(ans, [sides.n * 180, (sides.n - 1) * 180, 360], ' 度');
      results.push(
        makeQuestion(
          'dyn-g5s1-u3',
          seed,
          i,
          `把一個「${sides.name}」從同一個頂點畫對角線，可以分成 ${sides.n - 2} 個三角形。請問這個${sides.name}的內角和是多少度？`,
          built,
          `每個三角形內角和是 180 度，${sides.n - 2} 個三角形就是 180 × ${sides.n - 2} = ${ans} 度。`,
          `用分成的三角形個數 ${sides.n - 2} 乘以 180 度！`,
        ),
      );
    } else {
      const s = pickRandom([6, 8, 9, 10, 12]);
      const n = pickRandom([5, 6]);
      const ans = s * n;
      const built = buildNumericOptions(ans, [s * (n - 1), s * (n + 1), s + n], ' 公分');
      results.push(
        makeQuestion(
          'dyn-g5s1-u3',
          seed,
          i,
          `一個「正${n === 5 ? '五' : '六'}邊形」的每條邊長都是 ${s} 公分，請問它的周長是多少公分？`,
          built,
          `正${n === 5 ? '五' : '六'}邊形有 ${n} 條一樣長的邊，周長 = ${s} × ${n} = ${ans} 公分。`,
          `正多邊形的每條邊都一樣長，乘以邊數 ${n} 即可！`,
        ),
      );
    }
  }
  return results;
}

// ============================================================
// 五上 第5章：立體形體
// ============================================================
export function generateG5S1U5SolidFigures(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const results: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const built = buildStringOptions('互相垂直', ['互相平行', '互相重合', '沒有任何關係']);
      results.push(
        makeQuestion(
          'dyn-g5s1-u5',
          seed,
          i,
          '在長方體或正方體積木中，任意一個面與它的「相鄰面」（共用同一條邊的兩個面）之間，有什麼位置關係？',
          built,
          '長方體和正方體中，相鄰的面都「互相垂直」，相對的面則「互相平行」。',
          '觀察盒子的上面和側面，它們交接的地方是不是直角（垂直）？',
        ),
      );
    } else if (type === 1) {
      const item = pickRandom([
        { name: '五角柱', faces: 7, vertices: 10, edges: 15 },
        { name: '六角柱', faces: 8, vertices: 12, edges: 18 },
        { name: '四角錐', faces: 5, vertices: 5, edges: 8 },
        { name: '五角錐', faces: 6, vertices: 6, edges: 10 },
      ]);
      const ask = pickRandom(['面的個數', '頂點數', '邊數']);
      const ans = ask === '面的個數' ? item.faces : ask === '頂點數' ? item.vertices : item.edges;
      const built = buildNumericOptions(ans, [item.faces + 2, item.edges - 2, ans + 3], ' 個');
      results.push(
        makeQuestion(
          'dyn-g5s1-u5',
          seed,
          i,
          `請問一個「${item.name}」一共有幾個${ask === '面的個數' ? '面' : ask === '頂點數' ? '頂點' : '邊'}？`,
          built,
          `${item.name}共有 ${item.faces} 個面、${item.vertices} 個頂點、${item.edges} 條邊。`,
          '想一想角柱有上下兩個底面，角錐只有 1 個底面和 1 個尖頂點！',
        ),
      );
    } else {
      const s = randomInt(4, 12);
      const ans = s * 12;
      const built = buildNumericOptions(ans, [s * 6, s * 8, s * 4], ' 公分');
      results.push(
        makeQuestion(
          'dyn-g5s1-u5',
          seed,
          i,
          `一個正方體的邊長是 ${s} 公分，把它的所有邊長全部加起來，總邊長是多少公分？`,
          built,
          `正方體有 12 條一樣長的邊，總邊長 = ${s} × 12 = ${ans} 公分。`,
          '數一數正方體一共有幾條邊（上面 4 條、下面 4 條、直立 4 條）！',
        ),
      );
    }
  }
  return results;
}

// ============================================================
// 五上 第10章：扇形
// ============================================================
export function generateG5S1U10Sectors(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const results: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const built = buildStringOptions('兩條半徑和一段圓弧', [
        '兩條直徑和一條直線',
        '一條直徑和一段圓弧',
        '三條一樣長的線段',
      ]);
      results.push(
        makeQuestion(
          'dyn-g5s1-u10',
          seed,
          i,
          '「扇形」是由圓的哪些部分所圍成的圖形？',
          built,
          '扇形是由「兩條半徑」和「一段圓弧」所圍成的圖形，頂點就是圓心。',
          '想想看切披薩時，從圓心切兩刀（兩條半徑），外面是彎彎的圓弧！',
        ),
      );
    } else if (type === 1) {
      const denom = pickRandom([2, 3, 4, 5, 6, 8, 9, 10, 12]);
      const deg = 360 / denom;
      const built = buildNumericOptions(deg, [180 / denom, deg + 15, Math.max(10, deg - 15)], ' 度');
      results.push(
        makeQuestion(
          'dyn-g5s1-u10',
          seed,
          i,
          `一個「1/${denom} 圓」的扇形，它的圓心角是多少度？`,
          built,
          `整個圓的圓心角是 360 度，1/${denom} 圓的圓心角 = 360 ÷ ${denom} = ${deg} 度。`,
          `用周角 360 度除以分母 ${denom}！`,
        ),
      );
    } else {
      const deg = pickRandom([45, 60, 72, 90, 120, 180]);
      const denom = 360 / deg;
      const ans = `1/${denom} 圓`;
      const built = buildStringOptions(
        ans,
        [2, 3, 4, 5, 6, 8]
          .filter((d) => d !== denom)
          .slice(0, 3)
          .map((d) => `1/${d} 圓`),
      );
      results.push(
        makeQuestion(
          'dyn-g5s1-u10',
          seed,
          i,
          `一個扇形的圓心角是 ${deg} 度，這個扇形是幾分之幾圓？`,
          built,
          `${deg} ÷ 360 = 1/${denom}，所以是 ${ans}。`,
          `算算看 360 度除以 ${deg} 度等於幾等分！`,
        ),
      );
    }
  }
  return results;
}

