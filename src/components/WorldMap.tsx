import {
  Award,
  BookOpen,
  Compass,
  Download,
  Layers,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadLessonPack } from '../data/curriculum/lessonLoader';
import {
  findCurriculumEntry,
  getCurriculumCatalog,
  hasQuizPack,
  loadGradeEntries,
  loadQuizPack,
} from '../data/curriculum/loader';
import { BUILTIN_STAGES } from '../data/quizzes';
import { getGradeSubjects, SUBJECT_META, SUBJECT_ORDER } from '../data/subjects';
import type { LessonPack, LessonScript } from '../types/lesson';
import type {
  CurriculumSubjectEntry,
  Grade,
  LocalProfileMeta,
  MapViewMode,
  PlayerProgress,
  QuizPack,
  Semester,
  Stage,
  SubjectId,
} from '../types/quiz';
import { getTodayStudyStats } from '../utils/dailyStudy';
import { countDueWrongQuestions } from '../utils/fsrs';
import { resolveLessonForStage } from '../utils/lessonSynthesizer';
import { playTap } from '../utils/sound';
import { getLevelFromXp, loadProgress } from '../utils/storage';
import { DailyMissionCard } from './DailyMissionCard';
import { HeroSprite } from './GameSprites';
import { StageCard } from './StageCard';

interface WorldMapProps {
  progress: PlayerProgress;
  profiles?: LocalProfileMeta[];
  onStartStage: (stage: Stage) => void;
  onStartLesson?: (lesson: LessonScript, stage: Stage) => void;
  onPracticeHanzi?: (stage: Stage) => void;
  onGoWrongBook: () => void;
  onGoExamReview?: () => void;
  onGoHanzi?: () => void;
  onOpenCertificate?: () => void;
  onGoTeacher: () => void;
  onUpdateDailyGoal?: (goal: number) => void;
  onUpdatePreferences?: (
    patch: Partial<
      Pick<
        PlayerProgress,
        | 'focusMode'
        | 'speechRateMode'
        | 'autoReadQuestion'
        | 'lowerGradeNudgeDismissed'
      >
    >,
  ) => void;
  onUpdateMapFilter: (
    patch: Partial<
      Pick<
        PlayerProgress,
        'selectedView' | 'selectedGrade' | 'selectedSemester' | 'selectedSubject'
      >
    >,
  ) => void;
}

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const GRADE_LABELS: Record<Grade, string> = {
  1: '一年級',
  2: '二年級',
  3: '三年級',
  4: '四年級',
  5: '五年級',
  6: '六年級',
};

