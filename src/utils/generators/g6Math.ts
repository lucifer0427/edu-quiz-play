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

/** 將放大 100 倍後的整數轉為最多兩位小數的乾淨字串（避免浮點誤差） */
function formatScaled100(scaled: number): string {
  const rounded = Math.round(scaled);
  const whole = Math.floor(rounded / 100);
  const frac = rounded % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, '0')}`;
}

function formatTenths(tenths: number): string {
  const rounded = Math.round(tenths);
  const whole = Math.floor(rounded / 10);
  const frac = rounded % 10;
  return frac === 0 ? String(whole) : `${whole}.${frac}`;
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
  const deltas = [-8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 10, 12];
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

function buildScaled100Options(
  answerScaled: number,
  extraScaled: number[] = [],
  unitSuffix = '',
): { options: [string, string, string, string]; answerIndex: number } {
  const answerStr = `${formatScaled100(answerScaled)}${unitSuffix}`;
  const set = new Set<string>([answerStr]);
  for (const c of extraScaled) {
    if (Number.isFinite(c) && c > 0) {
      const formatted = `${formatScaled100(c)}${unitSuffix}`;
      if (formatted !== answerStr && set.size < 4) {
        set.add(formatted);
      }
    }
  }
  const deltas = [-628, -314, -200, -100, -50, 50, 100, 200, 314, 628];
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    guard++;
    const candidate = answerScaled + pickRandom(deltas);
    if (candidate > 0) {
      set.add(`${formatScaled100(candidate)}${unitSuffix}`);
    }
  }
  let step = 100;
  while (set.size < 4) {
    set.add(`${formatScaled100(answerScaled + step)}${unitSuffix}`);
    step += 100;
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

/** 六上第1單元：最大公因數與最小公倍數 */
export function generateG6S1U1GcdLcm(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];
  const primesUnder20 = [2, 3, 5, 7, 11, 13, 17, 19];
  const compositesUnder30 = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 20 以內的質數辨識
      const targetPrime = pickRandom(primesUnder20);
      const poolComposites = shuffle(compositesUnder30.filter((n) => n <= 21));
      const distractors = ['1', ...poolComposites.slice(0, 3).map(String)];
      const built = buildStringOptions(String(targetPrime), shuffle(distractors).slice(0, 3));
      questions.push(
        makeQuestion(
          'g6s1-u1',
          seed,
          i,
          '下列哪一個數是「質數」？',
          built,
          `${targetPrime} 只有 1 和 ${targetPrime} 兩個因數，所以是質數。注意：1 既不是質數也不是合數。`,
          '質數是只有「1 和自己」兩個因數的大於 1 整數喔！',
        ),
      );
    } else if (mode === 1) {
      // 質因數分解表達式
      const triples: [number, string, string[]][] = [
        [24, '2×2×2×3', ['2×3×4', '2×2×6', '1×2×2×2×3']],
        [36, '2×2×3×3', ['2×3×6', '4×3×3', '2×2×9']],
        [45, '3×3×5', ['3×15', '5×9', '1×3×3×5']],
        [60, '2×2×3×5', ['2×5×6', '4×3×5', '2×2×15']],
        [72, '2×2×2×3×3', ['2×4×9', '2×2×2×9', '8×3×3']],
        [90, '2×3×3×5', ['2×5×9', '3×5×6', '2×3×15']],
        [84, '2×2×3×7', ['4×3×7', '2×6×7', '2×2×21']],
        [105, '3×5×7', ['5×21', '3×35', '1×3×5×7']],
      ];
      const [num, correctExpr, wrongExprs] = pickRandom(triples);
      const built = buildStringOptions(correctExpr, wrongExprs);
      questions.push(
        makeQuestion(
          'g6s1-u1',
          seed,
          i,
          `將 ${num} 做質因數分解，寫成標準連乘算式是哪一個？`,
          built,
          `質因數分解必須全部都是質數相乘（不能包含 1 或 4、6、9、15 等合數），${num} = ${correctExpr}。`,
          '檢查每個乘數是不是都是質數，而且不含 1！',
        ),
      );
    } else if (mode === 2) {
      // 互質判斷
      const basePairs: [number, number, number[]][] = [
        [8, 15, [10, 12, 14]],
        [9, 14, [12, 15, 18]],
        [12, 25, [14, 15, 18]],
        [10, 21, [12, 15, 25]],
        [14, 15, [16, 21, 28]],
        [16, 27, [18, 20, 24]],
      ];
      const [base, coprime, nonCoprimes] = pickRandom(basePairs);
      const built = buildNumericOptions(coprime, nonCoprimes);
      questions.push(
        makeQuestion(
          'g6s1-u1',
          seed,
          i,
          `下列哪一個數與 ${base}「互質」？`,
          built,
          `${base} 與 ${coprime} 的最大公因數是 1（沒有大於 1 的共同因數），所以兩數互質。`,
          `找找看哪一個選項和 ${base} 除了 1 以外沒有其他公因數！`,
        ),
      );
    } else {
      // 最大公因數或最小公倍數應用
      if (randomInt(0, 1) === 0) {
        const g = pickRandom([4, 6, 8, 9, 12]);
        const m1 = pickRandom([2, 3, 5]);
        let m2 = pickRandom([3, 4, 5, 7]);
        while (gcd(m1, m2) !== 1) m2++;
        const a = g * m1;
        const b = g * m2;
        const built = buildNumericOptions(g, [g * 2, Math.max(2, Math.floor(g / 2)), lcm(a, b)]);
        questions.push(
          makeQuestion(
            'g6s1-u1',
            seed,
            i,
            `老師準備了 ${a} 顆草莓和 ${b} 顆橘子，要平分裝進禮盒且兩種水果都剛好分完，最多可以裝成幾盒？`,
            built,
            `求最多可以分裝幾盒，就是求 ${a} 和 ${b} 的最大公因數：(${a}, ${b}) = ${g} 盒。`,
            '要將兩種東西剛好平分，盒子數要找它們的最大公因數！',
          ),
        );
      } else {
        const pairs: [number, number][] = [
          [6, 8],
          [8, 12],
          [9, 12],
          [10, 15],
          [12, 16],
          [12, 18],
          [14, 21],
        ];
        const [a, b] = pickRandom(pairs);
        const ans = lcm(a, b);
        const built = buildNumericOptions(ans, [gcd(a, b), a * b, ans * 2], ' 分鐘');
        questions.push(
          makeQuestion(
            'g6s1-u1',
            seed,
            i,
            `甲線公車每 ${a} 分鐘發一班車，乙線公車每 ${b} 分鐘發一班車。兩車同時在早上 8 點發車後，最少要經過幾分鐘會再次同時發車？`,
            built,
            `求再次同時發車的最短時間，就是求 ${a} 和 ${b} 的最小公倍數：[${a}, ${b}] = ${ans} 分鐘。`,
            '同時發車的時間要同時是兩班車間隔的倍數，找最小公倍數！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 六上第2單元：分數除法 */
export function generateG6S1U2FractionDiv(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 最簡分數判斷
      const irreducibles: [number, number][] = [
        [3, 7],
        [4, 9],
        [5, 12],
        [7, 15],
        [8, 15],
        [9, 16],
        [11, 18],
      ];
      const reducibles: [number, number][] = [
        [4, 10],
        [6, 15],
        [9, 12],
        [8, 14],
        [10, 25],
        [12, 18],
      ];
      const [an, ad] = pickRandom(irreducibles);
      const ans = `${an}/${ad}`;
      const wrongs = shuffle(reducibles)
        .slice(0, 3)
        .map(([wn, wd]) => `${wn}/${wd}`);
      const built = buildStringOptions(ans, wrongs);
      questions.push(
        makeQuestion(
          'g6s1-u2',
          seed,
          i,
          '下列哪一個分數已經是「最簡分數」？',
          built,
          `${an} 和 ${ad} 的最大公因數是 1（互質），不能再約分，所以 ${ans} 是最簡分數。`,
          '檢查分子和分母是不是「除了 1 以外沒有其他公因數」！',
        ),
      );
    } else if (mode === 1) {
      // 整數除以真分數（整除情境）
      const qVal = randomInt(2, 6);
      const den = pickRandom([3, 4, 5, 6, 7]);
      let num = randomInt(2, den - 1);
      while (gcd(num, den) !== 1) num = randomInt(2, den - 1);
      const total = qVal * num;
      // total ÷ (num/den) = qVal * den
      const ans = qVal * den;
      const wrong1 = Math.max(1, Math.floor((total * num) / den));
      const wrong2 = qVal * num;
      const built = buildNumericOptions(ans, [wrong1, wrong2, ans + den], ' 段');
      questions.push(
        makeQuestion(
          'g6s1-u2',
          seed,
          i,
          `一條長 ${total} 公尺的彩帶，每 ${num}/${den} 公尺剪成一段，全部可以剪成多少段？`,
          built,
          `${total} ÷ (${num}/${den}) = ${total} × (${den}/${num}) = ${ans} 段。`,
          '除以一個分數，等於乘以它的倒數（分子分母顛倒）喔！',
        ),
      );
    } else if (mode === 2) {
      // 分數除以分數（結果化簡為最簡分數）
      const d1 = pickRandom([3, 4, 5, 6, 8]);
      const n1 = randomInt(1, d1 - 1);
      const d2 = pickRandom([2, 3, 4, 5]);
      const n2 = randomInt(1, d2 - 1);
      const resN = n1 * d2;
      const resD = d1 * n2;
      const ans = formatFraction(resN, resD);
      const wrongMul = formatFraction(n1 * n2, d1 * d2);
      const wrongFlip = formatFraction(d1 * n2, n1 * d2);
      const wrongAdd = formatFraction(resN + 1, resD + 1);
      const distractors = [wrongMul, wrongFlip, wrongAdd].filter((x) => x !== ans);
      const built = buildStringOptions(ans, distractors);
      questions.push(
        makeQuestion(
          'g6s1-u2',
          seed,
          i,
          `計算 (${n1}/${d1}) ÷ (${n2}/${d2}) 的結果是多少？（以最簡分數或整數作答）`,
          built,
          `(${n1}/${d1}) ÷ (${n2}/${d2}) = (${n1}/${d1}) × (${d2}/${n2}) = ${resN}/${resD}，約分後為 ${ans}。`,
          '記得把「除號後面」的分數倒數過來變成乘法，最後要約成最簡分數！',
        ),
      );
    } else {
      // 商與被除數大小關係
      const base = `${randomInt(3, 8)}/${randomInt(9, 13)}`;
      const isGreater = randomInt(0, 1) === 0;
      if (isGreater) {
        const div = pickRandom(['2/3', '3/4', '4/5', '5/6', '1/2']);
        const built = buildStringOptions('大於被除數', [
          '小於被除數',
          '等於被除數',
          '一定是 1',
        ]);
        questions.push(
          makeQuestion(
            'g6s1-u2',
            seed,
            i,
            `算式 (${base}) ÷ (${div}) 的商和被除數 ${base} 比較，結果如何？`,
            built,
            `因為除數 ${div} 小於 1，正數除以小於 1 的正數，商會比原來的被除數大。`,
            '想一想：把一塊蛋糕切得比「1 份」還小塊，會分出比原來更多份還是更少份？',
          ),
        );
      } else {
        const div = pickRandom(['1 又 1/2', '1 又 2/3', '4/3', '5/4', '3/2']);
        const built = buildStringOptions('小於被除數', [
          '大於被除數',
          '等於被除數',
          '一定大於 1',
        ]);
        questions.push(
          makeQuestion(
            'g6s1-u2',
            seed,
            i,
            `算式 (${base}) ÷ (${div}) 的商和被除數 ${base} 比較，結果如何？`,
            built,
            `因為除數 ${div} 大於 1，正數除以大於 1 的數，商會比原來的被除數小。`,
            '先判斷除數大於 1 還是小於 1！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 六上第3單元：數量關係 */
export function generateG6S1U3NumberPatterns(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 植樹問題（兩端都種 vs 兩端都不種 vs 圓形封閉）
      const interval = pickRandom([4, 5, 6, 8, 10]);
      const gaps = randomInt(8, 16);
      const length = interval * gaps;
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const ans = gaps + 1;
        const built = buildNumericOptions(ans, [gaps, gaps - 1, ans + 2], ' 棵');
        questions.push(
          makeQuestion(
            'g6s1-u3',
            seed,
            i,
            `在長 ${length} 公尺的筆直道路一旁種樹，每隔 ${interval} 公尺種 1 棵，路的「兩端都種」，總共種了幾棵樹？`,
            built,
            `間隔數 = ${length} ÷ ${interval} = ${gaps} 個。兩端都種時，棵數 = 間隔數 + 1 = ${gaps} + 1 = ${ans} 棵。`,
            '先算出有幾個間隔，兩端都種記得要「+ 1」喔！',
          ),
        );
      } else if (variant === 1) {
        const ans = gaps - 1;
        const built = buildNumericOptions(ans, [gaps, gaps + 1, ans - 1], ' 盞');
        questions.push(
          makeQuestion(
            'g6s1-u3',
            seed,
            i,
            `在長 ${length} 公尺的走廊兩柱之間掛燈籠，每隔 ${interval} 公尺掛 1 盞，「兩端都不掛」，總共掛了幾盞燈籠？`,
            built,
            `間隔數 = ${length} ÷ ${interval} = ${gaps} 個。兩端都不掛時，數量 = 間隔數 - 1 = ${gaps} - 1 = ${ans} 盞。`,
            '兩端都不放時，數量會比間隔數少 1！',
          ),
        );
      } else {
        const ans = gaps;
        const built = buildNumericOptions(ans, [gaps + 1, gaps - 1, gaps + 2], ' 盆');
        questions.push(
          makeQuestion(
            'g6s1-u3',
            seed,
            i,
            `沿著圓周長 ${length} 公尺的圓形花圃周圍擺花盆，每隔 ${interval} 公尺擺 1 盆，總共要擺幾盆花？`,
            built,
            `封閉圖形（圓形）頭尾相接，盆數剛好等於間隔數 = ${length} ÷ ${interval} = ${ans} 盆。`,
            '圓形是頭尾相連的封閉圖形，數量跟間隔數一模一樣！',
          ),
        );
      }
    } else if (mode === 1) {
      // 火柴棒／圖形規律
      const n = randomInt(6, 15);
      if (randomInt(0, 1) === 0) {
        // 連排正方形：3n + 1
        const ans = 3 * n + 1;
        const built = buildNumericOptions(ans, [4 * n, 3 * n, 3 * n + 2], ' 根');
        questions.push(
          makeQuestion(
            'g6s1-u3',
            seed,
            i,
            `用吸管排成橫向相連的正方形：排 1 個正方形用 4 根、排 2 個用 7 根、排 3 個用 10 根……照這樣排 ${n} 個相連正方形需要幾根吸管？`,
            built,
            `第 1 個用 4 根，之後每多 1 個正方形多 3 根，所以是 1 + 3 × ${n} = ${ans} 根。`,
            '觀察每增加 1 個正方形，吸管都固定增加 3 根！',
          ),
        );
      } else {
        // 連排三角形：2n + 1
        const ans = 2 * n + 1;
        const built = buildNumericOptions(ans, [3 * n, 2 * n, 2 * n + 2], ' 根');
        questions.push(
          makeQuestion(
            'g6s1-u3',
            seed,
            i,
            `用小棒子排成橫向相連的正三角形：排 1 個用 3 根、排 2 個用 5 根、排 3 個用 7 根……排 ${n} 個相連正三角形共需幾根？`,
            built,
            `第 1 個用 3 根，之後每多 1 個三角形多 2 根，總共 1 + 2 × ${n} = ${ans} 根。`,
            '每次多排 1 個三角形只增加 2 根喔！',
          ),
        );
      }
    } else if (mode === 2) {
      // 和差問題
      const younger = randomInt(12, 35);
      const diff = pickRandom([6, 8, 10, 12, 14]);
      const older = younger + diff;
      const sum = older + younger;
      const askOlder = randomInt(0, 1) === 0;
      const ans = askOlder ? older : younger;
      const built = buildNumericOptions(
        ans,
        [askOlder ? younger : older, Math.floor(sum / 2), ans + 2],
        ' 顆',
      );
      questions.push(
        makeQuestion(
          'g6s1-u3',
          seed,
          i,
          `姊姊和弟弟共有 ${sum} 顆彈珠，姊姊比弟弟多 ${diff} 顆，請問${askOlder ? '姊姊' : '弟弟'}有多少顆彈珠？`,
          built,
          `較小數（弟弟）= (${sum} - ${diff}) ÷ 2 = ${younger} 顆；較大數（姊姊）= ${younger} + ${diff} = ${older} 顆。`,
          '把總數先減掉相差的數量再除以 2，就會得到比較少的那個人喔！',
        ),
      );
    } else {
      // 倍數與總和關係式
      const unit = randomInt(8, 25);
      const mult = pickRandom([3, 4, 5]);
      const sum = unit * (mult + 1);
      const built = buildNumericOptions(unit, [unit * mult, Math.floor(sum / mult), unit + 4], ' 元');
      questions.push(
        makeQuestion(
          'g6s1-u3',
          seed,
          i,
          `一本筆記本的價錢是一支原子筆的 ${mult} 倍，買 1 本筆記本和 1 支原子筆共花了 ${sum} 元，一支原子筆多少元？`,
          built,
          `把原子筆看成 1 份，筆記本就是 ${mult} 份，共 ${mult + 1} 份。${sum} ÷ (${mult} + 1) = ${unit} 元。`,
          `把原子筆當作 1 基準，全部合計是 1 + ${mult} 份！`,
        ),
      );
    }
  }
  return questions;
}

/** 六上第4單元：小數除法 */
export function generateG6S1U4DecimalDiv(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 整除的小數除法（使用整數 tenths 避免浮點誤差）
      const divTenths = pickRandom([4, 5, 6, 8, 12, 15, 25]);
      const quotTenths = pickRandom([12, 14, 15, 16, 18, 24, 25, 32, 35]);
      // dividend * 100 = divTenths * quotTenths
      const dividendScaled100 = divTenths * quotTenths;
      const divStr = formatTenths(divTenths);
      const dividendStr = formatScaled100(dividendScaled100);
      const quotStr = formatTenths(quotTenths);
      const built = buildScaled100Options(quotTenths * 10, [
        quotTenths,
        quotTenths * 100,
        quotTenths * 10 + 10,
      ]);
      questions.push(
        makeQuestion(
          'g6s1-u4',
          seed,
          i,
          `計算 ${dividendStr} ÷ ${divStr} 的商是多少？`,
          built,
          `將除數與被除數同時乘以 10 變成整數除法後計算，可得商為 ${quotStr}。`,
          '計算小數除法時，先把除數的小數點向右移成整數，被除數也向右移相同位數！',
        ),
      );
    } else if (mode === 1) {
      // 有餘數的小數除法（求整段數與餘數）
      const segTenths = pickRandom([6, 7, 8, 9, 12, 15]);
      const pieces = randomInt(3, 7);
      const remTenths = randomInt(1, segTenths - 1);
      const totalTenths = segTenths * pieces + remTenths;
      const totalStr = formatTenths(totalTenths);
      const segStr = formatTenths(segTenths);
      const remStr = formatTenths(remTenths);
      const askRemainder = randomInt(0, 1) === 0;

      if (askRemainder) {
        const built = buildScaled100Options(
          remTenths * 10,
          [remTenths, remTenths * 100, (remTenths + 1) * 10],
          ' 公尺',
        );
        questions.push(
          makeQuestion(
            'g6s1-u4',
            seed,
            i,
            `把一條長 ${totalStr} 公尺的繩子，每 ${segStr} 公尺剪成 1 段，盡量剪完後，還剩下多少公尺？`,
            built,
            `${totalStr} ÷ ${segStr} = ${pieces} 段……餘 ${remStr} 公尺（注意餘數的小數點要對齊「原來」被除數的小數點）。`,
            '餘數的小數點位置要看「原本被除數」的小數點，不要搞錯位數喔！',
          ),
        );
      } else {
        const built = buildNumericOptions(pieces, [pieces - 1, pieces + 1, pieces + 2], ' 瓶');
        questions.push(
          makeQuestion(
            'g6s1-u4',
            seed,
            i,
            `有 ${totalStr} 公升的果汁，每 ${segStr} 公升裝滿 1 瓶，最多可以裝滿幾瓶？`,
            built,
            `${totalStr} ÷ ${segStr} = ${pieces}……餘 ${remStr}，剩下的不夠裝滿 1 瓶，所以最多裝滿 ${pieces} 瓶。`,
            '問「最多裝滿幾瓶」，只要取商的整數部分喔！',
          ),
        );
      }
    } else if (mode === 2) {
      // 商與被除數的大小判斷
      const dividend = pickRandom(['4.8', '6.4', '9.6', '12.5']);
      const isSmallerThanOne = randomInt(0, 1) === 0;
      const divisors = isSmallerThanOne ? ['0.4', '0.6', '0.8'] : ['1.2', '1.6', '2.5'];
      const correctDiv = pickRandom(divisors);
      const wrongDivs = isSmallerThanOne
        ? ['1', '1.2', '2.5']
        : ['0.4', '0.8', '1'];
      const built = buildStringOptions(correctDiv, wrongDivs);
      questions.push(
        makeQuestion(
          'g6s1-u4',
          seed,
          i,
          isSmallerThanOne
            ? `下列哪一個算式的商會「大於」${dividend}？`
            : `下列哪一個算式的商會「小於」${dividend}？`,
          built,
          isSmallerThanOne
            ? `當除數小於 1（例如 ${correctDiv}）時，${dividend} ÷ ${correctDiv} 的商會比 ${dividend} 大。`
            : `當除數大於 1（例如 ${correctDiv}）時，${dividend} ÷ ${correctDiv} 的商會比 ${dividend} 小。`,
          '記住口訣：除以小於 1 的數會變大、除以大於 1 的數會變小！',
        ),
      );
    } else {
      // 被除數、除數同乘以 10/100 的商不變觀念
      const pairs: [string, string, string][] = [
        ['18.4', '0.4', '46'],
        ['25.2', '0.6', '42'],
        ['31.5', '0.9', '35'],
        ['43.2', '1.2', '36'],
      ];
      const [a, b, q] = pickRandom(pairs);
      const built = buildStringOptions(q, [
        String(Number(q) * 10),
        formatTenths(Number(q)),
        String(Number(q) / 10),
      ]);
      questions.push(
        makeQuestion(
          'g6s1-u4',
          seed,
          i,
          `已知 ${Math.round(Number(a) * 10)} ÷ ${Math.round(Number(b) * 10)} = ${q}，那麼 ${a} ÷ ${b} 的商是多少？`,
          built,
          `被除數和除數同時除以 10（小數點各向左移 1 位），商不變，依然是 ${q}。`,
          '被除數和除數一起縮小 10 倍，商會改變嗎？',
        ),
      );
    }
  }
  return questions;
}

/** 六上第5單元：比與比值 */
export function generateG6S1U5Ratio(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 求比值
      const a = randomInt(2, 12);
      let b = randomInt(3, 15);
      while (a === b) b = randomInt(3, 15);
      const ans = formatFraction(a, b);
      const inverted = formatFraction(b, a);
      const sumFrac = formatFraction(a, a + b);
      const alt = formatFraction(a + 1, b + 1);
      const distractors = [inverted, sumFrac, alt].filter((x) => x !== ans);
      const built = buildStringOptions(ans, distractors);
      questions.push(
        makeQuestion(
          'g6s1-u5',
          seed,
          i,
          `${a} : ${b} 的比值是多少？（以最簡分數或整數表示）`,
          built,
          `a : b 的比值是前項除以後項（a ÷ b），所以 ${a} : ${b} = ${a} ÷ ${b} = ${ans}。`,
          '比值就是「前項 ÷ 後項」，記得約分到最簡喔！',
        ),
      );
    } else if (mode === 1) {
      // 化簡最簡整數比
      const basePairs: [number, number][] = [
        [2, 3],
        [3, 4],
        [3, 5],
        [4, 5],
        [5, 6],
        [5, 7],
        [4, 7],
      ];
      const [sa, sb] = pickRandom(basePairs);
      const mult = pickRandom([3, 4, 5, 6, 8]);
      const ans = `${sa} : ${sb}`;
      const distractors = [`${sb} : ${sa}`, `${sa * 2} : ${sb * 2}`, `${sa + 1} : ${sb}`];
      const built = buildStringOptions(ans, distractors);
      questions.push(
        makeQuestion(
          'g6s1-u5',
          seed,
          i,
          `把 ${sa * mult} : ${sb * mult} 化簡成「最簡整數比」是多少？`,
          built,
          `${sa * mult} 和 ${sb * mult} 的最大公因數是 ${mult}，兩項同時除以 ${mult} 可得最簡整數比 ${ans}。`,
          '找出前項和後項的最大公因數，兩邊同時除以它！',
        ),
      );
    } else if (mode === 2) {
      // 比例式求未知數
      const a = randomInt(2, 7);
      let b = randomInt(3, 9);
      while (gcd(a, b) !== 1) b++;
      const k = randomInt(3, 8);
      const askSecond = randomInt(0, 1) === 0;
      if (askSecond) {
        const ans = b * k;
        const built = buildNumericOptions(ans, [a * k, b + k, ans + a]);
        questions.push(
          makeQuestion(
            'g6s1-u5',
            seed,
            i,
            `如果 ${a} : ${b} = ${a * k} : □，那麼 □ 裡應該填入哪一個數？`,
            built,
            `前項 ${a} 乘以 ${k} 變成 ${a * k}，後項 ${b} 也要乘以 ${k}，所以 □ = ${b} × ${k} = ${ans}。`,
            '看前項放大了幾倍，後項也要跟著放大同樣的倍數！',
          ),
        );
      } else {
        const ans = a * k;
        const built = buildNumericOptions(ans, [b * k, a + k, ans + b]);
        questions.push(
          makeQuestion(
            'g6s1-u5',
            seed,
            i,
            `如果 ${a} : ${b} = □ : ${b * k}，那麼 □ 裡應該填入哪一個數？`,
            built,
            `後項 ${b} 乘以 ${k} 變成 ${b * k}，前項 ${a} 也要乘以 ${k}，所以 □ = ${a} × ${k} = ${ans}。`,
            '看後項放大了幾倍，前項也要跟著放大同樣的倍數！',
          ),
        );
      }
    } else {
      // 依比分配應用題
      const a = randomInt(2, 5);
      let b = randomInt(2, 5);
      while (gcd(a, b) !== 1) b++;
      const k = randomInt(4, 12);
      const total = (a + b) * k;
      const ans = a * k;
      const built = buildNumericOptions(ans, [b * k, total / 2, ans + k], ' 公克');
      questions.push(
        makeQuestion(
          'g6s1-u5',
          seed,
          i,
          `調製一杯蜂蜜水時，蜂蜜和開水的重量比是 ${a} : ${b}。如果要調出總重 ${total} 公克的蜂蜜水，需要蜂蜜多少公克？`,
          built,
          `總份數 = ${a} + ${b} = ${a + b} 份，每份為 ${total} ÷ ${a + b} = ${k} 公克，蜂蜜佔 ${a} 份 = ${a} × ${k} = ${ans} 公克。`,
          `先把比例的兩項加起來算出總份數（${a} + ${b}），再求 1 份是多少公克！`,
        ),
      );
    }
  }
  return questions;
}

/** 六上第6單元：圓周長與扇形周長（圓周率以 3.14 計算） */
export function generateG6S1U6CirclePerimeter(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 已知直徑求圓周長
      const d = pickRandom([4, 5, 6, 8, 10, 12, 15, 20]);
      const ansScaled = d * 314;
      const built = buildScaled100Options(
        ansScaled,
        [(d / 2) * 314, d * 2 * 314, d * d * 314],
        ' 公分',
      );
      questions.push(
        makeQuestion(
          'g6s1-u6',
          seed,
          i,
          `一個直徑是 ${d} 公分的圓形盤子，它的圓周長大約是多少公分？（圓周率以 3.14 計算）`,
          built,
          `圓周長 = 直徑 × 3.14 = ${d} × 3.14 = ${formatScaled100(ansScaled)} 公分。`,
          '記得「圓周長 = 直徑 × 3.14」喔！',
        ),
      );
    } else if (mode === 1) {
      // 已知半徑求圓周長
      const r = pickRandom([3, 4, 5, 6, 7, 10, 15]);
      const d = r * 2;
      const ansScaled = d * 314;
      const built = buildScaled100Options(
        ansScaled,
        [r * 314, r * r * 314, (d + 2) * 314],
        ' 公分',
      );
      questions.push(
        makeQuestion(
          'g6s1-u6',
          seed,
          i,
          `一個半徑為 ${r} 公分的時鐘鐘面，它的圓周長大約是多少公分？（圓周率以 3.14 計算）`,
          built,
          `直徑 = ${r} × 2 = ${d} 公分，圓周長 = ${d} × 3.14 = ${formatScaled100(ansScaled)} 公分。`,
          '題目給的是「半徑」，記得要先乘以 2 變成直徑再乘 3.14！',
        ),
      );
    } else if (mode === 2) {
      // 已知圓周長求直徑或半徑
      const r = pickRandom([3, 4, 5, 6, 8, 10, 12, 15]);
      const d = r * 2;
      const circumferenceScaled = d * 314;
      const askRadius = randomInt(0, 1) === 0;
      const ans = askRadius ? r : d;
      const built = buildNumericOptions(ans, [askRadius ? d : r, ans + 2, ans + 4], ' 公分');
      questions.push(
        makeQuestion(
          'g6s1-u6',
          seed,
          i,
          `用一條長 ${formatScaled100(circumferenceScaled)} 公分的繩子剛好圍成一個圓，這個圓的「${askRadius ? '半徑' : '直徑'}」大約是多少公分？（圓周率以 3.14 計算）`,
          built,
          `直徑 = 圓周長 ÷ 3.14 = ${formatScaled100(circumferenceScaled)} ÷ 3.14 = ${d} 公分${askRadius ? `，半徑 = ${d} ÷ 2 = ${r} 公分` : ''}。`,
          `先把圓周長除以 3.14 算出直徑${askRadius ? '，再除以 2 就是半徑' : ''}！`,
        ),
      );
    } else {
      // 扇形周長（弧長 + 2條半徑）
      const cases: [number, number][] = [
        [6, 60],
        [4, 90],
        [8, 90],
        [10, 90],
        [6, 120],
        [9, 120],
        [5, 180],
        [10, 180],
        [8, 270],
      ];
      const [r, angle] = pickRandom(cases);
      const fracNum = angle / gcd(angle, 360);
      const fracDen = 360 / gcd(angle, 360);
      // arcScaled = 2 * r * 314 * fracNum / fracDen
      const arcScaled = (2 * r * 314 * fracNum) / fracDen;
      const perimScaled = arcScaled + 2 * r * 100;
      const built = buildScaled100Options(
        perimScaled,
        [arcScaled, arcScaled + r * 100, 2 * r * 314],
        ' 公分',
      );
      questions.push(
        makeQuestion(
          'g6s1-u6',
          seed,
          i,
          `一個半徑 ${r} 公分、圓心角 ${angle}° 的扇形，它的「周長」大約是多少公分？（圓周率以 3.14 計算）`,
          built,
          `弧長 = ${2 * r} × 3.14 × (${angle}/360) = ${formatScaled100(arcScaled)} 公分；扇形周長要加上兩條半徑：${formatScaled100(arcScaled)} + ${r} + ${r} = ${formatScaled100(perimScaled)} 公分。`,
          '扇形周長 = 弧長 + 兩條半徑，千萬不要漏掉兩條半徑！',
        ),
      );
    }
  }
  return questions;
}

/** 六上第7單元：圓面積與扇形面積（圓周率以 3.14 計算） */
export function generateG6S1U7CircleArea(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 已知半徑求圓面積
      const r = pickRandom([2, 3, 4, 5, 6, 8, 10]);
      const ansScaled = r * r * 314;
      const built = buildScaled100Options(
        ansScaled,
        [2 * r * 314, 2 * r * 2 * r * 314, r * 314],
        ' 平方公分',
      );
      questions.push(
        makeQuestion(
          'g6s1-u7',
          seed,
          i,
          `一個半徑是 ${r} 公分的圓形杯墊，面積大約是多少平方公分？（圓周率以 3.14 計算）`,
          built,
          `圓面積 = 半徑 × 半徑 × 3.14 = ${r} × ${r} × 3.14 = ${formatScaled100(ansScaled)} 平方公分。`,
          '記得「圓面積 = 半徑 × 半徑 × 3.14」喔！',
        ),
      );
    } else if (mode === 1) {
      // 已知直徑求圓面積
      const r = pickRandom([3, 4, 5, 6, 10]);
      const d = r * 2;
      const ansScaled = r * r * 314;
      const built = buildScaled100Options(
        ansScaled,
        [d * d * 314, d * 314, 2 * r * 314],
        ' 平方公分',
      );
      questions.push(
        makeQuestion(
          'g6s1-u7',
          seed,
          i,
          `一個直徑是 ${d} 公尺的圓形水池，水面面積大約是多少平方公尺？（圓周率以 3.14 計算）`,
          built,
          `先算半徑 = ${d} ÷ 2 = ${r} 公尺；圓面積 = ${r} × ${r} × 3.14 = ${formatScaled100(ansScaled)} 平方公尺。`,
          '題目給直徑，一定要先除以 2 算出半徑，才能代入半徑 × 半徑 × 3.14！',
        ),
      );
    } else if (mode === 2) {
      // 扇形面積
      const cases: [number, number][] = [
        [6, 60],
        [4, 90],
        [8, 90],
        [10, 90],
        [6, 120],
        [6, 180],
        [10, 180],
        [8, 270],
      ];
      const [r, angle] = pickRandom(cases);
      const fracNum = angle / gcd(angle, 360);
      const fracDen = 360 / gcd(angle, 360);
      const areaScaled = (r * r * 314 * fracNum) / fracDen;
      const built = buildScaled100Options(
        areaScaled,
        [r * r * 314, (2 * r * 314 * fracNum) / fracDen, areaScaled + 314],
        ' 平方公分',
      );
      questions.push(
        makeQuestion(
          'g6s1-u7',
          seed,
          i,
          `一個半徑 ${r} 公分、圓心角 ${angle}° 的扇形，面積大約是多少平方公分？（圓周率以 3.14 計算）`,
          built,
          `扇形面積 = ${r} × ${r} × 3.14 × (${angle}/360) = ${formatScaled100(areaScaled)} 平方公分。`,
          `算出整個圓的面積後，再乘以這個扇形占全圓的幾分之幾（${angle}/360）！`,
        ),
      );
    } else {
      // 圓環面積（同心圓）
      const innerR = pickRandom([3, 4, 5, 6]);
      const outerR = innerR + pickRandom([2, 3, 4]);
      const ansScaled = (outerR * outerR - innerR * innerR) * 314;
      const built = buildScaled100Options(
        ansScaled,
        [
          (outerR - innerR) * (outerR - innerR) * 314,
          outerR * outerR * 314,
          (outerR + innerR) * 314,
        ],
        ' 平方公尺',
      );
      questions.push(
        makeQuestion(
          'g6s1-u7',
          seed,
          i,
          `一個圓形花壇半徑 ${innerR} 公尺，周圍鋪了一條使外圍大圓半徑變成 ${outerR} 公尺的環形步道，這條步道的面積大約是多少平方公尺？（圓周率以 3.14 計算）`,
          built,
          `環形面積 = 大圓面積 - 小圓面積 = (${outerR}×${outerR} - ${innerR}×${innerR}) × 3.14 = ${formatScaled100(ansScaled)} 平方公尺。`,
          '用外圍大圓的面積減掉裡面花壇小圓的面積！',
        ),
      );
    }
  }
  return questions;
}

/** 六上第8單元：認識速率 */
export function generateG6S1U8Speed(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 已知距離與時間求速率
      const speed = pickRandom([45, 50, 60, 72, 80, 90, 120]);
      const hours = randomInt(2, 5);
      const dist = speed * hours;
      const built = buildNumericOptions(
        speed,
        [speed + 10, Math.max(10, speed - 10), dist],
        ' 公里/時',
      );
      questions.push(
        makeQuestion(
          'g6s1-u8',
          seed,
          i,
          `一輛汽車在高速公路上行駛 ${hours} 小時，總共走了 ${dist} 公里，這輛汽車的平均時速是多少？`,
          built,
          `速率 = 距離 ÷ 時間 = ${dist} ÷ ${hours} = ${speed} 公里/時。`,
          '想一想：速率就是「1 小時走多少距離」，用距離除以時間！',
        ),
      );
    } else if (mode === 1) {
      // 已知速率與時間求距離，或已知距離與速率求時間
      if (randomInt(0, 1) === 0) {
        const speed = pickRandom([60, 75, 80, 120, 150, 200]);
        const mins = pickRandom([8, 10, 12, 15, 20]);
        const dist = speed * mins;
        const built = buildNumericOptions(
          dist,
          [speed + mins, Math.floor(dist / 2), dist + speed],
          ' 公尺',
        );
        questions.push(
          makeQuestion(
            'g6s1-u8',
            seed,
            i,
            `小華走路的分速是 ${speed} 公尺，他用相同的速率走了 ${mins} 分鐘，共走了多少公尺？`,
            built,
            `距離 = 速率 × 時間 = ${speed} × ${mins} = ${dist} 公尺。`,
            '每分鐘走這麼多公尺，乘以走的分鐘數就是總距離！',
          ),
        );
      } else {
        const speed = pickRandom([50, 60, 75, 80, 90]);
        const time = randomInt(3, 8);
        const dist = speed * time;
        const built = buildNumericOptions(time, [time + 1, time - 1, time + 2], ' 小時');
        questions.push(
          makeQuestion(
            'g6s1-u8',
            seed,
            i,
            `一艘渡輪的時速是 ${speed} 公里，行駛 ${dist} 公里需要幾小時？`,
            built,
            `時間 = 距離 ÷ 速率 = ${dist} ÷ ${speed} = ${time} 小時。`,
            '用總距離除以每小時走的距離（速率），就能求出需要的時間！',
          ),
        );
      }
    } else if (mode === 2) {
      // 速率單位換算（秒速 ↔ 分速 ↔ 時速）
      const variant = randomInt(0, 1);
      if (variant === 0) {
        // m/s -> km/h (5的倍數，乘以 3.6 得整數)
        const ms = pickRandom([5, 10, 15, 20, 25, 30]);
        const kmh = (ms * 36) / 10;
        const built = buildNumericOptions(kmh, [ms * 60, ms * 3, kmh + 18], ' 公里/時');
        questions.push(
          makeQuestion(
            'g6s1-u8',
            seed,
            i,
            `捷運列車的秒速是 ${ms} 公尺，換算成時速是多少公里？`,
            built,
            `1 小時 = 3600 秒，${ms} × 3600 = ${ms * 3600} 公尺 = ${kmh} 公里，所以時速是 ${kmh} 公里/時。`,
            '先把 1 秒的距離乘以 3600 算出 1 小時走幾公尺，再除以 1000 換成公里！',
          ),
        );
      } else {
        // m/min -> m/s
        const ms = pickRandom([8, 12, 15, 18, 25, 40]);
        const mmin = ms * 60;
        const built = buildNumericOptions(ms, [mmin * 60, Math.floor(mmin / 10), ms + 5], ' 公尺/秒');
        questions.push(
          makeQuestion(
            'g6s1-u8',
            seed,
            i,
            `自行車選手的分速是 ${mmin} 公尺，換算成秒速是多少公尺？`,
            built,
            `1 分鐘 = 60 秒，每秒鐘走的距離 = ${mmin} ÷ 60 = ${ms} 公尺/秒。`,
            '1 分鐘有 60 秒，把 1 分鐘走的距離除以 60 就好！',
          ),
        );
      }
    } else {
      // 來回平均速率（總距離 ÷ 總時間）
      const cases: [number, number, number, number][] = [
        // dist, t1, t2, avg
        [12, 2, 4, 4], // total 24 / 6 = 4
        [18, 2, 4, 6], // total 36 / 6 = 6
        [24, 3, 5, 6], // total 48 / 8 = 6
        [30, 2, 3, 12], // total 60 / 5 = 12
        [40, 2, 6, 10], // total 80 / 8 = 10
      ];
      const [dist, t1, t2, avg] = pickRandom(cases);
      const upSpeed = dist / t1;
      const downSpeed = dist / t2;
      const arithAvg = Math.floor((upSpeed + downSpeed) / 2);
      const built = buildNumericOptions(
        avg,
        [arithAvg !== avg ? arithAvg : avg + 2, upSpeed, downSpeed],
        ' 公里/時',
      );
      questions.push(
        makeQuestion(
          'g6s1-u8',
          seed,
          i,
          `小美走山路上山距離 ${dist} 公里花了 ${t1} 小時，沿原路下山花了 ${t2} 小時。她上、下山全程的平均時速是多少？`,
          built,
          `全程平均速率 = 總距離 ÷ 總時間 = (${dist} × 2) ÷ (${t1} + ${t2}) = ${dist * 2} ÷ ${t1 + t2} = ${avg} 公里/時。`,
          '平均速率不能把兩個速率直接相加除以 2，必須用「總距離 ÷ 總時間」！',
        ),
      );
    }
  }
  return questions;
}

/** 六上第9單元：放大圖、縮圖與比例尺 */
export function generateG6S1U9Scale(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 放大圖／縮圖邊長與對應角性質
      const angle = pickRandom([45, 60, 75, 90, 120]);
      const factor = pickRandom([2, 3, 4]);
      const built = buildNumericOptions(
        angle,
        [angle * factor, Math.max(15, Math.floor(angle / factor)), 180 - angle],
        ' 度',
      );
      questions.push(
        makeQuestion(
          'g6s1-u9',
          seed,
          i,
          `一個三角形裡面有一個角是 ${angle} 度，把它畫成「${factor} 倍放大圖」後，放大圖中對應的這個角是幾度？`,
          built,
          `圖形在放大或縮小時，對應邊長會按比例縮放，但「對應角的大小完全不變」，依然是 ${angle} 度。`,
          '把三角形放大 3 倍，形狀沒變，角度會跟著變大嗎？',
        ),
      );
    } else if (mode === 1) {
      // 面積縮放倍數
      const factor = pickRandom([2, 3, 4, 5]);
      const ans = factor * factor;
      const built = buildNumericOptions(ans, [factor, factor * 2, ans + factor], ' 倍');
      questions.push(
        makeQuestion(
          'g6s1-u9',
          seed,
          i,
          `將一個長方形畫成邊長為原來的 ${factor} 倍放大圖，放大圖的「面積」會是原圖的幾倍？`,
          built,
          `長和寬都變成原來的 ${factor} 倍，面積 = 長 × 寬，所以面積會變成 ${factor} × ${factor} = ${ans} 倍。`,
          '長放大幾倍、寬也放大幾倍，乘起來後面積會放大幾倍呢？',
        ),
      );
    } else if (mode === 2) {
      // 比例尺：圖上距離 → 實際距離（公尺或公里）
      const scales: [number, number, string, number][] = [
        // denom, factorToUnit(cm per target unit), unitLabel, sampleMapCm
        [1000, 100, '公尺', randomInt(4, 15)],
        [2000, 100, '公尺', randomInt(3, 12)],
        [5000, 100, '公尺', randomInt(2, 10)],
        [10000, 100, '公尺', randomInt(2, 9)],
        [50000, 100000, '公里', pickRandom([2, 4, 6, 8, 10])],
        [100000, 100000, '公里', randomInt(2, 9)],
      ];
      const [denom, unitFactor, unitLabel, mapCm] = pickRandom(scales);
      const realCm = mapCm * denom;
      const ans = realCm / unitFactor;
      const built = buildNumericOptions(
        ans,
        [ans * 10, Math.max(1, Math.floor(ans / 10)), ans + 5],
        ` ${unitLabel}`,
      );
      questions.push(
        makeQuestion(
          'g6s1-u9',
          seed,
          i,
          `在一張比例尺 1 : ${denom.toLocaleString('en-US')} 的地圖上，兩地相距 ${mapCm} 公分，實際距離是多少${unitLabel}？`,
          built,
          `實際距離 = ${mapCm} × ${denom.toLocaleString('en-US')} = ${realCm.toLocaleString('en-US')} 公分，換算成${unitLabel}為 ${ans} ${unitLabel}。`,
          '先用圖上公分數乘以比例尺分母算出實際公分數，再換成公尺（÷100）或公里（÷100000）！',
        ),
      );
    } else {
      // 給實際距離與圖上距離求比例尺 1 : N
      const mapCm = pickRandom([2, 3, 4, 5]);
      const realMeters = mapCm * pickRandom([10, 20, 50, 100, 200]);
      const realCm = realMeters * 100;
      const denom = realCm / mapCm;
      const ans = `1 : ${denom}`;
      const distractors = [
        `1 : ${Math.floor(denom / 100)}`,
        `1 : ${denom * 10}`,
        `1 : ${Math.floor(denom / 10)}`,
      ];
      const built = buildStringOptions(ans, distractors);
      questions.push(
        makeQuestion(
          'g6s1-u9',
          seed,
          i,
          `實際長 ${realMeters} 公尺的公園步道，在地圖上只畫成 ${mapCm} 公分，這張地圖的比例尺是多少？`,
          built,
          `先統一單位為公分：${realMeters} 公尺 = ${realCm} 公分。比例尺 = ${mapCm} : ${realCm} = ${ans}。`,
          '求比例尺時，一定要先把「公尺換成公分」（× 100）使兩邊單位相同再約分！',
        ),
      );
    }
  }
  return questions;
}

/** 六下第1單元：小數與分數的計算（四則混合與分配律簡化計算） */
export function generateG6S2U1MixedOps(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 小數與分數四則混合計算
      if (randomInt(0, 1) === 0) {
        const decPairs: [string, number, number][] = [
          ['0.25', 1, 4],
          ['0.5', 1, 2],
          ['0.75', 3, 4],
          ['0.2', 1, 5],
          ['0.4', 2, 5],
          ['0.6', 3, 5],
          ['0.8', 4, 5],
          ['1.2', 6, 5],
          ['1.5', 3, 2],
        ];
        const frac1: [number, number][] = [
          [1, 2],
          [1, 3],
          [2, 3],
          [3, 4],
          [2, 5],
          [3, 5],
          [5, 6],
        ];
        const frac2: [number, number][] = [
          [1, 2],
          [2, 3],
          [3, 4],
          [2, 5],
          [4, 5],
          [1, 3],
        ];
        const [decStr, dn, dd] = pickRandom(decPairs);
        const [n1, d1] = pickRandom(frac1);
        const [n2, d2] = pickRandom(frac2);

        const prodN = n1 * n2;
        const prodD = d1 * d2;
        const ansN = dn * prodD + prodN * dd;
        const ansD = dd * prodD;
        const [sn, sd] = simplifyFraction(ansN, ansD);
        const ans = formatFraction(sn, sd);

        const wrongLeftToRight = formatFraction((dn * d1 + n1 * dd) * n2, dd * d1 * d2);
        const distractors = [
          wrongLeftToRight,
          formatFraction(sn + 1, sd),
          formatFraction(sn + 2, sd),
          formatFraction(sn + 3, sd),
        ].filter((x) => x !== ans);
        const built = buildStringOptions(ans, distractors);
        questions.push(
          makeQuestion(
            'g6s2-u1',
            seed,
            i,
            `計算 ${decStr} + (${n1}/${d1}) × (${n2}/${d2}) 的結果是多少？（以最簡分數或整數作答）`,
            built,
            `先算乘法：(${n1}/${d1}) × (${n2}/${d2}) = ${formatFraction(prodN, prodD)}；再把 ${decStr} 換成 ${dn}/${dd} 相加，得 ${ans}。`,
            '記得「先乘除後加減」，並把小數換成分數再通分計算！',
          ),
        );
      } else {
        const decPairs: [string, number, number][] = [
          ['0.75', 3, 4],
          ['0.8', 4, 5],
          ['1.2', 6, 5],
          ['1.5', 3, 2],
          ['1.25', 5, 4],
        ];
        const frac1: [number, number][] = [
          [1, 2],
          [2, 3],
          [3, 4],
          [3, 5],
          [5, 6],
        ];
        const frac2: [number, number][] = [
          [1, 4],
          [1, 5],
          [1, 3],
          [2, 5],
          [1, 2],
        ];
        const [decStr, dn, dd] = pickRandom(decPairs);
        const [n1, d1] = pickRandom(frac1);
        const [n2, d2] = pickRandom(frac2);

        const qn = dn * d1;
        const qd = dd * n1;
        const ansN = qn * d2 - n2 * qd;
        const ansD = qd * d2;
        const [sn, sd] = simplifyFraction(ansN, ansD);
        const ans = formatFraction(sn, sd);

        const wrongAdd = formatFraction(qn * d2 + n2 * qd, qd * d2);
        const distractors = [
          wrongAdd,
          formatFraction(sn + 1, sd),
          formatFraction(sn + 2, sd),
          formatFraction(sn + 3, sd),
        ].filter((x) => x !== ans);
        const built = buildStringOptions(ans, distractors);
        questions.push(
          makeQuestion(
            'g6s2-u1',
            seed,
            i,
            `計算 ${decStr} ÷ (${n1}/${d1}) - (${n2}/${d2}) 的結果是多少？（以最簡分數或整數作答）`,
            built,
            `先把 ${decStr} 換成 ${dn}/${dd}，除以 ${n1}/${d1} 等於乘以 ${d1}/${n1}，得 ${formatFraction(qn, qd)}；再減掉 ${n2}/${d2}，結果為 ${ans}。`,
            '先乘除後加減，除以分數記得要乘以它的倒數喔！',
          ),
        );
      }
    } else if (mode === 1) {
      // 分配律簡化計算
      if (randomInt(0, 1) === 0) {
        const isAdd = randomInt(0, 1) === 0;
        const cScaled = pickRandom([125, 250, 350, 450, 750, 1250]);
        const cStr = formatScaled100(cScaled);
        const ansScaled = 10 * cScaled;
        if (isAdd) {
          const aTenths = pickRandom([24, 32, 37, 45, 56, 63, 72, 84]);
          const bTenths = 100 - aTenths;
          const built = buildScaled100Options(ansScaled, [
            cScaled,
            100 * cScaled,
            ansScaled + cScaled,
          ]);
          questions.push(
            makeQuestion(
              'g6s2-u1',
              seed,
              i,
              `利用分配律簡化計算：${formatTenths(aTenths)} × ${cStr} + ${formatTenths(bTenths)} × ${cStr} = ？`,
              built,
              `提出公因數 ${cStr}：(${formatTenths(aTenths)} + ${formatTenths(bTenths)}) × ${cStr} = 10 × ${cStr} = ${formatScaled100(ansScaled)}。`,
              `兩邊都有「× ${cStr}」，試著把前面的小數加起來！`,
            ),
          );
        } else {
          const bTenths = pickRandom([26, 35, 42, 58, 64, 73]);
          const aTenths = bTenths + 100;
          const built = buildScaled100Options(ansScaled, [
            cScaled,
            100 * cScaled,
            ansScaled + cScaled,
          ]);
          questions.push(
            makeQuestion(
              'g6s2-u1',
              seed,
              i,
              `利用分配律簡化計算：${formatTenths(aTenths)} × ${cStr} - ${formatTenths(bTenths)} × ${cStr} = ？`,
              built,
              `提出公因數 ${cStr}：(${formatTenths(aTenths)} - ${formatTenths(bTenths)}) × ${cStr} = 10 × ${cStr} = ${formatScaled100(ansScaled)}。`,
              `把前面兩個小數先相減，再乘以共同的 ${cStr}！`,
            ),
          );
        }
      } else {
        const d = pickRandom([5, 7, 8, 9]);
        let n1 = randomInt(1, d - 1);
        while (gcd(n1, d) !== 1) n1 = randomInt(1, d - 1);
        const n2 = d - n1;
        const k = pickRandom([13, 17, 23, 29, 34, 46]);
        const ans = 2 * k;
        const built = buildNumericOptions(ans, [k, 3 * k, ans + d]);
        questions.push(
          makeQuestion(
            'g6s2-u1',
            seed,
            i,
            `利用分配律簡化計算：(1 又 ${n1}/${d}) × ${k} + (${n2}/${d}) × ${k} = ？`,
            built,
            `提出公因數 ${k}：(1 又 ${n1}/${d} + ${n2}/${d}) × ${k} = 2 × ${k} = ${ans}。`,
            `先把兩個分數 (1 又 ${n1}/${d}) 和 (${n2}/${d}) 加起來看看是不是整數！`,
          ),
        );
      }
    } else if (mode === 2) {
      // 二到三步驟應用問題（小數與分數混合）
      if (randomInt(0, 1) === 0) {
        const d = pickRandom([3, 4, 5]);
        let n = randomInt(1, d - 1);
        while (gcd(n, d) !== 1) n = randomInt(1, d - 1);
        const cups = pickRandom([2, 3]);
        const unitScaled = pickRandom([10, 15, 20, 25]);
        const totalScaled = unitScaled * d * cups;
        const remScaled = unitScaled * (d - n) * cups;
        const ansScaled = unitScaled * (d - n);
        const drunkPerCupScaled = unitScaled * n;

        const built = buildScaled100Options(
          ansScaled,
          [drunkPerCupScaled, remScaled, unitScaled * d],
          ' 公升',
        );
        questions.push(
          makeQuestion(
            'g6s2-u1',
            seed,
            i,
            `一瓶果汁有 ${formatScaled100(totalScaled)} 公升，小傑喝了其中的 ${n}/${d} 後，把剩下的果汁平分倒進 ${cups} 個杯子裡，每個杯子裡有多少公升果汁？`,
            built,
            `剩下的果汁佔 1 - ${n}/${d} = ${d - n}/${d}，共 ${formatScaled100(totalScaled)} × (${d - n}/${d}) = ${formatScaled100(remScaled)} 公升；平分倒進 ${cups} 杯，每杯有 ${formatScaled100(remScaled)} ÷ ${cups} = ${formatScaled100(ansScaled)} 公升。`,
            '先算出「剩下」多少公升，再除以杯子數量！',
          ),
        );
      } else {
        const priceA = pickRandom([60, 80, 100, 120]);
        const kgATenths = pickRandom([12, 15, 18, 25]);
        const priceB = pickRandom([40, 60, 80, 120]);
        const [wn, wd] = pickRandom([
          [1, 2],
          [1, 4],
          [3, 4],
          [2, 5],
        ]);
        const costA = (priceA * kgATenths) / 10;
        const costB = (priceB * wn) / wd;
        const totalCost = costA + costB;
        const change = 500 - totalCost;
        const built = buildNumericOptions(
          change,
          [totalCost, 500 - costA, 500 - (priceA + priceB)],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g6s2-u1',
            seed,
            i,
            `媽媽到水果行買了每公斤 ${priceA} 元的蘋果 ${formatTenths(kgATenths)} 公斤，又買了每公斤 ${priceB} 元的芭樂 ${wn}/${wd} 公斤，她付一張 500 元鈔票，可以找回多少元？`,
            built,
            `蘋果花費 = ${priceA} × ${formatTenths(kgATenths)} = ${costA} 元，芭樂花費 = ${priceB} × (${wn}/${wd}) = ${costB} 元，合計 ${totalCost} 元；找回 500 - ${totalCost} = ${change} 元。`,
            '分別算出兩種水果的價錢相加，再用 500 元去減！',
          ),
        );
      }
    } else {
      // 連除計算規律與概數估算
      if (randomInt(0, 1) === 0) {
        const cases: [string, number, number][] = [
          ['0.25', 4, 10],
          ['0.5', 2, 10],
          ['0.2', 5, 10],
          ['0.125', 8, 10],
          ['1.25', 8, 100],
          ['2.5', 4, 100],
          ['0.25', 8, 20],
          ['0.5', 4, 20],
        ];
        const [bStr, cNum, prodTenths] = pickRandom(cases);
        const a = pickRandom([24, 36, 48, 54, 64, 72, 84, 96]);
        const ansScaled = (a * 1000) / prodTenths;
        const prodStr = formatTenths(prodTenths);
        const built = buildScaled100Options(ansScaled, [
          prodTenths === 10 ? a * 1000 : a * 100,
          prodTenths === 10 ? a * 200 : ansScaled * 10,
          ansScaled + 100,
        ]);
        questions.push(
          makeQuestion(
            'g6s2-u1',
            seed,
            i,
            `利用計算規律簡化算式：${a} ÷ ${bStr} ÷ ${cNum} = ？`,
            built,
            `連除兩數等於除以這兩數的積：${a} ÷ (${bStr} × ${cNum}) = ${a} ÷ ${prodStr} = ${formatScaled100(ansScaled)}。`,
            `先把後面的兩個除數「${bStr} × ${cNum}」乘起來再除，會非常好算喔！`,
          ),
        );
      } else {
        const pCases: [string, number][] = [
          ['19.8', 20],
          ['29.9', 30],
          ['39.7', 40],
          ['49.8', 50],
          ['59.9', 60],
        ];
        const qCases: [string, number][] = [
          ['4.9', 5],
          ['5.1', 5],
          ['7.9', 8],
          ['8.2', 8],
          ['9.8', 10],
        ];
        const [pStr, pRound] = pickRandom(pCases);
        const [qStr, qRound] = pickRandom(qCases);
        const ans = pRound * qRound;
        const built = buildNumericOptions(ans, [
          (pRound - 1) * qRound,
          pRound * (qRound + 1),
          (pRound - 1) * (qRound - 1),
        ]);
        questions.push(
          makeQuestion(
            'g6s2-u1',
            seed,
            i,
            `將算式 ${pStr} × ${qStr} 的兩個數都先用「四捨五入法」取概數到個位後，再相乘估算的結果大約是多少？`,
            built,
            `${pStr} 四捨五入到個位約為 ${pRound}，${qStr} 四捨五入到個位約為 ${qRound}，估算乘積 = ${pRound} × ${qRound} = ${ans}。`,
            '先把兩個小數各自四捨五入取整數，再相乘！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 六下第2單元：速率的應用（相向相遇、同向追趕、順流逆流船速） */
export function generateG6S2U2SpeedApps(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 相向相遇問題
      if (randomInt(0, 1) === 0) {
        const v1 = pickRandom([40, 45, 50, 60]);
        let v2 = pickRandom([50, 55, 60, 70]);
        while (v2 === v1) v2 = pickRandom([50, 55, 60, 70]);
        const t = randomInt(2, 5);
        const dist = (v1 + v2) * t;
        const built = buildNumericOptions(
          t,
          [t + 1, t + 2, Math.max(1, Math.floor(dist / v1))],
          ' 小時',
        );
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `甲、乙兩地相距 ${dist} 公里，A 車以時速 ${v1} 公里從甲地出發，同時 B 車以時速 ${v2} 公里從乙地出發，兩車相向而行，幾小時後會相遇？`,
            built,
            `相向而行每小時靠近的距離 = ${v1} + ${v2} = ${v1 + v2} 公里；相遇時間 = ${dist} ÷ ${v1 + v2} = ${t} 小時。`,
            '兩車相向而行，1 小時合計縮短「兩車時速相加」的距離！',
          ),
        );
      } else {
        const v1 = pickRandom([55, 60, 65, 70, 75]);
        const v2 = pickRandom([45, 50, 55, 65, 80]);
        const t = pickRandom([8, 10, 12, 15]);
        const dist = (v1 + v2) * t;
        const diffDist = Math.abs(v1 - v2) * t || v1 * t + 100;
        const built = buildNumericOptions(dist, [diffDist, v1 * t, v2 * t], ' 公尺');
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `小明和小華分別從筆直步道的兩端同時相向慢跑，小明分速 ${v1} 公尺，小華分速 ${v2} 公尺，經過 ${t} 分鐘後兩人相遇，這條步道全長多少公尺？`,
            built,
            `兩人每分鐘共靠近 ${v1} + ${v2} = ${v1 + v2} 公尺，總距離 = (${v1} + ${v2}) × ${t} = ${dist} 公尺。`,
            '把兩人的速率加起來，再乘以相遇經過的時間！',
          ),
        );
      }
    } else if (mode === 1) {
      // 同向追趕問題
      if (randomInt(0, 1) === 0) {
        const vSlow = pickRandom([45, 50, 60, 70]);
        const diff = pickRandom([15, 20, 25, 30]);
        const vFast = vSlow + diff;
        const t = pickRandom([4, 5, 6, 8, 10]);
        const dist = diff * t;
        const built = buildNumericOptions(
          t,
          [Math.max(1, Math.round(dist / (vFast + vSlow))), t + 2, t + 4],
          ' 分鐘',
        );
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `在筆直的跑道上，弟弟在前面距離哥哥 ${dist} 公尺處以分速 ${vSlow} 公尺前進，哥哥以分速 ${vFast} 公尺從後方同向追趕，幾分鐘後哥哥會追上弟弟？`,
            built,
            `同向追趕時，哥哥每分鐘追近 ${vFast} - ${vSlow} = ${diff} 公尺；追上時間 = ${dist} ÷ ${diff} = ${t} 分鐘。`,
            '同向追趕要先用「快車速率 - 慢車速率」算出每分鐘追近多少公尺！',
          ),
        );
      } else {
        const cases: [number, number, number, number][] = [
          [60, 80, 3, 9],
          [50, 75, 4, 8],
          [60, 90, 2, 4],
          [60, 90, 3, 6],
          [40, 60, 5, 10],
          [80, 100, 2, 8],
          [45, 60, 4, 12],
        ];
        const [vSlow, vFast, tLead, ansT] = pickRandom(cases);
        const leadDist = vSlow * tLead;
        const diff = vFast - vSlow;
        const built = buildNumericOptions(
          ansT,
          [ansT + tLead, Math.max(1, Math.floor(leadDist / vFast)), ansT + 2],
          ' 分鐘',
        );
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `弟弟以分速 ${vSlow} 公尺先出發走了 ${tLead} 分鐘後，哥哥才從同一地點以分速 ${vFast} 公尺同向追趕，哥哥出發幾分鐘後會追上弟弟？`,
            built,
            `弟弟先走了 ${vSlow} × ${tLead} = ${leadDist} 公尺；哥哥每分鐘追近 ${vFast} - ${vSlow} = ${diff} 公尺，所以需 ${leadDist} ÷ ${diff} = ${ansT} 分鐘追上。`,
            '先算出弟弟領先了多少公尺，再除以兩人每分鐘的速率差！',
          ),
        );
      }
    } else if (mode === 2) {
      // 順流逆流船速問題
      if (randomInt(0, 1) === 0) {
        const vBoat = pickRandom([14, 16, 18, 20, 22]);
        const vWater = pickRandom([2, 3, 4, 5]);
        const isDown = randomInt(0, 1) === 0;
        const effSpeed = isDown ? vBoat + vWater : vBoat - vWater;
        const oppSpeed = isDown ? vBoat - vWater : vBoat + vWater;
        const t = randomInt(2, 5);
        const dist = effSpeed * t;
        const built = buildNumericOptions(
          t,
          [t + 1, Math.max(1, Math.round(dist / vBoat)), Math.max(1, Math.round(dist / oppSpeed))],
          ' 小時',
        );
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `一艘遊艇在靜水中的時速是 ${vBoat} 公里，河水流速是時速 ${vWater} 公里。這艘遊艇「${isDown ? '順流而下' : '逆流而上'}」行駛 ${dist} 公里，需要幾小時？`,
            built,
            `${isDown ? '順流船速 = 靜水船速 + 水速' : '逆流船速 = 靜水船速 - 水速'} = ${vBoat} ${isDown ? '+' : '-'} ${vWater} = ${effSpeed} 公里/時；時間 = ${dist} ÷ ${effSpeed} = ${t} 小時。`,
            isDown
              ? '順流時水流會幫忙推船，船速 = 靜水船速 + 水速！'
              : '逆流時水流會阻擋船，船速 = 靜水船速 - 水速！',
          ),
        );
      } else {
        const vBoat = pickRandom([15, 16, 18, 20, 22, 24]);
        const vWater = pickRandom([2, 3, 4, 5, 6]);
        const vDown = vBoat + vWater;
        const vUp = vBoat - vWater;
        const askBoat = randomInt(0, 1) === 0;
        const ans = askBoat ? vBoat : vWater;
        const built = buildNumericOptions(
          ans,
          [askBoat ? vWater : vBoat, vDown - vUp, vDown + vUp],
          ' 公里/時',
        );
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `一艘渡輪順流而下的時速是 ${vDown} 公里，逆流而上的時速是 ${vUp} 公里，請問「${askBoat ? '渡輪靜水船速' : '水流時速'}」是多少？`,
            built,
            askBoat
              ? `靜水船速 = (順流船速 + 逆流船速) ÷ 2 = (${vDown} + ${vUp}) ÷ 2 = ${vBoat} 公里/時。`
              : `水流時速 = (順流船速 - 逆流船速) ÷ 2 = (${vDown} - ${vUp}) ÷ 2 = ${vWater} 公里/時。`,
            askBoat
              ? '順流速率與逆流速率相加除以 2，就是靜水船速！'
              : '順流速率減去逆流速率會得到 2 倍的水速，再除以 2 就是水速！',
          ),
        );
      }
    } else {
      // 兩段路程平均速率或單位換算比較
      if (randomInt(0, 1) === 0) {
        const avg = pickRandom([45, 50, 60, 65]);
        const t1 = pickRandom([2, 3]);
        const t2 = pickRandom([2, 3]);
        const delta = pickRandom([4, 5, 6]);
        const v1 = avg + delta * t2;
        const v2 = avg - delta * t1;
        const d1 = v1 * t1;
        const d2 = v2 * t2;
        const arithAvg = Math.floor((v1 + v2) / 2);
        const built = buildNumericOptions(
          avg,
          [arithAvg !== avg ? arithAvg : avg + 5, v1, v2],
          ' 公里/時',
        );
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `爸爸開車出遊，前半段花了 ${t1} 小時行駛 ${d1} 公里，後半段花了 ${t2} 小時行駛 ${d2} 公里，全程的平均時速是多少？`,
            built,
            `全程平均速率 = 總距離 ÷ 總時間 = (${d1} + ${d2}) ÷ (${t1} + ${t2}) = ${d1 + d2} ÷ ${t1 + t2} = ${avg} 公里/時。`,
            '平均速率一定要用「兩段總距離相加 ÷ 兩段總時間相加」！',
          ),
        );
      } else {
        const ms = pickRandom([10, 15, 20, 25]);
        const kmhA = (ms * 36) / 10;
        let kmhB = pickRandom([40, 48, 60, 66, 80]);
        while (kmhB === kmhA) kmhB = pickRandom([40, 48, 60, 66, 80]);
        const hours = pickRandom([2, 3]);
        const diffKmh = Math.abs(kmhA - kmhB);
        const ans = diffKmh * hours;
        const built = buildNumericOptions(
          ans,
          [(kmhA + kmhB) * hours, kmhA * hours, diffKmh],
          ' 公里',
        );
        questions.push(
          makeQuestion(
            'g6s2-u2',
            seed,
            i,
            `捷運秒速是 ${ms} 公尺，汽車時速是 ${kmhB} 公里。兩車同時從起點同方向行駛 ${hours} 小時後，兩車相距多少公里？`,
            built,
            `先統一單位：秒速 ${ms} 公尺 = ${ms} × 3600 ÷ 1000 = ${kmhA} 公里/時；每小時相距 ${diffKmh} 公里，${hours} 小時後相距 ${diffKmh} × ${hours} = ${ans} 公里。`,
            '先把秒速乘以 3.6 換算成時速（公里/時），再求時間內的距離差！',
          ),
        );
      }
    }
  }
  return questions;
}

/** 六下第3單元：柱體體積與表面積（三角柱、長方柱、圓柱，圓周率以 3.14 計算） */
export function generateG6S2U3PrismCylinder(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 三角柱體積或表面積
      if (randomInt(0, 1) === 0) {
        const b = pickRandom([6, 8, 10, 12, 14]);
        const hTri = pickRandom([4, 5, 6, 7, 8, 9]);
        const hPrism = pickRandom([8, 10, 12, 15]);
        const baseArea = (b * hTri) / 2;
        const vol = baseArea * hPrism;
        const built = buildNumericOptions(
          vol,
          [b * hTri * hPrism, baseArea + hPrism, vol + baseArea],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g6s2-u3',
            seed,
            i,
            `一個三角柱的底面是底 ${b} 公分、高 ${hTri} 公分的三角形，柱體的高是 ${hPrism} 公分，這個三角柱的體積是多少立方公分？`,
            built,
            `底面積 = ${b} × ${hTri} ÷ 2 = ${baseArea} 平方公分；三角柱體積 = 底面積 × 柱高 = ${baseArea} × ${hPrism} = ${vol} 立方公分。`,
            '先算三角形底面積（底 × 高 ÷ 2），再乘以柱體的高！',
          ),
        );
      } else {
        const triples: [number, number, number][] = [
          [3, 4, 5],
          [6, 8, 10],
          [5, 12, 13],
          [9, 12, 15],
          [8, 15, 17],
        ];
        const [a, b, c] = pickRandom(triples);
        const h = pickRandom([6, 8, 10, 12, 14]);
        const baseArea = (a * b) / 2;
        const twoBases = a * b;
        const lateral = (a + b + c) * h;
        const surface = twoBases + lateral;
        const built = buildNumericOptions(
          surface,
          [baseArea + lateral, lateral, baseArea * h !== surface ? baseArea * h : surface + twoBases],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g6s2-u3',
            seed,
            i,
            `一個直角三角柱的底面三邊長分別是 ${a} 公分、${b} 公分、${c} 公分（兩股為 ${a} 公分和 ${b} 公分），柱體高 ${h} 公分，這個三角柱的「表面積」是多少平方公分？`,
            built,
            `兩個底面積 = (${a} × ${b} ÷ 2) × 2 = ${twoBases} 平方公分；側面積 = (${a} + ${b} + ${c}) × ${h} = ${lateral} 平方公分；表面積 = ${twoBases} + ${lateral} = ${surface} 平方公分。`,
            '柱體表面積 = 兩個底面積 + 底面周長 × 柱高！',
          ),
        );
      }
    } else if (mode === 1) {
      // 長方柱表面積與梯形柱體積
      if (randomInt(0, 1) === 0) {
        const l = pickRandom([6, 8, 10, 12]);
        let w = pickRandom([4, 5, 6, 7]);
        while (w === l) w = pickRandom([4, 5, 6, 7]);
        const h = pickRandom([5, 8, 9, 10]);
        const halfSurf = l * w + w * h + h * l;
        const surface = 2 * halfSurf;
        const vol = l * w * h;
        const built = buildNumericOptions(
          surface,
          [halfSurf, vol !== surface ? vol : surface + 20, 2 * l * w + (l + w) * h],
          ' 平方公分',
        );
        questions.push(
          makeQuestion(
            'g6s2-u3',
            seed,
            i,
            `一個長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的長方體柱體禮盒，它的「表面積」是多少平方公分？`,
            built,
            `表面積 = (${l}×${w} + ${w}×${h} + ${h}×${l}) × 2 = ${halfSurf} × 2 = ${surface} 平方公分。`,
            '長方體有 6 個面，算出前面、上面、右面三個面的面積相加再乘以 2！',
          ),
        );
      } else {
        const u = pickRandom([4, 5, 6, 8]);
        const d = pickRandom([10, 12, 14, 16]);
        const ht = pickRandom([4, 6, 8]);
        const hp = pickRandom([6, 8, 10, 12]);
        const baseArea = ((u + d) * ht) / 2;
        const vol = baseArea * hp;
        const built = buildNumericOptions(
          vol,
          [(u + d) * ht * hp, u * d * hp, baseArea + hp],
          ' 立方公分',
        );
        questions.push(
          makeQuestion(
            'g6s2-u3',
            seed,
            i,
            `一個四角柱的底面是上底 ${u} 公分、下底 ${d} 公分、高 ${ht} 公分的梯形，柱體的高是 ${hp} 公分，體積是多少立方公分？`,
            built,
            `梯形底面積 = (${u} + ${d}) × ${ht} ÷ 2 = ${baseArea} 平方公分；柱體體積 = ${baseArea} × ${hp} = ${vol} 立方公分。`,
            '柱體體積通通都是「底面積 × 柱高」，先把梯形底面積算出來！',
          ),
        );
      }
    } else if (mode === 2) {
      // 圓柱體積（圓周率 3.14）
      const askDiameter = randomInt(0, 1) === 0;
      const r = pickRandom([2, 3, 4, 5, 6]);
      const d = r * 2;
      const h = pickRandom([5, 6, 8, 10, 12]);
      const volScaled = r * r * 314 * h;
      const built = buildScaled100Options(
        volScaled,
        [
          askDiameter ? d * d * 314 * h : 2 * r * 314 * h,
          d * 314 * h,
          r * r * 314,
        ],
        ' 立方公分',
      );
      questions.push(
        makeQuestion(
          'g6s2-u3',
          seed,
          i,
          askDiameter
            ? `一個底面直徑 ${d} 公分、柱高 ${h} 公分的圓柱體罐頭，體積大約是多少立方公分？（圓周率以 3.14 計算）`
            : `一個底面半徑 ${r} 公分、柱高 ${h} 公分的圓柱體積木，體積大約是多少立方公分？（圓周率以 3.14 計算）`,
          built,
          `${askDiameter ? `半徑 = ${d} ÷ 2 = ${r} 公分；` : ''}底面積 = ${r} × ${r} × 3.14 = ${formatScaled100(r * r * 314)} 平方公分，體積 = ${formatScaled100(r * r * 314)} × ${h} = ${formatScaled100(volScaled)} 立方公分。`,
          askDiameter
            ? '題目給直徑，記得先除以 2 換成半徑，再算「半徑 × 半徑 × 3.14 × 柱高」！'
            : '圓柱體積 = 底面圓面積（半徑 × 半徑 × 3.14）× 柱高！',
        ),
      );
    } else {
      // 圓柱表面積（圓周率 3.14）
      const askDiameter = randomInt(0, 1) === 0;
      const r = pickRandom([2, 3, 4, 5, 6]);
      const d = r * 2;
      const h = pickRandom([5, 7, 8, 10, 12]);
      const oneBaseScaled = r * r * 314;
      const twoBasesScaled = 2 * oneBaseScaled;
      const lateralScaled = d * 314 * h;
      const surfaceScaled = twoBasesScaled + lateralScaled;
      const built = buildScaled100Options(
        surfaceScaled,
        [oneBaseScaled + lateralScaled, lateralScaled, twoBasesScaled + r * 314 * h],
        ' 平方公分',
      );
      questions.push(
        makeQuestion(
          'g6s2-u3',
          seed,
          i,
          askDiameter
            ? `一個底面直徑 ${d} 公分、柱高 ${h} 公分的圓柱體紙筒，它的「表面積」大約是多少平方公分？（圓周率以 3.14 計算）`
            : `一個底面半徑 ${r} 公分、柱高 ${h} 公分的圓柱體模型，它的「表面積」大約是多少平方公分？（圓周率以 3.14 計算）`,
          built,
          `${askDiameter ? `半徑 = ${d} ÷ 2 = ${r} 公分；` : ''}兩個底圓面積 = ${r} × ${r} × 3.14 × 2 = ${formatScaled100(twoBasesScaled)} 平方公分；側面積 = ${d} × 3.14 × ${h} = ${formatScaled100(lateralScaled)} 平方公分；表面積合計 = ${formatScaled100(surfaceScaled)} 平方公分。`,
          '圓柱表面積包含「上、下兩個圓形底面」加上「長方形側面（底面圓周長 × 柱高）」！',
        ),
      );
    }
  }
  return questions;
}

/** 六下第4單元：基準量與比較量（母子和、母子差、比值應用） */
export function generateG6S2U4BaseComparison(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 基本基準量與比較量關係
      if (randomInt(0, 1) === 0) {
        const base = pickRandom([120, 150, 180, 200, 240, 300]);
        const [rStr, rTenths] = pickRandom<[string, number]>([
          ['0.6', 6],
          ['0.8', 8],
          ['1.2', 12],
          ['1.5', 15],
          ['1.8', 18],
        ]);
        const ans = (base * rTenths) / 10;
        const built = buildNumericOptions(
          ans,
          [Math.max(10, Math.round((base * 10) / rTenths)), base + rTenths, ans + base / 10],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `小美有 ${base} 元，哥哥的錢是小美的 ${rStr} 倍（把小美的錢當作基準量 1），哥哥有多少元？`,
            built,
            `比較量 = 基準量 × 比值 = ${base} × ${rStr} = ${ans} 元。`,
            '已知基準量和比值，求比較量要用乘法！',
          ),
        );
      } else {
        const [wn, wd] = pickRandom<[number, number]>([
          [2, 3],
          [3, 4],
          [3, 5],
          [4, 5],
          [5, 4],
        ]);
        const k = pickRandom([12, 15, 20, 24, 30]);
        const base = wd * k;
        const comp = wn * k;
        const built = buildNumericOptions(
          base,
          [Math.max(5, Math.round((comp * wn) / wd)), comp + base, base + wd * 4],
          ' 公分',
        );
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `紅彩帶長 ${comp} 公分，紅彩帶的長度是藍彩帶的 ${wn}/${wd} 倍，請問藍彩帶長多少公分？`,
            built,
            `把藍彩帶當作基準量 1，基準量 = 比較量 ÷ 比值 = ${comp} ÷ (${wn}/${wd}) = ${comp} × (${wd}/${wn}) = ${base} 公分。`,
            '題目給的是比較量和比值，要求基準量（1倍），要用除法喔！',
          ),
        );
      }
    } else if (mode === 1) {
      // 母子和問題
      if (randomInt(0, 1) === 0) {
        const rTenths = pickRandom([6, 8, 12, 14, 15, 16]);
        const rStr = formatTenths(rTenths);
        const base = pickRandom([150, 200, 250, 300, 400]);
        const comp = (base * rTenths) / 10;
        const total = base + comp;
        const askBase = randomInt(0, 1) === 0;
        const ans = askBase ? base : comp;
        const built = buildNumericOptions(
          ans,
          [askBase ? comp : base, Math.max(20, Math.round((total * 10) / rTenths)), ans + 50],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `一件外套和一條長褲共賣 ${total} 元，已知長褲的價錢是外套的 ${rStr} 倍，請問${askBase ? '外套' : '長褲'}是多少元？`,
            built,
            `把外套當作基準量 1，兩者共佔 1 + ${rStr} = ${formatTenths(10 + rTenths)} 倍；外套 = ${total} ÷ ${formatTenths(10 + rTenths)} = ${base} 元，長褲 = ${base} × ${rStr} = ${comp} 元。`,
            `先把總價錢除以 (1 + ${rStr}) 算出基準量（外套）的價錢！`,
          ),
        );
      } else {
        const [wn, wd] = pickRandom<[number, number]>([
          [2, 3],
          [3, 4],
          [2, 5],
          [3, 5],
          [4, 5],
        ]);
        const k = pickRandom([8, 10, 12, 15, 20]);
        const base = wd * k;
        const comp = wn * k;
        const total = (wd + wn) * k;
        const built = buildNumericOptions(
          base,
          [comp, Math.max(5, Math.round((total * wn) / wd)), base + k],
          ' 本',
        );
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `書櫃裡故事書和漫畫書共有 ${total} 本，故事書的數量是漫畫書的 ${wn}/${wd}，漫畫書有幾本？`,
            built,
            `把漫畫書當作基準量 1，總共佔 1 + ${wn}/${wd} = ${wd + wn}/${wd}；漫畫書 = ${total} ÷ (${wd + wn}/${wd}) = ${base} 本。`,
            `先求出總數佔基準量的「1 + ${wn}/${wd}」倍，再用總數除以這個倍數！`,
          ),
        );
      }
    } else if (mode === 2) {
      // 母子差問題
      if (randomInt(0, 1) === 0) {
        const rHundredths = pickRandom([125, 140, 150, 160, 175]);
        const rStr = formatScaled100(rHundredths);
        const base = pickRandom([40, 60, 80, 100, 120]);
        const comp = (base * rHundredths) / 100;
        const diff = comp - base;
        const built = buildNumericOptions(
          base,
          [
            comp,
            Math.max(5, Math.round((diff * 100) / rHundredths)),
            Math.max(5, Math.round((diff * 100) / (rHundredths + 100))),
          ],
          ' 公升',
        );
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `大水桶的容量是小水桶的 ${rStr} 倍，已知大水桶比小水桶多裝 ${diff} 公升，小水桶能裝多少公升？`,
            built,
            `把小水桶當作基準量 1，兩桶相差 ${rStr} - 1 = ${formatScaled100(rHundredths - 100)} 倍；小水桶 = ${diff} ÷ ${formatScaled100(rHundredths - 100)} = ${base} 公升。`,
            `相差的量對應到 (${rStr} - 1) 倍，用相差的公升數除以倍數差！`,
          ),
        );
      } else {
        const [discountLabel, rateHundredths] = pickRandom<[string, number]>([
          ['七五折', 75],
          ['八折', 80],
          ['八五折', 85],
          ['七折', 70],
        ]);
        const base = pickRandom([400, 600, 800, 1000, 1200, 1600]);
        const diff = (base * (100 - rateHundredths)) / 100;
        const salePrice = base - diff;
        const rateStr = formatScaled100(rateHundredths);
        const diffRateStr = formatScaled100(100 - rateHundredths);
        const built = buildNumericOptions(
          base,
          [salePrice, Math.max(20, Math.round((diff * 100) / rateHundredths)), base + diff],
          ' 元',
        );
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `一件球衣按原定價打${discountLabel}出售，結果比原定價便宜了 ${diff} 元，這件球衣的原定價是多少元？`,
            built,
            `打${discountLabel}就是原定價的 ${rateStr} 倍，便宜了 1 - ${rateStr} = ${diffRateStr} 倍；原定價 = ${diff} ÷ ${diffRateStr} = ${base} 元。`,
            `便宜的錢佔原定價的 (1 - ${rateStr}) 倍，用便宜的錢除以這個差值倍數！`,
          ),
        );
      }
    } else {
      // 交換基準與加成應用
      if (randomInt(0, 1) === 0) {
        const pairs: [number, number][] = [
          [2, 3],
          [3, 4],
          [3, 5],
          [4, 5],
          [5, 4],
          [5, 3],
          [4, 3],
        ];
        const [n, d] = pickRandom(pairs);
        const ans = formatFraction(d, n);
        const distractors = [
          formatFraction(n, d),
          formatFraction(n, n + d),
          formatFraction(d, n + d),
          formatFraction(d + 1, n),
          formatFraction(d + 2, n),
        ].filter((x) => x !== ans);
        const built = buildStringOptions(ans, distractors);
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `已知甲是乙的 ${n}/${d} 倍；如果交換基準，把「甲」當作基準量 1，那麼乙是甲的幾倍？（以最簡分數作答）`,
            built,
            `若乙為 1，則甲為 ${n}/${d}；反過來以甲為基準量 1 時，乙是甲的 1 ÷ (${n}/${d}) = ${ans} 倍。`,
            '把基準量和比較量交換時，新的倍數會變成原本倍數的「倒數」！',
          ),
        );
      } else {
        const base = pickRandom([200, 300, 400, 500, 600, 800]);
        const [pctLabel, pct] = pickRandom<[string, number]>([
          ['一成（10%）', 10],
          ['一成五（15%）', 15],
          ['兩成（20%）', 20],
        ]);
        const fee = (base * pct) / 100;
        const total = base + fee;
        const built = buildNumericOptions(total, [fee, base - fee, total + base / 10], ' 元');
        questions.push(
          makeQuestion(
            'g6s2-u4',
            seed,
            i,
            `一家餐廳餐點定價 ${base} 元，結帳時要另外加收${pctLabel}服務費，總共要付多少元？`,
            built,
            `總金額 = 基準量 × (1 + ${pct}%) = ${base} + ${fee} = ${total} 元。`,
            `服務費是原價的 ${pct}%，最後總價是原價的 (1 + ${pct}%) 倍！`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 六下第5單元：怎樣解題（雞兔同籠、年齡問題、間隔與規律） */
export function generateG6S2U5ProblemSolving(count = 6): Question[] {
  const seed = Date.now() + randomInt(1, 9999);
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      // 雞兔同籠問題
      if (randomInt(0, 1) === 0) {
        const chickens = randomInt(5, 16);
        let rabbits = randomInt(4, 15);
        while (rabbits === chickens) rabbits = randomInt(4, 15);
        const heads = chickens + rabbits;
        const legs = 2 * chickens + 4 * rabbits;
        const askRabbit = randomInt(0, 1) === 0;
        const ans = askRabbit ? rabbits : chickens;
        const built = buildNumericOptions(
          ans,
          [askRabbit ? chickens : rabbits, Math.floor(legs / 4), ans + 2],
          ' 隻',
        );
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `農場裡有雞和兔子共 ${heads} 隻，牠們一共有 ${legs} 隻腳，請問農場裡有幾隻${askRabbit ? '兔子' : '雞'}？`,
            built,
            `假設全部都是雞，共有 ${heads} × 2 = ${heads * 2} 隻腳，少了 ${legs} - ${heads * 2} = ${legs - heads * 2} 隻腳；每把 1 隻雞換成兔子多 2 隻腳，所以兔子 = ${rabbits} 隻、雞 = ${chickens} 隻。`,
            '先假設全部都是雞（或全都是兔），算出腳數差再除以每隻相差的 2 隻腳！',
          ),
        );
      } else {
        const c5 = randomInt(4, 14);
        let c10 = randomInt(5, 15);
        while (c10 === c5) c10 = randomInt(5, 15);
        const totalCoins = c5 + c10;
        const totalMoney = 5 * c5 + 10 * c10;
        const ask10 = randomInt(0, 1) === 0;
        const ans = ask10 ? c10 : c5;
        const built = buildNumericOptions(
          ans,
          [ask10 ? c5 : c10, Math.floor(totalMoney / 10), ans + 3],
          ' 個',
        );
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `存錢筒裡有 5 元和 10 元硬幣共 ${totalCoins} 個，總金額是 ${totalMoney} 元，請問 ${ask10 ? '10 元' : '5 元'}硬幣有幾個？`,
            built,
            `假設全部都是 5 元硬幣共 ${totalCoins * 5} 元，差了 ${totalMoney - totalCoins * 5} 元；每換成 1 個 10 元多 5 元，所以 10 元有 ${c10} 個、5 元有 ${c5} 個。`,
            '假設全部都是 5 元硬幣，用總金額差除以每個硬幣相差的 5 元！',
          ),
        );
      }
    } else if (mode === 1) {
      // 年齡問題
      if (randomInt(0, 1) === 0) {
        const k = pickRandom([2, 3, 4]);
        const kidFuture = pickRandom([11, 12, 14, 15, 16, 18]);
        const momFuture = k * kidFuture;
        const years = randomInt(3, 6);
        const kidNow = kidFuture - years;
        const momNow = momFuture - years;
        const diff = momNow - kidNow;
        const built = buildNumericOptions(
          years,
          [years + 2, Math.max(1, years - 2), Math.floor(momNow / k)],
          ' 年',
        );
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `今年媽媽 ${momNow} 歲，小琪 ${kidNow} 歲，再過幾年後，媽媽的年齡會剛好是小琪的 ${k} 倍？`,
            built,
            `兩人的年齡差永遠不變：${momNow} - ${kidNow} = ${diff} 歲。當媽媽是小琪的 ${k} 倍時，兩人相差 ${k - 1} 倍，所以小琪那時是 ${diff} ÷ ${k - 1} = ${kidFuture} 歲，需經過 ${kidFuture} - ${kidNow} = ${years} 年。`,
            '不管經過幾年，兩人的「年齡差」永遠不變，先算出年齡差！',
          ),
        );
      } else {
        const k = pickRandom([3, 4, 5]);
        const kidPast = pickRandom([5, 6, 7, 8, 9]);
        const momPast = k * kidPast;
        const yearsAgo = randomInt(2, 5);
        const kidNow = kidPast + yearsAgo;
        const momNow = momPast + yearsAgo;
        const diff = momNow - kidNow;
        const built = buildNumericOptions(
          yearsAgo,
          [yearsAgo + 2, yearsAgo * 2, yearsAgo + 3],
          ' 年',
        );
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `今年爸爸 ${momNow} 歲，小宇 ${kidNow} 歲，幾年前爸爸的年齡剛好是小宇的 ${k} 倍？`,
            built,
            `年齡差 = ${momNow} - ${kidNow} = ${diff} 歲。爸爸是小宇的 ${k} 倍時，相差 ${k - 1} 倍，小宇當時是 ${diff} ÷ ${k - 1} = ${kidPast} 歲，是 ${kidNow} - ${kidPast} = ${yearsAgo} 年前。`,
            '利用「年齡差不變」，先算出當時小宇是幾歲！',
          ),
        );
      }
    } else if (mode === 2) {
      // 間隔與方陣問題
      if (randomInt(0, 1) === 0) {
        const timePerCut = pickRandom([3, 4, 5, 6]);
        const pieces1 = pickRandom([3, 4, 5]);
        const cuts1 = pieces1 - 1;
        const totalMins = cuts1 * timePerCut;
        const pieces2 = pickRandom([6, 7, 8, 9, 10]);
        const cuts2 = pieces2 - 1;
        const ans = cuts2 * timePerCut;
        const built = buildNumericOptions(
          ans,
          [Math.round((totalMins * pieces2) / pieces1), pieces2 * timePerCut, ans + timePerCut],
          ' 分鐘',
        );
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `木工把一根長木頭鋸成 ${pieces1} 段花了 ${totalMins} 分鐘（每次鋸斷的時間相同）。如果要把同一種木頭鋸成 ${pieces2} 段，共需要幾分鐘？`,
            built,
            `鋸成 ${pieces1} 段只需鋸 ${cuts1} 次，每次需要 ${totalMins} ÷ ${cuts1} = ${timePerCut} 分鐘；鋸成 ${pieces2} 段要鋸 ${cuts2} 次，共需 ${cuts2} × ${timePerCut} = ${ans} 分鐘。`,
            '注意：把木頭鋸成 N 段，只需要鋸「N - 1」次喔！',
          ),
        );
      } else {
        const n = pickRandom([6, 7, 8, 9, 10, 12, 15]);
        const ans = 4 * (n - 1);
        const built = buildNumericOptions(ans, [4 * n, 4 * (n - 2), 4 * n + 4], ' 盆');
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `園丁把花盆排成一個「每邊都有 ${n} 盆」的正方形外框（四個頂點都要擺放），全部共需要幾盆花？`,
            built,
            `正方形的 4 個頂點會被重複計算，所以每邊少算 1 個頂點：(${n} - 1) × 4 = ${ans} 盆（或 ${n} × 4 - 4 = ${ans} 盆）。`,
            '四個角落的花盆同時屬於兩條邊，不要重複數兩次喔！',
          ),
        );
      }
    } else {
      // 座位排列與階梯積木規律
      if (randomInt(0, 1) === 0) {
        const n = pickRandom([6, 7, 8, 9, 10, 12, 15]);
        const ans = 4 * n + 2;
        const built = buildNumericOptions(ans, [6 * n, 4 * n, 4 * n + 4], ' 人');
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `餐廳裡 1 張長方形餐桌可坐 6 人，2 張餐桌橫向併在一起可坐 10 人，3 張餐桌併在一起可坐 14 人……照這樣排法，將 ${n} 張餐桌併成一排共可坐幾人？`,
            built,
            `每多併 1 張餐桌會多 4 個座位，加上左右兩端固定的 2 個座位，共可坐 4 × ${n} + 2 = ${ans} 人。`,
            '觀察每多併 1 張餐桌，人數固定增加幾人呢？',
          ),
        );
      } else {
        const n = pickRandom([6, 7, 8, 9, 10, 12]);
        const ans = (n * (n + 1)) / 2;
        const built = buildNumericOptions(ans, [n * n, ans - n, ans + n], ' 個');
        questions.push(
          makeQuestion(
            'g6s2-u5',
            seed,
            i,
            `用小正方體堆成階梯：第 1 層有 1 個、第 2 層有 2 個、第 3 層有 3 個……照這樣堆疊到第 ${n} 層，全部共有幾個小正方體？`,
            built,
            `總數 = 1 + 2 + 3 + …… + ${n} = (1 + ${n}) × ${n} ÷ 2 = ${ans} 個。`,
            '把 1 加到 N 可以用「(首項 + 末項) × 項數 ÷ 2」來算！',
          ),
        );
      }
    }
  }
  return questions;
}
