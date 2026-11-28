import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Eye,
  EyeOff,
  Filter,
  Lightbulb,
  Play,
  Printer,
  Rocket,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  findLessonForStage,
  loadLessonPack,
} from '../data/curriculum/lessonLoader';
import {
  getCurriculumCatalog,
  loadGradeEntries,
  loadQuizPack,
} from '../data/curriculum/loader';
import { SUBJECT_META } from '../data/subjects';
import type { LessonPack, LessonScript } from '../types/lesson';
import type {
  CurriculumSubjectEntry,
  ExamPlan,
  Grade,
  PlayerProgress,
  Question,
  QuizPack,
  Semester,
  Stage,
  SubjectId,
  WorkedExampleData,
} from '../types/quiz';
import { buildExamSprintSummary } from '../utils/examPlanner';
import { resolveStageQuestionsAsync } from '../utils/generators/registry';
import { buildSubjectDiagnostics } from '../utils/learningDiagnostics';
import { playTap } from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';
import {
  EnglishSpellingModal,
  extractSpellingWords,
} from './EnglishSpellingModal';

interface ExamReviewProps {
  progress: PlayerProgress;
  onStartMockExam: (mockStage: Stage) => void;
  onStartRealMockExam?: (
    mockStage: Stage,
    grade: Grade,
    semester: Semester,
    timeLimitSec?: number,
  ) => void;
  onStartStage: (stage: Stage) => void;
  onStartLesson: (lesson: LessonScript, stage: Stage) => void;
  onUpdateExamPlan?: (plan: ExamPlan | undefined) => void;
  onUpdateMapFilter: (
    patch: Partial<
      Pick<
        PlayerProgress,
        'selectedGrade' | 'selectedSemester' | 'selectedSubject'
      >
    >,
  ) => void;
}

type ExamPreset = 'midterm' | 'final' | 'all' | 'custom';
type ReviewMode = 'notes' | 'mock';
type MockStrategy = 'weakness-first' | 'balanced';
type MockExamStyle = 'real' | 'practice';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const QUESTION_COUNT_OPTIONS = [10, 15, 20, 25] as const;
const TIME_LIMIT_OPTIONS = [
  { minutes: 0, label: '不限時' },
  { minutes: 15, label: '15 分鐘' },
  { minutes: 25, label: '25 分鐘' },
  { minutes: 40, label: '40 分鐘' },
] as const;

interface UnitDigest {
  stage: Stage;
  lesson: LessonScript | null;
  unitNo: number;
  stars: number;
  wrongCount: number;
  wrongQuestions: Question[];
  needsAttention: boolean;
  keyPoints: string[];
  analogies: string[];
  workedExamples: WorkedExampleData[];
  commonErrors: string[];
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ClozeText({ text, enabled }: { text: string; enabled: boolean }) {
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>({});
  useEffect(() => {
    setRevealedMap({});
  }, [enabled, text]);

  if (!enabled) return <span>{text}</span>;

  const parts = text.split(/(「[^」]+」|『[^』]+』|\d+(?:\.\d+)?%?)/g);
  if (parts.length <= 1) return <span>{text}</span>;

  return (
    <span>
      {parts.map((part, idx) => {
        const isMaskTarget =
          /^(「[^」]+」|『[^』]+』|\d+(?:\.\d+)?%?)$/.test(part);
        if (!isMaskTarget) return <span key={idx}>{part}</span>;
        const revealed = Boolean(revealedMap[idx]);
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTap();
              setRevealedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
            }}
            className={`mx-0.5 inline-block rounded-lg px-1.5 py-0.5 text-xs font-black transition ${
              revealed
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-slate-800 text-amber-200 hover:bg-slate-700'
            }`}
            title={revealed ? '點擊再次遮住' : '點擊顯示關鍵字'}
          >
            {revealed ? part : '點擊回想'}
          </button>
        );
      })}
    </span>
  );
}

