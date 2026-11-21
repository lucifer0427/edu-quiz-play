import { Check, Coins, Edit3, Lock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { HERO_AVATARS } from '../data/avatars';
import type { PlayerProgress } from '../types/quiz';
import { playTap, playUnlock } from '../utils/sound';
import { HeroSprite } from './GameSprites';

interface HeroShopProps {
  progress: PlayerProgress;
  onSelectAvatar: (avatarId: string) => void;
  onUnlockAvatar: (avatarId: string, price: number) => void;
  onUpdateNickname: (nickname: string) => void;
}

export function HeroShop({
  progress,
  onSelectAvatar,
  onUnlockAvatar,
  onUpdateNickname,
}: HeroShopProps) {
  const [nameInput, setNameInput] = useState(progress.nickname);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    playTap();
    onUpdateNickname(trimmed.slice(0, 12));
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              英雄基地與換裝商店
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              用答題賺來的金幣解鎖可愛新夥伴，還能自訂你的冒險者暱稱！
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-base font-black text-yellow-800">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span>目前金幣：{progress.coins}</span>
          </div>
        </div>

        <form
          onSubmit={handleSaveName}
          className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 p-3.5"
        >
          <label
            htmlFor="nickname-input"
            className="flex items-center gap-1.5 text-sm font-black text-slate-700"
          >
            <Edit3 className="h-4 w-4 text-amber-600" />
            <span>冒險者暱稱：</span>
          </label>
          <input
            id="nickname-input"
            type="text"
            maxLength={12}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="輸入你的名字"
            className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-amber-400 px-4 py-1.5 text-sm font-black text-slate-900 hover:bg-amber-300"
          >
            儲存暱稱
          </button>
          {savedNotice && (
            <span className="text-xs font-black text-emerald-600">
              ✓ 已更新暱稱！
            </span>
          )}
        </form>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HERO_AVATARS.map((hero) => {
          const isUnlocked = progress.unlockedAvatarIds.includes(hero.id);
          const isSelected = progress.selectedAvatarId === hero.id;
          const canAfford = progress.coins >= hero.price;

          return (
            <div
              key={hero.id}
              className={`flex flex-col justify-between rounded-3xl border-2 bg-white p-5 shadow-xs transition ${
                isSelected
                  ? `ring-4 ${hero.ringClass} border-transparent`
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div
                  className={`flex items-center justify-center rounded-2xl py-4 ${hero.bgClass}`}
                >
                  <HeroSprite
                    avatarId={hero.id}
                    size={96}
                    className={isSelected ? 'animate-bob' : ''}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <h3 className="text-xl font-black text-slate-800">
                    {hero.name}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                    {hero.title}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {hero.description}
                </p>
              </div>

              <div className="mt-5 pt-2">
                {isSelected ? (
                  <div className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-100 py-2.5 text-sm font-black text-emerald-700">
                    <Check className="h-4 w-4" />
                    <span>目前出戰中</span>
                  </div>
                ) : isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      onSelectAvatar(hero.id);
                    }}
                    className="btn-3d w-full rounded-2xl bg-sky-500 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#0369a1] hover:bg-sky-400"
                  >
                    換上這個角色
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      playUnlock();
                      onUnlockAvatar(hero.id, hero.price);
                    }}
                    className={`btn-3d flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-black ${
                      canAfford
                        ? 'bg-amber-400 text-slate-900 shadow-[0_3px_0_#d97706] hover:bg-amber-300'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                    }`}
                  >
                    {canAfford ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    <span>
                      {canAfford
                        ? `花費 ${hero.price} 金幣解鎖`
                        : `還差 ${hero.price - progress.coins} 金幣`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
