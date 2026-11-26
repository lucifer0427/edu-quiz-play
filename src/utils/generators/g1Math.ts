import type { Question } from '../../types/quiz';

let seedSeq = 0;

function nextSeed(): number {
  seedSeq += 1;
  return Date.now() + seedSeq * 1000 + randomInt(1, 999);
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

const CN_NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] as const;
const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const;

function buildNumericOptions(
  answer: number,
  extraCandidates: number[] = [],
  unitSuffix = '',
  minAllowed = 0,
  maxAllowed = Number.POSITIVE_INFINITY,
): { options: [string, string, string, string]; answerIndex: number } {
  const set = new Set<number>([answer]);
  for (const c of extraCandidates) {
    if (
      Number.isInteger(c) &&
      c >= minAllowed &&
      c <= maxAllowed &&
      c !== answer &&
      set.size < 4
    ) {
      set.add(c);
    }
  }
  const deltas = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10, -10];
  let guard = 0;
  while (set.size < 4 && guard < 100) {
    guard++;
    const next = answer + pickRandom(deltas);
    if (next >= minAllowed && next <= maxAllowed && next !== answer) {
      set.add(next);
    }
  }
  let step = 1;
  while (set.size < 4 && step <= 200) {
    if (answer + step <= maxAllowed) set.add(answer + step);
    if (set.size < 4 && answer - step >= minAllowed) set.add(answer - step);
    step++;
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

function sanitizeSpeechText(text: string): string {
  return text
    .replace(/=\s*[?？]/g, '等於多少')
    .replace(/\?/g, '多少')
    .replace(/□/g, '多少')
    .replace(/×/g, '乘以')
    .replace(/÷/g, '除以')
    .replace(/:/g, '點');
}

function makeQuestion(
  idPrefix: string,
  seed: number,
  index: number,
  prompt: string,
  built: { options: [string, string, string, string]; answerIndex: number },
  explanation: string,
  hint: string,
  spokenPrompt: string,
): Question {
  return {
    id: `${idPrefix}-${seed}-${index}`,
    subjectId: 'math',
    prompt,
    options: built.options,
    answerIndex: built.answerIndex,
    explanation,
    hint,
    speechText: sanitizeSpeechText(spokenPrompt),
    speechLang: 'zh-TW',
  };
}

/** 一上第1單元：10以內的數數數與多寡 */
export function generateG1S1U1Numbers10(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];
  const countItems = [
    { icon: '🍎', name: '蘋果', unit: '顆' },
    { icon: '⭐', name: '星星', unit: '顆' },
    { icon: '🎈', name: '氣球', unit: '顆' },
    { icon: '🍬', name: '糖果', unit: '顆' },
    { icon: '🐟', name: '小魚', unit: '條' },
    { icon: '🌸', name: '花朵', unit: '朵' },
  ] as const;

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const item = pickRandom(countItems);
      const n = randomInt(1, 10);
      const icons = Array.from({ length: n }, () => item.icon).join(' ');
      const built = buildNumericOptions(n, [n + 1, n - 1, n + 2], ` ${item.unit}`, 1, 10);
      questions.push(
        makeQuestion(
          'g1s1-u1',
          seed,
          i,
          `數數看，有幾${item.unit}${item.name}？ ${icons}`,
          built,
          `一個一個慢慢點數，一共有 ${n} ${item.unit}${item.name}。`,
          '用手指頭一個一個指著數，就不會算錯囉！',
          `數數看，圖裡一共有幾${item.unit}${item.name}？`,
        ),
      );
    } else if (mode === 1) {
      const n = randomInt(0, 10);
      if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(n, [n + 1, n - 1, 10 - n], '', 0, 10);
        questions.push(
          makeQuestion(
            'g1s1-u1',
            seed,
            i,
            `「${CN_NUMS[n]}」寫成數字是多少？`,
            built,
            `國字「${CN_NUMS[n]}」就是數字 ${n}。`,
            '唸一唸這個國字，想想看是哪一個數字！',
            `請問國字「${CN_NUMS[n]}」，寫成數字是多少？`,
          ),
        );
      } else {
        const wrongNums = shuffle(
          CN_NUMS.filter((_, idx) => idx !== n),
        ).slice(0, 3);
        const built = buildStringOptions(CN_NUMS[n], wrongNums);
        questions.push(
          makeQuestion(
            'g1s1-u1',
            seed,
            i,
            `數字「${n}」的國字怎麼寫？`,
            built,
            `數字 ${n} 的國字是「${CN_NUMS[n]}」。`,
            '從零、一、二、三慢慢數過去找找看！',
            `請問數字 ${n} 的國字要怎麼寫呢？`,
          ),
        );
      }
    } else if (mode === 2) {
      const variant = randomInt(0, 1);
      if (variant === 0) {
        const n = randomInt(2, 6);
        const built = buildNumericOptions(0, [1, n, 2], ' 顆', 0, 10);
        questions.push(
          makeQuestion(
            'g1s1-u1',
            seed,
            i,
            `盤子裡有 ${n} 顆草莓，全部吃光了，還剩幾顆？`,
            built,
            '全部吃光光，一顆都沒有留下來，就是剩下 0 顆。',
            '一顆也沒有了，要用哪一個數字表示呢？',
            `盤子裡原本有 ${n} 顆草莓，全部吃光光了，現在還剩下幾顆呢？`,
          ),
        );
      } else {
        const scene = pickRandom([
          '盒子裡一枝鉛筆也沒有，要用哪一個數字表示？',
          '籃子裡一顆球也沒有，要用哪一個數字表示？',
          '樹上一隻小鳥也沒有，要用哪一個數字表示？',
        ]);
        const built = buildNumericOptions(0, [1, 2, 10], '', 0, 10);
        questions.push(
          makeQuestion(
            'g1s1-u1',
            seed,
            i,
            scene,
            built,
            '什麼都沒有、一個也沒有的時候，就是「0」。',
            '代表「沒有」的數字是 0 喔！',
            scene,
          ),
        );
      }
    } else {
      if (randomInt(0, 1) === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 4);
        const askMax = randomInt(0, 1) === 0;
        const ans = askMax ? Math.max(...nums) : Math.min(...nums);
        const others = nums.filter((v) => v !== ans);
        const built = buildStringOptions(String(ans), others.map(String));
        questions.push(
          makeQuestion(
            'g1s1-u1',
            seed,
            i,
            askMax ? '下面哪一個數字「最大」？' : '下面哪一個數字「最小」？',
            built,
            askMax
              ? `從 1 數到 10，越後面越大，所以 ${ans} 最大。`
              : `從 1 數到 10，越前面越小，所以 ${ans} 最小。`,
            '從 1 開始往後數，先數到的比較小，後數到的比較大！',
            askMax
              ? '比比看，下面哪一個數字最大呢？'
              : '比比看，下面哪一個數字最小呢？',
          ),
        );
      } else {
        const target = randomInt(4, 7);
        const more = randomInt(target + 1, 10);
        const smallers = shuffle(
          Array.from({ length: target - 1 }, (_, k) => k + 1),
        ).slice(0, 3);
        const built = buildStringOptions(
          `${more} 顆`,
          smallers.map((v) => `${v} 顆`),
        );
        questions.push(
          makeQuestion(
            'g1s1-u1',
            seed,
            i,
            `桌上有 ${target} 顆糖果，下面哪一個比 ${target} 顆「多」？`,
            built,
            `數到 ${target} 之後才會數到 ${more}，所以 ${more} 顆比 ${target} 顆多。`,
            `找找看比 ${target} 還要大的數字！`,
            `桌上有 ${target} 顆糖果，下面哪一個數量比 ${target} 顆還要多呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 一上第3單元：排順序、第幾個與共有幾個、比多少 */
export function generateG1S1U3OrderCompare(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const forward = randomInt(0, 1) === 0;
      if (forward) {
        const start = randomInt(1, 6);
        const seq = [start, start + 1, start + 2, start + 3, start + 4];
        const hideIdx = randomInt(1, 3);
        const ans = seq[hideIdx];
        const display = seq.map((v, idx) => (idx === hideIdx ? '□' : String(v))).join('、');
        const spokenSeq = seq
          .map((v, idx) => (idx === hideIdx ? '多少' : String(v)))
          .join('、');
        const built = buildNumericOptions(ans, [ans - 1, ans + 1, ans + 2], '', 1, 10);
        questions.push(
          makeQuestion(
            'g1s1-u3',
            seed,
            i,
            `數一數：${display}，□ 是多少？`,
            built,
            `一個接著一個往後數：${seq.join('、')}，所以 □ 是 ${ans}。`,
            '從第一個數字慢慢往後數過去！',
            `照順序數一數，${spokenSeq}，中間空格裡是多少呢？`,
          ),
        );
      } else {
        const start = randomInt(6, 10);
        const seq = [start, start - 1, start - 2, start - 3];
        const hideIdx = randomInt(1, 2);
        const ans = seq[hideIdx];
        const display = seq.map((v, idx) => (idx === hideIdx ? '□' : String(v))).join('、');
        const spokenSeq = seq
          .map((v, idx) => (idx === hideIdx ? '多少' : String(v)))
          .join('、');
        const built = buildNumericOptions(ans, [ans - 1, ans + 1, ans - 2], '', 1, 10);
        questions.push(
          makeQuestion(
            'g1s1-u3',
            seed,
            i,
            `倒數看看：${display}，□ 是多少？`,
            built,
            `每次少 1 往回數：${seq.join('、')}，所以 □ 是 ${ans}。`,
            '這題是越來越小，倒著數數看！',
            `倒著數看看，${spokenSeq}，中間空格裡是多少呢？`,
          ),
        );
      }
    } else if (mode === 1) {
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const total = randomInt(5, 8);
        const pos = randomInt(2, total - 1);
        const fromLeft = randomInt(0, 1) === 0;
        const targetIdx = fromLeft ? pos - 1 : total - pos;
        const row = Array.from({ length: total }, (_, idx) => (idx === targetIdx ? '★' : '○')).join(
          ' ',
        );
        const ans = `第 ${pos} 個`;
        const distractors = shuffle(
          Array.from({ length: total }, (_, k) => k + 1).filter((k) => k !== pos),
        )
          .slice(0, 3)
          .map((k) => `第 ${k} 個`);
        const built = buildStringOptions(ans, distractors);
        questions.push(
          makeQuestion(
            'g1s1-u3',
            seed,
            i,
            `從${fromLeft ? '左' : '右'}邊數起，★ 是第幾個？ ${row}`,
            built,
            `從${fromLeft ? '左' : '右'}邊當作第 1 個開始數，數到 ★ 剛好是第 ${pos} 個。`,
            `看清楚要從「${fromLeft ? '左' : '右'}邊」開始數喔！`,
            `從${fromLeft ? '左' : '右'}邊開始數，星星排在第幾個呢？`,
          ),
        );
      } else if (variant === 1) {
        const total = randomInt(4, 10);
        const ans = `第 ${total} 隻`;
        const distractors = shuffle(
          Array.from({ length: 10 }, (_, k) => k + 1).filter((k) => k !== total),
        )
          .slice(0, 3)
          .map((k) => `第 ${k} 隻`);
        const built = buildStringOptions(ans, distractors);
        questions.push(
          makeQuestion(
            'g1s1-u3',
            seed,
            i,
            `有 ${total} 隻小鴨排一排，最後一隻是第幾隻？`,
            built,
            `一共有 ${total} 隻，從第 1 隻數到最後一隻，就是第 ${total} 隻。`,
            '共有幾隻，最後一隻就是第幾隻喔！',
            `有 ${total} 隻小鴨排成一排，請問最後一隻是第幾隻呢？`,
          ),
        );
      } else {
        const pos = randomInt(3, 9);
        const ans = pos - 1;
        const built = buildNumericOptions(ans, [pos, pos + 1, ans - 1], ' 個人', 1, 10);
        questions.push(
          makeQuestion(
            'g1s1-u3',
            seed,
            i,
            `大家排隊買水，小明排在第 ${pos} 個，他前面有幾個人？`,
            built,
            `小明是第 ${pos} 個，他前面有第 1 個到第 ${pos - 1} 個，一共有 ${ans} 個人。`,
            '不包括小明自己，只數排在他前面的人喔！',
            `大家在排隊買水，小明排在第 ${pos} 個，請問他前面有幾個人呢？`,
          ),
        );
      }
    } else if (mode === 2) {
      const pos = randomInt(2, 9);
      const isAfter = pos === 2 ? true : pos === 9 ? false : randomInt(0, 1) === 0;
      const ansNum = isAfter ? pos + 1 : pos - 1;
      const ans = `第 ${ansNum} 個`;
      const distractors = shuffle(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((v) => v !== ansNum),
      )
        .slice(0, 3)
        .map((v) => `第 ${v} 個`);
      const built = buildStringOptions(ans, distractors);
      questions.push(
        makeQuestion(
          'g1s1-u3',
          seed,
          i,
          `小美排在第 ${pos} 個，她${isAfter ? '後面' : '前面'}一個是第幾個？`,
          built,
          isAfter
            ? `第 ${pos} 個的後面一個要加 1，是第 ${ansNum} 個。`
            : `第 ${pos} 個的前面一個要減 1，是第 ${ansNum} 個。`,
          isAfter ? `排在後面一個，比 ${pos} 多 1 喔！` : `排在前面一個，比 ${pos} 少 1 喔！`,
          `小朋友排隊時，小美排在第 ${pos} 個，排在她${isAfter ? '後面' : '前面'}一個的是第幾個呢？`,
        ),
      );
    } else {
      const pair = pickRandom([
        ['紅花', '黃花', '朵'],
        ['蘋果', '橘子', '顆'],
        ['紅筆', '藍筆', '枝'],
        ['草莓', '櫻桃', '顆'],
      ] as const);
      const a = randomInt(4, 10);
      const b = randomInt(1, a - 1);
      const diff = a - b;
      const askMore = randomInt(0, 1) === 0;
      const built = buildNumericOptions(diff, [a, b, diff + 1], ` ${pair[2]}`, 1, 10);
      questions.push(
        makeQuestion(
          'g1s1-u3',
          seed,
          i,
          askMore
            ? `${pair[0]}有 ${a} ${pair[2]}，${pair[1]}有 ${b} ${pair[2]}，${pair[0]}比${pair[1]}多幾${pair[2]}？`
            : `${pair[0]}有 ${a} ${pair[2]}，${pair[1]}有 ${b} ${pair[2]}，${pair[1]}比${pair[0]}少幾${pair[2]}？`,
          built,
          `兩組排起來比一比，多出來（或少掉）的部分是 ${a} - ${b} = ${diff} ${pair[2]}。`,
          `從 ${b} 數到 ${a}，多了幾個就是答案喔！`,
          askMore
            ? `${pair[0]}有 ${a} ${pair[2]}，${pair[1]}有 ${b} ${pair[2]}，請問${pair[0]}比${pair[1]}多幾${pair[2]}呢？`
            : `${pair[0]}有 ${a} ${pair[2]}，${pair[1]}有 ${b} ${pair[2]}，請問${pair[1]}比${pair[0]}少幾${pair[2]}呢？`,
        ),
      );
    }
  }
  return questions;
}

/** 一上第4單元：10以內數的分與合、10的湊數 */
export function generateG1S1U4ComposeDecompose10(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const a = randomInt(1, 9);
      const b = 10 - a;
      const built = buildNumericOptions(b, [a, b + 1, Math.max(0, b - 1)], '', 0, 10);
      if (randomInt(0, 1) === 0) {
        questions.push(
          makeQuestion(
            'g1s1-u4',
            seed,
            i,
            `10 可以分成 ${a} 和多少？`,
            built,
            `10 可以分成 ${a} 和 ${b}，因為 ${a} 和 ${b} 合起來就是 10。`,
            `伸出 10 根手指頭，彎下 ${a} 根，還剩幾根呢？`,
            `10 可以分成 ${a} 和多少呢？`,
          ),
        );
      } else {
        questions.push(
          makeQuestion(
            'g1s1-u4',
            seed,
            i,
            `${a} 和多少合起來是 10？`,
            built,
            `${a} 和 ${b} 合起來剛好是 10。`,
            `從 ${a} 往上數到 10，一共數了幾個數？`,
            `${a} 和多少合起來會等於 10 呢？`,
          ),
        );
      }
    } else if (mode === 1) {
      const total = randomInt(5, 9);
      const p1 = randomInt(1, total - 1);
      const p2 = total - p1;
      const built = buildNumericOptions(p2, [p1, total, p2 + 1], ' 顆', 1, 10);
      questions.push(
        makeQuestion(
          'g1s1-u4',
          seed,
          i,
          `把 ${total} 顆糖果分成兩堆，一堆有 ${p1} 顆，另一堆有幾顆？`,
          built,
          `${total} 可以分成 ${p1} 和 ${p2}，所以另一堆有 ${p2} 顆。`,
          `想一想，${p1} 和多少合起來是 ${total} 呢？`,
          `把 ${total} 顆糖果分成兩堆，其中一堆有 ${p1} 顆，另一堆有幾顆呢？`,
        ),
      );
    } else if (mode === 2) {
      const total = randomInt(4, 10);
      const p1 = randomInt(1, total - 1);
      const p2 = total - p1;
      const built = buildNumericOptions(total, [p1, p2, total - 1], ' 顆', 2, 11);
      questions.push(
        makeQuestion(
          'g1s1-u4',
          seed,
          i,
          `左手有 ${p1} 顆彈珠，右手有 ${p2} 顆，合起來有幾顆？`,
          built,
          `${p1} 和 ${p2} 合起來一共是 ${total} 顆彈珠。`,
          `把左手的 ${p1} 顆和右手的 ${p2} 顆全部數在一起！`,
          `左手有 ${p1} 顆彈珠，右手有 ${p2} 顆彈珠，合起來一共有幾顆呢？`,
        ),
      );
    } else {
      if (randomInt(0, 1) === 0) {
        const p1 = randomInt(1, 9);
        const ans = 10 - p1;
        const built = buildNumericOptions(ans, [p1, ans + 1, Math.max(0, ans - 1)], ' 顆', 0, 10);
        questions.push(
          makeQuestion(
            'g1s1-u4',
            seed,
            i,
            `媽媽買了 10 顆蘋果，哥哥拿走 ${p1} 顆，還剩下幾顆？`,
            built,
            `10 可以分成 ${p1} 和 ${ans}，所以還剩下 ${ans} 顆。`,
            '用 10 的好朋友來想一想喔！',
            `媽媽買了 10 顆蘋果，哥哥拿走了 ${p1} 顆，請問還剩下幾顆呢？`,
          ),
        );
      } else {
        const a = randomInt(1, 5);
        const b = 10 - a;
        const ans = `${a} 和 ${b}`;
        const wrongs = new Set<string>();
        const candidates: [number, number][] = [
          [a, Math.max(1, b - 1)],
          [a + 1, b],
          [a, b === 9 ? 7 : b + 1],
          [Math.max(1, a - 1), Math.max(1, b - 2)],
          [a + 2, b],
        ];
        for (const [x, y] of candidates) {
          if (x + y !== 10) {
            const label = `${x} 和 ${y}`;
            if (label !== ans) wrongs.add(label);
          }
          if (wrongs.size >= 3) break;
        }
        const built = buildStringOptions(ans, Array.from(wrongs));
        questions.push(
          makeQuestion(
            'g1s1-u4',
            seed,
            i,
            '下面哪一組數字合起來「剛好是 10」？',
            built,
            `${a} 和 ${b} 合起來剛好等於 10。`,
            '把每一組的兩個數字加起來算算看！',
            '請問下面哪一組數字合起來剛好是 10 呢？',
          ),
        );
      }
    }
  }
  return questions;
}

/** 一上第6單元：30以內的數、幾個十幾個一與順序 */
export function generateG1S1U6Numbers30(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const num = randomInt(11, 30);
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      if (ones === 0) {
        const built = buildNumericOptions(num, [tens, num - 10, num + 1], '', 10, 30);
        questions.push(
          makeQuestion(
            'g1s1-u6',
            seed,
            i,
            `${tens} 個十合起來是多少？`,
            built,
            `1 個十是 10，${tens} 個十就是 ${num}。`,
            '十個十個數數看：10、20、30！',
            `請問 ${tens} 個十合起來是多少？`,
          ),
        );
      } else if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(
          num,
          [ones * 10 + tens, tens + ones, num + 1],
          '',
          10,
          30,
        );
        questions.push(
          makeQuestion(
            'g1s1-u6',
            seed,
            i,
            `${tens} 個十和 ${ones} 個一合起來是多少？`,
            built,
            `${tens} 個十是 ${tens * 10}，再加上 ${ones} 個一，合起來是 ${num}。`,
            `十位寫 ${tens}，個位寫 ${ones}，合起來就是答案喔！`,
            `${tens} 個十和 ${ones} 個一合起來是多少呢？`,
          ),
        );
      } else {
        const ans = `${tens} 個十和 ${ones} 個一`;
        const candPairs: [number, number][] = [
          [ones, tens],
          [tens + 1, ones],
          [tens, ones === 9 ? 8 : ones + 1],
          [tens, ones - 1],
          [Math.max(1, tens - 1), ones],
        ];
        const wrongs: string[] = [];
        for (const [t, o] of candPairs) {
          if (t >= 0 && o >= 0 && !(t === tens && o === ones)) {
            const label = `${t} 個十和 ${o} 個一`;
            if (!wrongs.includes(label)) wrongs.push(label);
          }
          if (wrongs.length >= 3) break;
        }
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g1s1-u6',
            seed,
            i,
            `「${num}」裡面有幾個十和幾個一？`,
            built,
            `${num} 是 ${tens * 10} 和 ${ones} 合起來的，所以有 ${ans}。`,
            '左邊的數字代表幾個十，右邊的數字代表幾個一！',
            `請問數字 ${num} 裡面，有幾個十和幾個一呢？`,
          ),
        );
      }
    } else if (mode === 1) {
      if (randomInt(0, 1) === 0) {
        const a = randomInt(11, 27);
        const ans = a + 2;
        const built = buildNumericOptions(ans, [ans - 1, ans + 1, ans + 2], '', 11, 30);
        questions.push(
          makeQuestion(
            'g1s1-u6',
            seed,
            i,
            `數一數：${a}、${a + 1}、□、${a + 3}，□ 是多少？`,
            built,
            `照順序數下去：${a}、${a + 1}、${ans}、${a + 3}，所以 □ 是 ${ans}。`,
            `想想看，${a + 1} 的下一個數字是幾呢？`,
            `照順序數一數，${a}、${a + 1}、多少、${a + 3}，中間少了哪一個數？`,
          ),
        );
      } else {
        const n = randomInt(12, 29);
        const askMore = randomInt(0, 1) === 0;
        const ans = askMore ? n + 1 : n - 1;
        const built = buildNumericOptions(ans, [n, askMore ? n - 1 : n + 1, ans + 2], '', 10, 30);
        questions.push(
          makeQuestion(
            'g1s1-u6',
            seed,
            i,
            `比 ${n} ${askMore ? '多' : '少'} 1 的數是多少？`,
            built,
            askMore
              ? `比 ${n} 多 1 就是往後數 1 個數，是 ${ans}。`
              : `比 ${n} 少 1 就是往前數 1 個數，是 ${ans}。`,
            askMore ? `${n} 的下一個數是誰？` : `${n} 的前一個數是誰？`,
            `請問比 ${n} ${askMore ? '多' : '少'} 1 的數字是多少？`,
          ),
        );
      }
    } else if (mode === 2) {
      const tens = pickRandom([1, 2]);
      const ones = randomInt(1, 9);
      const total = tens * 10 + ones;
      const built = buildNumericOptions(
        total,
        [tens + ones, ones * 10 + tens, total + 1],
        ' 枝',
        10,
        30,
      );
      questions.push(
        makeQuestion(
          'g1s1-u6',
          seed,
          i,
          `1 盒鉛筆有 10 枝，桌上有 ${tens} 盒又 ${ones} 枝，共有幾枝？`,
          built,
          `${tens} 盒是 ${tens * 10} 枝，再接著數 ${ones} 枝，一共是 ${total} 枝。`,
          '先十個一數算出幾盒，再一個一個加上剩下的！',
          `一盒鉛筆有 10 枝，桌上有 ${tens} 盒又多出 ${ones} 枝，請問一共有幾枝鉛筆？`,
        ),
      );
    } else {
      if (randomInt(0, 1) === 0) {
        const pool = Array.from({ length: 19 }, (_, k) => k + 12);
        const nums = shuffle(pool).slice(0, 4);
        const askMax = randomInt(0, 1) === 0;
        const ans = askMax ? Math.max(...nums) : Math.min(...nums);
        const others = nums.filter((v) => v !== ans);
        const built = buildStringOptions(String(ans), others.map(String));
        questions.push(
          makeQuestion(
            'g1s1-u6',
            seed,
            i,
            askMax ? '下面哪一個數字「最大」？' : '下面哪一個數字「最小」？',
            built,
            askMax
              ? `先比十位數字，十位一樣再比個位數字，最大的是 ${ans}。`
              : `先比十位數字，十位一樣再比個位數字，最小的是 ${ans}。`,
            '先看左邊的十位誰比較大（或比較小）喔！',
            askMax ? '比比看，下面哪一個數字最大？' : '比比看，下面哪一個數字最小？',
          ),
        );
      } else {
        const p = randomInt(12, 29);
        const ans = `第 ${p + 1} 個`;
        const distractors = [`第 ${p - 1} 個`, `第 ${p} 個`, `第 ${p + 2 > 30 ? p - 2 : p + 2} 個`];
        const built = buildStringOptions(ans, distractors);
        questions.push(
          makeQuestion(
            'g1s1-u6',
            seed,
            i,
            `有 30 個人排隊，小美排在第 ${p} 個，後面一個是第幾個？`,
            built,
            `第 ${p} 個的後面一個是第 ${p + 1} 個。`,
            `從 ${p} 往後數 1 個數喔！`,
            `有 30 個人在排隊，小美排在第 ${p} 個，排在她後面一個的是第幾個呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 一上第7單元：10以內加法 */
export function generateG1S1U7Add10(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const sum = randomInt(2, 10);
      const a = randomInt(0, sum);
      const b = sum - a;
      const built = buildNumericOptions(
        sum,
        [sum + 1, Math.max(0, sum - 1), Math.abs(a - b)],
        '',
        0,
        12,
      );
      questions.push(
        makeQuestion(
          'g1s1-u7',
          seed,
          i,
          `算算看：${a} + ${b} = ？`,
          built,
          `${a} 加 ${b} 等於 ${sum}。`,
          `先記住 ${a}，再往後數 ${b} 個數！`,
          `算算看，${a} 加 ${b} 等於多少？`,
        ),
      );
    } else if (mode === 1) {
      const sum = randomInt(3, 10);
      const a = randomInt(1, sum - 1);
      const b = sum - a;
      const built = buildNumericOptions(sum, [sum + 1, sum - 1, Math.abs(a - b)], ' 顆', 1, 12);
      questions.push(
        makeQuestion(
          'g1s1-u7',
          seed,
          i,
          `盤子裡有 ${a} 顆紅蘋果和 ${b} 顆青蘋果，共有幾顆蘋果？`,
          built,
          `把兩邊合起來用加法：${a} + ${b} = ${sum} 顆。`,
          `把 ${a} 顆和 ${b} 顆加在一起算算看！`,
          `盤子裡有 ${a} 顆紅蘋果和 ${b} 顆青蘋果，合起來一共有幾顆蘋果呢？`,
        ),
      );
    } else if (mode === 2) {
      const sum = randomInt(4, 10);
      const a = randomInt(1, sum - 1);
      const b = sum - a;
      const built = buildNumericOptions(sum, [sum + 1, sum - 1, Math.abs(a - b)], ' 隻', 1, 12);
      questions.push(
        makeQuestion(
          'g1s1-u7',
          seed,
          i,
          `樹上原來有 ${a} 隻小鳥，又飛來 ${b} 隻，現在有幾隻小鳥？`,
          built,
          `原來有 ${a} 隻，又飛來 ${b} 隻，合起來是 ${a} + ${b} = ${sum} 隻。`,
          `數量變多了，從 ${a} 開始往後再數 ${b} 個！`,
          `樹上原本有 ${a} 隻小鳥，又飛來了 ${b} 隻，現在一共有幾隻小鳥？`,
        ),
      );
    } else {
      if (randomInt(0, 1) === 0) {
        const a = randomInt(1, 10);
        const built = buildNumericOptions(a, [0, a + 1, Math.max(0, a - 1)], ' 張', 0, 10);
        questions.push(
          makeQuestion(
            'g1s1-u7',
            seed,
            i,
            `小明原來有 ${a} 張貼紙，今天又拿到 0 張，現在有幾張？`,
            built,
            `加上 0 就是沒有多拿任何貼紙，所以 ${a} + 0 = ${a} 張。`,
            '任何數加上 0，大小都不會變喔！',
            `小明原本有 ${a} 張貼紙，今天又拿到 0 張，現在一共有幾張貼紙呢？`,
          ),
        );
      } else {
        const target = randomInt(5, 10);
        const a = randomInt(1, target - 1);
        const b = target - a;
        const ans = `${a} + ${b}`;
        const wrongs = new Set<string>();
        const cand: [number, number][] = [
          [a, b + 1],
          [a, Math.max(0, b - 1)],
          [Math.max(1, a - 1), Math.max(0, b - 1)],
          [a + 1, b + 1],
          [a + 2, b],
        ];
        for (const [x, y] of cand) {
          if (x + y !== target) wrongs.add(`${x} + ${y}`);
          if (wrongs.size >= 3) break;
        }
        const built = buildStringOptions(ans, Array.from(wrongs));
        questions.push(
          makeQuestion(
            'g1s1-u7',
            seed,
            i,
            `下面哪一個算式的答案等於 ${target}？`,
            built,
            `${a} + ${b} = ${target}，其餘三個算式的答案都不是 ${target}。`,
            '把四個算式分別算出來比對看看！',
            `請問下面哪一個加法算式的答案等於 ${target} 呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 一上第8單元：10以內減法 */
export function generateG1S1U8Sub10(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const a = randomInt(2, 10);
      const b = randomInt(0, a);
      const diff = a - b;
      const built = buildNumericOptions(
        diff,
        [diff + 1, Math.max(0, diff - 1), Math.min(10, a + b)],
        '',
        0,
        10,
      );
      questions.push(
        makeQuestion(
          'g1s1-u8',
          seed,
          i,
          `算算看：${a} - ${b} = ？`,
          built,
          `${a} 減 ${b} 等於 ${diff}。`,
          b === 0
            ? '減掉 0 就是一個都沒有拿走喔！'
            : b === a
              ? '全部拿走，一個也不剩了！'
              : `從 ${a} 往回倒數 ${b} 個數試試看！`,
          `算算看，${a} 減 ${b} 等於多少？`,
        ),
      );
    } else if (mode === 1) {
      const a = randomInt(3, 10);
      const b = randomInt(1, a);
      const diff = a - b;
      const built = buildNumericOptions(diff, [diff + 1, a, b], ' 顆', 0, 10);
      questions.push(
        makeQuestion(
          'g1s1-u8',
          seed,
          i,
          `袋子裡有 ${a} 顆糖果，吃掉了 ${b} 顆，還剩下幾顆？`,
          built,
          `吃掉就是變少了，用減法算：${a} - ${b} = ${diff} 顆。`,
          '吃掉會變少，要用減法喔！',
          `袋子裡原本有 ${a} 顆糖果，吃掉了 ${b} 顆，還剩下幾顆呢？`,
        ),
      );
    } else if (mode === 2) {
      const a = randomInt(4, 10);
      const b = randomInt(1, a - 1);
      const diff = a - b;
      const built = buildNumericOptions(diff, [a, b, diff + 1], ' 枝', 1, 10);
      questions.push(
        makeQuestion(
          'g1s1-u8',
          seed,
          i,
          `小明有 ${a} 枝鉛筆，小華有 ${b} 枝，小明比小華多幾枝？`,
          built,
          `比誰多幾個要用減法：${a} - ${b} = ${diff} 枝。`,
          `想一想 ${b} 和多少合起來是 ${a}，或用 ${a} 減 ${b}！`,
          `小明有 ${a} 枝鉛筆，小華有 ${b} 枝鉛筆，小明比小華多幾枝呢？`,
        ),
      );
    } else {
      if (randomInt(0, 1) === 0) {
        const a = randomInt(2, 9);
        const built = buildNumericOptions(0, [1, a, 2], ' 塊', 0, 10);
        questions.push(
          makeQuestion(
            'g1s1-u8',
            seed,
            i,
            `盤子裡有 ${a} 塊餅乾，小狗吃掉了 ${a} 塊，還剩幾塊？`,
            built,
            `${a} - ${a} = 0，餅乾全部被吃掉了，還剩 0 塊。`,
            '原本有幾塊就吃掉幾塊，一塊也不剩囉！',
            `盤子裡有 ${a} 塊餅乾，小狗吃掉了 ${a} 塊，請問還剩下幾塊餅乾？`,
          ),
        );
      } else {
        const a = randomInt(4, 10);
        const b = randomInt(1, a - 1);
        const ans = `${a} - ${b}`;
        const wrongs = [
          `${a} + ${b}`,
          `${b} - ${a}`,
          `${a} - ${b === 1 ? 2 : b - 1}`,
        ];
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g1s1-u8',
            seed,
            i,
            `樹上有 ${a} 顆蘋果，摘走了 ${b} 顆，還剩幾顆？算式怎麼寫？`,
            built,
            `摘走蘋果會變少，所以要用減法算式：${a} - ${b}。`,
            '變多了用「+」，變少了用「-」喔！',
            `樹上有 ${a} 顆蘋果，摘走了 ${b} 顆，想知道還剩下幾顆，要選哪一個算式呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 一上第9單元：認識整點與半點 */
export function generateG1S1U9ClockHours(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const hour = randomInt(1, 12);
      const nextHour = hour === 12 ? 1 : hour + 1;
      const prevHour = hour === 1 ? 12 : hour - 1;
      const ans = `${hour} 點`;
      const built = buildStringOptions(ans, [
        `${nextHour} 點`,
        `${prevHour} 點`,
        `${hour} 點半`,
      ]);
      questions.push(
        makeQuestion(
          'g1s1-u9',
          seed,
          i,
          `長針指著 12，短針指著 ${hour}，現在是幾點鐘？`,
          built,
          `長針指著 12 代表整點，短針指著 ${hour}，所以現在是 ${hour} 點鐘。`,
          '看時間要先看短針指著幾，再看長針是不是指著 12！',
          `時鐘的長針指著 12，短針指著 ${hour}，請問現在是幾點鐘？`,
        ),
      );
    } else if (mode === 1) {
      const hour = randomInt(1, 12);
      const nextHour = hour === 12 ? 1 : hour + 1;
      const ans = `${hour} 點半`;
      const built = buildStringOptions(ans, [
        `${nextHour} 點半`,
        `${hour} 點`,
        `${nextHour} 點`,
      ]);
      questions.push(
        makeQuestion(
          'g1s1-u9',
          seed,
          i,
          `長針指著 6，短針在 ${hour} 和 ${nextHour} 中間，現在是幾點？`,
          built,
          `長針指著 6 代表半點，短針剛走過 ${hour}、還沒到 ${nextHour}，所以是 ${hour} 點半。`,
          '短針在兩個數字中間時，要選剛走過的那個比較小的數字（12 和 1 中間是 12 點半）喔！',
          `時鐘的長針指著 6，短針在 ${hour} 和 ${nextHour} 的中間，請問現在是幾點呢？`,
        ),
      );
    } else if (mode === 2) {
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const built = buildStringOptions('6', ['12', '3', '9']);
        questions.push(
          makeQuestion(
            'g1s1-u9',
            seed,
            i,
            '「半點」的時候，時鐘上的長針會指著數字幾？',
            built,
            '整點時長針指著 12，半點時長針走半圈指著 6。',
            '想一想時鐘最下面的數字是幾？',
            '請問到了半點的時候，時鐘上的長針會指著數字幾呢？',
          ),
        );
      } else if (variant === 1) {
        const hour = randomInt(1, 11);
        const built = buildStringOptions(`${hour + 1} 點`, [
          `${hour} 點`,
          `${hour} 點半`,
          `${hour + 1} 點半`,
        ]);
        questions.push(
          makeQuestion(
            'g1s1-u9',
            seed,
            i,
            `現在是 ${hour} 點鐘，再過 1 小時是幾點？`,
            built,
            `從 ${hour} 點再過 1 小時，短針會再多走 1 格，變成 ${hour + 1} 點。`,
            `從 ${hour} 往後數 1 個整點喔！`,
            `現在是 ${hour} 點鐘，再過 1 小時會是幾點呢？`,
          ),
        );
      } else {
        const hour = randomInt(1, 12);
        const nextHour = hour === 12 ? 1 : hour + 1;
        const built = buildStringOptions(`${hour} 點半`, [
          `${hour} 點`,
          `${nextHour} 點`,
          `${nextHour} 點半`,
        ]);
        questions.push(
          makeQuestion(
            'g1s1-u9',
            seed,
            i,
            `現在是 ${hour} 點鐘，再過半小時是幾點？`,
            built,
            `${hour} 點鐘再過半小時（長針走到 6），就是 ${hour} 點半。`,
            '多過半小時就是「幾點半」喔！',
            `現在是 ${hour} 點鐘，再過半小時會是幾點呢？`,
          ),
        );
      }
    } else {
      const routines = [
        {
          prompt: '早上太陽出來，背書包去上學，是什麼時候？',
          speech: '早上太陽出來了，背著書包去上學，通常是什麼時候呢？',
          ans: '上午',
          explain: '早上太陽升起去上學的時間叫做「上午」。',
        },
        {
          prompt: '太陽高高掛，大家在學校吃午餐，是什麼時候？',
          speech: '太陽高高掛在頭頂，大家在學校吃午餐，通常是什麼時候呢？',
          ans: '中午',
          explain: '大約 12 點吃午餐的時間叫做「中午」。',
        },
        {
          prompt: '放學回家寫功課，天還沒黑，是什麼時候？',
          speech: '放學回家寫功課，天色還沒全黑，通常是什麼時候呢？',
          ans: '下午',
          explain: '中午過後、太陽下山前的時間叫做「下午」。',
        },
        {
          prompt: '天黑黑的，月亮出來了，準備睡覺，是什麼時候？',
          speech: '天黑黑的，月亮出來了，準備刷牙睡覺，是什麼時候呢？',
          ans: '晚上',
          explain: '天黑出現月亮、準備睡覺的時間叫做「晚上」。',
        },
      ] as const;
      const item = pickRandom(routines);
      const others = ['上午', '中午', '下午', '晚上'].filter((t) => t !== item.ans);
      const built = buildStringOptions(item.ans, others);
      questions.push(
        makeQuestion(
          'g1s1-u9',
          seed,
          i,
          item.prompt,
          built,
          item.explain,
          '想一想你平常在這個時候都在做什麼事！',
          item.speech,
        ),
      );
    }
  }
  return questions;
}

/** 一下第1單元：50以內的數、十個一數與大小比較 */
export function generateG1S2U1Numbers50(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const step = pickRandom([10, 5, 2]);
      const start =
        step === 10
          ? pickRandom([10, 20])
          : step === 5
            ? pickRandom([15, 20, 25, 30])
            : pickRandom([22, 26, 30, 34, 40]);
      const seq = [start, start + step, start + step * 2, start + step * 3];
      const hideIdx = randomInt(1, 2);
      const ans = seq[hideIdx];
      const display = seq.map((v, idx) => (idx === hideIdx ? '□' : String(v))).join('、');
      const spokenSeq = seq
        .map((v, idx) => (idx === hideIdx ? '多少' : String(v)))
        .join('、');
      const built = buildNumericOptions(ans, [ans + 1, ans - 1, ans + step], '', 1, 50);
      questions.push(
        makeQuestion(
          'g1s2-u1',
          seed,
          i,
          `${step} 個一數：${display}，□ 是多少？`,
          built,
          `每次都多 ${step}：${seq.join('、')}，所以 □ 是 ${ans}。`,
          `每個數之間都相差 ${step}，加 ${step} 算算看！`,
          `${step} 個一數，${spokenSeq}，空格裡要填多少呢？`,
        ),
      );
    } else if (mode === 1) {
      const tens = randomInt(2, 4);
      const ones = randomInt(1, 9);
      const num = tens * 10 + ones;
      if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(
          num,
          [ones * 10 + tens, tens + ones, num + 10],
          '',
          10,
          50,
        );
        questions.push(
          makeQuestion(
            'g1s2-u1',
            seed,
            i,
            `${tens} 條十的積木和 ${ones} 個一的積木，合起來是多少？`,
            built,
            `${tens} 個十是 ${tens * 10}，加上 ${ones} 個一，合起來是 ${num}。`,
            `十位是 ${tens}、個位是 ${ones}，寫出來是多少呢？`,
            `${tens} 條十的積木和 ${ones} 個一的積木，合起來是多少呢？`,
          ),
        );
      } else {
        const ans = `${tens} 袋多 ${ones} 顆`;
        const cand: [number, number][] = [
          [ones, tens],
          [tens + 1, ones],
          [tens - 1, ones],
          [tens, ones === 9 ? 8 : ones + 1],
        ];
        const wrongs = cand
          .filter(([t, o]) => !(t === tens && o === ones))
          .map(([t, o]) => `${t} 袋多 ${o} 顆`);
        const built = buildStringOptions(ans, wrongs);
        questions.push(
          makeQuestion(
            'g1s2-u1',
            seed,
            i,
            `有 ${num} 顆糖果，每 10 顆裝 1 袋，可以裝幾袋又多幾顆？`,
            built,
            `${num} 裡面有 ${tens} 個十和 ${ones} 個一，所以可以裝滿 ${tens} 袋又多 ${ones} 顆。`,
            '看十位數字就知道可以裝幾袋，個位數字就是多出來的顆數！',
            `有 ${num} 顆糖果，每 10 顆裝成 1 袋，可以裝滿幾袋又多出幾顆呢？`,
          ),
        );
      }
    } else if (mode === 2) {
      if (randomInt(0, 1) === 0) {
        const nums = shuffle(Array.from({ length: 30 }, (_, k) => k + 21)).slice(0, 4);
        const askMax = randomInt(0, 1) === 0;
        const ans = askMax ? Math.max(...nums) : Math.min(...nums);
        const others = nums.filter((v) => v !== ans);
        const built = buildStringOptions(String(ans), others.map(String));
        questions.push(
          makeQuestion(
            'g1s2-u1',
            seed,
            i,
            askMax ? '下面哪一個數字「最大」？' : '下面哪一個數字「最小」？',
            built,
            `先比較十位數字，十位相同再比個位數字，${askMax ? '最大' : '最小'}的是 ${ans}。`,
            '先看十位數字誰最大（或最小）！',
            askMax ? '比比看，下面哪一個數字最大？' : '比比看，下面哪一個數字最小？',
          ),
        );
      } else {
        const n = randomInt(25, 44);
        const ans = n + randomInt(1, 3);
        const filteredWrongs = [n - 2, n, n + 4, n + 6];
        const safeBuilt = buildStringOptions(
          String(ans),
          filteredWrongs.slice(0, 3).map(String),
        );
        questions.push(
          makeQuestion(
            'g1s2-u1',
            seed,
            i,
            `哪一個數比 ${n} 大，又比 ${n + 4} 小？`,
            safeBuilt,
            `在 ${n} 和 ${n + 4} 中間的數只有 ${n + 1}、${n + 2}、${n + 3}，答案是 ${ans}。`,
            `從 ${n} 往後數到 ${n + 4}，中間夾著哪一個數？`,
            `請問下面哪一個數字比 ${n} 大，又比 ${n + 4} 小呢？`,
          ),
        );
      }
    } else {
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const p = randomInt(25, 48);
        const ans = `第 ${p + 1} 個`;
        const built = buildStringOptions(ans, [
          `第 ${p - 1} 個`,
          `第 ${p} 個`,
          `第 ${p + 2} 個`,
        ]);
        questions.push(
          makeQuestion(
            'g1s2-u1',
            seed,
            i,
            `大家排隊領禮物，小華排在第 ${p} 個，下一個是第幾個？`,
            built,
            `第 ${p} 個的後面下一個是第 ${p + 1} 個。`,
            `往後多數 1 個就是下一個囉！`,
            `大家排隊領禮物，小華排在第 ${p} 個，下一個是第幾個呢？`,
          ),
        );
      } else if (variant === 1) {
        const base = randomInt(30, 45);
        const step = randomInt(2, 4);
        const ans = base + step;
        const built = buildNumericOptions(ans, [ans - 1, ans + 1, base - step], '', 25, 50);
        questions.push(
          makeQuestion(
            'g1s2-u1',
            seed,
            i,
            `從 ${base} 往後數 ${step} 個數，會數到多少？`,
            built,
            `從 ${base} 開始往後數 ${step} 個，會數到 ${ans}。`,
            `伸出 ${step} 根手指頭，從 ${base} 往下數！`,
            `從 ${base} 開始往後數 ${step} 個數，會數到多少呢？`,
          ),
        );
      } else {
        const base = randomInt(32, 50);
        const step = randomInt(2, 4);
        const ans = base - step;
        const built = buildNumericOptions(ans, [ans - 1, ans + 1, base], '', 25, 50);
        questions.push(
          makeQuestion(
            'g1s2-u1',
            seed,
            i,
            `從 ${base} 往前倒數 ${step} 個數，會數到多少？`,
            built,
            `從 ${base} 往前倒數 ${step} 個，會數到 ${ans}。`,
            `倒著數就是越來越小，從 ${base} 減 ${step} 看看！`,
            `從 ${base} 往前倒數 ${step} 個數，會數到多少呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 一下第2單元：18以內進位加法 */
export function generateG1S2U2CarryAdd18(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const a = randomInt(3, 9);
      const b = randomInt(11 - a, 9);
      const sum = a + b;
      const need = 10 - a;
      const rest = b - need;
      const built = buildNumericOptions(sum, [sum + 1, sum - 1, sum - 2], '', 10, 19);
      questions.push(
        makeQuestion(
          'g1s2-u2',
          seed,
          i,
          `算算看：${a} + ${b} = ？`,
          built,
          `先湊成 10：把 ${b} 分成 ${need} 和 ${rest}，${a} + ${need} = 10，10 + ${rest} = ${sum}。`,
          `先把 ${a} 湊成 10，再加剩下的數喔！`,
          `算算看，${a} 加 ${b} 等於多少？`,
        ),
      );
    } else if (mode === 1) {
      const a = randomInt(6, 9);
      const b = randomInt(11 - a, 9);
      const need = 10 - a;
      const rest = b - need;
      const built = buildNumericOptions(rest, [need, b, rest + 1], '', 1, 9);
      questions.push(
        makeQuestion(
          'g1s2-u2',
          seed,
          i,
          `算 ${a} + ${b} 時，把 ${b} 分成 ${need} 和 □，湊成 10 + □，□ 是多少？`,
          built,
          `因為 ${a} 和 ${need} 湊成 10，${b} 拿走 ${need} 還剩下 ${rest}，所以 □ 是 ${rest}。`,
          `想一想，${b} 可以分成 ${need} 和多少呢？`,
          `算 ${a} 加 ${b} 的時候，把 ${b} 分成 ${need} 和多少，就能湊成 10 加多少呢？`,
        ),
      );
    } else if (mode === 2) {
      const a = randomInt(4, 9);
      const bCandidates = Array.from({ length: 9 - (11 - a) + 1 }, (_, k) => 11 - a + k).filter(
        (v) => v !== a,
      );
      const b = pickRandom(bCandidates);
      const sum = a + b;
      if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(sum, [sum + 1, sum - 1, sum + 2], '', 10, 19);
        questions.push(
          makeQuestion(
            'g1s2-u2',
            seed,
            i,
            `已知 ${a} + ${b} = ${sum}，那麼 ${b} + ${a} 是多少？`,
            built,
            `加法前後兩個數交換位置，合起來還是一樣大，所以 ${b} + ${a} = ${sum}。`,
            '兩個數換位子相加，答案會不會變呢？',
            `如果 ${a} 加 ${b} 等於 ${sum}，那麼 ${b} 加 ${a} 是多少呢？`,
          ),
        );
      } else {
        const built = buildNumericOptions(b, [a, sum, b + 1], '', 2, 18);
        questions.push(
          makeQuestion(
            'g1s2-u2',
            seed,
            i,
            `□ + ${a} = ${a} + ${b}，□ 是多少？`,
            built,
            `等號兩邊要一樣大，${a} 和 ${b} 交換位置相加結果相同，所以 □ 是 ${b}。`,
            '看看等號右邊有哪兩個數字在相加！',
            `多少加 ${a}，會等於 ${a} 加 ${b} 呢？`,
          ),
        );
      }
    } else {
      const a = randomInt(5, 9);
      const b = randomInt(11 - a, 9);
      const sum = a + b;
      const built = buildNumericOptions(sum, [sum + 1, sum - 1, sum + 2], ' 顆', 10, 20);
      questions.push(
        makeQuestion(
          'g1s2-u2',
          seed,
          i,
          `箱子裡有 ${a} 顆紅球和 ${b} 顆白球，一共有幾顆球？`,
          built,
          `${a} + ${b} = ${sum} 顆，可以先湊成 10 再加剩下的數。`,
          `把 ${a} 顆和 ${b} 顆合起來，先湊成 10 最好算！`,
          `箱子裡有 ${a} 顆紅球和 ${b} 顆白球，請問一共有幾顆球呢？`,
        ),
      );
    }
  }
  return questions;
}

/** 一下第4單元：18以內退位減法 */
export function generateG1S2U4BorrowSub18(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const total = randomInt(11, 18);
      const sub = randomInt((total % 10) + 1, 9);
      const diff = total - sub;
      const built = buildNumericOptions(diff, [diff + 1, Math.max(1, diff - 1), diff + 10], '', 1, 18);
      questions.push(
        makeQuestion(
          'g1s2-u4',
          seed,
          i,
          `算算看：${total} - ${sub} = ？`,
          built,
          `把 ${total} 分成 10 和 ${total - 10}，先算 10 - ${sub} = ${10 - sub}，再算 ${10 - sub} + ${total - 10} = ${diff}。`,
          `個位不夠減時，可以先用 10 去減 ${sub}，再加上剩下的 ${total - 10} 喔！`,
          `算算看，${total} 減 ${sub} 等於多少？`,
        ),
      );
    } else if (mode === 1) {
      const total = randomInt(11, 18);
      const sub = randomInt((total % 10) + 1, 9);
      const diff = total - sub;
      const built = buildNumericOptions(diff, [diff + 1, Math.max(1, diff - 1), sub], ' 顆', 1, 18);
      questions.push(
        makeQuestion(
          'g1s2-u4',
          seed,
          i,
          `盤子裡有 ${total} 顆草莓，吃掉了 ${sub} 顆，還剩下幾顆？`,
          built,
          `${total} - ${sub} = ${diff} 顆。`,
          `先用 10 減掉 ${sub}，再加上 ${total - 10} 就對了！`,
          `盤子裡原本有 ${total} 顆草莓，吃掉了 ${sub} 顆，還剩下幾顆呢？`,
        ),
      );
    } else if (mode === 2) {
      const total = randomInt(11, 18);
      const sub = randomInt((total % 10) + 1, 9);
      const diff = total - sub;
      const built = buildNumericOptions(diff, [diff + 1, Math.max(1, diff - 1), sub], ' 張', 1, 18);
      questions.push(
        makeQuestion(
          'g1s2-u4',
          seed,
          i,
          `哥哥有 ${total} 張卡片，妹妹有 ${sub} 張，妹妹比哥哥少幾張？`,
          built,
          `比較誰多誰少用減法：${total} - ${sub} = ${diff} 張。`,
          `用哥哥的 ${total} 張減去妹妹的 ${sub} 張！`,
          `哥哥有 ${total} 張卡片，妹妹有 ${sub} 張卡片，請問妹妹比哥哥少幾張呢？`,
        ),
      );
    } else {
      if (randomInt(0, 1) === 0) {
        const sub = randomInt(5, 8);
        const start = randomInt(Math.max(13, sub + 5), 17);
        const r1 = start - sub;
        const r2 = start - 1 - sub;
        const ans = start - 2 - sub;
        const built = buildNumericOptions(ans, [ans + 1, Math.max(1, ans - 1), ans + 2], '', 1, 12);
        questions.push(
          makeQuestion(
            'g1s2-u4',
            seed,
            i,
            `找規律：${start} - ${sub} = ${r1}，${start - 1} - ${sub} = ${r2}，${start - 2} - ${sub} = □，□ 是多少？`,
            built,
            `被減數每次少 1，減數都是 ${sub}，答案也會每次少 1，所以 □ 是 ${ans}。`,
            '看前兩個算式的答案每次少多少喔！',
            `看一看算式的規律：${start} 減 ${sub} 等於 ${r1}，${start - 1} 減 ${sub} 等於 ${r2}，那麼 ${start - 2} 減 ${sub} 等於多少呢？`,
          ),
        );
      } else {
        const total = randomInt(11, 18);
        const left = randomInt((total % 10) + 1, 9);
        const eaten = total - left;
        const built = buildNumericOptions(eaten, [eaten + 1, Math.max(1, eaten - 1), left], ' 顆', 1, 18);
        questions.push(
          makeQuestion(
            'g1s2-u4',
            seed,
            i,
            `盒子裡原有 ${total} 顆糖果，吃掉一些後還剩 ${left} 顆，吃掉了幾顆？`,
            built,
            `原本的 ${total} 顆減去剩下的 ${left} 顆，就知道吃掉了 ${total} - ${left} = ${eaten} 顆。`,
            `用原本的 ${total} 顆減掉剩下的 ${left} 顆！`,
            `盒子裡原本有 ${total} 顆糖果，吃掉一些後還剩下 ${left} 顆，請問吃掉了幾顆呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 一下第6單元：100以內的數、五個一數與百數表規律 */
export function generateG1S2U6Numbers100(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const tens = randomInt(5, 9);
      const ones = pickRandom([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== tens));
      const num = tens * 10 + ones;
      if (randomInt(0, 1) === 0) {
        const askTens = randomInt(0, 1) === 0;
        const ans = askTens ? tens : ones;
        const other = askTens ? ones : tens;
        const built = buildNumericOptions(ans, [other, tens * 10, ans + 1], '', 1, 99);
        questions.push(
          makeQuestion(
            'g1s2-u6',
            seed,
            i,
            `「${num}」的「${askTens ? '十位' : '個位'}」數字是多少？`,
            built,
            `${num} 的左邊是十位（${tens}），右邊是個位（${ones}），所以${askTens ? '十位' : '個位'}數字是 ${ans}。`,
            '右邊第一位是「個位」，左邊第二位是「十位」！',
            `請問在 ${num} 這個數字裡，${askTens ? '十位' : '個位'}的數字是多少？`,
          ),
        );
      } else {
        const built = buildNumericOptions(
          num,
          [ones * 10 + tens, tens + ones, num + 10],
          '',
          10,
          99,
        );
        questions.push(
          makeQuestion(
            'g1s2-u6',
            seed,
            i,
            `十位是 ${tens}、個位是 ${ones} 的數是多少？`,
            built,
            `十位是 ${tens} 表示 ${tens * 10}，個位是 ${ones} 表示 ${ones}，合起來是 ${num}。`,
            '把十位數字寫在左邊，個位數字寫在右邊！',
            `十位是 ${tens}、個位是 ${ones} 的數是多少呢？`,
          ),
        );
      }
    } else if (mode === 1) {
      const byFive = randomInt(0, 1) === 0;
      const step = byFive ? 5 : 10;
      const start = byFive
        ? pickRandom([50, 55, 60, 65, 70, 75, 80])
        : pickRandom([40, 50, 60, 53, 63]);
      const seq = [start, start + step, start + step * 2, start + step * 3];
      const hideIdx = randomInt(1, 2);
      const ans = seq[hideIdx];
      const display = seq.map((v, idx) => (idx === hideIdx ? '□' : String(v))).join('、');
      const spokenSeq = seq
        .map((v, idx) => (idx === hideIdx ? '多少' : String(v)))
        .join('、');
      const built = buildNumericOptions(ans, [ans + 1, ans - 1, ans + step], '', 30, 100);
      questions.push(
        makeQuestion(
          'g1s2-u6',
          seed,
          i,
          `${step} 個一數：${display}，□ 是多少？`,
          built,
          `每次都多 ${step}：${seq.join('、')}，所以 □ 是 ${ans}。`,
          `前一個數加上 ${step} 就能找到答案喔！`,
          `${step} 個一數，${spokenSeq}，空格裡是多少呢？`,
        ),
      );
    } else if (mode === 2) {
      const row = randomInt(2, 7);
      const col = randomInt(2, 8);
      const n = row * 10 + col;
      const dirs = [
        { label: '正下面', ans: n + 10, explain: '在百數表往下移一格會多 10' },
        { label: '正上面', ans: n - 10, explain: '在百數表往上移一格會少 10' },
        { label: '右邊', ans: n + 1, explain: '在百數表往右移一格會多 1' },
        { label: '左邊', ans: n - 1, explain: '在百數表往左移一格會少 1' },
      ] as const;
      const picked = pickRandom(dirs);
      const distractors = dirs.filter((d) => d.ans !== picked.ans).map((d) => String(d.ans));
      const built = buildStringOptions(String(picked.ans), distractors);
      questions.push(
        makeQuestion(
          'g1s2-u6',
          seed,
          i,
          `在百數表上，「${n}」${picked.label}一格的數字是多少？`,
          built,
          `${picked.explain}，所以是 ${picked.ans}。`,
          '百數表一排有 10 個數，左右差 1，上下差 10！',
          `在百數表上，${n} 的${picked.label}那一格是哪一個數字呢？`,
        ),
      );
    } else {
      if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(100, [10, 50, 90], '', 10, 100);
        questions.push(
          makeQuestion(
            'g1s2-u6',
            seed,
            i,
            '10 個十合起來是多少？',
            built,
            '十個十個數：10、20、30、40、50、60、70、80、90、100，所以 10 個十是 100。',
            '90 再多 1 個十是多少呢？',
            '請問 10 個十合起來是多少？',
          ),
        );
      } else {
        const a = randomInt(5, 8);
        const b = a + 1;
        const n1 = a * 10 + b;
        const n2 = b * 10 + a;
        const n3 = a * 10 + a;
        const n4 = b * 10 + b;
        const nums = [n1, n2, n3, n4];
        const askMax = randomInt(0, 1) === 0;
        const ans = askMax ? Math.max(...nums) : Math.min(...nums);
        const others = nums.filter((v) => v !== ans);
        const built = buildStringOptions(String(ans), others.map(String));
        questions.push(
          makeQuestion(
            'g1s2-u6',
            seed,
            i,
            askMax ? '下面哪一個數字「最大」？' : '下面哪一個數字「最小」？',
            built,
            `先比十位數字，十位一樣再比個位數字，${askMax ? '最大' : '最小'}的是 ${ans}。`,
            '先比較左邊的十位數字大小，十位相同再比右邊的個位！',
            askMax ? '比比看，下面哪一個數字最大？' : '比比看，下面哪一個數字最小？',
          ),
        );
      }
    }
  }
  return questions;
}

/** 一下第7單元：認識 1/5/10/50 元錢幣與合計金額 */
export function generateG1S2U7Coins(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const c50 = randomInt(0, 1);
      const c10 = randomInt(1, 3);
      const c5 = randomInt(0, 1);
      const c1 = randomInt(1, 4);
      const total = c50 * 50 + c10 * 10 + c5 * 5 + c1;
      const parts: string[] = [];
      if (c50 > 0) parts.push(`${c50} 個 50 元`);
      if (c10 > 0) parts.push(`${c10} 個 10 元`);
      if (c5 > 0) parts.push(`${c5} 個 5 元`);
      if (c1 > 0) parts.push(`${c1} 個 1 元`);
      const desc =
        parts.length > 1
          ? `${parts.slice(0, -1).join('、')}和 ${parts[parts.length - 1]}`
          : parts[0];
      const built = buildNumericOptions(
        total,
        [total + 5, Math.max(5, total - 5), total + 10],
        ' 元',
        1,
        100,
      );
      questions.push(
        makeQuestion(
          'g1s2-u7',
          seed,
          i,
          `有 ${desc}，合起來共有幾元？`,
          built,
          `把錢幣從大到小加起來：${c50 * 50 + c10 * 10 + c5 * 5} + ${c1} = ${total} 元。`,
          '先數 50 元和 10 元，再加 5 元和 1 元！',
          `有 ${desc}，請問合起來一共有幾元呢？`,
        ),
      );
    } else if (mode === 1) {
      const convPool = [
        {
          q: '1 個 10 元可以換成幾個 1 元？',
          speech: '1 個 10 元硬幣，可以換成幾個 1 元硬幣呢？',
          ans: 10,
          traps: [5, 2, 20],
          explain: '1 個 10 元剛好可以換成 10 個 1 元。',
        },
        {
          q: '1 個 10 元可以換成幾個 5 元？',
          speech: '1 個 10 元硬幣，可以換成幾個 5 元硬幣呢？',
          ans: 2,
          traps: [5, 10, 1],
          explain: '5 + 5 = 10，所以 1 個 10 元可以換成 2 個 5 元。',
        },
        {
          q: '1 個 50 元可以換成幾個 10 元？',
          speech: '1 個 50 元硬幣，可以換成幾個 10 元硬幣呢？',
          ans: 5,
          traps: [10, 2, 50],
          explain: '10、20、30、40、50，5 個 10 元就是 50 元。',
        },
        {
          q: '1 個 50 元可以換成幾個 5 元？',
          speech: '1 個 50 元硬幣，可以換成幾個 5 元硬幣呢？',
          ans: 10,
          traps: [5, 2, 20],
          explain: '10 個 5 元合起來就是 50 元。',
        },
        {
          q: '1 張 100 元可以換成幾個 50 元？',
          speech: '1 張 100 元紙鈔，可以換成幾個 50 元硬幣呢？',
          ans: 2,
          traps: [5, 10, 1],
          explain: '50 + 50 = 100，所以 1 張 100 元可以換 2 個 50 元。',
        },
        {
          q: '1 張 100 元可以換成幾個 10 元？',
          speech: '1 張 100 元紙鈔，可以換成幾個 10 元硬幣呢？',
          ans: 10,
          traps: [5, 20, 50],
          explain: '10 個 10 元合起來就是 100 元。',
        },
      ] as const;
      const item = pickRandom(convPool);
      const built = buildNumericOptions(item.ans, [...item.traps], ' 個', 1, 50);
      questions.push(
        makeQuestion(
          'g1s2-u7',
          seed,
          i,
          item.q,
          built,
          item.explain,
          '用幾個硬幣加起來會剛好等於原本的錢呢？',
          item.speech,
        ),
      );
    } else if (mode === 2) {
      if (randomInt(0, 1) === 0) {
        const tens = randomInt(2, 5);
        const ones = randomInt(1, 9);
        const price = tens * 10 + ones;
        const ans = tens + 1;
        const built = buildNumericOptions(ans, [tens, tens + 2, Math.max(1, tens - 1)], ' 個', 1, 10);
        questions.push(
          makeQuestion(
            'g1s2-u7',
            seed,
            i,
            `一個麵包 ${price} 元，全部用 10 元硬幣付，最少要付幾個 10 元？`,
            built,
            `${tens} 個 10 元只有 ${tens * 10} 元不夠，還要再多付 1 個 10 元變成 ${ans * 10} 元才夠，所以最少要 ${ans} 個。`,
            `只付 ${tens} 個 10 元夠不夠 ${price} 元呢？`,
            `一個麵包賣 ${price} 元，全部用 10 元硬幣去買，最少要付幾個 10 元才夠呢？`,
          ),
        );
      } else {
        const has = randomInt(15, 35);
        const diff = randomInt(4, 15);
        const price = has + diff;
        const built = buildNumericOptions(diff, [diff + 1, Math.max(1, diff - 1), diff + 10], ' 元', 1, 50);
        questions.push(
          makeQuestion(
            'g1s2-u7',
            seed,
            i,
            `一本筆記本 ${price} 元，小明只有 ${has} 元，還差幾元才夠買？`,
            built,
            `用價錢減掉現有的錢：${price} - ${has} = ${diff} 元。`,
            `從 ${has} 元算到 ${price} 元，還缺多少元呢？`,
            `一本筆記本要 ${price} 元，小明只有 ${has} 元，還差幾元才夠買呢？`,
          ),
        );
      }
    } else {
      const pay50 = randomInt(0, 1) === 0;
      const paid = pay50 ? 50 : 100;
      const price = pay50 ? randomInt(15, 45) : randomInt(45, 85);
      const change = paid - price;
      const built = buildNumericOptions(
        change,
        [change + 5, Math.max(1, change - 5), change + 10],
        ' 元',
        1,
        90,
      );
      questions.push(
        makeQuestion(
          'g1s2-u7',
          seed,
          i,
          `買一個 ${price} 元的${pay50 ? '包子' : '鉛筆盒'}，付 ${pay50 ? '1 個 50 元' : '1 張 100 元'}，要找回幾元？`,
          built,
          `付出的錢減掉商品價錢：${paid} - ${price} = ${change} 元。`,
          `用 ${paid} 元減去 ${price} 元算算看！`,
          `買一個 ${price} 元的${pay50 ? '包子' : '鉛筆盒'}，付了 ${paid} 元，要找回幾元呢？`,
        ),
      );
    }
  }
  return questions;
}

/** 一下第8單元：二位數加減 */
export function generateG1S2U8AddSub2Digits(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const a = randomInt(15, 58);
      const b = randomInt(6, Math.min(39, 98 - a));
      const ans = a + b;
      const built = buildNumericOptions(ans, [ans + 10, Math.max(10, ans - 10), ans + 1], '', 10, 99);
      questions.push(
        makeQuestion(
          'g1s2-u8',
          seed,
          i,
          `算算看：${a} + ${b} = ？`,
          built,
          `個位和個位相加，十位和十位相加（滿 10 個一就換成 1 個十），${a} + ${b} = ${ans}。`,
          '先算個位加個位，滿 10 記得要進位到十位喔！',
          `算算看，${a} 加 ${b} 等於多少？`,
        ),
      );
    } else if (mode === 1) {
      const a = randomInt(35, 95);
      const b = randomInt(8, a - 12);
      const ans = a - b;
      const built = buildNumericOptions(ans, [ans + 10, Math.max(1, ans - 10), ans + 1], '', 1, 99);
      questions.push(
        makeQuestion(
          'g1s2-u8',
          seed,
          i,
          `算算看：${a} - ${b} = ？`,
          built,
          `個位減個位，十位減十位（個位不夠減時，從十位借 1 個十換成 10 個一），${a} - ${b} = ${ans}。`,
          '個位不夠減的時候，記得把 1 個十元換成 10 個一元再減！',
          `算算看，${a} 減 ${b} 等於多少？`,
        ),
      );
    } else if (mode === 2) {
      if (randomInt(0, 1) === 0) {
        const a = randomInt(22, 48);
        const b = randomInt(15, 45);
        const ans = a + b;
        const built = buildNumericOptions(
          ans,
          [ans + 10, Math.max(10, ans - 10), ans + 1],
          ' 元',
          20,
          99,
        );
        questions.push(
          makeQuestion(
            'g1s2-u8',
            seed,
            i,
            `鉛筆盒 ${a} 元，彩色筆 ${b} 元，各買一個一共要幾元？`,
            built,
            `把兩樣東西的價錢合起來：${a} + ${b} = ${ans} 元。`,
            '買兩樣東西合起來要付多少錢，要用加法喔！',
            `鉛筆盒 ${a} 元，彩色筆 ${b} 元，各買一個一共要幾元呢？`,
          ),
        );
      } else {
        const a = randomInt(45, 95);
        const b = randomInt(18, a - 12);
        const ans = a - b;
        const built = buildNumericOptions(
          ans,
          [ans + 10, Math.max(1, ans - 10), ans + 1],
          ' 元',
          1,
          95,
        );
        questions.push(
          makeQuestion(
            'g1s2-u8',
            seed,
            i,
            `小美帶了 ${a} 元，買書花了 ${b} 元，還剩下幾元？`,
            built,
            `原來的錢減掉花掉的錢：${a} - ${b} = ${ans} 元。`,
            '買東西花錢會變少，要用減法喔！',
            `小美帶了 ${a} 元，買書花了 ${b} 元，請問還剩下幾元呢？`,
          ),
        );
      }
    } else {
      if (randomInt(0, 1) === 0) {
        const a = randomInt(11, 18);
        const b = randomInt(11, 18);
        const ans = a + b;
        const built = buildNumericOptions(ans, [ans + 10, ans - 10, ans + 1], ' 個', 20, 50);
        questions.push(
          makeQuestion(
            'g1s2-u8',
            seed,
            i,
            `一甲有 ${a} 個男生和 ${b} 個女生，一共有幾個小朋友？`,
            built,
            `把男生和女生人數加起來：${a} + ${b} = ${ans} 個小朋友。`,
            '把兩個數字加在一起算算看！',
            `一甲有 ${a} 個男生和 ${b} 個女生，一共有幾個小朋友呢？`,
          ),
        );
      } else {
        const a = randomInt(28, 55);
        const b = randomInt(12, a - 5);
        const ans = a - b;
        const built = buildNumericOptions(
          ans,
          [ans + 10, Math.max(1, ans - 10), ans + 1],
          ' 顆',
          1,
          50,
        );
        questions.push(
          makeQuestion(
            'g1s2-u8',
            seed,
            i,
            `籃子裡有 ${a} 顆蘋果和 ${b} 顆橘子，蘋果比橘子多幾顆？`,
            built,
            `比較兩種水果誰多誰少，用減法：${a} - ${b} = ${ans} 顆。`,
            `用 ${a} 減去 ${b} 算算看喔！`,
            `籃子裡有 ${a} 顆蘋果和 ${b} 顆橘子，請問蘋果比橘子多幾顆呢？`,
          ),
        );
      }
    }
  }
  return questions;
}

