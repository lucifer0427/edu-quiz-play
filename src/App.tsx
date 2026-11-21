import { Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BattleArena, type BattleResult } from './components/BattleArena';
import { HeroShop } from './components/HeroShop';
import { Navbar } from './components/Navbar';
import { TeacherPanel } from './components/TeacherPanel';
import { WorldMap } from './components/WorldMap';
import { WrongBook } from './components/WrongBook';
import type { ActiveTab, PlayerProgress, Stage } from './types/quiz';
import { playTap, setSoundEnabled } from './utils/sound';
import {
  decodeCustomStageFromHash,
  loadProgress,
  saveProgress,
} from './utils/storage';

export function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    const loaded = loadProgress();
    setSoundEnabled(loaded.soundEnabled);
    return loaded;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [activeBattle, setActiveBattle] = useState<{
    stage: Stage;
    isWrongReviewMode: boolean;
  } | null>(null);
  const [sharedStage, setSharedStage] = useState<Stage | null>(() =>
    typeof window !== 'undefined'
      ? decodeCustomStageFromHash(window.location.hash)
      : null,
  );

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

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
      setActiveBattle({ stage: sharedStage, isWrongReviewMode: false });
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

  const handleFinishBattle = useCallback((result: BattleResult) => {
    setProgress((prev) => {
      const prevStars = prev.stageStars[result.stageId] ?? 0;
      const nextStageStars = result.isReviewMode
        ? prev.stageStars
        : {
            ...prev.stageStars,
            [result.stageId]: Math.max(prevStars, result.stars),
          };

      const wrongSet = new Set(prev.wrongQuestionIds);
      const nextSnapshots = { ...(prev.wrongQuestionSnapshots ?? {}) };

      if (result.isReviewMode) {
        result.solvedWrongIds.forEach((id) => {
          wrongSet.delete(id);
          delete nextSnapshots[id];
        });
      }

      result.wrongQuestions.forEach((q) => {
        wrongSet.add(q.id);
        nextSnapshots[q.id] = q;
      });

      return {
        ...prev,
        xp: prev.xp + result.xpEarned,
        coins: prev.coins + result.coinsEarned,
        totalCorrect: prev.totalCorrect + result.correctCount,
        totalAnswered: prev.totalAnswered + result.totalCount,
        stageStars: nextStageStars,
        wrongQuestionIds: Array.from(wrongSet),
        wrongQuestionSnapshots: nextSnapshots,
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

  const handleRemoveWrongId = (questionId: string) => {
    setProgress((prev) => {
      const nextSnapshots = { ...(prev.wrongQuestionSnapshots ?? {}) };
      delete nextSnapshots[questionId];
      return {
        ...prev,
        wrongQuestionIds: prev.wrongQuestionIds.filter(
          (id) => id !== questionId,
        ),
        wrongQuestionSnapshots: nextSnapshots,
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
        onChangeTab={(tab) => {
          playTap();
          setActiveBattle(null);
          setActiveTab(tab);
        }}
        onToggleSound={handleToggleSound}
      />

      {sharedStage && !activeBattle && (
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
            isWrongReviewMode={activeBattle.isWrongReviewMode}
            onFinishBattle={handleFinishBattle}
            onExit={() => setActiveBattle(null)}
          />
        ) : activeTab === 'map' ? (
          <WorldMap
            progress={progress}
            onStartStage={(stage) => {
              playTap();
              setActiveBattle({ stage, isWrongReviewMode: false });
            }}
            onGoWrongBook={() => {
              playTap();
              setActiveTab('wrong');
            }}
            onGoTeacher={() => {
              playTap();
              setActiveTab('teacher');
            }}
          />
        ) : activeTab === 'wrong' ? (
          <WrongBook
            progress={progress}
            onRemoveWrongId={handleRemoveWrongId}
            onStartWrongReview={(reviewStage) =>
              setActiveBattle({ stage: reviewStage, isWrongReviewMode: true })
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
            onStartStage={(stage) =>
              setActiveBattle({ stage, isWrongReviewMode: false })
            }
          />
        )}
      </main>
    </div>
  );
}

export default App;
