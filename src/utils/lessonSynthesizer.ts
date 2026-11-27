import type {
  AgeBand,
  LessonPack,
  LessonScene,
  LessonScript,
  LessonSubject,
  LessonVisualSpec,
  WarmupCheckData,
} from '../types/lesson.ts';
import type {
  CurriculumUnitSummary,
  Grade,
  Question,
  Stage,
  SubjectId,
  WorkedExampleData,
} from '../types/quiz.ts';
import {
  buildWorkedExampleFromQuestion,
  pickEliminatedOptionIndices,
} from './workedExample.ts';

const BANNED_SEDUCTIVE_TOKENS = [
  '吉祥物',
  '魔法棒',
  '超炫特效',
  '撒花',
  '華麗動畫',
  '炫酷',
];

const LANGUAGE_SUBJECTS = new Set<SubjectId>([
  'mandarin',
  'english',
  'minnan',
  'hakka',
]);

export function sanitizeLessonText(text: string): string {
  let cleaned = text;
  for (const token of BANNED_SEDUCTIVE_TOKENS) {
    cleaned = cleaned.split(token).join('');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function clampSpatialLabel(text: string, fallback: string): string {
  const cleaned = sanitizeLessonText(text);
  const chars = [...cleaned];
  if (chars.length === 0) return fallback;
  if (chars.length <= 12) return cleaned;
  return `${chars.slice(0, 11).join('')}…`;
}

export function mapLessonSubject(subjectId: SubjectId): LessonSubject {
  if (LANGUAGE_SUBJECTS.has(subjectId)) return 'LANGUAGE';
  if (subjectId === 'math') return 'MATH';
  return 'SCIENCE_SOCIAL';
}

export function mapAgeBand(grade?: Grade): AgeBand {
  if (grade !== undefined && grade <= 2) return 'AGE_6_8_LOWER';
  return 'AGE_9_12_UPPER';
}

export function buildFactGroundingSourceId(stage: Stage): string {
  const curr = stage.curriculum;
  if (
    curr &&
    typeof curr.academicYear === 'number' &&
    (curr.semester === 1 || curr.semester === 2) &&
    curr.grade >= 1 &&
    curr.grade <= 6 &&
    typeof curr.unitNo === 'number' &&
    stage.subjectId !== 'custom'
  ) {
    return `${curr.academicYear}-s${curr.semester}/g${curr.grade}/${stage.subjectId}#u${curr.unitNo}`;
  }
  return stage.id;
}

function buildCognitiveChunks(
  stage: Stage,
  unitSummary?: CurriculumUnitSummary,
): string[] {
  const chunks: string[] = [];

  if (unitSummary?.lessonTitles && unitSummary.lessonTitles.length > 0) {
    for (const rawTitle of unitSummary.lessonTitles) {
      const cleaned = sanitizeLessonText(rawTitle);
      if (cleaned && !chunks.includes(cleaned)) {
        chunks.push(cleaned);
      }
      if (chunks.length >= 3) break;
    }
  }

  const desc = sanitizeLessonText(stage.description);
  if (desc && !chunks.includes(desc) && chunks.length < 4) {
    chunks.push(desc);
  }

  if (chunks.length === 0) {
    const title = sanitizeLessonText(stage.title) || '本單元核心概念';
    chunks.push(`掌握「${title}」的核心定義與判斷方法`);
    chunks.push('先讀懂關鍵線索，再對照正確範例一步步完成練習');
  }

  return chunks.slice(0, 4);
}

function buildAnchorVisualSpec(
  stage: Stage,
  lessonSubject: LessonSubject,
  unitSummary?: CurriculumUnitSummary,
): LessonVisualSpec {
  const contextText = `${stage.title} ${stage.description}`;

  if (lessonSubject === 'MATH') {
    if (/分數|約分|通分|擴分|帶分數|假分數/.test(contextText)) {
      return {
        templateId: 'fraction_bar',
        params: {
          denominator: 4,
          numerator: 3,
          scaleFactor: 2,
        },
        spatialLabels: [
          {
            id: 'l1',
            text: clampSpatialLabel('原分數切分', '原分數切分'),
            anchorPointId: 'top',
          },
          {
            id: 'l2',
            text: clampSpatialLabel('等值擴分對照', '等值擴分對照'),
            anchorPointId: 'bottom',
          },
        ],
      };
    }

    if (
      /面積|周長|三角形|梯形|平行四邊形|長方形|正方形|圖形/.test(contextText)
    ) {
      let shape: 'rect' | 'triangle' | 'trapezoid' | 'parallelogram' = 'rect';
      if (/三角形/.test(contextText)) shape = 'triangle';
      else if (/梯形/.test(contextText)) shape = 'trapezoid';
      else if (/平行四邊形/.test(contextText)) shape = 'parallelogram';

      return {
        templateId: 'rect_geometry',
        params: {
          shape,
          base: 6,
          topBase: 4,
          height: 4,
          unit: 'cm',
        },
        spatialLabels: [
          { id: 'l1', text: '底 6 cm', anchorPointId: 'bottom' },
          { id: 'l2', text: '高 4 cm', anchorPointId: 'height' },
        ],
      };
    }

    if (/時間|時鐘|鐘面|幾點|角度|扇形|圓心角/.test(contextText)) {
      const isAngle = /角度|角|扇形|圓心角/.test(contextText);
      return {
        templateId: 'clock_face',
        params: isAngle ? { angle: 90 } : { hour: 3, minute: 15 },
        spatialLabels: isAngle
          ? [
              { id: 'l1', text: '圓心', anchorPointId: 'center' },
              { id: 'l2', text: '直角 90°', anchorPointId: 'bottom' },
            ]
          : [
              { id: 'l1', text: '時針短・分針長', anchorPointId: 'top' },
              { id: 'l2', text: '一大格 5 分鐘', anchorPointId: 'bottom' },
            ],
      };
    }

    if (/因數|倍數|數線|小數|負數|整數|規律/.test(contextText)) {
      return {
        templateId: 'number_line',
        params: {
          min: 0,
          max: 12,
          step: 1,
          stepA: 2,
          stepB: 3,
        },
        spatialLabels: [
          { id: 'l1', text: '從 0 起跳看規律', anchorPointId: 'top' },
          { id: 'l2', text: '圓點為重合位置', anchorPointId: 'bottom' },
        ],
      };
    }

    return {
      templateId: 'flow_cause',
      params: {
        nodes: ['讀題找條件', '列式細心算', '核對答與單位'],
      },
      spatialLabels: [
        { id: 'l1', text: '三步驟解題法', anchorPointId: 'bottom' },
      ],
    };
  }

  if (lessonSubject === 'LANGUAGE') {
    const rawTitles =
      unitSummary?.lessonTitles
        ?.map((t) => sanitizeLessonText(t))
        .filter(Boolean) ?? [];
    const leftPoints =
      rawTitles.length >= 2
        ? rawTitles.slice(0, 2)
        : [
            rawTitles[0] ?? (sanitizeLessonText(stage.title) || '本課核心主題'),
            '掌握關鍵詞句與語意',
          ];

    return {
      templateId: 'concept_compare',
      params: {
        leftTitle: '核心學習重點',
        rightTitle: '答題觀察技巧',
        leftPoints,
        rightPoints: ['先看清題幹問什麼', '回頭核對上下文與字形讀音'],
      },
      spatialLabels: [
        { id: 'l1', text: '核心重點', anchorPointId: 'left' },
        { id: 'l2', text: '觀察技巧', anchorPointId: 'right' },
      ],
    };
  }

  const lessonNodes =
    unitSummary?.lessonTitles
      ?.map((t) => clampSpatialLabel(t, '單元重點'))
      .filter(Boolean)
      .slice(0, 4) ?? [];

  if (lessonNodes.length >= 2) {
    return {
      templateId: 'flow_cause',
      params: {
        nodes: lessonNodes,
      },
      spatialLabels: [
        { id: 'l1', text: '單元知識脈絡', anchorPointId: 'bottom' },
      ],
    };
  }

  return {
    templateId: 'concept_compare',
    params: {
      leftTitle: '單元核心概念',
      rightTitle: '生活觀察應用',
      leftPoints: [
        sanitizeLessonText(stage.title) || '本單元學習主題',
        sanitizeLessonText(stage.description) || '理解因果與分類關聯',
      ],
      rightPoints: ['觀察實際生活現象', '比對條件並排除易混淆項'],
    },
    spatialLabels: [
      { id: 'l1', text: '核心概念', anchorPointId: 'left' },
      { id: 'l2', text: '生活觀察', anchorPointId: 'right' },
    ],
  };
}

function buildWorkedExampleSceneData(
  stage: Stage,
  lessonSubject: LessonSubject,
  ageBand: AgeBand,
  exampleQuestion?: Question,
): WorkedExampleData {
  const isLowerGrade = ageBand === 'AGE_6_8_LOWER';

  if (exampleQuestion) {
    const built = buildWorkedExampleFromQuestion(
      exampleQuestion,
      stage.curriculum?.grade,
    );
    const cleanedSteps = built.steps
      .map((step) => sanitizeLessonText(step))
      .filter(Boolean)
      .slice(0, 4);

    let commonErrorContrast = sanitizeLessonText(built.commonErrorContrast);
    if (lessonSubject === 'LANGUAGE') {
      commonErrorContrast =
        '常見錯誤：只看局部字詞就匆忙作答，沒有回頭核對整句語意、字形或題幹條件。';
    } else if (lessonSubject === 'SCIENCE_SOCIAL') {
      commonErrorContrast =
        '常見錯誤：把題目中的因果條件或比較對象看反，憑直覺作答而未核對關鍵事實。';
    }

    return {
      problemStatement:
        sanitizeLessonText(built.problemStatement) || stage.title,
      steps:
        cleanedSteps.length > 0
          ? cleanedSteps
          : ['第 1 步：先讀懂題幹要問的核心概念，並比對正確定義。'],
      commonErrorContrast:
        commonErrorContrast ||
        '常見錯誤：未看清題幹關鍵條件就憑直覺選擇。',
      selfExplanationPrompt: isLowerGrade
        ? undefined
        : sanitizeLessonText(built.selfExplanationPrompt ?? '') ||
          '想一想：這題最重要的判斷線索是什麼？',
      keepStepCardVisible: isLowerGrade ? true : built.keepStepCardVisible,
    };
  }

  return {
    problemStatement: `如何掌握「${sanitizeLessonText(stage.title) || '本單元'}」的重點？`,
    steps: [
      '第 1 步：先讀清題幹中的關鍵字詞與已知條件。',
      '第 2 步：回憶單元核心概念或公式規則，寫出判斷依據。',
      '第 3 步：逐一排除不合理的選項，並再次核對題意。',
    ],
    commonErrorContrast:
      '常見錯誤：未看清題意與條件限制就急著下決定。',
    selfExplanationPrompt: isLowerGrade
      ? undefined
      : '想一想：哪一個條件是這類題型的關鍵判斷依據？',
    keepStepCardVisible: isLowerGrade,
  };
}

function isValidWarmupQuestion(q: Question): boolean {
  if (!q || typeof q.prompt !== 'string' || !Array.isArray(q.options)) {
    return false;
  }
  if (q.options.length < 3 || q.options.length > 4) return false;
  if (
    typeof q.answerIndex !== 'number' ||
    !Number.isInteger(q.answerIndex) ||
    q.answerIndex < 0 ||
    q.answerIndex >= q.options.length
  ) {
    return false;
  }
  const normalized = q.options.map((opt) => sanitizeLessonText(String(opt)));
  if (normalized.some((opt) => !opt)) return false;
  return new Set(normalized).size === normalized.length;
}

function buildWarmupCheckData(
  stage: Stage,
  ageBand: AgeBand,
  questions: Question[],
): WarmupCheckData {
  const validCandidates = questions.filter(isValidWarmupQuestion);
  const pickedQuestion = validCandidates[1] ?? validCandidates[0];

  if (!pickedQuestion) {
    const cleanTitle = sanitizeLessonText(stage.title) || '本單元';
    return {
      prompt: `在進入「${cleanTitle}」挑戰前，哪一個做法最能幫你答對題目？`,
      options: [
        '先看清題幹的關鍵字與條件，再核對觀念',
        '不看題目直接猜第一個選項',
        '忽略單位或上下文線索直接作答',
      ],
      answerIndex: 0,
      feedbackCorrect: '答對了！看清關鍵線索再核對觀念，答題準確率會大幅提升！',
      feedbackRetry: '再想想看，讀懂題幹與條件是不是比直接猜測更穩妥呢？',
    };
  }

  const rawOptions = pickedQuestion.options.map((opt) =>
    sanitizeLessonText(String(opt)),
  );
  let options = rawOptions;
  let answerIndex = pickedQuestion.answerIndex;

  if (ageBand === 'AGE_6_8_LOWER' && rawOptions.length === 4) {
    const eliminated = new Set(pickEliminatedOptionIndices(pickedQuestion, 1));
    const filtered: string[] = [];
    let mappedAnswerIndex = -1;
    rawOptions.forEach((opt, idx) => {
      if (eliminated.has(idx)) return;
      if (idx === pickedQuestion.answerIndex) {
        mappedAnswerIndex = filtered.length;
      }
      filtered.push(opt);
    });
    if (
      filtered.length === 3 &&
      mappedAnswerIndex >= 0 &&
      new Set(filtered).size === 3
    ) {
      options = filtered;
      answerIndex = mappedAnswerIndex;
    }
  }

  const feedbackCorrect =
    sanitizeLessonText(pickedQuestion.explanation) ||
    '太棒了！你已經掌握這個觀念的核心重點。';
  const feedbackRetry =
    sanitizeLessonText(pickedQuestion.hint ?? '') ||
    '再看一次題幹的關鍵條件，想一想剛剛示範的步驟喔！';

  return {
    prompt: sanitizeLessonText(pickedQuestion.prompt) || stage.title,
    options,
    answerIndex,
    feedbackCorrect,
    feedbackRetry,
  };
}

function buildStepFlowVisualSpec(
  stage: Stage,
  subject: LessonSubject,
  anchorVisualSpec: LessonVisualSpec,
  unitSummary?: CurriculumUnitSummary,
): LessonVisualSpec {
  const cleanTitle = sanitizeLessonText(stage.title) || '本單元';
  const unitLessons =
    unitSummary?.lessonTitles
      ?.map((t) => clampSpatialLabel(t, '單元重點'))
      .filter(Boolean)
      .slice(0, 3) ?? [];

  if (anchorVisualSpec.templateId === 'flow_cause') {
    return {
      templateId: 'concept_compare',
      params: {
        leftTitle: '正確解題思路',
        rightTitle: '最常見陷阱',
        leftPoints: [
          `先確認「${cleanTitle}」的關鍵條件與單位`,
          '照步驟拆解關係，一步步檢查答案合理性',
        ],
        rightPoints: [
          '跳過審題直接心算或猜測，漏看關鍵字',
          '忘記核對單位、正負方向或上下文線索',
        ],
      },
      spatialLabels: [
        { id: 'l1', text: '正確思路', anchorPointId: 'left' },
        { id: 'l2', text: '避開陷阱', anchorPointId: 'right' },
      ],
    };
  }

  if (subject === 'MATH') {
    return {
      templateId: 'flow_cause',
      params: {
        nodes: ['圈出已知條件', '畫圖或列算式', '檢查單位合理性'],
      },
      spatialLabels: [
        { id: 'l1', text: '數學解題三步驟', anchorPointId: 'bottom' },
      ],
    };
  }

  if (subject === 'LANGUAGE') {
    return {
      templateId: 'flow_cause',
      params: {
        nodes:
          unitLessons.length >= 2
            ? [unitLessons[0], unitLessons[1], '統整句意與用詞']
            : ['讀懂題幹問題', '回文章找線索', '核對字形與語意'],
      },
      spatialLabels: [
        { id: 'l1', text: '語文閱讀三步驟', anchorPointId: 'bottom' },
      ],
    };
  }

  return {
    templateId: 'flow_cause',
    params: {
      nodes:
        unitLessons.length >= 2
          ? [unitLessons[0], unitLessons[1], '歸納原理與應用']
          : ['觀察生活現象', '找出因果與規律', '驗證是否符合條件'],
    },
    spatialLabels: [
      { id: 'l1', text: '探究思考三步驟', anchorPointId: 'bottom' },
    ],
  };
}

/**
 * 依據關卡、題庫與課綱單元摘要，確定性合成 4 幕符合雙層認知護欄的圖解式互動微課程。
 */
export function synthesizeLessonForStage(
  stage: Stage,
  unitSummary?: CurriculumUnitSummary,
): LessonScript {
  const ageBand = mapAgeBand(stage.curriculum?.grade);
  const subject = mapLessonSubject(stage.subjectId);
  const factGroundingSourceId = buildFactGroundingSourceId(stage);
  const cleanTitle = sanitizeLessonText(stage.title) || '觀念導航';
  const chunks = buildCognitiveChunks(stage, unitSummary);
  const anchorVisualSpec = buildAnchorVisualSpec(stage, subject, unitSummary);
  const stepFlowVisualSpec = buildStepFlowVisualSpec(
    stage,
    subject,
    anchorVisualSpec,
    unitSummary,
  );

  const questions = Array.isArray(stage.questions) ? stage.questions : [];
  const exampleQuestion = questions[0];
  const workedExampleData = buildWorkedExampleSceneData(
    stage,
    subject,
    ageBand,
    exampleQuestion,
  );
  const warmupCheck = buildWarmupCheckData(stage, ageBand, questions);

  const anchorNarration =
    sanitizeLessonText(
      `歡迎來到「${cleanTitle}」觀念微課程！先看上方圖解掌握核心概念：${chunks.join('；')}。`,
    ) || `一起透過圖解認識「${cleanTitle}」的核心概念！`;

  const stepFlowNarration =
    subject === 'MATH'
      ? `看懂「${cleanTitle}」的概念後，解題時請照著上方流程圖操作：先圈出已知條件與單位，再畫圖或列式推導，最後回頭驗算是否合理。`
      : subject === 'LANGUAGE'
        ? `掌握「${cleanTitle}」的關鍵在「先讀題、再找線索、最後核對語意」：照著上方流程圖的順序思考，就能避開相似字詞或斷章取義的陷阱。`
        : `學習「${cleanTitle}」時，建議用上方流程圖的三個步驟：先觀察現象與特徵，再找出背後的因果規律，最後回到題目條件做確認。`;

  const exampleNarration =
    subject === 'MATH'
      ? '接著看一題實際示範：結合上方圖解，左邊照著步驟一步步推導，右邊提醒你最容易踩到的陷阱。'
      : '接著透過一題真實例題，結合圖解對照正確思考脈絡與常見誤區，建立穩固的判斷標準。';

  const warmupNarration =
    '最後來一題零懲罰暖身小試，答錯也能再試一次，準備好就能直接上場挑戰！';

  const scenes: LessonScene[] = [
    {
      sceneId: 's1-anchor',
      componentType: 'ANCHOR_SCENE',
      title: `圖解核心「${cleanTitle}」`,
      narrationText: anchorNarration,
      cognitiveChunks: chunks,
      analogyAnchor: sanitizeLessonText(stage.description) || undefined,
      visualSpec: anchorVisualSpec,
      factGroundingSourceId,
    },
    {
      sceneId: 's2-step-flow',
      componentType: 'ANCHOR_SCENE',
      title: '思考流程與解題口訣圖解',
      narrationText: stepFlowNarration,
      cognitiveChunks:
        subject === 'MATH'
          ? [
              '第 1 步：圈出題目數字、單位與要求',
              '第 2 步：用圖示或算式整理數量關係',
              '第 3 步：代回原題檢查大小與單位是否合理',
            ]
          : subject === 'LANGUAGE'
            ? [
                '第 1 步：先讀懂題幹到底在問什麼',
                '第 2 步：從上下文、部首或詞性找線索',
                '第 3 步：把選項代回原句念一次確認通順',
              ]
            : [
                '第 1 步：先分辨題目觀察的對象與條件',
                '第 2 步：連結課本學過的特徵、因果或規律',
                '第 3 步：逐一排除矛盾選項，選出最完整答案',
              ],
      analogyAnchor:
        '把思考步驟當成檢查清單，一格一格打勾就不會漏看關鍵條件！',
      visualSpec: stepFlowVisualSpec,
      factGroundingSourceId,
    },
    {
      sceneId: 's3-example',
      componentType: 'WORKED_EXAMPLE_SPLIT',
      title: '示範拆解與易錯對比',
      narrationText: exampleNarration,
      cognitiveChunks: [
        '先圈出題幹已知條件與要回答的目標',
        '照步驟核對關係，避開右欄常見陷阱',
      ],
      visualSpec: anchorVisualSpec,
      workedExampleData,
      factGroundingSourceId,
    },
    {
      sceneId: 's4-warmup',
      componentType: 'WARMUP_CHECK',
      title: '零懲罰暖身小試',
      narrationText: warmupNarration,
      cognitiveChunks: [
        '套用剛剛學到的判斷步驟完成暖身題',
        '答錯不扣愛心，看提示再試一次就會懂',
      ],
      warmupCheck,
      factGroundingSourceId,
    },
  ];

  return {
    schemaVersion: '2026.1',
    lessonId: `auto-lesson-${stage.id}`,
    stageId: stage.id,
    title: `${cleanTitle}：核心觀念微課程`,
    ageBand,
    subject,
    scenes,
  };
}

/**
 * 優先取用手寫精雕微課程；若該關尚未製作手寫課程，自動合成互動微課程補位。
 */
export function resolveLessonForStage(
  curatedPack: LessonPack | null,
  stage: Stage,
  unitSummary?: CurriculumUnitSummary,
): { lesson: LessonScript; isCurated: boolean } {
  const curated =
    curatedPack && Array.isArray(curatedPack.lessons)
      ? (curatedPack.lessons.find((lesson) => lesson.stageId === stage.id) ??
        null)
      : null;

  if (curated) {
    return { lesson: curated, isCurated: true };
  }

  return {
    lesson: synthesizeLessonForStage(stage, unitSummary),
    isCurated: false,
  };
}