/** 一下第9單元：幾月幾日星期幾、昨天今天明天與月曆判讀 */
export function generateG1S2U9CalendarDate(count = 6): Question[] {
  const seed = nextSeed();
  const questions: Question[] = [];
  const monthDays: readonly [number, number][] = [
    [1, 31],
    [3, 31],
    [4, 30],
    [5, 31],
    [6, 30],
    [7, 31],
    [8, 31],
    [9, 30],
    [10, 31],
    [11, 30],
    [12, 31],
  ];

  for (let i = 0; i < count; i++) {
    const mode = i % 4;
    if (mode === 0) {
      const today = randomInt(0, 6);
      const yesterday = (today + 6) % 7;
      const tomorrow = (today + 1) % 7;
      const variant = randomInt(0, 3);
      let prompt = '';
      let speech = '';
      let ans = '';
      let explain = '';
      if (variant === 0) {
        ans = WEEKDAYS[tomorrow];
        prompt = `今天是${WEEKDAYS[today]}，明天是星期幾？`;
        speech = `今天是${WEEKDAYS[today]}，請問明天是星期幾呢？`;
        explain = `${WEEKDAYS[today]}的下一天（明天）是${ans}。`;
      } else if (variant === 1) {
        ans = WEEKDAYS[yesterday];
        prompt = `今天是${WEEKDAYS[today]}，昨天是星期幾？`;
        speech = `今天是${WEEKDAYS[today]}，請問昨天是星期幾呢？`;
        explain = `${WEEKDAYS[today]}的前一天（昨天）是${ans}。`;
      } else if (variant === 2) {
        ans = WEEKDAYS[today];
        prompt = `昨天是${WEEKDAYS[yesterday]}，今天是星期幾？`;
        speech = `昨天是${WEEKDAYS[yesterday]}，請問今天是星期幾呢？`;
        explain = `昨天的下一天就是今天，${WEEKDAYS[yesterday]}的下一天是${ans}。`;
      } else {
        ans = WEEKDAYS[today];
        prompt = `明天是${WEEKDAYS[tomorrow]}，今天是星期幾？`;
        speech = `明天是${WEEKDAYS[tomorrow]}，請問今天是星期幾呢？`;
        explain = `明天的前一天就是今天，${WEEKDAYS[tomorrow]}的前一天是${ans}。`;
      }
      const distractors = shuffle(WEEKDAYS.filter((w) => w !== ans)).slice(0, 3);
      const built = buildStringOptions(ans, distractors);
      questions.push(
        makeQuestion(
          'g1s2-u9',
          seed,
          i,
          prompt,
          built,
          explain,
          '從星期日、星期一、星期二……一路念過去，記住星期六的後面又是星期日喔！',
          speech,
        ),
      );
    } else if (mode === 1) {
      const [m, maxD] = pickRandom(monthDays);
      if (m < 12 && randomInt(0, 4) === 0) {
        const ans = `${m + 1} 月 1 日`;
        const built = buildStringOptions(ans, [
          `${m} 月 ${maxD + 1} 日`,
          `${m + 1} 月 2 日`,
          `${m} 月 ${maxD - 1} 日`,
        ]);
        questions.push(
          makeQuestion(
            'g1s2-u9',
            seed,
            i,
            `這個月的最後一天是 ${m} 月 ${maxD} 日，明天是幾月幾日？`,
            built,
            `${m} 月最後一天過完，明天就會進到下一個月 ${m + 1} 月 1 日。`,
            '這個月的最後一天過完，就要換下一個月的 1 日囉！',
            `這個月的最後一天是 ${m} 月 ${maxD} 日，請問明天是幾月幾日呢？`,
          ),
        );
      } else {
        const d = randomInt(3, maxD - 2);
        const askTomorrow = randomInt(0, 1) === 0;
        const ansDay = askTomorrow ? d + 1 : d - 1;
        const ans = `${m} 月 ${ansDay} 日`;
        const built = buildStringOptions(ans, [
          `${m} 月 ${askTomorrow ? d - 1 : d + 1} 日`,
          `${m} 月 ${d + 2} 日`,
          `${m === 12 ? 1 : m + 1} 月 ${d} 日`,
        ]);
        questions.push(
          makeQuestion(
            'g1s2-u9',
            seed,
            i,
            `今天是 ${m} 月 ${d} 日，${askTomorrow ? '明天' : '昨天'}是幾月幾日？`,
            built,
            askTomorrow
              ? `明天要多 1 天，所以是 ${ans}。`
              : `昨天要少 1 天，所以是 ${ans}。`,
            askTomorrow ? '明天就是日期多 1 天喔！' : '昨天就是日期少 1 天喔！',
            `今天是 ${m} 月 ${d} 日，請問${askTomorrow ? '明天' : '昨天'}是幾月幾日呢？`,
          ),
        );
      }
    } else if (mode === 2) {
      const variant = randomInt(0, 2);
      if (variant === 0) {
        const m = randomInt(1, 12);
        const d = randomInt(1, 21);
        const wd = pickRandom(WEEKDAYS);
        const ans = `${m} 月 ${d + 7} 日`;
        const built = buildStringOptions(ans, [
          `${m} 月 ${d + 1} 日`,
          `${m} 月 ${d + 6} 日`,
          `${m} 月 ${d + 8} 日`,
        ]);
        questions.push(
          makeQuestion(
            'g1s2-u9',
            seed,
            i,
            `月曆上，${m} 月 ${d} 日是${wd}，下一個${wd}是幾月幾日？`,
            built,
            `一個星期有 7 天，所以同一個星期幾在月曆上會多 7 天：${d} + 7 = ${d + 7}，是 ${ans}。`,
            '一個星期有 7 天，把日期加上 7 算算看！',
            `在月曆上，${m} 月 ${d} 日是${wd}，請問下一個${wd}是幾月幾日呢？`,
          ),
        );
      } else if (variant === 1) {
        const m = randomInt(1, 12);
        const d = randomInt(10, 28);
        const wd = pickRandom(WEEKDAYS);
        const ans = `${m} 月 ${d - 7} 日`;
        const built = buildStringOptions(ans, [
          `${m} 月 ${d - 1} 日`,
          `${m} 月 ${d - 6} 日`,
          `${m} 月 ${d - 8} 日`,
        ]);
        questions.push(
          makeQuestion(
            'g1s2-u9',
            seed,
            i,
            `月曆上，${m} 月 ${d} 日是${wd}，上一個${wd}是幾月幾日？`,
            built,
            `一個星期有 7 天，往前推一週要減 7：${d} - 7 = ${d - 7}，是 ${ans}。`,
            '一個星期有 7 天，上一個星期要把日期減 7 喔！',
            `在月曆上，${m} 月 ${d} 日是${wd}，請問上一個${wd}是幾月幾日呢？`,
          ),
        );
      } else if (randomInt(0, 1) === 0) {
        const built = buildNumericOptions(7, [5, 6, 10], ' 天', 1, 14);
        questions.push(
          makeQuestion(
            'g1s2-u9',
            seed,
            i,
            '一個星期一共有幾天？',
            built,
            '星期日、星期一、星期二、星期三、星期四、星期五、星期六，一個星期共有 7 天。',
            '從星期一數到星期日，數數看有幾天！',
            '請問一個星期一共有幾天呢？',
          ),
        );
      } else {
        const built = buildNumericOptions(12, [7, 10, 24], ' 個月', 1, 30);
        questions.push(
          makeQuestion(
            'g1s2-u9',
            seed,
            i,
            '一年一共有幾個月？',
            built,
            '從 1 月到 12 月，一年一共有 12 個月。',
            '想一想年曆上最後一個月是幾月？',
            '請問一年一共有幾個月呢？',
          ),
        );
      }
    } else {
      const m = randomInt(2, 9);
      const d1 = randomInt(3, 12);
      const d2 = d1 + randomInt(5, 12);
      const d3 = randomInt(1, 12);
      const d4 = randomInt(10, 25);
      const dates = [
        `${m} 月 ${d1} 日`,
        `${m} 月 ${d2} 日`,
        `${m + 1} 月 ${d3} 日`,
        `${m + 2} 月 ${d4} 日`,
      ];
      const askEarliest = randomInt(0, 1) === 0;
      const ans = askEarliest ? dates[0] : dates[3];
      const others = dates.filter((d) => d !== ans);
      const built = buildStringOptions(ans, others);
      questions.push(
        makeQuestion(
          'g1s2-u9',
          seed,
          i,
          askEarliest
            ? '在同一年裡，哪一個日期「最早到」？'
            : '在同一年裡，哪一個日期「最晚到」？',
          built,
          askEarliest
            ? `比日期先看「月分」，${m} 月比 ${m + 1} 月和 ${m + 2} 月早；同為 ${m} 月時，${d1} 日比 ${d2} 日早，所以最早到的是 ${ans}。`
            : `比日期先看「月分」，${m + 2} 月比 ${m} 月和 ${m + 1} 月都晚，所以最晚到的是 ${ans}。`,
          '先比幾月，再比幾日，越前面的日期越早到！',
          askEarliest
            ? '在同一年裡面，下面哪一個日期最早到呢？'
            : '在同一年裡面，下面哪一個日期最晚到呢？',
        ),
      );
    }
  }
  return questions;
}