export function ExamReview({
  progress,
  onStartMockExam,
  onStartRealMockExam,
  onStartStage,
  onStartLesson,
  onUpdateExamPlan,
  onUpdateMapFilter,
}: ExamReviewProps) {
  const catalog = useMemo(() => getCurriculumCatalog(), []);
  const speechAvailable = isSpeechSupported();

  const [grade, setGrade] = useState<Grade>(progress.selectedGrade ?? 5);
  const [semester, setSemester] = useState<Semester>(
    progress.selectedSemester ?? 1,
  );
  const [subjectId, setSubjectId] = useState<Exclude<SubjectId, 'custom'>>(
    progress.selectedSubject &&
      progress.selectedSubject !== 'all' &&
      progress.selectedSubject !== 'custom'
      ? progress.selectedSubject
      : 'mandarin',
  );

  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [planTitle, setPlanTitle] = useState(
    progress.examPlan?.title ?? `${progress.selectedGrade ?? 5}年級段考衝刺`,
  );
  const [planDate, setPlanDate] = useState(
    progress.examPlan?.examDate ??
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [planSubjects, setPlanSubjects] = useState<SubjectId[]>(
    progress.examPlan?.subjectIds && progress.examPlan.subjectIds.length > 0
      ? progress.examPlan.subjectIds
      : ['mandarin', 'math'],
  );
  const [planPreset, setPlanPreset] = useState<'midterm' | 'final' | 'all'>(
    progress.examPlan?.preset === 'final' || progress.examPlan?.preset === 'all'
      ? progress.examPlan.preset
      : 'midterm',
  );
  const [planPacks, setPlanPacks] = useState<
    Partial<Record<SubjectId, QuizPack | null>>
  >({});

  useEffect(() => {
    setPlanTitle(
      progress.examPlan?.title ?? `${progress.selectedGrade ?? 5}年級段考衝刺`,
    );
    setPlanDate(
      progress.examPlan?.examDate ??
        new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    );
    if (progress.examPlan?.subjectIds && progress.examPlan.subjectIds.length > 0) {
      setPlanSubjects(progress.examPlan.subjectIds);
    }
    if (
      progress.examPlan?.preset === 'midterm' ||
      progress.examPlan?.preset === 'final' ||
      progress.examPlan?.preset === 'all'
    ) {
      setPlanPreset(progress.examPlan.preset);
    }
  }, [progress.examPlan, progress.selectedGrade]);

  useEffect(() => {
    const plan = progress.examPlan;
    if (!plan || plan.subjectIds.length === 0) {
      setPlanPacks({});
      return;
    }
    let active = true;
    const planGrade = plan.grade ?? grade;
    const planSemester = plan.semester ?? semester;
    Promise.all(
      plan.subjectIds.map(async (sid) => {
        if (sid === 'custom') return [sid, null] as const;
        const p = await loadQuizPack(
          catalog.academicYear,
          planSemester,
          planGrade,
          sid,
        ).catch(() => null);
        return [sid, p] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      const next: Partial<Record<SubjectId, QuizPack | null>> = {};
      for (const [sid, p] of entries) {
        next[sid] = p;
      }
      setPlanPacks(next);
    });
    return () => {
      active = false;
    };
  }, [catalog.academicYear, grade, progress.examPlan, semester]);

  const [gradeEntries, setGradeEntries] = useState<CurriculumSubjectEntry[]>(
    [],
  );
  const [quizPack, setQuizPack] = useState<QuizPack | null>(null);
  const [lessonPack, setLessonPack] = useState<LessonPack | null>(null);
  const [loading, setLoading] = useState(true);

  const [preset, setPreset] = useState<ExamPreset>('midterm');
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [mode, setMode] = useState<ReviewMode>('notes');
  const [onlyWeakUnits, setOnlyWeakUnits] = useState(false);
  const [clozeMode, setClozeMode] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const [mockCount, setMockCount] = useState<number>(15);
  const [mockStrategy, setMockStrategy] =
    useState<MockStrategy>('weakness-first');
  const [examStyle, setExamStyle] = useState<MockExamStyle>('real');
  const [timeLimitMin, setTimeLimitMin] = useState<number>(
    (progress.selectedGrade ?? 5) <= 2 ? 0 : 25,
  );
  const [buildingMock, setBuildingMock] = useState(false);
  const [printPaper, setPrintPaper] = useState<{
    title: string;
    questions: Question[];
  } | null>(null);
  const [spellingModalOpen, setSpellingModalOpen] = useState(false);

  const semesterEntries = useMemo(
    () => gradeEntries.filter((entry) => entry.semester === semester),
    [gradeEntries, semester],
  );

  // 載入該年級的課綱目錄
  useEffect(() => {
    let active = true;
    loadGradeEntries(grade).then((entries) => {
      if (!active) return;
      setGradeEntries(entries);
    });
    return () => {
      active = false;
    };
  }, [grade]);

  // 確保選中的科目存在於該年級學期（如低年級無自然／社會，改切第一科）
  useEffect(() => {
    if (semesterEntries.length === 0) return;
    const exists = semesterEntries.some((e) => e.subjectId === subjectId);
    if (!exists) {
      const fallback = semesterEntries[0].subjectId;
      setSubjectId(fallback);
      onUpdateMapFilter({ selectedSubject: fallback });
    }
  }, [semesterEntries, subjectId, onUpdateMapFilter]);

  // 載入題庫包與微課程包
  useEffect(() => {
    let active = true;
    setLoading(true);
    stopSpeech();
    setSpeakingId(null);

    Promise.all([
      loadQuizPack(catalog.academicYear, semester, grade, subjectId),
      loadLessonPack(catalog.academicYear, semester, grade, subjectId),
    ])
      .then(([qPack, lPack]) => {
        if (!active) return;
        setQuizPack(qPack);
        setLessonPack(lPack);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setQuizPack(null);
        setLessonPack(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [catalog.academicYear, grade, semester, subjectId]);

  // 依期中／期末／全學期自動設定預設勾選單元
  useEffect(() => {
    if (!quizPack) {
      setSelectedStageIds([]);
      return;
    }
    const stages = quizPack.stages;
    const half = Math.ceil(stages.length / 2);
    let nextIds: string[] = [];
    if (preset === 'midterm') {
      nextIds = stages.slice(0, half).map((s) => s.id);
    } else if (preset === 'final') {
      nextIds = stages.slice(half).map((s) => s.id);
    } else if (preset === 'all') {
      nextIds = stages.map((s) => s.id);
    } else {
      return;
    }
    setSelectedStageIds(nextIds);

    // 預設展開前 2 個單元方便直接閱讀
    const initialExpanded: Record<string, boolean> = {};
    nextIds.slice(0, 2).forEach((id) => {
      initialExpanded[id] = true;
    });
    setExpandedIds(initialExpanded);
  }, [quizPack, preset]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const wrongIdSet = useMemo(
    () => new Set(progress.wrongQuestionIds),
    [progress.wrongQuestionIds],
  );

  const unitDigests: UnitDigest[] = useMemo(() => {
    if (!quizPack) return [];
    const snapshots = progress.wrongQuestionSnapshots ?? {};
    const snapshotList = Object.values(snapshots);

    return quizPack.stages.map((stage, idx) => {
      const lesson = findLessonForStage(lessonPack, stage.id);
      const stars = progress.stageStars[stage.id] ?? 0;

      const wrongMap = new Map<string, Question>();
      for (const q of stage.questions) {
        if (wrongIdSet.has(q.id)) {
          wrongMap.set(q.id, {
            ...q,
            subjectId: stage.subjectId,
            stageTitle: stage.title,
          });
        }
      }
      for (const snap of snapshotList) {
        if (
          wrongIdSet.has(snap.id) &&
          snap.subjectId === stage.subjectId &&
          snap.stageTitle === stage.title &&
          !wrongMap.has(snap.id)
        ) {
          wrongMap.set(snap.id, snap);
        }
      }
      const wrongQuestions = Array.from(wrongMap.values());
      const wrongCount = wrongQuestions.length;
      const needsAttention = wrongCount > 0 || stars < 3;

      const keyPointsSet = new Set<string>();
      const analogiesSet = new Set<string>();
      const workedExamples: WorkedExampleData[] = [];
      const commonErrorsSet = new Set<string>();

      if (lesson) {
        for (const scene of lesson.scenes) {
          for (const chunk of scene.cognitiveChunks ?? []) {
            const trimmed = chunk.trim();
            if (trimmed) keyPointsSet.add(trimmed);
          }
          if (scene.analogyAnchor?.trim()) {
            analogiesSet.add(scene.analogyAnchor.trim());
          }
          if (scene.workedExampleData) {
            workedExamples.push(scene.workedExampleData);
            if (scene.workedExampleData.commonErrorContrast?.trim()) {
              commonErrorsSet.add(
                scene.workedExampleData.commonErrorContrast.trim(),
              );
            }
          }
        }
      }

      return {
        stage,
        lesson,
        unitNo: stage.curriculum?.unitNo ?? idx + 1,
        stars,
        wrongCount,
        wrongQuestions,
        needsAttention,
        keyPoints: Array.from(keyPointsSet),
        analogies: Array.from(analogiesSet),
        workedExamples,
        commonErrors: Array.from(commonErrorsSet),
      };
    });
  }, [
    quizPack,
    lessonPack,
    progress.stageStars,
    progress.wrongQuestionSnapshots,
    wrongIdSet,
  ]);

  const selectedDigests = useMemo(() => {
    const selectedSet = new Set(selectedStageIds);
    return unitDigests.filter((d) => selectedSet.has(d.stage.id));
  }, [unitDigests, selectedStageIds]);

  const diagnostics = useMemo(
    () =>
      buildSubjectDiagnostics(
        selectedDigests.map((d) => d.stage),
        progress.fsrsCards,
        progress.stageStars,
        progress.wrongQuestionIds,
      ),
    [
      progress.fsrsCards,
      progress.stageStars,
      progress.wrongQuestionIds,
      selectedDigests,
    ],
  );

  const displayedDigests = useMemo(() => {
    if (!onlyWeakUnits) return selectedDigests;
    return selectedDigests.filter((d) => d.needsAttention);
  }, [selectedDigests, onlyWeakUnits]);

  const summaryStats = useMemo(() => {
    const totalKeyPoints = selectedDigests.reduce(
      (sum, d) => sum + d.keyPoints.length,
      0,
    );
    const totalWrong = selectedDigests.reduce((sum, d) => sum + d.wrongCount, 0);
    const weakUnitCount = selectedDigests.filter((d) => d.needsAttention).length;
    const totalQuestions = selectedDigests.reduce(
      (sum, d) => sum + d.stage.questions.length,
      0,
    );
    return {
      unitCount: selectedDigests.length,
      totalKeyPoints,
      totalWrong,
      weakUnitCount,
      totalQuestions,
    };
  }, [selectedDigests]);

  const toggleStageSelection = (stageId: string) => {
    playTap();
    setPreset('custom');
    setSelectedStageIds((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId],
    );
  };

  const handleToggleExpandAll = (expand: boolean) => {
    playTap();
    const next: Record<string, boolean> = {};
    for (const d of selectedDigests) {
      next[d.stage.id] = expand;
    }
    setExpandedIds(next);
  };

  const handleSpeakDigest = (digest: UnitDigest) => {
    if (!speechAvailable) return;
    if (speakingId === digest.stage.id) {
      stopSpeech();
      setSpeakingId(null);
      return;
    }
    const textParts = [
      digest.stage.title,
      ...digest.keyPoints,
      ...digest.analogies,
      ...digest.commonErrors,
    ];
    setSpeakingId(digest.stage.id);
    speakText(textParts.join('。'), 'zh-TW', {
      grade,
      slowMode: progress.speechRateMode === 'slow',
      onEnd: () => setSpeakingId(null),
    });
  };

  const examSprintSummary = useMemo(() => {
    if (!progress.examPlan) return null;
    return buildExamSprintSummary(progress.examPlan, planPacks, progress);
  }, [planPacks, progress]);

  const spellingWords = useMemo(
    () =>
      extractSpellingWords(selectedDigests.flatMap((d) => d.stage.questions)),
    [selectedDigests],
  );

  const assembleMockPaper = async (): Promise<{
    title: string;
    questions: Question[];
    stage: Stage;
  } | null> => {
    if (selectedDigests.length === 0) return null;
    const targetCount = mockCount;
    const perUnitPools = await Promise.all(
      selectedDigests.map(async (digest) => {
        const resolved = await resolveStageQuestionsAsync(digest.stage);
        const mergedMap = new Map<string, Question>();
        for (const q of [...resolved, ...digest.stage.questions]) {
          if (!mergedMap.has(q.id)) {
            mergedMap.set(q.id, {
              ...q,
              subjectId: digest.stage.subjectId,
              stageTitle: digest.stage.title,
              sourceGrade: grade,
              sourceSemester: semester,
              sourceStageId: digest.stage.id,
            });
          }
        }
        return {
          digest,
          questions: Array.from(mergedMap.values()),
        };
      }),
    );

    const picked: Question[] = [];
    const usedPromptSet = new Set<string>();
    const pushUnique = (q: Question): boolean => {
      const key = q.prompt.trim();
      if (usedPromptSet.has(key)) return false;
      usedPromptSet.add(key);
      picked.push(q);
      return true;
    };

    if (mockStrategy === 'weakness-first') {
      const wrongPool = shuffleArray(
        selectedDigests.flatMap((d) => d.wrongQuestions),
      );
      for (const q of wrongPool) {
        if (picked.length >= targetCount) break;
        pushUnique(q);
      }

      const weakPools = shuffleArray(
        perUnitPools.filter((p) => p.digest.stars < 3),
      ).map((p) => shuffleArray(p.questions));
      let round = 0;
      while (picked.length < targetCount && weakPools.length > 0 && round < 10) {
        let addedInRound = false;
        for (const pool of weakPools) {
          if (picked.length >= targetCount) break;
          const candidate = pool.find((q) => !usedPromptSet.has(q.prompt.trim()));
          if (candidate && pushUnique(candidate)) {
            addedInRound = true;
          }
        }
        if (!addedInRound) break;
        round++;
      }
    }

    const allShuffledPools = shuffleArray(perUnitPools).map((p) =>
      shuffleArray(p.questions),
    );
    let round = 0;
    while (
      picked.length < targetCount &&
      allShuffledPools.length > 0 &&
      round < 12
    ) {
      let added = false;
      for (const pool of allShuffledPools) {
        if (picked.length >= targetCount) break;
        const candidate = pool.find((q) => !usedPromptSet.has(q.prompt.trim()));
        if (candidate && pushUnique(candidate)) {
          added = true;
        }
      }
      if (!added) break;
      round++;
    }

    const meta = SUBJECT_META[subjectId];
    const presetLabel =
      preset === 'midterm'
        ? '期中模擬複習'
        : preset === 'final'
          ? '期末模擬複習'
          : preset === 'all'
            ? '全學期總複習'
            : '自選範圍複習';

    const title = `${grade}年級${semester === 1 ? '上' : '下'}學期 ${meta.shortName}・${presetLabel}`;
    const finalQuestions = shuffleArray(picked);
    const mockStage: Stage = {
      id: `exam-mock-${grade}-s${semester}-${subjectId}-${Date.now()}`,
      subjectId,
      title,
      description: `涵蓋 ${selectedDigests.length} 個單元、精選 ${finalQuestions.length} 題考前模擬複習`,
      difficulty: 'medium',
      monsterId: 'flameDragon',
      monsterName: '段考大魔王',
      monsterHp: Math.max(120, finalQuestions.length * 18),
      questions: finalQuestions,
    };
    return { title, questions: finalQuestions, stage: mockStage };
  };

  const handleStartMockQuiz = async () => {
    if (selectedDigests.length === 0 || buildingMock) return;
    playTap();
    setBuildingMock(true);

    try {
      const assembled = await assembleMockPaper();
      if (!assembled) return;
      stopSpeech();
      setSpeakingId(null);
      if (examStyle === 'real' && onStartRealMockExam) {
        onStartRealMockExam(
          assembled.stage,
          grade,
          semester,
          timeLimitMin > 0 ? timeLimitMin * 60 : undefined,
        );
      } else {
        onStartMockExam(assembled.stage);
      }
    } finally {
      setBuildingMock(false);
    }
  };

  const handlePrintMockPaper = async () => {
    if (selectedDigests.length === 0 || buildingMock) return;
    playTap();
    setBuildingMock(true);
    try {
      const assembled = await assembleMockPaper();
      if (!assembled) return;
      setPrintPaper({
        title: assembled.title,
        questions: assembled.questions,
      });
      setTimeout(() => {
        window.print();
      }, 120);
    } finally {
      setBuildingMock(false);
    }
  };

  const subjectMeta = SUBJECT_META[subjectId];

  return (
    <>
    <div
      className={`mx-auto max-w-6xl space-y-6 px-4 py-6 ${
        mode === 'mock' && printPaper ? 'print:hidden' : ''
      }`}
    >
      {/* 標題與列印按鈕 */}
      <section className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm print:border-slate-300 print:bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm print:hidden">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 sm:text-2xl">
                考前重點複習中心
              </h2>
              <p className="text-xs font-bold text-slate-500 sm:text-sm">
                彙整 115 學年度微課程核心觀念、易錯提醒，一鍵產生期中／期末模擬測驗
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {subjectId === 'english' && (
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setSpellingModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-violet-300 bg-violet-50 px-3.5 py-2 text-sm font-black text-violet-800 hover:bg-violet-100"
              >
                <span>🔤 英語聽音拼字</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playTap();
                setMode('notes');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition ${
                mode === 'notes'
                  ? 'bg-amber-400 text-slate-900 shadow-[0_3px_0_#d97706]'
                  : 'border border-amber-200 bg-white text-slate-600 hover:bg-amber-50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              重點速覽
            </button>
            <button
              type="button"
              onClick={() => {
                playTap();
                setMode('mock');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition ${
                mode === 'mock'
                  ? 'bg-indigo-500 text-white shadow-[0_3px_0_#4338ca]'
                  : 'border border-amber-200 bg-white text-slate-600 hover:bg-indigo-50'
              }`}
            >
              <Target className="h-4 w-4" />
              考前模擬測驗
            </button>
          </div>
        </div>
      </section>

      {/* 段考倒數衝刺計畫 */}
      {onUpdateExamPlan && (
        <section className="space-y-3 rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 p-4 shadow-xs print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-5 w-5 text-indigo-600" />
              {progress.examPlan ? (
                (() => {
                  const daysLeft = examSprintSummary?.daysLeft ?? 0;
                  return (
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-black text-indigo-950">
                        <span>📅 {progress.examPlan.title}</span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                          {daysLeft === 0
                            ? '就是今天！'
                            : daysLeft < 0
                              ? '已過期'
                              : `倒數 ${daysLeft} 天`}
                        </span>
                        {examSprintSummary && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
                            整體準備度 {examSprintSummary.overallReadinessPercent}%
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-indigo-700">
                        {examSprintSummary?.recommendationText ??
                          `本次範圍 ${selectedDigests.length} 個單元`}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div>
                  <div className="text-sm font-black text-indigo-950">
                    📅 多科段考倒數衝刺計畫
                  </div>
                  <div className="text-xs font-medium text-indigo-700">
                    一次設定要考的科目與日期，首頁每日任務自動推播複習進度
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {examSprintSummary?.priorityTask && (
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onStartStage(examSprintSummary.priorityTask!.stage);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-900 shadow-xs hover:bg-amber-300"
                >
                  <Play className="h-3.5 w-3.5 fill-slate-900" />
                  <span>
                    衝刺：{SUBJECT_META[examSprintSummary.priorityTask.subjectId].shortName}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setShowPlanEditor((v) => !v);
                }}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-indigo-700 shadow-xs hover:bg-indigo-100"
              >
                {progress.examPlan ? '調整計畫' : '設定段考計畫'}
              </button>
              {progress.examPlan && (
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onUpdateExamPlan(undefined);
                  }}
                  className="rounded-xl bg-white/70 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {examSprintSummary && examSprintSummary.subjectReadiness.length > 0 && (
            <div className="grid gap-2 border-t border-indigo-200/70 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {examSprintSummary.subjectReadiness.map((sr) => {
                const meta = SUBJECT_META[sr.subjectId];
                const barTone =
                  sr.readinessPercent >= 80
                    ? 'bg-emerald-500'
                    : sr.readinessPercent >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500';
                return (
                  <div
                    key={sr.subjectId}
                    className="rounded-2xl border border-indigo-100 bg-white/90 p-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-black text-slate-800">
                      <span>{meta.shortName}</span>
                      <span>
                        {sr.threeStarCount}/{sr.unitCount} 單元滿星 ·{' '}
                        {sr.readinessPercent}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${barTone}`}
                        style={{ width: `${sr.readinessPercent}%` }}
                      />
                    </div>
                    {sr.wrongInScopeCount > 0 && (
                      <div className="mt-1 text-[11px] font-bold text-rose-600">
                        含 {sr.wrongInScopeCount} 題範圍錯題待清
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {showPlanEditor && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                playTap();
                const validSubjectIds = new Set(
                  semesterEntries.map((entry) => entry.subjectId),
                );
                const filteredSubjects = planSubjects.filter((id) =>
                  validSubjectIds.has(id as Exclude<SubjectId, 'custom'>),
                );
                const chosenSubjects =
                  filteredSubjects.length > 0 ? filteredSubjects : [subjectId];
                onUpdateExamPlan({
                  title: planTitle.trim() || `${grade}年級段考衝刺`,
                  examDate: planDate,
                  grade,
                  semester,
                  preset: planPreset,
                  subjectIds: chosenSubjects,
                });
                setShowPlanEditor(false);
              }}
              className="mt-2 space-y-3 border-t border-indigo-200 pt-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  maxLength={30}
                  placeholder="例如：五上期中考"
                  className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
                />
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
                />
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'midterm', label: '期中範圍' },
                      { id: 'final', label: '期末範圍' },
                      { id: 'all', label: '全學期' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playTap();
                        setPlanPreset(p.id);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                        planPreset === p.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-indigo-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-indigo-900">
                  考試科目（可複選）：
                </span>
                {semesterEntries.map((entry) => {
                  const meta = SUBJECT_META[entry.subjectId];
                  const active = planSubjects.includes(entry.subjectId);
                  return (
                    <button
                      key={`plan-${entry.subjectId}`}
                      type="button"
                      onClick={() => {
                        playTap();
                        setPlanSubjects((prev) =>
                          prev.includes(entry.subjectId)
                            ? prev.filter((id) => id !== entry.subjectId)
                            : [...prev, entry.subjectId],
                        );
                      }}
                      className={`rounded-xl border px-2.5 py-1 text-xs font-black transition ${
                        active
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-indigo-200 bg-white text-slate-600 hover:bg-indigo-100'
                      }`}
                    >
                      {meta.shortName}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-black text-white hover:bg-indigo-500"
              >
                儲存段考衝刺計畫
              </button>
            </form>
          )}
        </section>
      )}

      {/* 年級、學期、科目與單元範圍選擇 */}
      <section className="space-y-4 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm print:hidden">
        {/* 年級與學期 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-black text-slate-500">年級</span>
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  playTap();
                  setGrade(g);
                  onUpdateMapFilter({ selectedGrade: g });
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                  grade === g
                    ? 'bg-amber-400 text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                }`}
              >
                {g} 年級
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs font-black text-slate-500">學期</span>
            {([1, 2] as Semester[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  playTap();
                  setSemester(s);
                  onUpdateMapFilter({ selectedSemester: s });
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                  semester === s
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-sky-100'
                }`}
              >
                {s === 1 ? '上學期' : '下學期'}
              </button>
            ))}
          </div>
        </div>

        {/* 科目列表 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-black text-slate-500">科目</span>
          {semesterEntries.map((entry) => {
            const meta = SUBJECT_META[entry.subjectId];
            const Icon = meta.icon;
            const active = entry.subjectId === subjectId;
            return (
              <button
                key={entry.subjectId}
                type="button"
                onClick={() => {
                  playTap();
                  setSubjectId(entry.subjectId);
                  onUpdateMapFilter({ selectedSubject: entry.subjectId });
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                  active
                    ? 'border-amber-400 bg-amber-100 text-amber-950 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.shortName}
              </button>
            );
          })}
        </div>

        {/* 考期範圍快選 + 單元勾選 */}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-black text-slate-500">
                考期範圍
              </span>
              {(
                [
                  { id: 'midterm', label: '期中考（前半單元）' },
                  { id: 'final', label: '期末考（後半單元）' },
                  { id: 'all', label: '全學期總複習' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playTap();
                    setPreset(item.id);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    preset === item.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-slate-500">
              已選{' '}
              <span className="font-black text-slate-800">
                {summaryStats.unitCount}
              </span>{' '}
              個單元・共{' '}
              <span className="font-black text-slate-800">
                {summaryStats.totalKeyPoints}
              </span>{' '}
              條重點
              {summaryStats.totalWrong > 0 && (
                <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 font-black text-rose-700">
                  含 {summaryStats.totalWrong} 題待複習錯題
                </span>
              )}
            </div>
          </div>

          {!loading && unitDigests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {unitDigests.map((d) => {
                const selected = selectedStageIds.includes(d.stage.id);
                return (
                  <button
                    key={d.stage.id}
                    type="button"
                    onClick={() => toggleStageSelection(d.stage.id)}
                    className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                      selected
                        ? 'border-amber-400 bg-amber-50 text-amber-950'
                        : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        selected ? 'text-amber-500' : 'text-slate-300'
                      }`}
                    />
                    <span className="max-w-[180px] truncate">{d.stage.title}</span>
                    {d.wrongCount > 0 && (
                      <span
                        title={`本單元有 ${d.wrongCount} 題錯題`}
                        className="h-2 w-2 rounded-full bg-rose-500"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 主內容區 */}
      {loading ? (
        <div className="rounded-3xl border-2 border-amber-200 bg-white p-10 text-center text-sm font-black text-slate-500">
          正在彙整 {grade} 年級{semester === 1 ? '上' : '下'}學期{' '}
          {subjectMeta.shortName} 重點資料...
        </div>
      ) : selectedDigests.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-black text-slate-600">
            請至少勾選 1 個單元，才能顯示考前重點或進行模擬測驗！
          </p>
        </div>
      ) : mode === 'notes' ? (
        <section className="space-y-4">
          {/* 重點速覽工具列 */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setOnlyWeakUnits((v) => !v);
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                  onlyWeakUnits
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                只看需加強單元（{summaryStats.weakUnitCount}）
              </button>
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setClozeMode((v) => !v);
                }}
                aria-pressed={clozeMode}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                  clozeMode
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {clozeMode ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {clozeMode ? '遮罩背誦中（點關鍵字翻開）' : '遮罩背誦'}
              </button>
              <button
                type="button"
                onClick={() => handleToggleExpandAll(true)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                全部展開
              </button>
              <button
                type="button"
                onClick={() => handleToggleExpandAll(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                全部收合
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                playTap();
                handleToggleExpandAll(true);
                setTimeout(() => window.print(), 100);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              列印考前重點／診斷單
            </button>
          </div>

          <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-sky-50/80 p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  📊 知識點掌握度診斷摘要（親師參考）
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  依據目前勾選範圍內的作答紀錄與 FSRS 記憶穩定度即時統計
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
                  🌳 長期掌握 {diagnostics.masteredCount} 題
                </span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">
                  🌿 穩固中 {diagnostics.growingCount} 題
                </span>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">
                  🔔 待複習／錯題 {diagnostics.dueCount} 題
                </span>
              </div>
            </div>

            {diagnostics.tagSummaries.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-slate-600">
                  核心知識點狀態：
                </span>
                {diagnostics.tagSummaries.slice(0, 8).map((item) => (
                  <span
                    key={item.tag}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-black ${
                      item.status === 'weak'
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : item.status === 'mastered'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : item.status === 'growing'
                            ? 'border-sky-300 bg-sky-50 text-sky-800'
                            : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {item.status === 'weak'
                      ? '⚠ '
                      : item.status === 'mastered'
                        ? '✓ '
                        : ''}
                    {item.tag}
                    {item.dueCount > 0 ? ` (${item.dueCount}待複習)` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          {displayedDigests.length === 0 ? (
            <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
              <p className="text-sm font-black text-emerald-800">
                太棒了！選定範圍內沒有錯題或未滿 3 星的單元，你可以直接挑戰模擬測驗！
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedDigests.map((digest) => {
                const isExpanded = Boolean(expandedIds[digest.stage.id]);
                const isSpeaking = speakingId === digest.stage.id;

                return (
                  <article
                    key={digest.stage.id}
                    className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm print:break-inside-avoid print:border-slate-300"
                  >
                    {/* 單元標頭 */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          playTap();
                          setExpandedIds((prev) => ({
                            ...prev,
                            [digest.stage.id]: !isExpanded,
                          }));
                        }}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xs font-black text-slate-900">
                          U{digest.unitNo}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-slate-800">
                              {digest.stage.title}
                            </h3>
                            {digest.wrongCount > 0 && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">
                                {digest.wrongCount} 題待複習
                              </span>
                            )}
                            <span className="flex items-center gap-0.5 text-xs font-black text-amber-600">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                              {digest.stars}/3
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-500">
                            {digest.keyPoints.length} 條核心重點
                            {digest.commonErrors.length > 0 &&
                              ` ・ ${digest.commonErrors.length} 項易錯提醒`}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 print:hidden">
                        {speechAvailable && (
                          <button
                            type="button"
                            onClick={() => handleSpeakDigest(digest)}
                            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition ${
                              isSpeaking
                                ? 'bg-sky-500 text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-sky-50'
                            }`}
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            {isSpeaking ? '停止' : '聽重點'}
                          </button>
                        )}
                        {digest.lesson && (
                          <button
                            type="button"
                            onClick={() => {
                              stopSpeech();
                              setSpeakingId(null);
                              onStartLesson(digest.lesson!, digest.stage);
                            }}
                            className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                          >
                            微課程
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            stopSpeech();
                            setSpeakingId(null);
                            onStartStage(digest.stage);
                          }}
                          className="flex items-center gap-1 rounded-xl bg-amber-400 px-2.5 py-1.5 text-xs font-black text-slate-900 hover:bg-amber-300"
                        >
                          <Play className="h-3 w-3" />
                          練這關
                        </button>
                        <button
                          type="button"
                          aria-label={isExpanded ? '收合單元' : '展開單元'}
                          onClick={() => {
                            playTap();
                            setExpandedIds((prev) => ({
                              ...prev,
                              [digest.stage.id]: !isExpanded,
                            }));
                          }}
                          className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-200/70"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 展開內容 */}
                    {(isExpanded || typeof window === 'undefined') && (
                      <div className="space-y-4 border-t border-slate-100 p-5">
                        {/* 核心觀念速記 */}
                        {digest.keyPoints.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-sky-700">
                              <Sparkles className="h-4 w-4" />
                              核心觀念速記
                            </div>
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {digest.keyPoints.map((point, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-3.5 py-2.5 text-sm font-bold text-slate-700"
                                >
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[11px] font-black text-white">
                                    {idx + 1}
                                  </span>
                                  <ClozeText text={point} enabled={clozeMode} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 生活比喻／記憶口訣 */}
                        {digest.analogies.length > 0 && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
                            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-amber-800">
                              <Lightbulb className="h-4 w-4" />
                              生活比喻・記憶口訣
                            </div>
                            <div className="space-y-1 text-sm font-bold text-amber-950">
                              {digest.analogies.map((a, idx) => (
                                <p key={idx}>{a}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 必考例題與步驟 */}
                        {digest.workedExamples.length > 0 && (
                          <div className="space-y-2.5">
                            {digest.workedExamples.map((ex, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"
                              >
                                <div className="mb-1.5 text-xs font-black text-indigo-700">
                                  📌 必考範例 {idx + 1}
                                </div>
                                <p className="mb-2 text-sm font-black text-slate-800">
                                  {ex.problemStatement}
                                </p>
                                <ol className="space-y-1 text-xs font-bold text-slate-700 sm:text-sm">
                                  {ex.steps.map((step, sIdx) => (
                                    <li key={sIdx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 易錯提醒 */}
                        {digest.commonErrors.length > 0 && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5">
                            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-rose-700">
                              <AlertTriangle className="h-4 w-4" />
                              考前易錯提醒（小心踩雷！）
                            </div>
                            <div className="space-y-1 text-sm font-bold text-rose-900">
                              {digest.commonErrors.map((err, idx) => (
                                <p key={idx}>{err}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* 考前模擬測驗設定卡 */
        <div className="space-y-6 print:hidden">
          <section className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
            <div className="mx-auto max-w-2xl space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Rocket className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-black text-slate-800">
                  組卷考前模擬總複習
                </h3>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  從已選的 {summaryStats.unitCount} 個單元（題庫池共{' '}
                  {summaryStats.totalQuestions} 題
                  {subjectId === 'math' ? '＋動態算式題' : ''}）自動抽題實戰！
                </p>
              </div>

              {/* 模式切換：真實段考 vs 練習模擬 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setExamStyle('real');
                  }}
                  className={`rounded-2xl border-2 p-3.5 text-left transition ${
                    examStyle === 'real'
                      ? 'border-indigo-500 bg-indigo-50/70'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-black text-slate-800">
                    📝 真實段考模式（推薦）
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-slate-500">
                    支援計時、跳題檢查、交卷統一批改與百分制成績單
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setExamStyle('practice');
                  }}
                  className={`rounded-2xl border-2 p-3.5 text-left transition ${
                    examStyle === 'practice'
                      ? 'border-amber-400 bg-amber-50/70'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-black text-slate-800">
                    ⚔️ 輕鬆練習模式
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-slate-500">
                    每題即時公佈對錯與提示，答錯 3 題後自動重練
                  </div>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black text-slate-600">
                    1. 選擇模擬題數
                  </div>
                  <div className="flex gap-2">
                    {QUESTION_COUNT_OPTIONS.map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          playTap();
                          setMockCount(cnt);
                        }}
                        className={`flex-1 rounded-xl py-2 text-sm font-black transition ${
                          mockCount === cnt
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50'
                        }`}
                      >
                        {cnt} 題
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black text-slate-600">
                    2. 出題優先順序
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setMockStrategy('weakness-first');
                      }}
                      className={`flex-1 rounded-xl px-2 py-2 text-xs font-black transition ${
                        mockStrategy === 'weakness-first'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-rose-50'
                      }`}
                    >
                      弱點錯題優先
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setMockStrategy('balanced');
                      }}
                      className={`flex-1 rounded-xl px-2 py-2 text-xs font-black transition ${
                        mockStrategy === 'balanced'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      各單元平均抽題
                    </button>
                  </div>
                </div>
              </div>

              {examStyle === 'real' && (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>3. 考試時間限制（低年級建議不限時）</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TIME_LIMIT_OPTIONS.map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => {
                          playTap();
                          setTimeLimitMin(opt.minutes);
                        }}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs font-black transition ${
                          timeLimitMin === opt.minutes
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-bold text-amber-900">
                💡 模擬測驗模式不影響單關最高星數紀錄；答錯的題目仍會自動收錄進「錯題本」與 FSRS 記憶排程，並正常獲得 XP 與金幣！
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={buildingMock}
                  onClick={handleStartMockQuiz}
                  className="btn-3d flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-base font-black text-white shadow-[0_4px_0_#4338ca] hover:bg-indigo-400 disabled:opacity-60"
                >
                  <Rocket className="h-5 w-5" />
                  {buildingMock
                    ? '正在組卷中...'
                    : `開始 ${mockCount} 題${examStyle === 'real' ? '真實段考' : '模擬練習'}`}
                </button>
                <button
                  type="button"
                  disabled={buildingMock}
                  onClick={handlePrintMockPaper}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-60"
                >
                  <Printer className="h-4 w-4" />
                  <span>列印 A4 模擬考卷</span>
                </button>
              </div>
            </div>
          </section>

          {/* 歷次模擬考成績紀錄 */}
          {(progress.mockExamHistory ?? []).length > 0 && (
            <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-800">
                  歷次真實模擬考成績紀錄
                </h3>
              </div>
              <div className="space-y-2.5">
                {(progress.mockExamHistory ?? []).slice(0, 8).map((rec) => {
                  const tone =
                    rec.score >= 85
                      ? 'bg-emerald-500'
                      : rec.score >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500';
                  const textTone =
                    rec.score >= 85
                      ? 'text-emerald-700'
                      : rec.score >= 60
                        ? 'text-amber-700'
                        : 'text-rose-700';
                  return (
                    <div
                      key={rec.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-800">
                          {rec.title}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500">
                          {new Date(rec.takenAt).toLocaleDateString('zh-TW')} · 答對{' '}
                          {rec.correctCount}/{rec.totalCount} 題 · 耗時{' '}
                          {Math.floor(rec.durationSec / 60)}分
                          {rec.durationSec % 60}秒
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-slate-200 sm:block">
                          <div
                            className={`h-full rounded-full ${tone}`}
                            style={{ width: `${rec.score}%` }}
                          />
                        </div>
                        <div className={`text-lg font-black ${textTone}`}>
                          {rec.score} 分
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>

    {/* 列印專用：A4 空白模擬考卷＋解答卷 */}
    {mode === 'mock' && printPaper && (
      <div className="hidden print:block print:p-6 print:text-slate-900">
        <div className="mb-5 border-b-2 border-slate-800 pb-3">
          <h1 className="text-xl font-black">
            知識大冒險 · {printPaper.title}
          </h1>
          <div className="mt-2 flex flex-wrap justify-between gap-4 text-xs font-bold text-slate-700">
            <span>姓名：{progress.nickname}</span>
            <span>
              日期：{new Date().toLocaleDateString('zh-TW')} · 共{' '}
              {printPaper.questions.length} 題
            </span>
            <span>得分：________ / 100 分</span>
          </div>
        </div>

        <ol className="space-y-4">
          {printPaper.questions.map((q, idx) => (
            <li
              key={`mock-print-${q.id}-${idx}`}
              className="break-inside-avoid border-b border-slate-200 pb-3"
            >
              <div className="text-sm font-bold">
                （　）{idx + 1}. {q.prompt}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 pl-4 text-xs">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx}>
                    ({['A', 'B', 'C', 'D'][oIdx]}) {opt}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 break-before-page border-t-2 border-slate-800 pt-4">
          <h2 className="mb-3 text-base font-black">
            參考答案與小老師解析 — {printPaper.title}
          </h2>
          <ol className="space-y-2 text-xs">
            {printPaper.questions.map((q, idx) => (
              <li key={`mock-ans-${q.id}-${idx}`}>
                <span className="font-bold">
                  {idx + 1}. 答案：({['A', 'B', 'C', 'D'][q.answerIndex]}){' '}
                  {q.options[q.answerIndex]}
                </span>
                {' — '}
                <span>{q.explanation}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    )}
    <EnglishSpellingModal
      open={spellingModalOpen}
      title={`${grade}年級${semester === 1 ? '上' : '下'}學期 英語單字拼寫`}
      grade={grade}
      words={spellingWords}
      speechSlowMode={progress.speechRateMode === 'slow'}
      onClose={() => setSpellingModalOpen(false)}
    />
    </>
  );
}

export default ExamReview;
