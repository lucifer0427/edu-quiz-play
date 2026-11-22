import {
  KNOWN_GENERATOR_IDS,
  loadAllGenerators,
} from '../src/utils/generators/registry.ts';

const SAMPLE_SIZE = 24;
const FORBIDDEN_TOKENS = ['NaN', 'Infinity', 'undefined', 'null'];

function checkText(field, value, where, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${where} 缺少或為空：${field}`);
    return;
  }
  for (const token of FORBIDDEN_TOKENS) {
    if (value.includes(token)) {
      errors.push(`${where} 的 ${field} 含非法字串「${token}」：${value}`);
    }
  }
}

function validateQuestion(question, where, ids, errors) {
  if (!question || typeof question !== 'object') {
    errors.push(`${where} 不是物件`);
    return;
  }

  if (typeof question.id !== 'string' || question.id.trim() === '') {
    errors.push(`${where} 缺少 id`);
  } else if (ids.has(question.id)) {
    errors.push(`${where} 的 id 重複：${question.id}`);
  } else {
    ids.add(question.id);
  }

  checkText('prompt', question.prompt, where, errors);
  checkText('explanation', question.explanation, where, errors);
  checkText('hint', question.hint, where, errors);
  checkText('speechText', question.speechText, where, errors);

  if (typeof question.speechLang !== 'string' || question.speechLang.trim() === '') {
    errors.push(`${where} 缺少 speechLang`);
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push(`${where} 選項必須恰為 4 個`);
    return;
  }

  const normalized = [];
  for (const option of question.options) {
    if (typeof option !== 'string' || option.trim() === '') {
      errors.push(`${where} 有空白或非字串選項`);
      return;
    }
    for (const token of FORBIDDEN_TOKENS) {
      if (option.includes(token)) {
        errors.push(`${where} 的選項含非法字串「${token}」：${option}`);
      }
    }
    normalized.push(option.trim());
  }
  if (new Set(normalized).size !== 4) {
    errors.push(`${where} 選項重複：${JSON.stringify(normalized)}`);
  }

  if (
    typeof question.answerIndex !== 'number' ||
    !Number.isInteger(question.answerIndex) ||
    question.answerIndex < 0 ||
    question.answerIndex > 3
  ) {
    errors.push(`${where} 的 answerIndex 必須為 0..3（目前 ${question.answerIndex}）`);
  }
}

const errors = [];
const generators = await loadAllGenerators();
const generatorIds = Object.keys(generators);

if (generatorIds.length === 0) {
  errors.push('loadAllGenerators() 未載入任何出題器');
}
if (generatorIds.length !== KNOWN_GENERATOR_IDS.size) {
  errors.push(
    `KNOWN_GENERATOR_IDS（${KNOWN_GENERATOR_IDS.size}）與實際載入出題器數（${generatorIds.length}）不一致`,
  );
}
for (const knownId of KNOWN_GENERATOR_IDS) {
  if (!(knownId in generators)) {
    errors.push(`KNOWN_GENERATOR_IDS 中的 ${knownId} 未在模組載入結果內`);
  }
}

for (const generatorId of generatorIds) {
  const generate = generators[generatorId];
  if (typeof generate !== 'function') {
    errors.push(`出題器 ${generatorId} 不是函式`);
    continue;
  }

  let questions;
  try {
    questions = generate(SAMPLE_SIZE);
  } catch (err) {
    errors.push(`出題器 ${generatorId} 執行失敗：${err.message}`);
    continue;
  }

  if (!Array.isArray(questions)) {
    errors.push(`出題器 ${generatorId} 未回傳陣列`);
    continue;
  }
  if (questions.length !== SAMPLE_SIZE) {
    errors.push(
      `出題器 ${generatorId} 要求 ${SAMPLE_SIZE} 題，實際回傳 ${questions.length} 題`,
    );
  }

  const ids = new Set();
  questions.forEach((question, index) => {
    validateQuestion(question, `${generatorId}[${index}]`, ids, errors);
  });
}

if (errors.length > 0) {
  console.error(`動態出題器抽測失敗（共 ${errors.length} 項，涵蓋 ${generatorIds.length} 個出題器）：`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(
  `動態出題器抽測通過：${generatorIds.length} 個出題器 × ${SAMPLE_SIZE} 題（0 錯誤）`,
);