// ============================================================
// 一上 第二單元：比長短
// ============================================================
export function generateG1S1U2CompareLength(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const a = randomInt(4, 8);
      const b = a + randomInt(2, 5);
      const c = b + randomInt(2, 5);
      const askLongest = randomInt(0, 1) === 0;
      const ans = askLongest ? `丙繩（${c} 格）` : `甲繩（${a} 格）`;
      const built = buildStringOptions(ans, [
        `乙繩（${b} 格）`,
        askLongest ? `甲繩（${a} 格）` : `丙繩（${c} 格）`,
        `丁繩（${a + 1} 格）`,
      ]);
      questions.push(
        makeQuestion(
          'g1s1-u2',
          seed,
          i,
          `在格子紙上拉直比較：甲繩佔 ${a} 格、乙繩佔 ${b} 格、丙繩佔 ${c} 格、丁繩佔 ${a + 1} 格。哪一條繩子「${askLongest ? '最長' : '最短'}」？`,
          built,
          `${c} > ${b} > ${a + 1} > ${a}，所以${askLongest ? '最長' : '最短'}的是 ${ans}。`,
          `數一數每一條繩子佔了幾格，格數越${askLongest ? '多越長' : '少越短'}！`,
          `請問哪一條繩子${askLongest ? '最長' : '最短'}呢？`,
        ),
      );
    } else if (type === 1) {
      const itemA = pickRandom(['紅鉛筆', '藍蠟筆', '綠尺子', '黃吸管']);
      const itemB = pickRandom(['小木棒', '花毛線', '紙膠帶', '橘彩帶']);
      const ans = '先把兩枝的一端對齊，再拉直比較另一端';
      const built = buildStringOptions(ans, [
        '把其中一枝彎起來再比',
        '隨便擺在桌上，看哪一枝顏色比較深',
        '只看右邊有沒有突出來，不管左邊有沒有對齊',
      ]);
      questions.push(
        makeQuestion(
          'g1s1-u2',
          seed,
          i,
          `拿 ${itemA} 和 ${itemB}「比長短」時，怎樣擺放才能比得最準確？`,
          built,
          '比長短一定要「拉直」並且「把其中一端對齊」，看另一端誰突出來就比較長！',
          '想想看，起跑線要對齊才公平喔！',
          `拿${itemA}和${itemB}比長短，要怎麼擺放才準確？`,
        ),
      );
    } else {
      const diff = randomInt(2, 6);
      const shortLen = randomInt(5, 10);
      const longLen = shortLen + diff;
      const built = buildNumericOptions(diff, [shortLen, longLen, diff + 1], ' 格', 1, 20);
      questions.push(
        makeQuestion(
          'g1s1-u2',
          seed,
          i,
          `一枝鉛筆和 ${longLen} 個一樣長的迴紋針一樣長，一塊橡皮擦和 ${shortLen} 個迴紋針一樣長。鉛筆比橡皮擦長幾個迴紋針？`,
          built,
          `用相同的迴紋針來比，${longLen} - ${shortLen} = ${diff}，所以長 ${diff} 個迴紋針。`,
          `把鉛筆的 ${longLen} 個減掉橡皮擦的 ${shortLen} 個！`,
          `鉛筆比橡皮擦長幾個迴紋針？`,
        ),
      );
    }
  }
  return questions;
}

