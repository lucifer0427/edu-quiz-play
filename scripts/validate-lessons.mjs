import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LESSONS_DIR = path.join(ROOT, 'src', 'data', 'curriculum', 'lessons');
const PACKS_DIR = path.join(ROOT, 'src', 'data', 'curriculum', 'packs');
const SOURCES_DIR = path.join(ROOT, 'content', 'curriculum-sources');

const ALLOWED_COMPONENT_TYPES = new Set([
  'ANCHOR_SCENE',
  'WORKED_EXAMPLE_SPLIT',
  'TOPIC_SIGNAL_BOX',
  'WARMUP_CHECK',
  'SPATIAL_3D_SCENE',
]);

const ALLOWED_AGE_BANDS = new Set(['AGE_6_8_LOWER', 'AGE_9_12_UPPER']);
const ALLOWED_SUBJECTS = new Set(['LANGUAGE', 'MATH', 'SCIENCE_SOCIAL']);
const ALLOWED_TEMPLATES = new Set([
  'fraction_bar',
  'rect_geometry',
  'number_line',
  'flow_cause',
  'concept_compare',
  'concept_map',
  'clock_face',
]);
const BANNED_SEDUCTIVE_TOKENS = [
  '吉祥物',
  '魔法棒',
  '超炫特效',
  '撒花',
  '華麗動畫',
  '炫酷',
];

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(full);
    }
  }
  return files.sort();
}

export function collectValidStageIds() {
  const stageIds = new Set();
  for (const filePath of walkJsonFiles(PACKS_DIR)) {
    const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(pack.stages)) {
      for (const stage of pack.stages) {
        if (typeof stage.id === 'string' && stage.id.trim() !== '') {
          stageIds.add(stage.id);
        }
      }
    }
  }
  return stageIds;
}

export function collectSourceUnitIndex() {
  const index = new Map();
  for (const filePath of walkJsonFiles(SOURCES_DIR)) {
    const rel = path.relative(SOURCES_DIR, filePath).replace(/\\/g, '/');
    const match = /^(\d+-s[12])\/(g[1-6])\/([a-z0-9-]+)\.json$/.exec(rel);
    if (!match) continue;
    const key = `${match[1]}/${match[2]}/${match[3]}`;
    const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const unitNos = new Set(
      Array.isArray(doc.units) ? doc.units.map((u) => Number(u.unit_no)) : [],
    );
    index.set(key, unitNos);
  }
  return index;
}

function parseLessonPath(relPath) {
  const match =
    /^src\/data\/curriculum\/lessons\/(\d+)-s([12])\/g([1-6])\/([a-z0-9-]+)\.json$/.exec(
      relPath,
    );
  if (!match) return null;
  return {
    academicYear: Number(match[1]),
    semester: Number(match[2]),
    grade: Number(match[3]),
    subjectId: match[4],
  };
}

function checkSeductiveTokens(text, where, errors) {
  if (typeof text !== 'string') return;
  for (const token of BANNED_SEDUCTIVE_TOKENS) {
    if (text.includes(token)) {
      errors.push(`${where} 含誘惑細節禁用詞「${token}」`);
    }
  }
}

