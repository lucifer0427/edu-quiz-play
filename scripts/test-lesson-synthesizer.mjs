import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveLessonForStage,
  synthesizeLessonForStage,
} from '../src/utils/lessonSynthesizer.ts';
import {
  collectSourceUnitIndex,
  collectValidStageIds,
  validateLessonPack,
} from './validate-lessons.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PACKS_DIR = path.join(ROOT, 'src', 'data', 'curriculum', 'packs');
const GRADES_DIR = path.join(ROOT, 'src', 'data', 'curriculum', 'grades');
const LESSONS_DIR = path.join(ROOT, 'src', 'data', 'curriculum', 'lessons');

const LANGUAGE_SUBJECTS = new Set(['mandarin', 'english', 'minnan', 'hakka']);

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

function buildUnitSummaryIndex() {
  const index = new Map();
  for (const filePath of walkJsonFiles(GRADES_DIR)) {
    const gradeCatalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const entry of gradeCatalog.entries ?? []) {
      for (const unit of entry.units ?? []) {
        const key = `${entry.academicYear}-s${entry.semester}-g${entry.grade}-${entry.subjectId}#u${unit.unitNo}`;
        index.set(key, unit);
      }
    }
  }
  return index;
}

function main() {
  const validStageIds = collectValidStageIds();
  const sourceUnitIndex = collectSourceUnitIndex();
  const unitSummaryIndex = buildUnitSummaryIndex();

  const packFiles = walkJsonFiles(PACKS_DIR);
  assert.equal(
    packFiles.length,
    116,
    `預期共有 116 份課綱題庫包，實際為 ${packFiles.length}`,
  );

  const seenLessonIds = new Set();
  const allErrors = [];
  let totalSynthesizedLessons = 0;
  let totalScenes = 0;

  for (const filePath of packFiles) {
    const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const stages = Array.isArray(pack.stages) ? pack.stages : [];
    assert.ok(stages.length > 0, `題庫包不可為空：${pack.packId}`);

    const lessons = stages.map((stage) => {
      const unitNo = stage.curriculum?.unitNo;
      const summaryKey =
        typeof unitNo === 'number'
          ? `${pack.academicYear}-s${pack.semester}-g${pack.grade}-${pack.subjectId}#u${unitNo}`
          : '';
      const unitSummary = summaryKey ? unitSummaryIndex.get(summaryKey) : undefined;
      const lesson = synthesizeLessonForStage(stage, unitSummary);

      // 額外檢查：語文科嚴禁 SPATIAL_3D_SCENE 且 subject 須為 LANGUAGE
      if (LANGUAGE_SUBJECTS.has(stage.subjectId)) {
        assert.equal(
          lesson.subject,
          'LANGUAGE',
          `${stage.id} 應映射為 LANGUAGE`,
        );
        assert.equal(
          lesson.scenes.some((s) => s.componentType === 'SPATIAL_3D_SCENE'),
          false,
          `${stage.id} 語文科不得使用 SPATIAL_3D_SCENE`,
        );
      }

      // 額外檢查：G1–G2 低年級必須保留步驟卡且暖身題為 3 選 1
      if (stage.curriculum?.grade <= 2) {
        assert.equal(
          lesson.ageBand,
          'AGE_6_8_LOWER',
          `${stage.id} 應為 AGE_6_8_LOWER`,
        );
        const workedScene = lesson.scenes.find(
          (s) => s.componentType === 'WORKED_EXAMPLE_SPLIT',
        );
        assert.equal(
          workedScene?.workedExampleData?.keepStepCardVisible,
          true,
          `${stage.id} 低年級必須 keepStepCardVisible: true`,
        );
        const warmupScene = lesson.scenes.find(
          (s) => s.componentType === 'WARMUP_CHECK',
        );
        assert.equal(
          warmupScene?.warmupCheck?.options.length,
          3,
          `${stage.id} 低年級暖身題應為 3 選 1`,
        );
      }

      return lesson;
    });

    const syntheticPack = {
      packId: pack.packId,
      schemaVersion: '2026.1',
      academicYear: pack.academicYear,
      semester: pack.semester,
      grade: pack.grade,
      subjectId: pack.subjectId,
      lessons,
    };

    const syntheticRelPath = `src/data/curriculum/lessons/${pack.academicYear}-s${pack.semester}/g${pack.grade}/${pack.subjectId}.json`;
    const errors = validateLessonPack(
      syntheticPack,
      syntheticRelPath,
      validStageIds,
      sourceUnitIndex,
      seenLessonIds,
    );
    allErrors.push(...errors);

    totalSynthesizedLessons += lessons.length;
    for (const l of lessons) {
      totalScenes += l.scenes.length;
    }
  }

  assert.equal(
    allErrors.length,
    0,
    `合成微課程出現護欄違規：\n${allErrors.join('\n')}`,
  );
  assert.equal(
    totalSynthesizedLessons,
    650,
    `預期合成 650 關微課程，實際為 ${totalSynthesizedLessons}`,
  );

  // 優先覆蓋檢查：五上數學 u1 應優先使用手寫精雕微課程；未傳 curatedPack 時應回退為自動合成
  const g5MathPack = JSON.parse(
    fs.readFileSync(
      path.join(PACKS_DIR, '115-s1', 'g5', 'math.json'),
      'utf8',
    ),
  );
  const g5CuratedLessonPack = JSON.parse(
    fs.readFileSync(
      path.join(LESSONS_DIR, '115-s1', 'g5', 'math.json'),
      'utf8',
    ),
  );
  const g5U1Stage = g5MathPack.stages[0];
  const g5U1Summary = unitSummaryIndex.get('115-s1-g5-math#u1');

  const curatedResolved = resolveLessonForStage(
    g5CuratedLessonPack,
    g5U1Stage,
    g5U1Summary,
  );
  assert.equal(curatedResolved.isCurated, true);
  assert.equal(curatedResolved.lesson.lessonId, 'lesson-115-s1-g5-math-u1');

  const fallbackResolved = resolveLessonForStage(null, g5U1Stage, g5U1Summary);
  assert.equal(fallbackResolved.isCurated, false);
  assert.equal(
    fallbackResolved.lesson.lessonId,
    `auto-lesson-${g5U1Stage.id}`,
  );

  // 抽樣檢查五下國語與一下數學合成行為
  const g5S2MandarinPack = JSON.parse(
    fs.readFileSync(
      path.join(PACKS_DIR, '115-s2', 'g5', 'mandarin.json'),
      'utf8',
    ),
  );
  const mandarinResolved = resolveLessonForStage(
    null,
    g5S2MandarinPack.stages[0],
  );
  assert.equal(mandarinResolved.isCurated, false);
  assert.equal(mandarinResolved.lesson.subject, 'LANGUAGE');
  assert.equal(
    mandarinResolved.lesson.scenes[0]?.visualSpec?.templateId,
    'concept_compare',
  );

  console.log(
    `自動微課程合成檢查通過：${packFiles.length} 份題庫包、${totalSynthesizedLessons} 關合成微課程、${totalScenes} 幕（0 錯誤，手寫優先覆蓋與低年級／語文護欄全過）`,
  );
}

main();
