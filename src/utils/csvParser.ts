import type { Question } from '../types/quiz';

export const CSV_TEMPLATE = [
  '題目,選項A,選項B,選項C,選項D,正確答案(1-4或A-D),解析,提示(選填)',
  '12 + 15 等於多少？,25,27,28,30,B,12 + 15 = 27，個位 2+5=7，十位 1+1=2。,先算個位數 2 + 5！',
  '「畫龍點睛」的意思最接近哪一項？,畫畫技巧很差,在關鍵地方加上一筆讓整體更生動,把龍畫在眼睛上,忘記畫眼睛,2,比喻在關鍵處加上精闢的內容，使整體生動傳神。,想一想關鍵的那一筆！',
  'Apple 的中文意思是什麼？,香蕉,葡萄,蘋果,橘子,C,Apple 就是蘋果喔！,紅紅脆脆的水果！',
].join('\n');

function parseCsvRows(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\r' && next === '\n') {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.length > 0));
}

function parseAnswerToken(token: string): number {
  const normalized = token.trim().toUpperCase();
  if (normalized === 'A' || normalized === '1') return 0;
  if (normalized === 'B' || normalized === '2') return 1;
  if (normalized === 'C' || normalized === '3') return 2;
  if (normalized === 'D' || normalized === '4') return 3;
  return -1;
}

export function parseCsvQuestions(csvText: string): {
  questions: Question[];
  errors: string[];
} {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return { questions: [], errors: ['CSV 內容是空的，沒有找到題目。'] };
  }

  const errors: string[] = [];
  const questions: Question[] = [];
  const seed = Date.now();

  const firstCell = rows[0][0]?.toLowerCase() ?? '';
  const hasHeader =
    firstCell.includes('題目') ||
    firstCell.includes('question') ||
    firstCell.includes('prompt');
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;
    if (row.length < 6) {
      errors.push(`第 ${lineNum} 列欄位不足（至少需要題目、4 個選項與正確答案）。`);
      continue;
    }

    const [prompt, optA, optB, optC, optD, answerRaw, explanation, hint] = row;
    if (!prompt || !optA || !optB || !optC || !optD) {
      errors.push(`第 ${lineNum} 列題目或選項有空白。`);
      continue;
    }

    const answerIndex = parseAnswerToken(answerRaw ?? '');
    if (answerIndex < 0 || answerIndex > 3) {
      errors.push(
        `第 ${lineNum} 列正確答案格式錯誤（請填 1-4 或 A-D，收到「${answerRaw ?? ''}」）。`,
      );
      continue;
    }

    const isEnglishPrompt = /^[A-Za-z0-9\s.,?!'"-]+$/.test(prompt);
    questions.push({
      id: `custom-${seed}-${i}`,
      prompt,
      options: [optA, optB, optC, optD],
      answerIndex,
      explanation: explanation || `正確答案是「${[optA, optB, optC, optD][answerIndex]}」。`,
      hint: hint || undefined,
      speechText: prompt,
      speechLang: isEnglishPrompt ? 'en-US' : 'zh-TW',
    });
  }

  return { questions, errors };
}

export function parseJsonQuestions(jsonText: string): {
  questions: Question[];
  errors: string[];
} {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const rawList = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' &&
          parsed !== null &&
          Array.isArray((parsed as { questions?: unknown[] }).questions)
        ? (parsed as { questions: unknown[] }).questions
        : null;

    if (!rawList) {
      return {
        questions: [],
        errors: ['JSON 格式不正確，請提供題目陣列或包含 questions 欄位的物件。'],
      };
    }

    const questions: Question[] = [];
    const errors: string[] = [];
    const seed = Date.now();

    rawList.forEach((item, idx) => {
      if (typeof item !== 'object' || item === null) {
        errors.push(`第 ${idx + 1} 筆資料不是物件。`);
        return;
      }
      const q = item as Partial<Question> & { answer?: string | number };
      if (
        !q.prompt ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        q.options.some((opt) => typeof opt !== 'string' || !opt.trim())
      ) {
        errors.push(`第 ${idx + 1} 題缺少題目或 4 個選項。`);
        return;
      }

      let answerIndex =
        typeof q.answerIndex === 'number' ? q.answerIndex : -1;
      if (answerIndex < 0 && q.answer !== undefined) {
        answerIndex = parseAnswerToken(String(q.answer));
      }

      if (answerIndex < 0 || answerIndex > 3) {
        errors.push(`第 ${idx + 1} 題 answerIndex 必須是 0-3。`);
        return;
      }

      questions.push({
        id: q.id || `custom-json-${seed}-${idx}`,
        prompt: q.prompt,
        options: [q.options[0], q.options[1], q.options[2], q.options[3]],
        answerIndex,
        explanation:
          q.explanation || `正確答案是「${q.options[answerIndex]}」。`,
        hint: q.hint,
        speechText: q.speechText || q.prompt,
        speechLang: q.speechLang || 'zh-TW',
      });
    });

    return { questions, errors };
  } catch {
    return { questions: [], errors: ['JSON 解析失敗，請檢查檔案內容格式。'] };
  }
}

export function downloadCsvTemplate(): void {
  const blob = new Blob([`\uFEFF${CSV_TEMPLATE}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'edu-quiz-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
