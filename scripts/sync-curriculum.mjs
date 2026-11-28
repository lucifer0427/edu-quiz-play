import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'content', 'curriculum-sources');
const PACKS_DIR = path.join(ROOT, 'src', 'data', 'curriculum', 'packs');
const CATALOG_DIR = path.join(ROOT, 'src', 'data', 'curriculum');

const SUBJECT_ORDER = [
  'mandarin',
  'math',
  'english',
  'science',
  'social',
  'life',
  'arts',
  'health-pe',
  'integrative',
  'computer',
  'minnan',
  'hakka',
];
const SUBJECT_SET = new Set(SUBJECT_ORDER);
const FORBIDDEN_PATH_TOKENS = ['C:\\Users', 'C:\\\\Users', '/Users/'];

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function validateCurriculumSources() {
  const files = walkJsonFiles(SOURCES_DIR);
  const errors = [];
  const entries = [];
  let maxCollectedAt = '';
  let academicYear = 115;
  let school = '桃園市大忠國小';

  if (files.length === 0) {
    errors.push(`找不到任何課綱來源檔案：${SOURCES_DIR}`);
    return { errors, catalog: null };
  }

  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const raw = fs.readFileSync(filePath, 'utf8');

    for (const token of FORBIDDEN_PATH_TOKENS) {
      if (raw.includes(token)) {
        errors.push(`檔案含本機使用者路徑 (${token})：${rel}`);
      }
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      errors.push(`JSON 解析失敗：${rel} (${err.message})`);
      continue;
    }

    if (data.schema_version !== '1.0.0') {
      errors.push(`schema_version 必須為 1.0.0：${rel}`);
    }

    const subjectSlug = path.basename(filePath, '.json');
    if (!SUBJECT_SET.has(subjectSlug)) {
      errors.push(`未知的科目檔名 slug「${subjectSlug}」：${rel}`);
    }

    if (!data.target || typeof data.target !== 'object') {
      errors.push(`缺少 target 欄位：${rel}`);
      continue;
    }

    const { academic_year: year, semester, grade, subject, publisher, book_series: bookSeries } =
      data.target;

    if (
      typeof year !== 'number' ||
      (semester !== 1 && semester !== 2) ||
      typeof grade !== 'number' ||
      grade < 1 ||
      grade > 6
    ) {
      errors.push(`target 年級/學期/學年度欄位異常：${rel}`);
    }

    if (!['verified', 'partial', 'unverified'].includes(data.status)) {
      errors.push(`status 無效：${rel}`);
    }

    if (!Array.isArray(data.sources)) {
      errors.push(`sources 必須為陣列：${rel}`);
    } else {
      if (Array.isArray(data.units) && data.units.length > 0 && data.sources.length === 0) {
        errors.push(`units 非空但 sources 為空：${rel}`);
      }
      for (const src of data.sources) {
        if (src.local_file && (src.local_file.includes('/') || src.local_file.includes('\\'))) {
          errors.push(`local_file 不可含路徑分隔符：${rel} -> ${src.local_file}`);
        }
        if (!src.source_url && !src.local_file) {
          errors.push(`source 缺少 source_url 與 local_file：${rel} (${src.id})`);
        }
      }
    }

    if (!Array.isArray(data.units)) {
      errors.push(`units 必須為陣列：${rel}`);
      continue;
    }

    if (!Array.isArray(data.gaps)) {
      errors.push(`gaps 必須為陣列：${rel}`);
    }

    let lessonCount = 0;
    const unitSummaries = [];
    for (const unit of data.units) {
      const lessons = Array.isArray(unit.lessons) ? unit.lessons : [];
      lessonCount += lessons.length;
      unitSummaries.push({
        unitNo: unit.unit_no,
        title: unit.title,
        lessonCount: lessons.length,
        lessonTitles: lessons
          .map((l) => l.title)
          .filter((t) => typeof t === 'string' && t.length > 0),
      });
    }

    if (typeof data.collected_at === 'string' && data.collected_at > maxCollectedAt) {
      maxCollectedAt = data.collected_at;
    }
    if (typeof year === 'number') academicYear = year;
    if (typeof data.target.school === 'string' && data.target.school) {
      school = data.target.school;
    }

    entries.push({
      academicYear: year,
      semester,
      grade,
      subjectId: subjectSlug,
      subjectLabel: subject,
      publisher: publisher ?? '',
      bookSeries: bookSeries ?? null,
      status: data.status,
      unitCount: data.units.length,
      lessonCount,
      units: unitSummaries,
    });
  }

  entries.sort((a, b) => {
    if (a.academicYear !== b.academicYear) return a.academicYear - b.academicYear;
    if (a.grade !== b.grade) return a.grade - b.grade;
    if (a.semester !== b.semester) return a.semester - b.semester;
    return SUBJECT_ORDER.indexOf(a.subjectId) - SUBJECT_ORDER.indexOf(b.subjectId);
  });

  const catalog = {
    generatedAt: maxCollectedAt || new Date().toISOString(),
    academicYear,
    school,
    entries,
  };

  return { errors, catalog, fileCount: files.length };
}