// ============================================================
// 一上 第五單元：方盒、圓罐、球
// ============================================================
export function generateG1S1U5SolidShapes(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const target = pickRandom([
        { q: '往四面八方滾來滾去、沒有平平的面', a: '皮球（球體）', w: ['牙膏盒（長方體）', '魔術方塊（正方體）', '方糖（正方體）'] },
        { q: '直立時可以穩穩站著，橫放推一下會往前後滾動', a: '圓柱形飲料罐（圓罐）', w: ['籃球（球體）', '大紙箱（方盒）', '積木方塊（方盒）'] },
        { q: '有 6 個平平的面，每個面都長得一模一樣的正方形', a: '骰子（正方體）', w: ['橘子（球體）', '膠水瓶（圓罐）', '彈珠（球體）'] },
      ]);
      const built = buildStringOptions(target.a, target.w);
      questions.push(
        makeQuestion(
          'g1s1-u5',
          seed,
          i,
          `下面哪一種物品放在平平的地板上，「${target.q}」？`,
          built,
          `${target.a} 的特徵正是「${target.q}」。`,
          '想一想球、圓罐、方盒摸起來和滾動起來的樣子！',
          `下面哪一種物品${target.q}？`,
        ),
      );
    } else if (type === 1) {
      const a = randomInt(2, 5);
      const b = randomInt(2, 5);
      const ans = a + b;
      const built = buildNumericOptions(ans, [a, b, ans + 2], ' 個', 1, 15);
      questions.push(
        makeQuestion(
          'g1s1-u5',
          seed,
          i,
          `小美用積木堆城堡，用了 ${a} 個方盒積木和 ${b} 個圓罐積木，她一共用了幾個這兩種積木？`,
          built,
          `方盒和圓罐合起來有 ${a} + ${b} = ${ans} 個。`,
          '把方盒積木和圓罐積木的數量加起來！',
          `小美一共用了幾個這兩種積木？`,
        ),
      );
    } else {
      const built = buildStringOptions('圓罐（圓柱體）上下兩個面都是圓圓平平的', [
        '球體有很多平平的面，很容易疊高高',
        '方盒放在地上推一下會一直往旁邊滾',
        '正方體和球體都能像輪子一樣滾動',
      ]);
      questions.push(
        makeQuestion(
          'g1s1-u5',
          seed,
          i,
          '關於「方盒、圓罐、球」這三種立體形體，下面哪一句話是「正確」的？',
          built,
          '圓罐（圓柱體）上下有兩個平平的圓形面，可以站立；橫放時也能滾動。',
          '找找看哪一個符合我們平常摸到圓罐的樣子！',
          '關於方盒、圓罐和球，哪一句話是正確的？',
        ),
      );
    }
  }
  return questions;
}

