import { Sparkles, X } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BattleArena, type BattleResult } from './components/BattleArena';
import { HeroShop } from './components/HeroShop';
import { Navbar } from './components/Navbar';
import { TeacherPanel } from './components/TeacherPanel';
import { WorldMap } from './components/WorldMap';
import { WrongBook } from './components/WrongBook';
import type { LessonScript } from './types/lesson';
import type {
  ActiveTab,
  BattleMode,
  LocalProfileMeta,
  PlayerProgress,
  Stage,
} from './types/quiz';

const ExamReview = lazy(() => import('./components/ExamReview'));
const LessonPlayer = lazy(() => import('./components/LessonPlayer'));
import { recordDailyStudyActivity } from './utils/dailyStudy';
import { reviewFsrsCard } from './utils/fsrs';
import { playTap, setSoundEnabled } from './utils/sound';
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
    setActiveProfileId(res.activeProfileId);
    setProgress(res.progress);
    setProfiles(res.profiles);
    setSoundEnabled(res.progress.soundEnabled);
    setActiveBattle(null);
    setActiveLesson(null);
  }, []);

  const handleCreateProfile = useCallback((nickname: string) => {
    playTap();
    const res = createProfile(nickname);
    setActiveProfileId(res.activeProfileId);
    setProgress(res.progress);
    setProfiles(res.profiles);
    setSoundEnabled(res.progress.soundEnabled);
    setActiveBattle(null);
    setActiveLesson(null);
  }, []);

  const handleDeleteProfile = useCallback((profileId: string) => {
    playTap();
    const res = deleteProfile(profileId);
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
      setProgress(imported);
      setSoundEnabled(imported.soundEnabled);
      saveProgress(imported, activeProfileId);
      setProfiles(syncActiveProfileMeta(imported, activeProfileId));
      setActiveBattle(null);
      setActiveLesson(null);
    },
    [activeProfileId],
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
      return {
        ...prev,
        ...dailyPatch,
        xp: prev.xp + 10,
        completedLessonIds: [...prevIds, lessonId],
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

      return {
        ...prev,
        ...dailyPatch,
        xp: prev.xp + result.xpEarned,
        coins: prev.coins + result.coinsEarned,
        totalCorrect: prev.totalCorrect + result.correctCount,
        totalAnswered: prev.totalAnswered + result.totalCount,
        stageStars: nextStageStars,
        wrongQuestionIds: Array.from(wrongSet),
        wrongQuestionSnapshots: nextSnapshots,
        fsrsCards: nextFsrsCards,
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
      return {
        ...prev,
        coins: prev.coins - price,
        unlockedAvatarIds: [...prev.unlockedAvatarIds, avatarId],
        selectedAvatarId: avatarId,
      };
    });
  };

  const handleUpdateNickname = (nickname: string) => {
    setProgress((prev) => ({ ...prev, nickname }));
  };

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
    <div className="min-h-screen bg-amber-50 pb-12">
      <Navbar
        progress={progress}
        activeTab={activeTab}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onChangeTab={(tab) => {
          playTap();
          setActiveBattle(null);
          setActiveLesson(null);
          setActiveTab(tab);
        }}
        onToggleSound={handleToggleSound}
        onToggleFocusMode={handleToggleFocusMode}
        onSwitchProfile={handleSwitchProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
      />

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
            onFinishBattle={handleFinishBattle}
            onExit={() => setActiveBattle(null)}
          />
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
            onStartStage={(stage) => {
              playTap();
              setActiveBattle({ stage, mode: 'stage' });
            }}
            onStartLesson={(lesson, stage) => {
              playTap();
              setActiveLesson({ lesson, stage });
            }}
            onGoWrongBook={() => {
              playTap();
              setActiveTab('wrong');
            }}
            onGoExamReview={() => {
              playTap();
              setActiveTab('exam');
            }}
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
              onUpdateMapFilter={handleUpdateMapFilter}
            />
          </Suspense>
        ) : activeTab === 'wrong' ? (
          <WrongBook
            progress={progress}
            onRemoveWrongId={handleRemoveWrongId}
            onStartWrongReview={(reviewStage) =>
              setActiveBattle({ stage: reviewStage, mode: 'wrong-review' })
            }
          />
        ) : activeTab === 'shop' ? (
          <HeroShop
            progress={progress}
            onSelectAvatar={handleSelectAvatar}
            onUnlockAvatar={handleUnlockAvatar}
            onUpdateNickname={handleUpdateNickname}
          />
        ) : (
          <TeacherPanel
            progress={progress}
            onAddCustomStage={handleAddCustomStage}
            onDeleteCustomStage={handleDeleteCustomStage}
            onImportProgress={handleImportProgress}
            onStartStage={(stage) =>
              setActiveBattle({ stage, mode: 'stage' })
            }
          />
        )}
      </main>
    </div>
  );
}

export default App;