function buildUnitIndex(entries) {
  const index = new Map();
  for (const entry of entries) {
    const key = `${entry.academicYear}-s${entry.semester}/g${entry.grade}/${entry.subjectId}`;
    index.set(key, new Set(entry.units.map((unit) => unit.unitNo)));
  }
  return index;
}

function parsePackPath(rel) {
  const nested = rel.match(/packs\/(\d+)-s([12])\/g([1-6])\/([a-z-]+)\.json$/);
  if (nested) {
    return {
      academicYear: Number(nested[1]),
      semester: Number(nested[2]),
      grade: Number(nested[3]),
      subjectId: nested[4],
    };
  }
  const flat = rel.match(/packs\/(\d+)-s([12])-g([1-6])-([a-z-]+)\.json$/);
  if (flat) {
    return {
      academicYear: Number(flat[1]),
      semester: Number(flat[2]),
      grade: Number(flat[3]),
      subjectId: flat[4],
    };
  }
  return null;
}

const REQUIRED_QUESTION_FIELDS = ['prompt', 'explanation', 'hint', 'speechText', 'speechLang'];
const REQUIRED_STAGE_FIELDS = [
  'id',
  'subjectId',
  'title',
  'description',
  'difficulty',
  'monsterId',
  'monsterName',
];
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MIN_PACK_SIZE_FOR_DISTRIBUTION = 16;
const MAX_ANSWER_SHARE = 0.4;

function isDynamic(stage) {
  return Boolean(stage.generatorId || stage.isDynamicMath);
}

