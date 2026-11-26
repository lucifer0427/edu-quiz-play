import { Sparkles, X } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { BattleResult } from './components/BattleArena';
import { CertificateModal } from './components/CertificateModal';
import { Navbar } from './components/Navbar';
import { WorldMap } from './components/WorldMap';
import { loadLessonPack } from './data/curriculum/lessonLoader';
import { getCurriculumCatalog, loadQuizPack } from './data/curriculum/loader';
import { extractHanziCharacters } from './data/hanziVocab';
import type { LessonScript } from './types/lesson';
import type {
  ActiveTab,
  BattleMode,
  ExamPlan,
  FamilyRewardItem,
  Grade,
  LocalProfileMeta,
  PlayerProgress,
  Stage,
  SubjectId,
} from './types/quiz';

const BattleArena = lazy(() =>
  import('./components/BattleArena').then((m) => ({ default: m.BattleArena })),
);
const ExamReview = lazy(() => import('./components/ExamReview'));
const EyeCareModal = lazy(() => import('./components/EyeCareModal'));
const HanziPractice = lazy(() => import('./components/HanziPractice'));
const HeroShop = lazy(() => import('./components/HeroShop'));
const LessonPlayer = lazy(() => import('./components/LessonPlayer'));
const MathToolsModal = lazy(() => import('./components/MathToolsModal'));
const ProfileSelectorModal = lazy(
  () => import('./components/ProfileSelectorModal'),
);
const SiblingDuoArena = lazy(() => import('./components/SiblingDuoArena'));
const TeacherPanel = lazy(() => import('./components/TeacherPanel'));
const WrongBook = lazy(() => import('./components/WrongBook'));
import {
  BADGE_DEFINITIONS,
  findNewlyEarnedBadges,
  type BadgeDefinition,
} from './utils/badges';
import { recordDailyStudyActivity } from './utils/dailyStudy';
import { reviewFsrsCard } from './utils/fsrs';
import { resolveLessonForStage } from './utils/lessonSynthesizer';
import { playTap, playUnlock, setSoundEnabled } from './utils/sound';
import {
  createProfile,
  decodeCustomStageFromHash,
  deleteProfile,
  getActiveProfileId,
  listProfiles,
  loadProgress,
  saveProgress,
  switchProfile,
  syncActiveProfileMeta,
} from './utils/storage';