export function validateLessonPack(
  pack,
  relPath,
  validStageIds,
  sourceUnitIndex,
  seenLessonIds = new Set(),
) {
  const errors = [];
  if (!pack || typeof pack !== 'object') {
    return [`微課程 JSON 結構無效：${relPath}`];
  }

  if (pack.schemaVersion !== '2026.1') {
    errors.push(`schemaVersion 應為 "2026.1"（目前 ${pack.schemaVersion}）：${relPath}`);
  }

  const pathInfo = parseLessonPath(relPath);
  if (!pathInfo) {
    errors.push(
      `路徑不符合 lessons/<year>-s<sem>/g<grade>/<subject>.json：${relPath}`,
    );
  } else {
    const expectedPackId = `${pathInfo.academicYear}-s${pathInfo.semester}-g${pathInfo.grade}-${pathInfo.subjectId}`;
    if (pack.packId !== expectedPackId) {
      errors.push(
        `packId 應為 "${expectedPackId}"（目前 ${pack.packId}）：${relPath}`,
      );
    }
    for (const field of ['academicYear', 'semester', 'grade', 'subjectId']) {
      if (pack[field] !== pathInfo[field]) {
        errors.push(
          `${field}（${pack[field]}）與路徑（${pathInfo[field]}）不一致：${relPath}`,
        );
      }
    }
  }

  if (!Array.isArray(pack.lessons) || pack.lessons.length === 0) {
    errors.push(`lessons 不可為空：${relPath}`);
    return errors;
  }

  for (const lesson of pack.lessons) {
    const lessonWhere = `${relPath} (${lesson?.lessonId || 'unknown'})`;
    if (lesson.schemaVersion !== '2026.1') {
      errors.push(`${lessonWhere} schemaVersion 應為 "2026.1"`);
    }
    if (typeof lesson.lessonId !== 'string' || lesson.lessonId.trim() === '') {
      errors.push(`${lessonWhere} 缺少 lessonId`);
    } else if (seenLessonIds.has(lesson.lessonId)) {
      errors.push(`${lessonWhere} lessonId 重複：${lesson.lessonId}`);
    } else {
      seenLessonIds.add(lesson.lessonId);
    }

    if (typeof lesson.stageId !== 'string' || !validStageIds.has(lesson.stageId)) {
      errors.push(`${lessonWhere} stageId 不存在於題庫包：${lesson.stageId}`);
    }
    if (!ALLOWED_AGE_BANDS.has(lesson.ageBand)) {
      errors.push(`${lessonWhere} ageBand 無效：${lesson.ageBand}`);
    }
    if (!ALLOWED_SUBJECTS.has(lesson.subject)) {
      errors.push(`${lessonWhere} subject 無效：${lesson.subject}`);
    }
    if (typeof lesson.title !== 'string' || lesson.title.trim() === '') {
      errors.push(`${lessonWhere} 缺少 title`);
    }
    checkSeductiveTokens(lesson.title, lessonWhere, errors);

    if (
      !Array.isArray(lesson.scenes) ||
      lesson.scenes.length < 1 ||
      lesson.scenes.length > 6
    ) {
      errors.push(`${lessonWhere} scenes 數量必須為 1–6 幕`);
      continue;
    }

    if (lesson.scenes[0]?.componentType === 'TOPIC_SIGNAL_BOX') {
      errors.push(
        `${lessonWhere} 違反護欄：scenes[0] 禁止使用 TOPIC_SIGNAL_BOX`,
      );
    }

    const sceneIds = new Set();
    for (const scene of lesson.scenes) {
      const sceneWhere = `${lessonWhere} -> ${scene?.sceneId || 'scene'}`;
      if (typeof scene.sceneId !== 'string' || scene.sceneId.trim() === '') {
        errors.push(`${sceneWhere} 缺少 sceneId`);
      } else if (sceneIds.has(scene.sceneId)) {
        errors.push(`${sceneWhere} sceneId 重複：${scene.sceneId}`);
      } else {
        sceneIds.add(scene.sceneId);
      }

      if (!ALLOWED_COMPONENT_TYPES.has(scene.componentType)) {
        errors.push(`${sceneWhere} componentType 無效：${scene.componentType}`);
      }
      if (typeof scene.title !== 'string' || scene.title.trim() === '') {
        errors.push(`${sceneWhere} 缺少 title`);
      }
      if (
        typeof scene.narrationText !== 'string' ||
        scene.narrationText.trim() === ''
      ) {
        errors.push(`${sceneWhere} 缺少 narrationText`);
      }

      if (
        !Array.isArray(scene.cognitiveChunks) ||
        scene.cognitiveChunks.length < 1 ||
        scene.cognitiveChunks.length > 4
      ) {
        errors.push(`${sceneWhere} cognitiveChunks 數量必須嚴格為 1–4 項`);
      } else {
        scene.cognitiveChunks.forEach((chunk, idx) => {
          if (typeof chunk !== 'string' || chunk.trim() === '') {
            errors.push(`${sceneWhere} cognitiveChunks[${idx}] 不可為空`);
          }
          checkSeductiveTokens(chunk, `${sceneWhere} chunk`, errors);
        });
      }

      if (
        typeof scene.factGroundingSourceId !== 'string' ||
        scene.factGroundingSourceId.trim() === ''
      ) {
        errors.push(`${sceneWhere} 缺少 factGroundingSourceId`);
      } else {
        const srcMatch =
          /^(\d+-s[12]\/g[1-6]\/[a-z0-9-]+)#u(\d+)$/.exec(
            scene.factGroundingSourceId,
          );
        if (srcMatch) {
          const units = sourceUnitIndex.get(srcMatch[1]);
          if (!units || !units.has(Number(srcMatch[2]))) {
            errors.push(
              `${sceneWhere} factGroundingSourceId 未對應課綱來源單元：${scene.factGroundingSourceId}`,
            );
          }
        }
      }

      checkSeductiveTokens(scene.title, sceneWhere, errors);
      checkSeductiveTokens(scene.narrationText, sceneWhere, errors);
      checkSeductiveTokens(scene.analogyAnchor, sceneWhere, errors);
      checkSeductiveTokens(scene.topicSignalTitle, sceneWhere, errors);

      if (scene.visualSpec) {
        if (!ALLOWED_TEMPLATES.has(scene.visualSpec.templateId)) {
          errors.push(
            `${sceneWhere} visualSpec.templateId 無效：${scene.visualSpec.templateId}`,
          );
        }
        checkSeductiveTokens(scene.visualSpec.templateId, sceneWhere, errors);
        if (!Array.isArray(scene.visualSpec.spatialLabels)) {
          errors.push(`${sceneWhere} visualSpec 缺少 spatialLabels 陣列`);
        } else {
          if (scene.visualSpec.spatialLabels.length > 4) {
            errors.push(`${sceneWhere} spatialLabels 最多只能有 4 項`);
          }
          for (const lbl of scene.visualSpec.spatialLabels) {
            const text = typeof lbl?.text === 'string' ? lbl.text.trim() : '';
            const charLen = [...text].length;
            if (charLen < 1 || charLen > 12) {
              errors.push(
                `${sceneWhere} spatialLabel「${text}」長度須為 1–12 字（目前 ${charLen} 字）`,
              );
            }
            checkSeductiveTokens(text, sceneWhere, errors);
          }
        }

        const params = scene.visualSpec.params ?? {};
        const TRUNCATED_END_RE = /(?:[的、，「（或把從是]|，將)$/;
        const checkDiagramPhrase = (phrase, fieldName) => {
          const text = typeof phrase === 'string' ? phrase.trim() : '';
          if (!text) {
            errors.push(`${sceneWhere} ${fieldName} 不可為空`);
            return;
          }
          if (TRUNCATED_END_RE.test(text)) {
            errors.push(
              `${sceneWhere} ${fieldName}「${text}」疑似被截斷（結尾字元不完整）`,
            );
          }
          const openQuotes = (text.match(/「/g) ?? []).length;
          const closeQuotes = (text.match(/」/g) ?? []).length;
          if (openQuotes !== closeQuotes) {
            errors.push(
              `${sceneWhere} ${fieldName}「${text}」引號未閉合`,
            );
          }
          checkSeductiveTokens(text, `${sceneWhere} ${fieldName}`, errors);
        };

        if (
          scene.visualSpec.templateId === 'flow_cause' &&
          Array.isArray(params.nodes)
        ) {
          params.nodes.forEach((node, idx) =>
            checkDiagramPhrase(node, `flow_cause.nodes[${idx}]`),
          );
        }

        if (scene.visualSpec.templateId === 'concept_map') {
          checkDiagramPhrase(params.center, 'concept_map.center');
          if (!Array.isArray(params.branches) || params.branches.length < 2) {
            errors.push(
              `${sceneWhere} concept_map.branches 至少需要 2 個分支重點`,
            );
          } else {
            params.branches.forEach((branch, idx) =>
              checkDiagramPhrase(branch, `concept_map.branches[${idx}]`),
            );
          }
        }

        if (scene.visualSpec.templateId === 'concept_compare') {
          if (Array.isArray(params.leftPoints)) {
            params.leftPoints.forEach((pt, idx) =>
              checkDiagramPhrase(pt, `concept_compare.leftPoints[${idx}]`),
            );
          }
          if (Array.isArray(params.rightPoints)) {
            params.rightPoints.forEach((pt, idx) =>
              checkDiagramPhrase(pt, `concept_compare.rightPoints[${idx}]`),
            );
          }
        }
      }

      if (scene.componentType === 'WORKED_EXAMPLE_SPLIT') {
        const we = scene.workedExampleData;
        if (!we || typeof we !== 'object') {
          errors.push(`${sceneWhere} WORKED_EXAMPLE_SPLIT 缺少 workedExampleData`);
        } else {
          if (
            !Array.isArray(we.steps) ||
            we.steps.length < 1 ||
            we.steps.length > 4
          ) {
            errors.push(`${sceneWhere} workedExampleData.steps 必須為 1–4 步`);
          }
          if (
            typeof we.commonErrorContrast !== 'string' ||
            we.commonErrorContrast.trim() === ''
          ) {
            errors.push(`${sceneWhere} workedExampleData 缺少 commonErrorContrast`);
          }
          if (lesson.ageBand === 'AGE_6_8_LOWER' && we.keepStepCardVisible !== true) {
            errors.push(
              `${sceneWhere} 違反低年級護欄：AGE_6_8_LOWER 必須為 keepStepCardVisible: true`,
            );
          }
        }
      }

      if (scene.componentType === 'TOPIC_SIGNAL_BOX') {
        if (
          typeof scene.topicSignalTitle !== 'string' ||
          scene.topicSignalTitle.trim() === ''
        ) {
          errors.push(`${sceneWhere} TOPIC_SIGNAL_BOX 缺少 topicSignalTitle`);
        }
      }

      if (scene.componentType === 'WARMUP_CHECK') {
        const wc = scene.warmupCheck;
        if (!wc || typeof wc !== 'object') {
          errors.push(`${sceneWhere} WARMUP_CHECK 缺少 warmupCheck`);
        } else {
          if (
            !Array.isArray(wc.options) ||
            wc.options.length < 3 ||
            wc.options.length > 4
          ) {
            errors.push(`${sceneWhere} warmupCheck.options 必須為 3–4 個選項`);
          } else {
            const norm = wc.options.map((o) => String(o).trim());
            if (norm.some((o) => !o) || new Set(norm).size !== norm.length) {
              errors.push(`${sceneWhere} warmupCheck.options 不可為空或重複`);
            }
            if (
              typeof wc.answerIndex !== 'number' ||
              !Number.isInteger(wc.answerIndex) ||
              wc.answerIndex < 0 ||
              wc.answerIndex >= wc.options.length
            ) {
              errors.push(`${sceneWhere} warmupCheck.answerIndex 無效`);
            }
          }
        }
      }

      if (scene.componentType === 'SPATIAL_3D_SCENE') {
        if (lesson.subject === 'LANGUAGE') {
          errors.push(`${sceneWhere} 違反護欄：語文科嚴禁使用 SPATIAL_3D_SCENE`);
        }
        if (
          !scene.spatial3dSpec ||
          !Array.isArray(scene.spatial3dSpec.allowedControls) ||
          scene.spatial3dSpec.allowedControls.length === 0
        ) {
          errors.push(
            `${sceneWhere} SPATIAL_3D_SCENE 必須宣告 spatial3dSpec.allowedControls`,
          );
        }
      }
    }
  }

  return errors;
}

