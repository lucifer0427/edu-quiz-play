import {
  BookX,
  Check,
  ChevronDown,
  ClipboardCheck,
  Coins,
  Compass,
  Focus,
  GraduationCap,
  PenTool,
  ShoppingBag,
  Sparkles,
  Swords,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  ActiveTab,
  LocalProfileMeta,
  PlayerProgress,
} from '../types/quiz';
import { countDueWrongQuestions } from '../utils/fsrs';
import { DEFAULT_PROFILE_ID, getLevelFromXp } from '../utils/storage';
import { HeroSprite } from './GameSprites';

interface NavbarProps {
  progress: PlayerProgress;
  activeTab: ActiveTab;
  profiles: LocalProfileMeta[];
  activeProfileId: string;
  onChangeTab: (tab: ActiveTab) => void;
  onToggleSound: () => void;
  onToggleFocusMode: () => void;
  onSwitchProfile: (profileId: string) => void;
  onCreateProfile: (nickname: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onOpenDuoMode?: () => void;
  onOpenMathTools?: () => void;
  onOpenProfileSelector?: () => void;
}

export function Navbar({
  progress,
  activeTab,
  profiles,
  activeProfileId,
  onChangeTab,
  onToggleSound,
  onToggleFocusMode,
  onSwitchProfile,
  onCreateProfile,
  onDeleteProfile,
  onOpenDuoMode,
  onOpenMathTools,
  onOpenProfileSelector,
}: NavbarProps) {
  const levelInfo = getLevelFromXp(progress.xp);
  const dueWrongCount = countDueWrongQuestions(progress);
  const isFocusMode = Boolean(progress.focusMode);

  const [menuOpen, setMenuOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(true);
  const [newProfileName, setNewProfileName] = useState('');
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const updateAlignment = () => {
      if (!menuContainerRef.current) return;
      const rect = menuContainerRef.current.getBoundingClientRect();
      // w-72 = 288px; only align right if there is >= 300px room to the left of rect.right
      setAlignRight(rect.right >= 300);
    };
    updateAlignment();
    const handleOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('resize', updateAlignment);
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('resize', updateAlignment);
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) return;
    onCreateProfile(trimmed);
    setNewProfileName('');
    setMenuOpen(false);
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof Compass;
    badge?: number;
  }> = [
    { id: 'map', label: '冒險地圖', icon: Compass },
    { id: 'hanzi', label: '手寫國字', icon: PenTool },
    { id: 'exam', label: '考前複習', icon: ClipboardCheck },
    { id: 'wrong', label: '錯題本', icon: BookX, badge: dueWrongCount },
    { id: 'shop', label: '英雄商店', icon: ShoppingBag },
    { id: 'teacher', label: '老師出題', icon: GraduationCap },
  ];

  return (
    <header className="sticky top-0 z-30 border-b-2 border-amber-200 bg-white/95 backdrop-blur print:hidden">
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
          <div className="relative" ref={menuContainerRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title="點擊切換或新增本機學童檔案"
              className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left transition hover:bg-amber-100/80"
            >
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
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className={`fixed inset-x-3 top-16 z-50 mx-auto max-w-xs rounded-2xl border-2 border-amber-200 bg-white p-3 shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:mx-0 sm:mt-2 sm:w-72 sm:max-w-none ${
                  alignRight ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-1.5 px-1 text-xs font-black text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-600" />
                    <span>本機學童檔案</span>
                  </div>
                  {onOpenProfileSelector && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenProfileSelector();
                      }}
                      className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800 hover:bg-amber-200"
                    >
                      大頭像選單
                    </button>
                  )}
                </div>

                <div className="max-h-52 space-y-1.5 overflow-y-auto">
                  {profiles.map((profile) => {
                    const isCurrent = profile.id === activeProfileId;
                    return (
                      <div
                        key={profile.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 ${
                          isCurrent
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!isCurrent) {
                              onSwitchProfile(profile.id);
                            }
                            setMenuOpen(false);
                          }}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <HeroSprite
                            avatarId={profile.selectedAvatarId}
                            size={28}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-black text-slate-800">
                              {profile.nickname}
                              {profile.defaultGrade ? ` (${profile.defaultGrade}年)` : ''}
                            </div>
                            {isCurrent && (
                              <div className="text-[10px] font-bold text-amber-700">
                                目前使用中
                              </div>
                            )}
                          </div>
                          {isCurrent && (
                            <Check className="h-4 w-4 shrink-0 text-amber-600" />
                          )}
                        </button>

                        {profile.id !== DEFAULT_PROFILE_ID && (
                          <button
                            type="button"
                            onClick={() => onDeleteProfile(profile.id)}
                            aria-label={`刪除 ${profile.nickname} 檔案`}
                            title="刪除此本機檔案"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleCreateSubmit}
                  className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5"
                >
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="輸入新學童暱稱（如：妹妹）"
                    maxLength={20}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-400 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newProfileName.trim()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-2.5 py-1.5 text-xs font-black text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>新增</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {onOpenDuoMode && (
            <button
              type="button"
              onClick={onOpenDuoMode}
              title="雙寶同機合作打魔王 / 跨年級公平 PK"
              className="flex h-10 items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2.5 text-xs font-black text-violet-700 transition hover:bg-violet-100"
            >
              <Swords className="h-4 w-4" />
              <span className="hidden lg:inline">雙人對戰</span>
            </button>
          )}

          {onOpenMathTools && (
            <button
              type="button"
              onClick={onOpenMathTools}
              title="九九乘法閃電戰與互動時鐘教具"
              className="flex h-10 items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 text-xs font-black text-sky-700 transition hover:bg-sky-100"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden lg:inline">數學教具</span>
            </button>
          )}

          <div
            className="flex items-center gap-1.5 rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-black text-yellow-800"
            title="冒險金幣"
          >
            <Coins className="h-4 w-4 text-yellow-500" />
            <span>{progress.coins}</span>
          </div>

          <button
            type="button"
            onClick={onToggleFocusMode}
            aria-pressed={isFocusMode}
            aria-label={isFocusMode ? '關閉專注模式' : '開啟專注模式'}
            title={
              isFocusMode
                ? '專注模式已開啟（減少晃動與特效干擾）'
                : '開啟專注模式（減少動畫干擾）'
            }
            className={`flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-black transition ${
              isFocusMode
                ? 'border-indigo-300 bg-indigo-100 text-indigo-800 hover:bg-indigo-200/70'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Focus
              className={`h-4 w-4 ${isFocusMode ? 'text-indigo-700' : 'text-slate-500'}`}
            />
            <span className="hidden sm:inline">
              {isFocusMode ? '專注中' : '專注'}
            </span>
          </button>

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