export function WorldMap({
  progress,
  profiles,
  onStartStage,
  onStartLesson,
  onPracticeHanzi,
  onGoWrongBook,
  onGoExamReview,
  onGoHanzi,
  onOpenCertificate,
  onGoTeacher,
  onUpdateDailyGoal,
  onUpdatePreferences,
  onUpdateMapFilter,
}: WorldMapProps) {
  const levelInfo = getLevelFromXp(progress.xp);
  const catalog = getCurriculumCatalog();

  const viewMode: MapViewMode = progress.selectedView ?? 'curriculum';
  const activeGrade: Grade = progress.selectedGrade ?? 5;
  const activeSemester: Semester = progress.selectedSemester ?? 1;
  const [offlineCacheKey, setOfflineCacheKey] = useState<string | null>(null);
  const [offlineCaching, setOfflineCaching] = useState(false);

  const classicStages = useMemo(
    () => [...progress.customStages, ...BUILTIN_STAGES],
    [progress.customStages],
  );

  const classicSubjectOrder = useMemo(() => {
    const present = new Set(classicStages.map((s) => s.subjectId));
    const ordered: SubjectId[] = [];
    if (present.has('custom')) {
      ordered.push('custom');
    }
    for (const id of SUBJECT_ORDER) {
      if (id !== 'custom' && present.has(id)) {
        ordered.push(id);
      }
    }
    return ordered;
  }, [classicStages]);

  const classicSubjectFilter: SubjectId | 'all' =
    progress.selectedSubject === 'all' ||
    (progress.selectedSubject &&
      classicSubjectOrder.includes(progress.selectedSubject))
      ? progress.selectedSubject
      : 'all';

  const visibleClassicStages = useMemo(
    () =>
      classicSubjectFilter === 'all'
        ? classicStages
        : classicStages.filter((s) => s.subjectId === classicSubjectFilter),
    [classicStages, classicSubjectFilter],
  );

  const gradeSubjects = useMemo(
    () => getGradeSubjects(activeGrade),
    [activeGrade],
  );

  const activeCurriculumSubject: Exclude<SubjectId, 'custom'> =
    progress.selectedSubject &&
    progress.selectedSubject !== 'all' &&
    progress.selectedSubject !== 'custom' &&
    gradeSubjects.includes(progress.selectedSubject)
      ? progress.selectedSubject
      : gradeSubjects.includes('math')
        ? 'math'
        : gradeSubjects[0];

  const packKey = `${catalog.academicYear}-s${activeSemester}-g${activeGrade}-${activeCurriculumSubject}`;
  const [gradeCatalog, setGradeCatalog] = useState<{
    grade: Grade;
    entries: CurriculumSubjectEntry[];
  }>({ grade: activeGrade, entries: [] });

  useEffect(() => {
    let cancelled = false;
    void loadGradeEntries(activeGrade).then((entries) => {
      if (!cancelled) {
        setGradeCatalog({ grade: activeGrade, entries });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeGrade]);

  const gradeEntries =
    gradeCatalog.grade === activeGrade ? gradeCatalog.entries : [];

  const [packState, setPackState] = useState<{
    key: string;
    pack: QuizPack | null;
    lessonPack: LessonPack | null;
    loading: boolean;
  }>({ key: '', pack: null, lessonPack: null, loading: false });

  useEffect(() => {
    if (viewMode !== 'curriculum') return;
    let cancelled = false;
    setPackState((prev) =>
      prev.key === packKey
        ? prev
        : { key: packKey, pack: null, lessonPack: null, loading: true },
    );

    void Promise.all([
      loadQuizPack(
        catalog.academicYear,
        activeSemester,
        activeGrade,
        activeCurriculumSubject,
      ),
      loadLessonPack(
        catalog.academicYear,
        activeSemester,
        activeGrade,
        activeCurriculumSubject,
      ),
    ])
      .then(([pack, lessonPack]) => {
        if (!cancelled) {
          setPackState({ key: packKey, pack, lessonPack, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPackState({
            key: packKey,
            pack: null,
            lessonPack: null,
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    packKey,
    catalog.academicYear,
    activeSemester,
    activeGrade,
    activeCurriculumSubject,
  ]);

  const loadedPack = packState.key === packKey ? packState.pack : null;
  const loadedLessonPack =
    packState.key === packKey ? packState.lessonPack : null;
  const packLoading = packState.key === packKey && packState.loading;

  const curriculumEntry = useMemo(
    () =>
      findCurriculumEntry(
        gradeEntries,
        activeSemester,
        activeCurriculumSubject,
      ),
    [gradeEntries, activeSemester, activeCurriculumSubject],
  );

  const scopedPlayableStages =
    viewMode === 'classic' ? visibleClassicStages : (loadedPack?.stages ?? []);

  const scopedStars = scopedPlayableStages.reduce(
    (sum, s) => sum + (progress.stageStars[s.id] ?? 0),
    0,
  );
  const maxScopedStars = scopedPlayableStages.length * 3;
  const accuracy =
    progress.totalAnswered > 0
      ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
      : 0;

  const coreGradeSubjects = gradeSubjects.filter(
    (id) => SUBJECT_META[id].group === 'core',
  );
  const extendedGradeSubjects = gradeSubjects.filter(
    (id) => SUBJECT_META[id].group === 'extended',
  );

  const curriculumMeta = SUBJECT_META[activeCurriculumSubject];
  const CurriculumIcon = curriculumMeta.icon;

  const stagesByUnit = useMemo(() => {
    const map = new Map<number, Stage[]>();
    const unmapped: Stage[] = [];
    for (const stage of loadedPack?.stages ?? []) {
      const unitNo = stage.curriculum?.unitNo;
      if (typeof unitNo === 'number') {
        const list = map.get(unitNo) ?? [];
        list.push(stage);
        map.set(unitNo, list);
      } else {
        unmapped.push(stage);
      }
    }
    return { map, unmapped };
  }, [loadedPack]);

  const todayStats = useMemo(() => getTodayStudyStats(progress), [progress]);
  const dueWrongCount = useMemo(
    () => countDueWrongQuestions(progress),
    [progress],
  );

  const recommendedNext = useMemo(() => {
    const candidates = loadedPack?.stages ?? [];
    for (const stage of candidates) {
      const unitNo = stage.curriculum?.unitNo;
      const unit =
        typeof unitNo === 'number'
          ? curriculumEntry?.units.find((u) => u.unitNo === unitNo)
          : undefined;
      const { lesson } = resolveLessonForStage(loadedLessonPack, stage, unit);
      const lessonCompleted = Boolean(
        progress.completedLessonIds?.includes(lesson.lessonId),
      );
      const stars = progress.stageStars[stage.id] ?? 0;
      if (!lessonCompleted || stars === 0) {
        return { stage, lesson, lessonCompleted, stars };
      }
    }
    return null;
  }, [
    curriculumEntry,
    loadedLessonPack,
    loadedPack,
    progress.completedLessonIds,
    progress.stageStars,
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <section className="relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div
              className={`${progress.focusMode ? '' : 'animate-bob '}rounded-3xl bg-white/90 p-2 shadow-sm ring-2 ring-amber-300`}
            >
              <HeroSprite avatarId={progress.selectedAvatarId} size={76} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/30 px-3 py-1 text-xs font-black text-amber-900">
                <Award className="h-3.5 w-3.5" />
                <span>
                  Lv.{levelInfo.level} {levelInfo.title}
                </span>
              </div>
              <h2 className="mt-1.5 text-2xl font-black text-slate-800 sm:text-3xl">
                哈囉，{progress.nickname}！準備好學習與複習了嗎？
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                先學觀念再闖關測驗，答錯的題目會由記憶樹幫你安排跨日複習！
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2.5 md:w-auto">
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-xs">
              <div className="text-xs font-bold text-slate-500">
                {viewMode === 'classic' ? '蒐集星星' : '本科星星'}
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-1 text-xl font-black text-amber-500">
                <Star className="h-5 w-5 fill-amber-400" />
                <span>
                  {maxScopedStars > 0 ? `${scopedStars}/${maxScopedStars}` : '—'}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-xs">
              <div className="text-xs font-bold text-slate-500">答題正確率</div>
              <div className="mt-0.5 text-xl font-black text-emerald-600">
                {accuracy}%
              </div>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-xs">
              <div className="text-xs font-bold text-slate-500">累計答對</div>
              <div className="mt-0.5 text-xl font-black text-sky-600">
                {progress.totalCorrect} 題
              </div>
            </div>
          </div>
        </div>
      </section>

      <DailyMissionCard
        todayStats={todayStats}
        activeGradeLabel={GRADE_LABELS[activeGrade]}
        activeSemester={activeSemester}
        subjectShortName={curriculumMeta.shortName}
        dueWrongCount={dueWrongCount}
        totalWrongCount={progress.wrongQuestionIds.length}
        recommendedNext={recommendedNext}
        onStartStage={onStartStage}
        onStartLesson={onStartLesson}
        onGoWrongBook={onGoWrongBook}
        onGoExamReview={onGoExamReview}
        onGoHanzi={onGoHanzi}
        onOpenCertificate={onOpenCertificate}
        onUpdateDailyGoal={onUpdateDailyGoal}
      />

      {profiles && profiles.length >= 2 && (
        <section className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 p-4 shadow-xs sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-700" />
              <h3 className="text-sm font-black text-slate-800 sm:text-base">
                家庭努力牆（不比分數、比堅持！大家一起加油）
              </h3>
            </div>
            <span className="rounded-full bg-white px-3 py-0.5 text-xs font-black text-emerald-800">
              共 {profiles.length} 位家庭成員
            </span>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((prof) => {
              const profProgress = loadProgress(prof.id);
              const profStats = getTodayStudyStats(profProgress);
              const lessonCount = profProgress.completedLessonIds?.length ?? 0;
              const hanziCount = Object.keys(
                profProgress.practicedHanzi ?? {},
              ).length;
              return (
                <div
                  key={prof.id}
                  className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-3.5 py-2.5 shadow-2xs"
                >
                  <HeroSprite avatarId={prof.selectedAvatarId} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-800">
                      {prof.nickname}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2.5 text-[11px] font-bold text-slate-500">
                      <span>🔥 連續 {profStats.streakDays} 天</span>
                      <span>
                        📝 今日 {profStats.answeredToday}/{profStats.goal} 題
                      </span>
                      <span>📖 {lessonCount} 堂課</span>
                      {hanziCount > 0 && <span>✍️ {hanziCount} 字</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-3xl border-2 border-amber-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl bg-amber-50 p-1">
            <button
              type="button"
              onClick={() => {
                playTap();
                onUpdateMapFilter({ selectedView: 'classic' });
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition ${
                viewMode === 'classic'
                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>綜合冒險</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTap();
                onUpdateMapFilter({ selectedView: 'curriculum' });
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition ${
                viewMode === 'curriculum'
                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>{catalog.academicYear} 課綱地圖</span>
            </button>
          </div>

          {viewMode === 'curriculum' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {([1, 2] as Semester[]).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      playTap();
                      onUpdateMapFilter({ selectedSemester: sem });
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-black transition ${
                      activeSemester === sem
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sem === 1 ? '上學期' : '下學期'}
                  </button>
                ))}
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                {catalog.school} · 共 {gradeSubjects.length} 科
              </span>
              <button
                type="button"
                disabled={offlineCaching}
                onClick={async () => {
                  playTap();
                  const key = `${catalog.academicYear}-s${activeSemester}-g${activeGrade}`;
                  setOfflineCaching(true);
                  try {
                    await Promise.allSettled(
                      gradeSubjects.flatMap((subj) => [
                        loadQuizPack(
                          catalog.academicYear,
                          activeSemester,
                          activeGrade,
                          subj,
                        ),
                        loadLessonPack(
                          catalog.academicYear,
                          activeSemester,
                          activeGrade,
                          subj,
                        ),
                      ]),
                    );
                    setOfflineCacheKey(key);
                  } finally {
                    setOfflineCaching(false);
                  }
                }}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black transition ${
                  offlineCacheKey ===
                  `${catalog.academicYear}-s${activeSemester}-g${activeGrade}`
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100'
                }`}
                title="預先下載本學期題庫與微課程至瀏覽器離線快取"
              >
                <Download className="h-3.5 w-3.5" />
                <span>
                  {offlineCaching
                    ? '快取中...'
                    : offlineCacheKey ===
                        `${catalog.academicYear}-s${activeSemester}-g${activeGrade}`
                      ? '✓ 本學期已離線快取'
                      : '離線快取本學期'}
                </span>
              </button>
            </div>
          )}
        </div>

        {viewMode === 'classic' ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playTap();
                onUpdateMapFilter({ selectedSubject: 'all' });
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                classicSubjectFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部科目 ({classicStages.length})
            </button>
            {classicSubjectOrder.map((subjectId) => {
              const meta = SUBJECT_META[subjectId];
              const Icon = meta.icon;
              const isSelected = classicSubjectFilter === subjectId;
              const count = classicStages.filter(
                (s) => s.subjectId === subjectId,
              ).length;
              return (
                <button
                  key={subjectId}
                  type="button"
                  onClick={() => {
                    playTap();
                    onUpdateMapFilter({ selectedSubject: subjectId });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    isSelected
                      ? `${meta.iconBgClass} text-white shadow-xs`
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>
                    {meta.shortName} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-black text-slate-400">
                年級：
              </span>
              {GRADES.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => {
                    playTap();
                    onUpdateMapFilter({ selectedGrade: grade });
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    activeGrade === grade
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {GRADE_LABELS[grade]}
                </button>
              ))}
            </div>

            {onUpdatePreferences &&
              activeGrade <= 2 &&
              !progress.lowerGradeNudgeDismissed &&
              (!progress.focusMode ||
                progress.speechRateMode !== 'slow' ||
                !progress.autoReadQuestion) && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-900">
                  <span>
                    ✨ 低年級貼心建議：開啟「專注模式」＋「慢速／自動朗讀」，能減少畫面干擾、聽得更清楚喔！
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        onUpdatePreferences({
                          focusMode: true,
                          speechRateMode: 'slow',
                          autoReadQuestion: true,
                          lowerGradeNudgeDismissed: true,
                        });
                      }}
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 font-black text-white shadow-2xs hover:bg-indigo-500"
                    >
                      一鍵開啟
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        onUpdatePreferences({
                          lowerGradeNudgeDismissed: true,
                        });
                      }}
                      className="rounded-xl bg-white px-3 py-1.5 font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                      先不用
                    </button>
                  </div>
                </div>
              )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-black text-slate-400">
                  核心主科：
                </span>
                {coreGradeSubjects.map((subjectId) => {
                  const meta = SUBJECT_META[subjectId];
                  const Icon = meta.icon;
                  const isSelected = activeCurriculumSubject === subjectId;
                  const ready = hasQuizPack(
                    catalog.academicYear,
                    activeSemester,
                    activeGrade,
                    subjectId,
                  );
                  return (
                    <button
                      key={subjectId}
                      type="button"
                      onClick={() => {
                        playTap();
                        onUpdateMapFilter({ selectedSubject: subjectId });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                        isSelected
                          ? `${meta.iconBgClass} text-white shadow-xs`
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{meta.shortName}</span>
                      {ready && (
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                          title="已有可挑戰題庫"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-black text-slate-400">
                  藝能與本土語：
                </span>
                {extendedGradeSubjects.map((subjectId) => {
                  const meta = SUBJECT_META[subjectId];
                  const Icon = meta.icon;
                  const isSelected = activeCurriculumSubject === subjectId;
                  const ready = hasQuizPack(
                    catalog.academicYear,
                    activeSemester,
                    activeGrade,
                    subjectId,
                  );
                  return (
                    <button
                      key={subjectId}
                      type="button"
                      onClick={() => {
                        playTap();
                        onUpdateMapFilter({ selectedSubject: subjectId });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                        isSelected
                          ? `${meta.iconBgClass} text-white shadow-xs`
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{meta.shortName}</span>
                      {ready && (
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                          title="已有可挑戰題庫"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {viewMode === 'classic' ? (
        classicSubjectOrder
          .filter(
            (subjectId) =>
              classicSubjectFilter === 'all' ||
              classicSubjectFilter === subjectId,
          )
          .map((subjectId) => {
            const meta = SUBJECT_META[subjectId];
            const Icon = meta.icon;
            const stages = visibleClassicStages.filter(
              (s) => s.subjectId === subjectId,
            );
            if (stages.length === 0) return null;

            return (
              <section key={subjectId} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs ${meta.iconBgClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">
                        {meta.name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        {meta.subtitle}
                      </p>
                    </div>
                  </div>
                  {subjectId === 'custom' && (
                    <button
                      type="button"
                      onClick={onGoTeacher}
                      className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
                    >
                      管理或新增自訂題庫
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {stages.map((stage) => {
                    const { lesson, isCurated } = resolveLessonForStage(
                      null,
                      stage,
                    );
                    const lessonCompleted = Boolean(
                      progress.completedLessonIds?.includes(lesson.lessonId),
                    );
                    return (
                      <StageCard
                        key={stage.id}
                        stage={stage}
                        earnedStars={progress.stageStars[stage.id] ?? 0}
                        lesson={lesson}
                        isCuratedLesson={isCurated}
                        lessonCompleted={lessonCompleted}
                        onStartStage={onStartStage}
                        onStartLesson={onStartLesson}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
      ) : (
        <section className="space-y-5">
          <div
            className={`rounded-3xl border-2 bg-gradient-to-br p-5 shadow-xs ${curriculumMeta.borderClass} ${curriculumMeta.cardBgClass}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs ${curriculumMeta.iconBgClass}`}
                >
                  <CurriculumIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-black text-slate-700">
                      {GRADE_LABELS[activeGrade]}
                      {activeSemester === 1 ? '上學期' : '下學期'}
                    </span>
                    {curriculumEntry && (
                      <>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black ${curriculumMeta.badgeClass}`}
                        >
                          {curriculumEntry.publisher}
                        </span>
                        {curriculumEntry.bookSeries && (
                          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                            {curriculumEntry.bookSeries}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-xl font-black text-slate-800">
                    {curriculumMeta.name}
                    {curriculumEntry
                      ? ` · ${curriculumEntry.subjectLabel}`
                      : ''}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">
                    {curriculumMeta.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {curriculumEntry && (
                  <span className="rounded-2xl bg-white/90 px-3.5 py-2 text-xs font-black text-slate-700 shadow-xs">
                    {curriculumEntry.unitCount} 單元 ·{' '}
                    {curriculumEntry.lessonCount} 課次
                  </span>
                )}
                {packLoading ? (
                  <span className="rounded-2xl bg-amber-100 px-3.5 py-2 text-xs font-black text-amber-800">
                    載入題庫中...
                  </span>
                ) : loadedPack && loadedPack.stages.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-2xl bg-emerald-100 px-3.5 py-2 text-xs font-black text-emerald-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    已有可挑戰題庫 ({loadedPack.stages.length} 關)
                  </span>
                ) : (
                  <span className="rounded-2xl bg-slate-200/80 px-3.5 py-2 text-xs font-black text-slate-600">
                    題庫建置中（課綱預覽）
                  </span>
                )}
              </div>
            </div>
          </div>

          {stagesByUnit.unmapped.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {stagesByUnit.unmapped.map((stage) => {
                const { lesson, isCurated } = resolveLessonForStage(
                  loadedLessonPack,
                  stage,
                );
                const lessonCompleted = Boolean(
                  progress.completedLessonIds?.includes(lesson.lessonId),
                );
                return (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    earnedStars={progress.stageStars[stage.id] ?? 0}
                    lesson={lesson}
                    isCuratedLesson={isCurated}
                    lessonCompleted={lessonCompleted}
                    onStartStage={onStartStage}
                    onStartLesson={onStartLesson}
                    onPracticeHanzi={onPracticeHanzi}
                  />
                );
              })}
            </div>
          )}

          {curriculumEntry ? (
            <div className="grid gap-4 md:grid-cols-2">
              {curriculumEntry.units.map((unit) => {
                const unitStages = stagesByUnit.map.get(unit.unitNo) ?? [];
                if (unitStages.length > 0) {
                  return unitStages.map((stage) => {
                    const { lesson, isCurated } = resolveLessonForStage(
                      loadedLessonPack,
                      stage,
                      unit,
                    );
                    const lessonCompleted = Boolean(
                      progress.completedLessonIds?.includes(lesson.lessonId),
                    );
                    return (
                      <StageCard
                        key={stage.id}
                        stage={stage}
                        earnedStars={progress.stageStars[stage.id] ?? 0}
                        lesson={lesson}
                        isCuratedLesson={isCurated}
                        lessonCompleted={lessonCompleted}
                        onStartStage={onStartStage}
                        onStartLesson={onStartLesson}
                        onPracticeHanzi={onPracticeHanzi}
                      />
                    );
                  });
                }

                return (
                  <div
                    key={unit.unitNo}
                    className="flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black ${curriculumMeta.badgeClass}`}
                        >
                          單元 {unit.unitNo}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                          題庫建置中
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-800">
                        {unit.title}
                      </h4>
                      {unit.lessonTitles.length > 0 && (
                        <ul className="space-y-1 text-xs font-medium text-slate-600">
                          {unit.lessonTitles.slice(0, 4).map((title, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="line-clamp-1">{title}</span>
                            </li>
                          ))}
                          {unit.lessonTitles.length > 4 && (
                            <li className="pl-5 text-[11px] font-bold text-slate-400">
                              另有 {unit.lessonTitles.length - 4} 課次⋯
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">
                      <span>收錄 {unit.lessonCount} 課次進度</span>
                      <span>敬請期待關卡上線</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
              此年級與學期暫無此科目的課綱紀錄。
            </div>
          )}
        </section>
      )}
    </div>
  );
}