function validateQuizPacks(catalogEntries) {
  const files = walkJsonFiles(PACKS_DIR);
  const errors = [];
  const stageIds = new Set();
  const questionIds = new Set();
  const prompts = new Map();
  const unitIndex = buildUnitIndex(catalogEntries);
  const covered = new Map();

  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const raw = fs.readFileSync(filePath, 'utf8');

    for (const token of FORBIDDEN_PATH_TOKENS) {
      if (raw.includes(token)) {
        errors.push(`題庫檔含本機使用者路徑 (${token})：${rel}`);
      }
    }

    let pack;
    try {
      pack = JSON.parse(raw);
    } catch (err) {
      errors.push(`題庫 JSON 解析失敗：${rel} (${err.message})`);
      continue;
    }

    if (!pack || !Array.isArray(pack.stages)) {
      errors.push(`題庫缺少 stages 陣列：${rel}`);
      continue;
    }

    if (!SUBJECT_SET.has(pack.subjectId)) {
      errors.push(`題庫 subjectId 無效（${pack.subjectId}）：${rel}`);
    }

    const pathInfo = parsePackPath(rel);
    if (!pathInfo) {
      errors.push(`題庫檔路徑不符合 packs/<year>-s<sem>/g<grade>/<subject>.json：${rel}`);
    } else {
      const expectedPackId = `${pathInfo.academicYear}-s${pathInfo.semester}-g${pathInfo.grade}-${pathInfo.subjectId}`;
      for (const field of ['academicYear', 'semester', 'grade', 'subjectId']) {
        if (pack[field] !== pathInfo[field]) {
          errors.push(`題庫 ${field}（${pack[field]}）與路徑（${pathInfo[field]}）不一致：${rel}`);
        }
      }
      if (pack.packId !== expectedPackId) {
        errors.push(`packId 應為「${expectedPackId}」（目前 ${pack.packId}）：${rel}`);
      }
      const coverageKey = `s${pathInfo.semester}/g${pathInfo.grade}`;
      covered.set(coverageKey, (covered.get(coverageKey) ?? 0) + 1);
    }

    const unitKey = pathInfo
      ? `${pathInfo.academicYear}-s${pathInfo.semester}/g${pathInfo.grade}/${pathInfo.subjectId}`
      : null;
    const knownUnits = unitKey ? unitIndex.get(unitKey) : undefined;
    if (pathInfo && !knownUnits) {
      errors.push(`找不到對應課綱來源（${unitKey}），無法驗證 unitNo：${rel}`);
    }

    const packAnswerCounts = [0, 0, 0, 0];

    for (const stage of pack.stages) {
      for (const field of REQUIRED_STAGE_FIELDS) {
        if (stage[field] === undefined || stage[field] === null || stage[field] === '') {
          errors.push(`stage 缺少必填欄位 ${field}：${rel} (${stage.id})`);
        }
      }

      if (stage.difficulty !== undefined && !DIFFICULTIES.has(stage.difficulty)) {
        errors.push(`stage difficulty 無效（${stage.difficulty}）：${rel} (${stage.id})`);
      }

      if (stage.subjectId && pack.subjectId && stage.subjectId !== pack.subjectId) {
        errors.push(`stage subjectId（${stage.subjectId}）與題庫包不一致：${rel} (${stage.id})`);
      }

      if (!stage.id || typeof stage.id !== 'string') {
        errors.push(`stage 缺少 id：${rel}`);
      } else if (stageIds.has(stage.id)) {
        errors.push(`重複的 stage.id「${stage.id}」：${rel}`);
      } else {
        stageIds.add(stage.id);
      }

      const ref = stage.curriculum;
      if (!ref || typeof ref !== 'object') {
        errors.push(`stage 缺少 curriculum 參照：${rel} (${stage.id})`);
      } else {
        if (
          pathInfo &&
          (ref.academicYear !== pathInfo.academicYear ||
            ref.semester !== pathInfo.semester ||
            ref.grade !== pathInfo.grade)
        ) {
          errors.push(`curriculum 學年度/學期/年級與題庫包不一致：${rel} (${stage.id})`);
        }
        if (!Number.isInteger(ref.unitNo)) {
          errors.push(`curriculum.unitNo 必須為整數：${rel} (${stage.id})`);
        } else if (knownUnits && !knownUnits.has(ref.unitNo)) {
          errors.push(
            `curriculum.unitNo ${ref.unitNo} 不存在於課綱來源：${rel} (${stage.id})`,
          );
        }
      }

      if (!Array.isArray(stage.questions)) {
        errors.push(`stage 缺少 questions 陣列：${rel} (${stage.id})`);
        continue;
      }

      if (!isDynamic(stage) && stage.questions.length >= 4) {
        const stageCounts = [0, 0, 0, 0];
        for (const q of stage.questions) {
          if (Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex <= 3) {
            stageCounts[q.answerIndex] += 1;
          }
        }
        const limit = Math.ceil(stage.questions.length / 2);
        const worst = Math.max(...stageCounts);
        if (worst > limit) {
          errors.push(
            `答案分布過度集中（${stageCounts.join('/')}，上限 ${limit}）：${rel} (${stage.id})`,
          );
        }
      }

      for (const q of stage.questions) {
        for (const field of REQUIRED_QUESTION_FIELDS) {
          if (typeof q[field] !== 'string' || q[field].trim() === '') {
            errors.push(`題目缺少必填欄位 ${field}：${rel} (${q.id})`);
          }
        }

        if (!q.id || typeof q.id !== 'string') {
          errors.push(`題目缺少 id：${rel} (${stage.id})`);
        } else if (questionIds.has(q.id)) {
          errors.push(`重複的 question.id「${q.id}」：${rel}`);
        } else {
          questionIds.add(q.id);
        }

        if (!Array.isArray(q.options) || q.options.length !== 4) {
          errors.push(`題目選項必須恰為 4 個：${rel} (${q.id})`);
        } else {
          const trimmed = q.options.map((opt) => (typeof opt === 'string' ? opt.trim() : opt));
          if (trimmed.some((opt) => typeof opt !== 'string' || opt === '')) {
            errors.push(`題目選項不可為空：${rel} (${q.id})`);
          } else if (new Set(trimmed).size !== 4) {
            errors.push(`題目選項重複：${rel} (${q.id})`);
          }
        }

        if (
          typeof q.answerIndex !== 'number' ||
          !Number.isInteger(q.answerIndex) ||
          q.answerIndex < 0 ||
          q.answerIndex > 3
        ) {
          errors.push(`題目 answerIndex 必須為 0..3：${rel} (${q.id})`);
        } else if (!isDynamic(stage)) {
          packAnswerCounts[q.answerIndex] += 1;
        }

        if (typeof q.prompt === 'string') {
          const normalized = q.prompt.trim().replace(/\s+/g, ' ');
          if (normalized) {
            const firstSeen = prompts.get(normalized);
            if (firstSeen) {
              errors.push(`題幹重複（與 ${firstSeen} 相同）：${rel} (${q.id})`);
            } else {
              prompts.set(normalized, q.id);
            }
          }
        }
      }
    }

    const staticCount = packAnswerCounts.reduce((sum, count) => sum + count, 0);
    if (staticCount >= MIN_PACK_SIZE_FOR_DISTRIBUTION) {
      const limit = Math.floor(staticCount * MAX_ANSWER_SHARE);
      const worst = Math.max(...packAnswerCounts);
      if (worst > limit) {
        errors.push(
          `題庫包答案分布過度集中（${packAnswerCounts.join('/')}，單一索引上限 ${limit}）：${rel}`,
        );
      }
      const missing = packAnswerCounts.findIndex((count) => count === 0);
      if (missing !== -1) {
        errors.push(`題庫包完全未使用 answerIndex ${missing}：${rel}`);
      }
    }
  }

  return { errors, packCount: files.length, covered };
}