function runGuardrailSelfTests(validStageIds, sourceUnitIndex) {
  const sampleStageId = validStageIds.values().next().value || '115-s1-g5-math-u1';
  const baseValid = {
    packId: '115-s1-g5-math',
    schemaVersion: '2026.1',
    academicYear: 115,
    semester: 1,
    grade: 5,
    subjectId: 'math',
    lessons: [
      {
        schemaVersion: '2026.1',
        lessonId: 'self-test-lesson',
        stageId: sampleStageId,
        title: '測試課',
        ageBand: 'AGE_6_8_LOWER',
        subject: 'LANGUAGE',
        scenes: [
          {
            sceneId: 's1',
            componentType: 'TOPIC_SIGNAL_BOX',
            topicSignalTitle: '延伸',
            title: '這有吉祥物',
            narrationText: '測試',
            cognitiveChunks: ['1', '2', '3', '4', '5'],
            visualSpec: {
              templateId: 'fraction_bar',
              spatialLabels: [
                {
                  id: 'lbl1',
                  text: '這是一段超過十二個字的超長圖表標籤',
                  anchorPointId: 'top',
                },
              ],
            },
            factGroundingSourceId: '115-s1/g5/math#u1',
          },
          {
            sceneId: 's2',
            componentType: 'WORKED_EXAMPLE_SPLIT',
            title: '低年級步驟檢查',
            narrationText: '測試',
            cognitiveChunks: ['重點1'],
            workedExampleData: {
              problemStatement: '題',
              steps: ['步1'],
              commonErrorContrast: '錯',
              keepStepCardVisible: false,
            },
            factGroundingSourceId: '115-s1/g5/math#u1',
          },
          {
            sceneId: 's3',
            componentType: 'SPATIAL_3D_SCENE',
            title: '語文禁止3D',
            narrationText: '測試',
            cognitiveChunks: ['重點1'],
            factGroundingSourceId: '115-s1/g5/math#u1',
          },
        ],
      },
    ],
  };

  const errs = validateLessonPack(
    baseValid,
    'src/data/curriculum/lessons/115-s1/g5/math.json',
    validStageIds,
    sourceUnitIndex,
  );

  assert.ok(errs.some((e) => e.includes('TOPIC_SIGNAL_BOX')));
  assert.ok(errs.some((e) => e.includes('吉祥物')));
  assert.ok(errs.some((e) => e.includes('cognitiveChunks')));
  assert.ok(errs.some((e) => e.includes('1–12 字')));
  assert.ok(errs.some((e) => e.includes('keepStepCardVisible')));
  assert.ok(errs.some((e) => e.includes('語文科嚴禁使用 SPATIAL_3D_SCENE')));
}