// ============================================================
// 一下 第三單元：圖形與分類
// ============================================================
export function generateG1S2U3PlaneShapes(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const item = pickRandom([
        { desc: '有 3 條直直的邊和 3 個尖尖的角', ans: '三角形', wrong: ['圓形', '正方形', '長方形'] },
        { desc: '邊緣彎彎的、沒有尖尖的角', ans: '圓形', wrong: ['三角形', '正方形', '長方形'] },
        { desc: '有 4 條一樣長的直邊和 4 個直角', ans: '正方形', wrong: ['三角形', '圓形', '長方形'] },
        { desc: '有 4 條直直的邊，對面兩條邊一樣長，但相鄰的邊一長一短', ans: '長方形', wrong: ['三角形', '圓形', '正方形'] },
      ]);
      const built = buildStringOptions(item.ans, item.wrong);
      questions.push(
        makeQuestion(
          'g1s2-u3',
          seed,
          i,
          `下面哪一種平面圖形「${item.desc}」？`,
          built,
          `${item.ans} 的特徵是「${item.desc}」。`,
          '數一數這個圖形有幾條邊、幾個角！',
          `下面哪一種平面圖形${item.desc}？`,
        ),
      );
    } else if (type === 1) {
      const tri = randomInt(3, 6);
      const sq = randomInt(2, 5);
      const cir = randomInt(2, 6);
      const askShape = pickRandom(['三角形', '正方形', '圓形']);
      const ans = askShape === '三角形' ? tri : askShape === '正方形' ? sq : cir;
      const built = buildNumericOptions(ans, [tri + sq, ans + 2, Math.max(1, ans - 1)], ' 個', 1, 20);
      questions.push(
        makeQuestion(
          'g1s2-u3',
          seed,
          i,
          `桌子上有 ${tri} 個三角形、${sq} 個正方形和 ${cir} 個圓形紙卡。如果按「形狀」分類，${askShape}一共有幾個？`,
          built,
          `把所有${askShape}分在一起數，一共有 ${ans} 個。`,
          `只看題目裡提到的「${askShape}」有幾個喔！`,
          `按形狀分類，${askShape}一共有幾個？`,
        ),
      );
    } else {
      const red = randomInt(3, 7);
      const blue = randomInt(2, 6);
      const ans = red + blue;
      const built = buildNumericOptions(ans, [red, blue, ans + 2], ' 個', 1, 20);
      questions.push(
        makeQuestion(
          'g1s2-u3',
          seed,
          i,
          `把圖形紙卡按「顏色」分成紅色和藍色兩堆：紅色有 ${red} 個，藍色有 ${blue} 個。這兩堆合起來一共有幾個圖形紙卡？`,
          built,
          `把紅色和藍色的數量加起來：${red} + ${blue} = ${ans} 個。`,
          '把兩堆紙卡的數量加在一起！',
          '這兩堆合起來一共有幾個圖形紙卡？',
        ),
      );
    }
  }
  return questions;
}

