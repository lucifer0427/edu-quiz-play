import {
  BookX,
  Coins,
  Compass,
  GraduationCap,
  ShoppingBag,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ActiveTab, PlayerProgress } from '../types/quiz';
import { getLevelFromXp } from '../utils/storage';
import { HeroSprite } from './GameSprites';

interface NavbarProps {
  progress: PlayerProgress;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onToggleSound: () => void;
}

export function Navbar({
  progress,
  activeTab,
  onChangeTab,
  onToggleSound,
}: NavbarProps) {
  const levelInfo = getLevelFromXp(progress.xp);
  const wrongCount = progress.wrongQuestionIds.length;

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof Compass;
    badge?: number;
  }> = [
    { id: 'map', label: '冒險地圖', icon: Compass },
    { id: 'wrong', label: '錯題本', icon: BookX, badge: wrongCount },
    { id: 'shop', label: '英雄商店', icon: ShoppingBag },
    { id: 'teacher', label: '老師出題', icon: GraduationCap },
  ];

  return (
    <header className="sticky top-0 z-30 border-b-2 border-amber-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800 sm:text-xl">
              知識大冒險
            </h1>
            <p className="text-xs font-medium text-slate-500">
              EduQuiz Play · 快樂闖關學知識
            </p>
          </div>
        </div>

        <nav className="order-3 flex w-full items-center gap-1.5 overflow-x-auto pt-1 md:order-2 md:w-auto md:pt-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? 'bg-amber-400 text-slate-900 shadow-sm'
                    : 'bg-amber-50/70 text-slate-600 hover:bg-amber-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] leading-none font-black text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="order-2 flex items-center gap-2.5 md:order-3">
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-2.5 py-1.5">
            <HeroSprite avatarId={progress.selectedAvatarId} size={32} />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span>{progress.nickname}</span>
                <span className="rounded-md bg-amber-200 px-1.5 py-0.5 text-[10px] font-black text-amber-900">
                  Lv.{levelInfo.level}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-amber-200">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-black text-yellow-800"
            title="冒險金幣"
          >
            <Coins className="h-4 w-4 text-yellow-500" />
            <span>{progress.coins}</span>
          </div>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={progress.soundEnabled ? '關閉音效' : '開啟音效'}
            title={progress.soundEnabled ? '音效已開啟' : '音效已靜音'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            {progress.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