export function App() {
  const [activeProfileId, setActiveProfileId] = useState<string>(() =>
    getActiveProfileId(),
  );
  const [profiles, setProfiles] = useState<LocalProfileMeta[]>(() =>
    listProfiles(),
  );
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    const loaded = loadProgress(activeProfileId);
    setSoundEnabled(loaded.soundEnabled);
    return loaded;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [activeBattle, setActiveBattle] = useState<{
    stage: Stage;
    mode: BattleMode;
  } | null>(null);
  const [activeLesson, setActiveLesson] = useState<{
    lesson: LessonScript;
    stage: Stage;
  } | null>(null);
  const [sharedStage, setSharedStage] = useState<Stage | null>(() =>
    typeof window !== 'undefined'
      ? decodeCustomStageFromHash(window.location.hash)
      : null,
  );
  const [certificateState, setCertificateState] = useState<{
    open: boolean;
    title: string;
    subtitle: string;
  }>({ open: false, title: '', subtitle: '' });
  const [recentBadges, setRecentBadges] = useState<BadgeDefinition[]>([]);
  const [hanziContext, setHanziContext] = useState<{
    chars: string[];
    title: string;
  } | null>(null);
  const [duoOpen, setDuoOpen] = useState(false);
  const [mathToolsOpen, setMathToolsOpen] = useState(false);
  const [eyeCareOpen, setEyeCareOpen] = useState(false);
  const [profileSelectorOpen, setProfileSelectorOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      listProfiles().length >= 2 &&
      !window.sessionStorage.getItem('edu_profile_chosen')
    );
  });
  const prevBadgeIdsRef = useRef<Set<string>>(
    new Set(progress.unlockedBadgeIds ?? []),
  );

  // 每 20 分鐘專注學習跳出護眼休息提醒（頁面隱藏時暫停計時）
  useEffect(() => {
    if (progress.eyeCareEnabled === false || eyeCareOpen) return;
    let activeSeconds = 0;
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      activeSeconds += 1;
      if (activeSeconds >= 1200) {
        activeSeconds = 0;
        setEyeCareOpen(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeProfileId, eyeCareOpen, progress.eyeCareEnabled]);

  useEffect(() => {
    const currentIds = progress.unlockedBadgeIds ?? [];
    const newlyAdded = currentIds.filter((id) => !prevBadgeIdsRef.current.has(id));
    prevBadgeIdsRef.current = new Set(currentIds);
    if (newlyAdded.length === 0) return;
    const defs = newlyAdded
      .map((id) => BADGE_DEFINITIONS.find((b) => b.id === id))
      .filter((b): b is BadgeDefinition => Boolean(b));
    if (defs.length === 0) return;
    playUnlock();
    setRecentBadges(defs);
    const timer = window.setTimeout(() => {
      setRecentBadges([]);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [progress.unlockedBadgeIds]);

  useEffect(() => {
    saveProgress(progress, activeProfileId);
  }, [activeProfileId, progress]);

  useEffect(() => {
    setProfiles(syncActiveProfileMeta(progress, activeProfileId));
  }, [activeProfileId, progress.nickname, progress.selectedAvatarId]);

  useEffect(() => {
    const handleHashChange = () => {
      const decoded = decodeCustomStageFromHash(window.location.hash);
      if (decoded) {
        setSharedStage(decoded);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const clearShareHash = () => {
    if (window.location.hash.includes('quiz=')) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    }
  };

  const handleAcceptSharedStage = (playImmediately: boolean) => {
    if (!sharedStage) return;
    playTap();
    setProgress((prev) => {
      const exists = prev.customStages.some((s) => s.id === sharedStage.id);
      if (exists) return prev;
      return {
        ...prev,
        customStages: [sharedStage, ...prev.customStages],
      };
    });
    if (playImmediately) {
      setActiveBattle({ stage: sharedStage, mode: 'stage' });
    }
    setSharedStage(null);
    clearShareHash();
  };

  const handleToggleSound = () => {
    setProgress((prev) => {
      const nextEnabled = !prev.soundEnabled;
      setSoundEnabled(nextEnabled);
      if (nextEnabled) {
        playTap();
      }
      return { ...prev, soundEnabled: nextEnabled };
    });
  };

  const handleToggleFocusMode = useCallback(() => {
    playTap();
    setProgress((prev) => ({
      ...prev,
      focusMode: !prev.focusMode,
    }));
  }, []);

  const handleToggleSpeechSlow = useCallback(() => {
    playTap();
    setProgress((prev) => ({
      ...prev,
      speechRateMode: prev.speechRateMode === 'slow' ? 'normal' : 'slow',
    }));
  }, []);

  const handleToggleAutoRead = useCallback(() => {
    playTap();
    setProgress((prev) => ({
      ...prev,
      autoReadQuestion: !prev.autoReadQuestion,
    }));
  }, []);

  const handleUpdatePreferences = useCallback(
    (
      patch: Partial<
        Pick<
          PlayerProgress,
          | 'focusMode'
          | 'speechRateMode'
          | 'autoReadQuestion'
          | 'lowerGradeNudgeDismissed'
        >
      >,
    ) => {
      setProgress((prev) => ({
        ...prev,
        ...patch,
      }));
    },
    [],
  );

  const handleSwitchProfile = useCallback((profileId: string) => {
    playTap();
    const res = switchProfile(profileId);
    prevBadgeIdsRef.current = new Set(res.progress.unlockedBadgeIds ?? []);
    setRecentBadges([]);
    setActiveProfileId(res.activeProfileId);
    setProgress(res.progress);
    setProfiles(res.profiles);
    setSoundEnabled(res.progress.soundEnabled);
    setActiveBattle(null);
    setActiveLesson(null);
  }, []);

  const handleCreateProfile = useCallback(
    (nickname: string, defaultGrade?: Grade) => {
      playTap();
      const res = createProfile(nickname, defaultGrade);
      prevBadgeIdsRef.current = new Set(res.progress.unlockedBadgeIds ?? []);
      setRecentBadges([]);
      setActiveProfileId(res.activeProfileId);
      setProgress(res.progress);
      setProfiles(res.profiles);
      setSoundEnabled(res.progress.soundEnabled);
      setActiveBattle(null);
      setActiveLesson(null);
    },
    [],
  );

  const handleDeleteProfile = useCallback((profileId: string) => {
    playTap();
    const res = deleteProfile(profileId);
    prevBadgeIdsRef.current = new Set(res.progress.unlockedBadgeIds ?? []);
    setRecentBadges([]);
    setActiveProfileId(res.activeProfileId);
    setProgress(res.progress);
    setProfiles(res.profiles);
    setSoundEnabled(res.progress.soundEnabled);
    setActiveBattle(null);
    setActiveLesson(null);
  }, []);

  const handleImportProgress = useCallback(
    (imported: PlayerProgress) => {
      playTap();
      prevBadgeIdsRef.current = new Set(imported.unlockedBadgeIds ?? []);
      setRecentBadges([]);
      setProgress(imported);
      setSoundEnabled(imported.soundEnabled);
      saveProgress(imported, activeProfileId);
      setProfiles(syncActiveProfileMeta(imported, activeProfileId));
      setActiveBattle(null);
      setActiveLesson(null);
    },
    [activeProfileId],
  );

  const handleAwardCoins = useCallback((amount: number) => {
    if (amount <= 0) return;
    setProgress((prev) => ({
      ...prev,
      coins: prev.coins + amount,
    }));
  }, []);

  const handleSaveCustomHanziList = useCallback(
    (title: string, chars: string[]) => {
      setProgress((prev) => ({
        ...prev,
        customHanziLists: [
          {
            id: `hanzi-${Date.now()}`,
            title,
            chars,
            createdAt: new Date().toISOString(),
          },
          ...(prev.customHanziLists ?? []),
        ].slice(0, 12),
      }));
    },
    [],
  );

  const handleDeleteCustomHanziList = useCallback((id: string) => {
    setProgress((prev) => ({
      ...prev,
      customHanziLists: (prev.customHanziLists ?? []).filter(
        (l) => l.id !== id,
      ),
    }));
  }, []);

  const handleUpdateExamPlan = useCallback((plan: ExamPlan | undefined) => {
    setProgress((prev) => ({
      ...prev,
      examPlan: plan,
    }));
  }, []);

  const handleToggleEyeCare = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      eyeCareEnabled: prev.eyeCareEnabled === false ? true : false,
    }));
  }, []);

  const handleUpdateDefaultGrade = useCallback(
    (grade: Grade | undefined) => {
      setProgress((prev) => {
        const next: PlayerProgress = {
          ...prev,
          defaultGrade: grade,
          selectedGrade: grade ?? prev.selectedGrade,
        };
        setProfiles(syncActiveProfileMeta(next, activeProfileId));
        return next;
      });
    },
    [activeProfileId],
  );

  const handleOpenLessonForWrongQuestion = useCallback(
    async (subjectId: SubjectId, stageTitle?: string) => {
      if (subjectId === 'custom') return;
      const grade = progress.selectedGrade ?? 5;
      const semester = progress.selectedSemester ?? 1;
      const { academicYear } = getCurriculumCatalog();
      const pack = await loadQuizPack(academicYear, semester, grade, subjectId);
      const lessonPack = await loadLessonPack(
        academicYear,
        semester,
        grade,
        subjectId,
      );
      if (!pack || !lessonPack || pack.stages.length === 0) return;
      const targetStage =
        (stageTitle ? pack.stages.find((s) => s.title === stageTitle) : undefined) ??
        pack.stages[0];
      const { lesson } = resolveLessonForStage(lessonPack, targetStage);
      setActiveLesson({ lesson, stage: targetStage });
    },
    [progress.selectedGrade, progress.selectedSemester],
  );

  const markLessonCompleted = useCallback((lessonId: string) => {
    setProgress((prev) => {
      const prevIds = prev.completedLessonIds ?? [];
      const isNew = !prevIds.includes(lessonId);
      const dailyPatch = recordDailyStudyActivity(prev, {
        lessonCompleted: isNew,
      });
      if (!isNew) {
        return { ...prev, ...dailyPatch };
      }
      const nextProgress: PlayerProgress = {
        ...prev,
        ...dailyPatch,
        xp: prev.xp + 10,
        completedLessonIds: [...prevIds, lessonId],
      };
      const newBadges = findNewlyEarnedBadges(nextProgress);
      if (newBadges.length === 0) return nextProgress;
      const bonusCoins = newBadges.reduce((sum, b) => sum + b.rewardCoins, 0);
      return {
        ...nextProgress,
        coins: nextProgress.coins + bonusCoins,
        unlockedBadgeIds: [
          ...(nextProgress.unlockedBadgeIds ?? []),
          ...newBadges.map((b) => b.id),
        ],
      };
    });
  }, []);

  const handleFinishBattle = useCallback((result: BattleResult) => {
    const now = new Date();
    setProgress((prev) => {
      const prevStars = prev.stageStars[result.stageId] ?? 0;
      const nextStageStars =
        result.battleMode !== 'stage'
          ? prev.stageStars
          : {
              ...prev.stageStars,
              [result.stageId]: Math.max(prevStars, result.stars),
            };

      const wrongSet = new Set(prev.wrongQuestionIds);
      const nextSnapshots = { ...(prev.wrongQuestionSnapshots ?? {}) };
      const nextFsrsCards = { ...(prev.fsrsCards ?? {}) };

      result.wrongQuestions.forEach((q) => {
        wrongSet.add(q.id);
        nextSnapshots[q.id] = {
          ...q,
          subjectId: q.subjectId ?? result.subjectId,
          stageTitle: q.stageTitle ?? result.stageTitle,
        };
      });

      // 答錯加入錯題排程；複習答對改為推進 FSRS 記憶間隔，不再直接刪除
      for (const outcome of result.attemptOutcomes) {
        const q = outcome.question;
        const shouldTrack =
          !outcome.wasCorrect || wrongSet.has(q.id) || q.id in nextFsrsCards;
        if (!shouldTrack) continue;

        if (!outcome.wasCorrect) {
          wrongSet.add(q.id);
          nextSnapshots[q.id] = {
            ...q,
            subjectId: q.subjectId ?? result.subjectId,
            stageTitle: q.stageTitle ?? result.stageTitle,
          };
        }

        nextFsrsCards[q.id] = reviewFsrsCard(
          nextFsrsCards[q.id],
          q.id,
          {
            wasCorrect: outcome.wasCorrect,
            usedHint: outcome.usedHint,
            responseTimeMs: outcome.responseTimeMs,
          },
          now,
        );
      }

      const dailyPatch = recordDailyStudyActivity(
        prev,
        {
          answered: result.totalCount,
          reviewCompleted: result.isReviewMode,
        },
        now,
      );

      const nextProgress: PlayerProgress = {
        ...prev,
        ...dailyPatch,
        xp: prev.xp + result.xpEarned,
        coins: prev.coins + result.coinsEarned,
        totalCorrect: prev.totalCorrect + result.correctCount,
        totalAnswered: prev.totalAnswered + result.totalCount,
        totalRepairedCount:
          (prev.totalRepairedCount ?? 0) + (result.repairedCount ?? 0),
        stageStars: nextStageStars,
        wrongQuestionIds: Array.from(wrongSet),
        wrongQuestionSnapshots: nextSnapshots,
        fsrsCards: nextFsrsCards,
      };
      const newBadges = findNewlyEarnedBadges(nextProgress);
      if (newBadges.length === 0) return nextProgress;
      const bonusCoins = newBadges.reduce((sum, b) => sum + b.rewardCoins, 0);
      return {
        ...nextProgress,
        coins: nextProgress.coins + bonusCoins,
        unlockedBadgeIds: [
          ...(nextProgress.unlockedBadgeIds ?? []),
          ...newBadges.map((b) => b.id),
        ],
      };
    });
  }, []);

  const handleSelectAvatar = (avatarId: string) => {
    setProgress((prev) => ({ ...prev, selectedAvatarId: avatarId }));
  };

  const handleUnlockAvatar = (avatarId: string, price: number) => {
    setProgress((prev) => {
      if (prev.unlockedAvatarIds.includes(avatarId) || prev.coins < price) {
        return prev;
      }
      const nextProgress: PlayerProgress = {
        ...prev,
        coins: prev.coins - price,
        unlockedAvatarIds: [...prev.unlockedAvatarIds, avatarId],
        selectedAvatarId: avatarId,
      };
      const newBadges = findNewlyEarnedBadges(nextProgress);
      if (newBadges.length === 0) return nextProgress;
      const bonusCoins = newBadges.reduce((sum, b) => sum + b.rewardCoins, 0);
      return {
        ...nextProgress,
        coins: nextProgress.coins + bonusCoins,
        unlockedBadgeIds: [
          ...(nextProgress.unlockedBadgeIds ?? []),
          ...newBadges.map((b) => b.id),
        ],
      };
    });
  };

  const handleUpdateNickname = (nickname: string) => {
    setProgress((prev) => ({ ...prev, nickname }));
  };

  const handleCompleteHanzi = useCallback((char: string) => {
    const now = new Date();
    setProgress((prev) => {
      const existing = prev.practicedHanzi?.[char];
      const isFirstTime = !existing;
      const dailyPatch = recordDailyStudyActivity(prev, { answered: 1 }, now);
      const nextProgress: PlayerProgress = {
        ...prev,
        ...dailyPatch,
        xp: prev.xp + (isFirstTime ? 10 : 5),
        coins: prev.coins + (isFirstTime ? 5 : 3),
        practicedHanzi: {
          ...(prev.practicedHanzi ?? {}),
          [char]: {
            count: (existing?.count ?? 0) + 1,
            masteredAt: existing?.masteredAt ?? now.toISOString(),
          },
        },
      };
      const newBadges = findNewlyEarnedBadges(nextProgress);
      if (newBadges.length === 0) return nextProgress;
      const bonusCoins = newBadges.reduce((sum, b) => sum + b.rewardCoins, 0);
      return {
        ...nextProgress,
        coins: nextProgress.coins + bonusCoins,
        unlockedBadgeIds: [
          ...(nextProgress.unlockedBadgeIds ?? []),
          ...newBadges.map((b) => b.id),
        ],
      };
    });
  }, []);

  const handleRedeemFamilyReward = useCallback((reward: FamilyRewardItem) => {
    setProgress((prev) => {
      if (prev.coins < reward.costCoins) return prev;
      return {
        ...prev,
        coins: prev.coins - reward.costCoins,
        redeemedRewards: [
          {
            id: `voucher-${Date.now()}`,
            rewardId: reward.id,
            title: reward.title,
            emoji: reward.emoji,
            costCoins: reward.costCoins,
            redeemedAt: new Date().toISOString(),
            used: false,
          },
          ...(prev.redeemedRewards ?? []),
        ],
      };
    });
  }, []);

  const handleMarkRewardUsed = useCallback((redeemedId: string) => {
    setProgress((prev) => ({
      ...prev,
      redeemedRewards: (prev.redeemedRewards ?? []).map((item) =>
        item.id === redeemedId ? { ...item, used: true } : item,
      ),
    }));
  }, []);

  const handleUpdateFamilyRewards = useCallback(
    (rewards: FamilyRewardItem[]) => {
      setProgress((prev) => ({
        ...prev,
        familyRewards: rewards,
      }));
    },
    [],
  );

  const handleReviewStageLesson = useCallback(async (stage: Stage) => {
    const ref = stage.curriculum;
    const pack =
      ref && stage.subjectId !== 'custom'
        ? await loadLessonPack(
            ref.academicYear,
            ref.semester,
            ref.grade,
            stage.subjectId,
          )
        : null;
    const { lesson } = resolveLessonForStage(pack, stage);
    setActiveBattle(null);
    setActiveLesson({ lesson, stage });
  }, []);

  const handleUpdateParentPin = useCallback((pin: string | undefined) => {
    setProgress((prev) => ({
      ...prev,
      parentPin: pin,
    }));
  }, []);

  const handlePracticeStageHanzi = useCallback((stage: Stage) => {
    playTap();
    const combinedText = [
      stage.title,
      ...stage.questions.slice(0, 5).map((q) => q.options[q.answerIndex] ?? ''),
    ].join('');
    const chars = extractHanziCharacters(combinedText).slice(0, 12);
    setHanziContext({
      chars,
      title: stage.title,
    });
    setActiveTab('hanzi');
  }, []);

  const handleUpdateMapFilter = useCallback(
    (
      patch: Partial<
        Pick<
          PlayerProgress,
          'selectedView' | 'selectedGrade' | 'selectedSemester' | 'selectedSubject'
        >
      >,
    ) => {
      setProgress((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const handleRemoveWrongId = (questionId: string) => {
    setProgress((prev) => {
      const nextSnapshots = { ...(prev.wrongQuestionSnapshots ?? {}) };
      delete nextSnapshots[questionId];
      const nextFsrsCards = { ...(prev.fsrsCards ?? {}) };
      delete nextFsrsCards[questionId];
      return {
        ...prev,
        wrongQuestionIds: prev.wrongQuestionIds.filter(
          (id) => id !== questionId,
        ),
        wrongQuestionSnapshots: nextSnapshots,
        fsrsCards: nextFsrsCards,
      };
    });
  };

  const handleAddCustomStage = (stage: Stage) => {
    setProgress((prev) => ({
      ...prev,
      customStages: [stage, ...prev.customStages],
    }));
  };

  const handleDeleteCustomStage = (stageId: string) => {
    setProgress((prev) => ({
      ...prev,
      customStages: prev.customStages.filter((s) => s.id !== stageId),
    }));
  };

  return (
    <div
      className={`min-h-screen bg-amber-50 pb-12 ${
        (progress.selectedGrade ?? 5) <= 2 ? 'text-[17px]' : ''
      }`}
    >
      <Navbar
        progress={progress}
        activeTab={activeTab}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onChangeTab={(tab) => {
          playTap();
          setActiveBattle(null);
          setActiveLesson(null);
          if (tab === 'hanzi') {
            setHanziContext(null);
          }
          setActiveTab(tab);
        }}
        onToggleSound={handleToggleSound}
        onToggleFocusMode={handleToggleFocusMode}
        onSwitchProfile={handleSwitchProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onOpenDuoMode={() => {
          playTap();
          setDuoOpen(true);
        }}
        onOpenMathTools={() => {
          playTap();
          setMathToolsOpen(true);
        }}
        onOpenProfileSelector={() => {
          playTap();
          setProfileSelectorOpen(true);
        }}
      />

      {recentBadges.length > 0 && (
        <div className="mx-auto mt-3 max-w-4xl px-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-amber-50 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2.5 text-sm font-black text-slate-800">
              <span className="text-xl">{recentBadges[0].emoji}</span>
              <span>
                🎉 恭喜解鎖新徽章：
                {recentBadges
                  .map((b) => `「${b.title}」(+${b.rewardCoins} 金幣)`)
                  .join('、')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRecentBadges([])}
              aria-label="關閉徽章通知"
              className="rounded-lg p-1 text-slate-500 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {sharedStage && !activeBattle && !activeLesson && (
        <div className="mx-auto mt-4 max-w-4xl px-4">
          <div className="animate-pop-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm font-bold text-slate-800">
                收到老師分享的專屬測驗：「
                <span className="font-black text-amber-900">
                  {sharedStage.title}
                </span>
                」（共 {sharedStage.questions.length} 題）
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAcceptSharedStage(true)}
                className="btn-3d rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-[0_2px_0_#d97706] hover:bg-amber-300"
              >
                儲存並立即開戰
              </button>
              <button
                type="button"
                onClick={() => handleAcceptSharedStage(false)}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-50"
              >
                先加入關卡列表
              </button>
              <button
                type="button"
                onClick={() => {
                  setSharedStage(null);
                  clearShareHash();
                }}
                aria-label="關閉分享提示"
                className="rounded-lg p-1 text-slate-500 hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        {activeBattle ? (
          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm font-black text-slate-600">
                正在準備冒險對戰關卡...
              </div>
            }
          >
            <BattleArena
              stage={activeBattle.stage}
              selectedAvatarId={progress.selectedAvatarId}
              currentXp={progress.xp}
              previousStars={progress.stageStars[activeBattle.stage.id] ?? 0}
              battleMode={activeBattle.mode}
              isWrongReviewMode={activeBattle.mode === 'wrong-review'}
              focusMode={Boolean(progress.focusMode)}
              speechSlowMode={progress.speechRateMode === 'slow'}
              autoReadQuestion={Boolean(progress.autoReadQuestion)}
              onToggleFocusMode={handleToggleFocusMode}
              onToggleSpeechSlow={handleToggleSpeechSlow}
              onToggleAutoRead={handleToggleAutoRead}
              onReviewLesson={
                activeBattle.stage.subjectId !== 'custom'
                  ? () => {
                      void handleReviewStageLesson(activeBattle.stage);
                    }
                  : undefined
              }
              onOpenCertificate={() =>
                setCertificateState({
                  open: true,
                  title: `成功通關「${activeBattle.stage.title}」`,
                  subtitle: '完成關卡挑戰，持續累積學習能量！',
                })
              }
              onFinishBattle={handleFinishBattle}
              onExit={() => setActiveBattle(null)}
            />
          </Suspense>
        ) : activeLesson ? (
          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm font-black text-slate-600">
                正在載入微課程內容...
              </div>
            }
          >
            <LessonPlayer
              lesson={activeLesson.lesson}
              stage={activeLesson.stage}
              alreadyCompleted={Boolean(
                progress.completedLessonIds?.includes(
                  activeLesson.lesson.lessonId,
                ),
              )}
              focusMode={Boolean(progress.focusMode)}
              speechSlowMode={progress.speechRateMode === 'slow'}
              autoReadQuestion={Boolean(progress.autoReadQuestion)}
              onToggleSpeechSlow={handleToggleSpeechSlow}
              onToggleAutoRead={handleToggleAutoRead}
              onCompleteAndStartQuiz={() => {
                markLessonCompleted(activeLesson.lesson.lessonId);
                const targetStage = activeLesson.stage;
                setActiveLesson(null);
                setActiveBattle({ stage: targetStage, mode: 'stage' });
              }}
              onCompleteAndExit={() => {
                markLessonCompleted(activeLesson.lesson.lessonId);
                setActiveLesson(null);
              }}
              onExit={() => setActiveLesson(null)}
            />
          </Suspense>
        ) : activeTab === 'map' ? (
          <WorldMap
            progress={progress}
            profiles={profiles}
            onStartStage={(stage) => {
              playTap();
              setActiveBattle({ stage, mode: 'stage' });
            }}
            onStartLesson={(lesson, stage) => {
              playTap();
              setActiveLesson({ lesson, stage });
            }}
            onPracticeHanzi={handlePracticeStageHanzi}
            onGoWrongBook={() => {
              playTap();
              setActiveTab('wrong');
            }}
            onGoExamReview={() => {
              playTap();
              setActiveTab('exam');
            }}
            onGoHanzi={() => {
              playTap();
              setHanziContext(null);
              setActiveTab('hanzi');
            }}
            onOpenCertificate={() =>
              setCertificateState({
                open: true,
                title: `達成今日學習目標（連續 ${progress.studyStreakDays ?? 1} 天）`,
                subtitle: '每天穩穩進步一點點，就是最棒的冒險家！',
              })
            }
            onGoTeacher={() => {
              playTap();
              setActiveTab('teacher');
            }}
            onUpdateDailyGoal={(goal) => {
              setProgress((prev) => ({ ...prev, dailyGoalQuestions: goal }));
            }}
            onUpdatePreferences={handleUpdatePreferences}
            onUpdateMapFilter={handleUpdateMapFilter}
          />
        ) : activeTab === 'hanzi' ? (
          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm font-black text-slate-600">
                正在載入平板手寫國字練字坊...
              </div>
            }
          >
            <HanziPractice
              progress={progress}
              initialChars={hanziContext?.chars}
              initialTitle={hanziContext?.title}
              onCompleteHanzi={handleCompleteHanzi}
              onSaveCustomList={handleSaveCustomHanziList}
              onDeleteCustomList={handleDeleteCustomHanziList}
            />
          </Suspense>
        ) : activeTab === 'exam' ? (
          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm font-black text-slate-600">
                正在載入考前重點複習...
              </div>
            }
          >
            <ExamReview
              progress={progress}
              onStartMockExam={(mockStage) => {
                playTap();
                setActiveBattle({ stage: mockStage, mode: 'mock-exam' });
              }}
              onStartStage={(stage) => {
                playTap();
                setActiveBattle({ stage, mode: 'stage' });
              }}
              onStartLesson={(lesson, stage) => {
                playTap();
                setActiveLesson({ lesson, stage });
              }}
              onUpdateExamPlan={handleUpdateExamPlan}
              onUpdateMapFilter={handleUpdateMapFilter}
            />
          </Suspense>
        ) : activeTab === 'wrong' ? (
          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm font-black text-slate-600">
                正在載入記憶樹錯題本...
              </div>
            }
          >
            <WrongBook
              progress={progress}
              onRemoveWrongId={handleRemoveWrongId}
              onStartWrongReview={(reviewStage) =>
                setActiveBattle({ stage: reviewStage, mode: 'wrong-review' })
              }
              onOpenLessonForQuestion={(subjectId, stageTitle) => {
                void handleOpenLessonForWrongQuestion(subjectId, stageTitle);
              }}
            />
          </Suspense>
        ) : activeTab === 'shop' ? (
          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm font-black text-slate-600">
                正在載入英雄商店...
              </div>
            }
          >
            <HeroShop
              progress={progress}
              onSelectAvatar={handleSelectAvatar}
              onUnlockAvatar={handleUnlockAvatar}
              onUpdateNickname={handleUpdateNickname}
              onRedeemFamilyReward={handleRedeemFamilyReward}
              onMarkRewardUsed={handleMarkRewardUsed}
              onUpdateFamilyRewards={handleUpdateFamilyRewards}
              onUpdateParentPin={handleUpdateParentPin}
              onToggleEyeCare={handleToggleEyeCare}
              onUpdateDefaultGrade={handleUpdateDefaultGrade}
              onImportProgress={handleImportProgress}
            />
          </Suspense>
        ) : (
          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm font-black text-slate-600">
                正在載入老師出題專區...
              </div>
            }
          >
            <TeacherPanel
              progress={progress}
              onAddCustomStage={handleAddCustomStage}
              onDeleteCustomStage={handleDeleteCustomStage}
              onImportProgress={handleImportProgress}
              onStartStage={(stage) =>
                setActiveBattle({ stage, mode: 'stage' })
              }
            />
          </Suspense>
        )}
      </main>

      <CertificateModal
        open={certificateState.open}
        nickname={progress.nickname}
        achievementTitle={certificateState.title}
        subtitle={certificateState.subtitle}
        onClose={() =>
          setCertificateState((prev) => ({ ...prev, open: false }))
        }
      />

      <Suspense fallback={null}>
        {duoOpen && (
          <SiblingDuoArena
            open={duoOpen}
            defaultGradeA={
              profiles.find((p) => (p.defaultGrade ?? 0) >= 3)?.defaultGrade ?? 5
            }
            defaultGradeB={
              profiles.find((p) => (p.defaultGrade ?? 9) <= 2)?.defaultGrade ?? 2
            }
            defaultNameA={
              profiles.find((p) => (p.defaultGrade ?? 0) >= 3)?.nickname ?? '大寶'
            }
            defaultNameB={
              profiles.find((p) => (p.defaultGrade ?? 9) <= 2)?.nickname ?? '二寶'
            }
            onAwardCoins={handleAwardCoins}
            onClose={() => setDuoOpen(false)}
          />
        )}
        {mathToolsOpen && (
          <MathToolsModal
            open={mathToolsOpen}
            onAwardCoins={handleAwardCoins}
            onClose={() => setMathToolsOpen(false)}
          />
        )}
        {eyeCareOpen && (
          <EyeCareModal
            open={eyeCareOpen}
            onComplete={(coins) => {
              handleAwardCoins(coins);
              setEyeCareOpen(false);
            }}
            onSkip={() => setEyeCareOpen(false)}
          />
        )}
        {profileSelectorOpen && (
          <ProfileSelectorModal
            open={profileSelectorOpen}
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSelectProfile={(id) => {
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('edu_profile_chosen', '1');
              }
              handleSwitchProfile(id);
            }}
            onCreateProfile={(name, grade) => {
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('edu_profile_chosen', '1');
              }
              handleCreateProfile(name, grade);
            }}
            onClose={() => {
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('edu_profile_chosen', '1');
              }
              setProfileSelectorOpen(false);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
