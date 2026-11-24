import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Filter,
  Lightbulb,
  Play,
  Printer,
  Rocket,
  Sparkles,
  Star,
  Target,
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
  Grade,
  PlayerProgress,
  Question,
  QuizPack,
  Semester,
  Stage,
  SubjectId,
  WorkedExampleData,
} from '../types/quiz';
import { resolveStageQuestionsAsync } from '../utils/generators/registry';
import { playTap } from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';

interface ExamReviewProps {
  progress: PlayerProgress;
  onStartMockExam: (mockStage: Stage) => void;
  onStartStage: (stage: Stage) => void;
  onStartLesson: (lesson: LessonScript, stage: Stage) => void;
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

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const QUESTION_COUNT_OPTIONS = [10, 15, 20] as const;

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

export function ExamReview({
  progress,
  onStartMockExam,
  onStartStage,
  onStartLesson,
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const [mockCount, setMockCount] = useState<number>(15);
  const [mockStrategy, setMockStrategy] =
    useState<MockStrategy>('weakness-first');
  const [buildingMock, setBuildingMock] = useState(false);

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

  const handleStartMockQuiz = async () => {
    if (selectedDigests.length === 0 || buildingMock) return;
    playTap();
    setBuildingMock(true);

    try {
      const targetCount = mockCount;
      // 先為每個選定單元取得題庫（結合錯題快照、靜態題與動態數學題）
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
        // 1. 優先放入錯題本中有紀錄的題目（含動態數學題快照）
        const wrongPool = shuffleArray(
          selectedDigests.flatMap((d) => d.wrongQuestions),
        );
        for (const q of wrongPool) {
          if (picked.length >= targetCount) break;
          pushUnique(q);
        }

        // 2. 其次從未滿 3 星的單元各抽題
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

      // 3. 剩餘名額從全部選定單元輪流均勻抽題
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

      const subjectMeta = SUBJECT_META[subjectId];
      const presetLabel =
        preset === 'midterm'
          ? '期中模擬複習'
          : preset === 'final'
            ? '期末模擬複習'
            : preset === 'all'
              ? '全學期總複習'
              : '自選範圍複習';

      const mockStage: Stage = {
        id: `exam-mock-${grade}-s${semester}-${subjectId}-${Date.now()}`,
        subjectId,
        title: `${grade}年級${semester === 1 ? '上' : '下'}學期 ${subjectMeta.shortName}・${presetLabel}`,
        description: `涵蓋 ${selectedDigests.length} 個單元、精選 ${picked.length} 題考前模擬複習`,
        difficulty: 'medium',
        monsterId: 'flameDragon',
        monsterName: '段考大魔王',
        monsterHp: Math.max(120, picked.length * 18),
        questions: shuffleArray(picked),
      };

      stopSpeech();
      setSpeakingId(null);
      onStartMockExam(mockStage);
    } finally {
      setBuildingMock(false);
    }
  };

  const subjectMeta = SUBJECT_META[subjectId];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
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
              列印考前重點單
            </button>
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
                                  <span>{point}</span>
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
        <section className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
          <div className="mx-auto max-w-2xl space-y-6">
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

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-bold text-amber-900">
              💡 模擬測驗模式不影響單關最高星數紀錄；答錯的題目仍會自動收錄進「錯題本」與 FSRS 記憶排程，並正常獲得 XP 與金幣！
            </div>

            <button
              type="button"
              disabled={buildingMock}
              onClick={handleStartMockQuiz}
              className="btn-3d flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-base font-black text-white shadow-[0_4px_0_#4338ca] hover:bg-indigo-400 disabled:opacity-60"
            >
              <Rocket className="h-5 w-5" />
              {buildingMock
                ? '正在組卷中...'
                : `開始 ${mockCount} 題考前模擬測驗`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default ExamReview;
