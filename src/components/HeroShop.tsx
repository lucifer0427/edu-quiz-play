import {
  Award,
  Check,
  Coins,
  Edit3,
  Gift,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { HERO_AVATARS } from '../data/avatars';
import type { FamilyRewardItem, PlayerProgress } from '../types/quiz';
import { DEFAULT_FAMILY_REWARDS, evaluateBadges } from '../utils/badges';
import { playTap, playUnlock } from '../utils/sound';
import { HeroSprite } from './GameSprites';
import { ParentGateModal } from './ParentGateModal';

interface HeroShopProps {
  progress: PlayerProgress;
  onSelectAvatar: (avatarId: string) => void;
  onUnlockAvatar: (avatarId: string, price: number) => void;
  onUpdateNickname: (nickname: string) => void;
  onRedeemFamilyReward?: (reward: FamilyRewardItem) => void;
  onMarkRewardUsed?: (redeemedId: string) => void;
  onUpdateFamilyRewards?: (rewards: FamilyRewardItem[]) => void;
  onUpdateParentPin?: (pin: string | undefined) => void;
}

export function HeroShop({
  progress,
  onSelectAvatar,
  onUnlockAvatar,
  onUpdateNickname,
  onRedeemFamilyReward,
  onMarkRewardUsed,
  onUpdateFamilyRewards,
  onUpdateParentPin,
}: HeroShopProps) {
  const [nameInput, setNameInput] = useState(progress.nickname);
  const [savedNotice, setSavedNotice] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(150);
  const [parentModeUnlocked, setParentModeUnlocked] = useState(false);
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [pinInput, setPinInput] = useState(progress.parentPin ?? '');
  const [pinSaved, setPinSaved] = useState(false);

  const badges = useMemo(() => evaluateBadges(progress), [progress]);
  const unlockedBadgeCount = badges.filter((b) => b.unlocked).length;
  const familyRewards = progress.familyRewards ?? DEFAULT_FAMILY_REWARDS;
  const redeemedRewards = progress.redeemedRewards ?? [];

  useEffect(() => {
    setNameInput(progress.nickname);
    setParentModeUnlocked(false);
  }, [progress.nickname]);

  useEffect(() => {
    setPinInput(progress.parentPin ?? '');
  }, [progress.parentPin]);

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

      {/* 努力導向成就徽章牆 */}
      <section className="space-y-4 rounded-3xl border-2 border-violet-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-violet-600" />
            <div>
              <h3 className="text-xl font-black text-slate-800">
                冒險成就徽章牆（累積努力就有獎！）
              </h3>
              <p className="text-xs font-medium text-slate-500">
                不用考滿分也能收集！完成微課程、手寫練字、修復錯題或連續打卡即可解鎖
              </p>
            </div>
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
            已解鎖 {unlockedBadgeCount} / {badges.length}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex flex-col justify-between rounded-2xl border-2 p-3.5 transition ${
                badge.unlocked
                  ? 'border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-2xs'
                  : 'border-slate-200 bg-slate-50/70 opacity-85'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{badge.emoji}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      badge.unlocked
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {badge.unlocked ? '✓ 已獲得' : `+${badge.rewardCoins} 幣`}
                  </span>
                </div>
                <div className="mt-2 text-sm font-black text-slate-800">
                  {badge.title}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug font-medium text-slate-500">
                  {badge.description}
                </p>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] font-black text-slate-500">
                  <span>進度</span>
                  <span>
                    {badge.current} / {badge.target}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      badge.unlocked ? 'bg-emerald-500' : 'bg-violet-400'
                    }`}
                    style={{ width: `${badge.percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 家長自訂家庭實體獎勵兌換券 */}
      {onRedeemFamilyReward && (
        <section className="space-y-4 rounded-3xl border-2 border-emerald-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-emerald-600" />
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  家庭獎勵兌換券（家長自訂實體獎勵）
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  把答題存到的金幣，換成真實生活中的小確幸！兌換後可請爸爸媽媽驗證核銷
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playTap();
                if (parentModeUnlocked) {
                  setParentModeUnlocked(false);
                } else {
                  setParentGateOpen(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                parentModeUnlocked
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {parentModeUnlocked ? (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  <span>家長模式已解鎖（點擊鎖定）</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>🔒 家長管理鎖</span>
                </>
              )}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {familyRewards.map((reward) => {
              const canRedeem = progress.coins >= reward.costCoins;
              return (
                <div
                  key={reward.id}
                  className="flex flex-col justify-between rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{reward.emoji}</span>
                      <span className="text-sm font-black text-slate-800">
                        {reward.title}
                      </span>
                    </div>
                    {parentModeUnlocked &&
                      onUpdateFamilyRewards &&
                      familyRewards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            playTap();
                            onUpdateFamilyRewards(
                              familyRewards.filter((r) => r.id !== reward.id),
                            );
                          }}
                          aria-label={`刪除 ${reward.title}`}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                  </div>
                  <button
                    type="button"
                    disabled={!canRedeem}
                    onClick={() => {
                      playUnlock();
                      onRedeemFamilyReward(reward);
                    }}
                    className={`btn-3d mt-3 w-full rounded-xl py-2 text-xs font-black ${
                      canRedeem
                        ? 'bg-emerald-500 text-white shadow-[0_3px_0_#047857] hover:bg-emerald-400'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                    }`}
                  >
                    {canRedeem
                      ? `花費 ${reward.costCoins} 金幣兌換`
                      : `需要 ${reward.costCoins} 金幣（還差 ${reward.costCoins - progress.coins}）`}
                  </button>
                </div>
              );
            })}
          </div>

          {parentModeUnlocked && onUpdateFamilyRewards && (
            <div className="space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = newRewardTitle.trim();
                  if (!trimmed) return;
                  playTap();
                  onUpdateFamilyRewards([
                    ...familyRewards,
                    {
                      id: `reward-${Date.now()}`,
                      title: trimmed.slice(0, 30),
                      costCoins: Math.max(10, Math.min(9999, newRewardCost)),
                      emoji: '🎁',
                    },
                  ]);
                  setNewRewardTitle('');
                }}
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs"
              >
                <span className="font-black text-slate-600">
                  家長新增獎勵：
                </span>
                <input
                  type="text"
                  value={newRewardTitle}
                  onChange={(e) => setNewRewardTitle(e.target.value)}
                  placeholder="例如：週末去吃冰淇淋"
                  className="w-48 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-800 focus:border-emerald-400 focus:outline-none"
                />
                <input
                  type="number"
                  min={10}
                  max={9999}
                  step={10}
                  value={newRewardCost}
                  onChange={(e) => setNewRewardCost(Number(e.target.value) || 100)}
                  className="w-24 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-800 focus:border-emerald-400 focus:outline-none"
                />
                <span className="font-bold text-slate-500">金幣</span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 font-black text-white hover:bg-emerald-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>新增</span>
                </button>
              </form>

              {onUpdateParentPin && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cleaned = pinInput.trim();
                    if (cleaned !== '' && !/^\d{4}$/.test(cleaned)) return;
                    playTap();
                    onUpdateParentPin(cleaned === '' ? undefined : cleaned);
                    setPinSaved(true);
                    window.setTimeout(() => setPinSaved(false), 1800);
                  }}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs"
                >
                  <span className="font-black text-slate-600">
                    設定 4 碼家長密碼（選填，留空則用成人乘法題）：
                  </span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4 碼數字"
                    className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-800 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-700 px-3 py-1.5 font-black text-white hover:bg-slate-600"
                  >
                    儲存密碼
                  </button>
                  {pinSaved && (
                    <span className="font-black text-emerald-600">✓ 已儲存</span>
                  )}
                </form>
              )}
            </div>
          )}

          {redeemedRewards.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="text-xs font-black text-slate-600">
                🎟️ 已兌換的獎勵券（共 {redeemedRewards.length} 張）
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {redeemedRewards.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                      item.used
                        ? 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <div className="font-bold">
                      {item.emoji} {item.title}
                      <span className="ml-1.5 text-[10px] opacity-75">
                        ({new Date(item.redeemedAt).toLocaleDateString('zh-TW')})
                      </span>
                    </div>
                    {!item.used && onMarkRewardUsed && (
                      <button
                        type="button"
                        onClick={() => {
                          playTap();
                          if (!parentModeUnlocked) {
                            setParentGateOpen(true);
                            return;
                          }
                          onMarkRewardUsed(item.id);
                        }}
                        className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-emerald-700 shadow-2xs hover:bg-emerald-50"
                      >
                        {parentModeUnlocked ? '家長核銷 ✓' : '🔒 解鎖核銷'}
                      </button>
                    )}
                    {item.used && (
                      <span className="shrink-0 text-[10px] font-black">
                        已核銷
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <ParentGateModal
        open={parentGateOpen}
        savedPin={progress.parentPin}
        onSuccess={() => {
          setParentGateOpen(false);
          setParentModeUnlocked(true);
        }}
        onClose={() => setParentGateOpen(false)}
      />
    </div>
  );
}

export default HeroShop;
