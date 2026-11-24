import type { FamilyRewardItem, PlayerProgress } from '../types/quiz.ts';
import { getMasteryStage } from './fsrs.ts';

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  rewardCoins: number;
  target: number;
  getCurrent: (progress: PlayerProgress) => number;
}

export interface EvaluatedBadge extends BadgeDefinition {
  current: number;
  unlocked: boolean;
  percent: number;
}

export const DEFAULT_FAMILY_REWARDS: FamilyRewardItem[] = [
  {
    id: 'reward-dinner',
    title: '點一道最愛的晚餐菜色',
    costCoins: 150,
    emoji: '🍛',
  },
  {
    id: 'reward-cartoon',
    title: '多看 15 分鐘卡通／自由時間',
    costCoins: 200,
    emoji: '📺',
  },
  {
    id: 'reward-park',
    title: '週末公園或書店探險券',
    costCoins: 300,
    emoji: '🎡',
  },
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-lesson',
    title: '小小學者',
    description: '完成第 1 堂先學觀念微課程',
    emoji: '📖',
    rewardCoins: 15,
    target: 1,
    getCurrent: (p) => p.completedLessonIds?.length ?? 0,
  },
  {
    id: 'lesson-explorer',
    title: '觀念探索家',
    description: '累計完成 10 堂微課程',
    emoji: '🧭',
    rewardCoins: 40,
    target: 10,
    getCurrent: (p) => p.completedLessonIds?.length ?? 0,
  },
  {
    id: 'hanzi-starter',
    title: '練字小新星',
    description: '在平板手寫練完 5 個國字',
    emoji: '✍️',
    rewardCoins: 25,
    target: 5,
    getCurrent: (p) => Object.keys(p.practicedHanzi ?? {}).length,
  },
  {
    id: 'hanzi-master',
    title: '小小書法家',
    description: '在平板手寫練完 20 個國字',
    emoji: '🖌️',
    rewardCoins: 60,
    target: 20,
    getCurrent: (p) => Object.keys(p.practicedHanzi ?? {}).length,
  },
  {
    id: 'error-healer',
    title: '錯題修復師',
    description: '回合內成功修復 10 題錯題',
    emoji: '🔧',
    rewardCoins: 35,
    target: 10,
    getCurrent: (p) => p.totalRepairedCount ?? 0,
  },
  {
    id: 'streak-3',
    title: '堅持小火苗',
    description: '連續學習達 3 天',
    emoji: '🔥',
    rewardCoins: 30,
    target: 3,
    getCurrent: (p) => p.studyStreakDays ?? 0,
  },
  {
    id: 'streak-7',
    title: '一週不間斷',
    description: '連續學習達 7 天',
    emoji: '🏅',
    rewardCoins: 70,
    target: 7,
    getCurrent: (p) => p.studyStreakDays ?? 0,
  },
  {
    id: 'tree-planter',
    title: '知識園丁',
    description: '在錯題知識花園種出 5 棵長期記憶大樹',
    emoji: '🌳',
    rewardCoins: 50,
    target: 5,
    getCurrent: (p) => {
      const cards = Object.values(p.fsrsCards ?? {});
      return cards.filter((c) => getMasteryStage(c).level === 'mastered')
        .length;
    },
  },
  {
    id: 'subject-allrounder',
    title: '全科探險家',
    description: '在 4 個以上不同科目拿過星星',
    emoji: '🌈',
    rewardCoins: 45,
    target: 4,
    getCurrent: (p) => {
      const subjects = new Set<string>();
      for (const [stageId, stars] of Object.entries(p.stageStars ?? {})) {
        if (stars <= 0) continue;
        const m = /^\d+-s[12]-g[1-6]-([a-z-]+)-u\d+/.exec(stageId);
        if (m) subjects.add(m[1]);
        else subjects.add('classic');
      }
      return subjects.size;
    },
  },
  {
    id: 'hero-collector',
    title: '英雄夥伴團',
    description: '解鎖 3 位以上冒險英雄',
    emoji: '🛡️',
    rewardCoins: 40,
    target: 3,
    getCurrent: (p) => p.unlockedAvatarIds?.length ?? 1,
  },
];

export function evaluateBadges(progress: PlayerProgress): EvaluatedBadge[] {
  const alreadyUnlocked = new Set(progress.unlockedBadgeIds ?? []);
  return BADGE_DEFINITIONS.map((def) => {
    const current = Math.max(0, def.getCurrent(progress));
    const unlocked = alreadyUnlocked.has(def.id) || current >= def.target;
    const percent = Math.min(100, Math.round((current / def.target) * 100));
    return {
      ...def,
      current: Math.min(def.target, current),
      unlocked,
      percent,
    };
  });
}

export function findNewlyEarnedBadges(progress: PlayerProgress): BadgeDefinition[] {
  const alreadyUnlocked = new Set(progress.unlockedBadgeIds ?? []);
  return BADGE_DEFINITIONS.filter(
    (def) => !alreadyUnlocked.has(def.id) && def.getCurrent(progress) >= def.target,
  );
}