function writeCatalogFiles(catalog) {
  fs.mkdirSync(CATALOG_DIR, { recursive: true });
  const grades = [...new Set(catalog.entries.map((entry) => entry.grade))].sort(
    (a, b) => a - b,
  );

  for (const grade of grades) {
    const entries = catalog.entries.filter((entry) => entry.grade === grade);
    fs.writeFileSync(
      path.join(CATALOG_DIR, `catalog-g${grade}.json`),
      `${JSON.stringify({ grade, entries }, null, 2)}\n`,
      'utf8',
    );
  }

  const meta = {
    generatedAt: catalog.generatedAt,
    academicYear: catalog.academicYear,
    school: catalog.school,
    grades,
  };
  fs.writeFileSync(
    path.join(CATALOG_DIR, 'catalog-meta.json'),
    `${JSON.stringify(meta, null, 2)}\n`,
    'utf8',
  );

  const legacy = path.join(CATALOG_DIR, 'catalog.json');
  if (fs.existsSync(legacy)) {
    fs.unlinkSync(legacy);
  }

  return grades.length;
}

function main() {
  const isCheckOnly = process.argv.includes('--check');
  const sourceResult = validateCurriculumSources();
  const packResult = validateQuizPacks(sourceResult.catalog?.entries ?? []);
  const allErrors = [...sourceResult.errors, ...packResult.errors];

  if (allErrors.length > 0) {
    console.error(`內容驗證失敗（共 ${allErrors.length} 項錯誤）：`);
    for (const err of allErrors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  if (!isCheckOnly && sourceResult.catalog) {
    const gradeCount = writeCatalogFiles(sourceResult.catalog);
    console.log(
      `已同步課綱目錄：${sourceResult.fileCount} 份來源 -> ${gradeCount} 個年級檔（題庫包：${packResult.packCount} 份）`,
    );
  } else {
    console.log(
      `內容驗證通過：${sourceResult.fileCount} 份課綱來源、${packResult.packCount} 份題庫包（0 錯誤）`,
    );
  }

  printCoverage(sourceResult.catalog, packResult.covered);
  printQualityAudit();
}

function printQualityAudit() {
  const packFiles = walkJsonFiles(PACKS_DIR);
  const templatePatterns = [
    /最核心的學習(重點|目標)是下列哪一項/,
    /只背誦課文標題與頁碼/,
    /做實驗時同時改變所有條件/,
    /融入[^\s]{2,6}教育/,
    /的課堂探究或活動時，哪一種學習方法最恰當/,
    /應用在日常生活中，下列哪一項做法最正確/,
    /的探究內容，下列哪一個敘述最符合課堂所學/,
  ];
  let templateCount = 0;
  let duplicateAnsStages = 0;

  for (const filePath of packFiles) {
    const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const stage of pack.stages ?? []) {
      const seenAnswers = new Set();
      let hasDup = false;
      for (const q of stage.questions ?? []) {
        const text = `${q.prompt ?? ''} ${(q.options ?? []).join(' ')}`;
        if (templatePatterns.some((re) => re.test(text))) {
          templateCount += 1;
        }
        const ans = q.options?.[q.answerIndex]?.trim();
        if (ans && seenAnswers.has(ans)) {
          hasDup = true;
        }
        if (ans) seenAnswers.add(ans);
      }
      if (hasDup) duplicateAnsStages += 1;
    }
  }

  console.log(
    `題庫品質巡檢：樣板題 ${templateCount} 題、含重複正解關卡 ${duplicateAnsStages} 關`,
  );
}

function printCoverage(catalog, covered) {
  if (!catalog) return;
  const expected = new Map();
  for (const entry of catalog.entries) {
    const key = `s${entry.semester}/g${entry.grade}`;
    expected.set(key, (expected.get(key) ?? 0) + 1);
  }
  const keys = [...expected.keys()].sort((a, b) => {
    const [as, ag] = a.slice(1).split('/g').map(Number);
    const [bs, bg] = b.slice(1).split('/g').map(Number);
    return as - bs || ag - bg;
  });
  const lines = keys.map((key) => {
    const total = expected.get(key);
    const done = covered.get(key) ?? 0;
    const mark = done === total ? '✓' : ' ';
    return `${key} ${done}/${total}${mark}`;
  });
  const totalExpected = [...expected.values()].reduce((sum, n) => sum + n, 0);
  const totalDone = [...covered.values()].reduce((sum, n) => sum + n, 0);
  console.log(
    `題庫覆蓋 ${totalDone}/${totalExpected}（${((totalDone / totalExpected) * 100).toFixed(1)}%）：${lines.join('  ')}`,
  );
}

main();