// ============================================================
// 一下 第五單元：有多長
// ============================================================
export function generateG1S2U5LengthMeasure(count = 6): Question[] {
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 3;
    if (type === 0) {
      const a = randomInt(4, 9);
      const b = a + randomInt(2, 5);
      const built = buildNumericOptions(a + b, [b - a, a * 2, a + b + 2], ' 個', 1, 30);
      questions.push(
        makeQuestion(
          'g1s2-u5',
          seed,
          i,
          `紅筆和 ${a} 個橡皮擦一樣長，藍筆和 ${b} 個橡皮擦一樣長。把紅筆和藍筆接在一起，總共會和幾個橡皮擦一樣長？`,
          built,
          `因為都用一樣長的橡皮擦量，接在一起就是 ${a} + ${b} = ${a + b} 個橡皮擦長。`,
          '把兩枝筆各自量出來的橡皮擦數量加起來！',
          '紅筆和藍筆接在一起，和幾個橡皮擦一樣長？',
        ),
      );
    } else if (type === 1) {
      const built = buildStringOptions('書桌比較寬', [
        '書櫃比較寬',
        '書桌和書櫃一樣寬',
        '無法比較',
      ]);
      questions.push(
        makeQuestion(
          'g1s2-u5',
          seed,
          i,
          '用一條藍繩子量書桌剛好一樣寬，這條藍繩子又比書櫃還要長一點。請問「書桌」和「書櫃」哪一個比較寬？',
          built,
          '書桌 ＝ 藍繩子，而藍繩子 ＞ 書櫃，所以書桌比書櫃寬！',
          '用藍繩子當作中間的小幫手來比一比！',
          '書桌和書櫃哪一個比較寬？',
        ),
      );
    } else {
      const clips = randomInt(6, 12);
      const ans = `${clips} 個迴紋針`;
      const built = buildStringOptions(ans, [
        `${clips - 2} 個迴紋針`,
        `${clips + 3} 個迴紋針`,
        '必須用不同大小的迴紋針混在一起量',
      ]);
      questions.push(
        makeQuestion(
          'g1s2-u5',
          seed,
          i,
          `用「一樣大的迴紋針」一個接一個排直，從起點排到終點剛好用了 ${clips} 個，沒有空隙也沒有重疊。這本課本的寬度大約是多少？`,
          built,
          `從頭到尾不留空隙也不重疊地排了 ${clips} 個相同的迴紋針，長度就是 ${clips} 個迴紋針長。`,
          '數一數總共接了幾個一樣大的迴紋針！',
          `這本課本的寬度大約是多少？`,
        ),
      );
    }
  }
  return questions;
}

