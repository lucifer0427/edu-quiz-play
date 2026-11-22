import type { Grade, Question, WorkedExampleData } from '../types/quiz.ts';

function splitExplanationClauses(explanation: string): string[] {
  const cleaned = explanation.trim();
  if (!cleaned) return [];

  const primary = cleaned
    .split(/[。；！\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (primary.length >= 2) {
    return primary.slice(0, 4);
  }

  const secondary = cleaned
    .split(/[，,、]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (secondary.length >= 2) {
    return secondary.slice(0, 4);
  }

  return [cleaned];
}

function detectCommonErrorContrast(question: Question): string {
  const text = `${question.prompt} ${question.explanation}`;

  if (/約分|通分|分母|分子|帶分數|假分數|分數/.test(text)) {
    return '常見錯誤：分數加減時忘記先通分就把分母直接相加減，或計算後忘記化為最簡分數。';
  }
  if (/小數點|三位小數|二位小數|一位小數|小數/.test(text)) {
    return '常見錯誤：小數加減沒有對齊小數點，或小數乘法算完忘記點上正確位數的小數點。';
  }
  if (/最大公因數|最小公倍數|因數|倍數|質因數/.test(text)) {
    return '常見錯誤：把「因數（能整除的較小數）」和「倍數（乘出來的較大數）」搞混，或漏算 1 與數字本身。';
  }
  if (/表面積|體積|周長|面積|立方|平方/.test(text)) {
    return '常見錯誤：把「周長（外圍邊長總和）」和「面積（內部大小）」搞混，或漏乘正方形／三角形／長方體的成對面數。';
  }
  if (/括號|先乘除|後加減|四則|併式/.test(text)) {
    return '常見錯誤：沒有遵守「括號優先、先乘除後加減」，直接由左往右硬算導致結果錯誤。';
  }
  if (/公升|毫升|公斤|公克|公里|公尺|公分|毫米|公噸|公頃|公畝/.test(text)) {
    return '常見錯誤：單位換算倍率記錯（如 10、100、1000 倍）或大單位換小單位時方向乘反。';
  }
  if (/小時|分鐘|秒|點|上午|下午|星期|天/.test(text)) {
    return '常見錯誤：把時間計算當成十進位來進位／借位（正確應為 1 小時 = 60 分、1 分 = 60 秒）。';
  }
  if (/百分率|比率|折|加成|速率|距離|時間/.test(text)) {
    return '常見錯誤：打折時把「打八折（× 0.8）」和「省下兩成（× 0.2）」搞反，或速率公式沒有對齊相同時間單位。';
  }
  if (/進位|退位|借位|乘|除|餘數/.test(text)) {
    return '常見錯誤：直式計算時忘記加進位或減去借位，或除法餘數沒有小於除數。';
  }
  return '常見錯誤：沒有先圈出題目要問的目標與單位，急著把出現的數字直接相加或相乘。';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskAnswerInText(text: string, correctOption: string): string {
  const trimmedOpt = correctOption.trim();
  if (!trimmedOpt) return text;

  let masked = text;
  const fullEscaped = escapeRegExp(trimmedOpt);
  if (/^\d+(\.\d+)?$/.test(trimmedOpt)) {
    masked = masked.replace(
      new RegExp(`(?<!\\d)${fullEscaped}(?!\\d)`, 'g'),
      '（？）',
    );
  } else {
    masked = masked.replace(new RegExp(fullEscaped, 'g'), '（？）');
  }

  const numericMatch = /^(\d+(?:\.\d+)?)\s*[^\d\s]+$/.exec(trimmedOpt);
  if (numericMatch) {
    const numEscaped = escapeRegExp(numericMatch[1]);
    masked = masked.replace(
      new RegExp(`(?<!\\d)${numEscaped}(?!\\d)`, 'g'),
      '（？）',
    );
  }

  return masked;
}

function extractKeyTerms(prompt: string): string[] {
  const terms: string[] = [];
  const matches = prompt.match(
    /\d+(?:\.\d+)?(?:\/\d+)?(?:\s*[元顆條朵張個隻公分公尺公里毫米公升毫升公斤公克平方立方小時分鐘秒歲折%]+)?/g,
  );
  if (matches) {
    for (const m of matches) {
      const clean = m.trim();
      if (clean && !terms.includes(clean)) {
        terms.push(clean);
      }
    }
  }
  const keywords = prompt.match(
    /(共|剩下|相差|平均|倍數|因數|最大|最小|周長|面積|體積|表面積|打\S+折|原來|至少|最多)/g,
  );
  if (keywords) {
    for (const k of keywords) {
      if (!terms.includes(k)) {
        terms.push(k);
      }
    }
  }
  return terms.slice(0, 5);
}

/**
 * 從題目與解析建構正反對比示範卡（Worked Example），用於數學連錯降階鷹架或課程教學模組。
 */
export function buildWorkedExampleFromQuestion(
  question: Question,
  grade?: Grade,
): WorkedExampleData {
  const clauses = splitExplanationClauses(question.explanation);
  const steps =
    clauses.length >= 2
      ? clauses.map((c, idx) => `第 ${idx + 1} 步：${c}`)
      : [
          '第 1 步：先圈出題目中的已知數字、條件與最終要問的單位。',
          `第 2 步：建立解題關係 → ${clauses[0] ?? question.explanation}`,
          '第 3 步：核對算出的結果是否合理，並確認單位與選項完全一致。',
        ];

  const isLowerGrade = grade !== undefined && grade <= 2;

  return {
    problemStatement: question.prompt,
    steps,
    commonErrorContrast: detectCommonErrorContrast(question),
    selfExplanationPrompt: isLowerGrade
      ? undefined
      : '想一想：這題在第一步是怎麼把題意轉換成算式或比較關係的？',
    keepStepCardVisible: isLowerGrade,
  };
}

/**
 * 產生三層漸進提示：Level 1（高亮關鍵條件）→ Level 2（引導思考）→ Level 3（第一步示範，遮蔽正解）。
 */
export function buildHintLevels(question: Question): [string, string, string] {
  const keyTerms = extractKeyTerms(question.prompt);
  const level1 =
    keyTerms.length > 0
      ? `🔍 先圈出題目關鍵字：${keyTerms.map((t) => `「${t}」`).join('、')}，看清楚題目最後要問什麼。`
      : '🔍 先把題目從頭到尾讀一遍，圈出已知條件與最後要問的目標。';

  const level2 = question.hint?.trim()
    ? `💡 思考方向：${question.hint.trim()}`
    : '💡 思考方向：想想看這兩個條件之間是「合起來、拿走、分給幾份，還是倍數／面積關係」？';

  const clauses = splitExplanationClauses(question.explanation);
  const correctOption = question.options[question.answerIndex] ?? '';
  const firstStepRaw = clauses[0] ?? question.explanation;
  const maskedFirstStep = maskAnswerInText(firstStepRaw, correctOption).trim();
  const level3 =
    maskedFirstStep && maskedFirstStep !== '（？）'
      ? `🪜 第一步示範：先從「${maskedFirstStep}」出發，推算出空格的值！`
      : '🪜 第一步示範：先把題目的兩個條件寫成算式，再比對四個選項中哪一個符合結果！';

  return [level1, level2, level3];
}

/**
 * 確定性挑選欲排除的錯誤選項索引（絕不包含正解），用於低年級 3 選 1 與中高年級 50/50 減壓。
 */
export function pickEliminatedOptionIndices(
  question: Question,
  removeCount: 1 | 2,
): number[] {
  const wrongIndices: number[] = [];
  for (let i = 0; i < question.options.length; i++) {
    if (i !== question.answerIndex) {
      wrongIndices.push(i);
    }
  }
  if (wrongIndices.length === 0) return [];

  let hash = 0;
  for (let i = 0; i < question.id.length; i++) {
    hash = (hash * 31 + question.id.charCodeAt(i)) >>> 0;
  }

  const targetCount = Math.min(removeCount, wrongIndices.length);
  const start = hash % wrongIndices.length;
  const picked: number[] = [];
  for (let offset = 0; offset < targetCount; offset++) {
    picked.push(wrongIndices[(start + offset) % wrongIndices.length]);
  }
  return picked.sort((a, b) => a - b);
}