function main() {
  const validStageIds = collectValidStageIds();
  const sourceUnitIndex = collectSourceUnitIndex();
  runGuardrailSelfTests(validStageIds, sourceUnitIndex);

  const files = walkJsonFiles(LESSONS_DIR);
  const allErrors = [];
  const seenLessonIds = new Set();
  let totalLessons = 0;
  let totalScenes = 0;

  for (const filePath of files) {
    const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    let pack;
    try {
      pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      allErrors.push(`微課程 JSON 解析失敗：${relPath} (${err.message})`);
      continue;
    }

    const errors = validateLessonPack(
      pack,
      relPath,
      validStageIds,
      sourceUnitIndex,
      seenLessonIds,
    );
    allErrors.push(...errors);

    if (Array.isArray(pack.lessons)) {
      totalLessons += pack.lessons.length;
      for (const l of pack.lessons) {
        if (Array.isArray(l.scenes)) totalScenes += l.scenes.length;
      }
    }
  }

  if (allErrors.length > 0) {
    console.error(`微課程雙層認知護欄驗證失敗（共 ${allErrors.length} 項）：`);
    for (const err of allErrors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `微課程雙層護欄驗證通過：${files.length} 份課程包、${totalLessons} 個單元微課程、${totalScenes} 幕（0 錯誤，含護欄自測）`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
