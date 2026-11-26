import { Plus, Sparkles, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import type { Grade, LocalProfileMeta } from '../types/quiz';
import { playTap } from '../utils/sound';
import { HeroSprite } from './GameSprites';

interface ProfileSelectorModalProps {
  open: boolean;
  profiles: LocalProfileMeta[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (nickname: string, defaultGrade?: Grade) => void;
  onClose: () => void;
}

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];

export function ProfileSelectorModal({
  open,
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onClose,
}: ProfileSelectorModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<Grade>(2);

  if (!open) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;
    playTap();
    onCreateProfile(trimmed, grade);
    setNickname('');
    setShowAddForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border-4 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 sm:text-2xl">
                今天誰要學習？
              </h2>
              <p className="text-xs font-medium text-slate-500">
                點選自己的頭像，自動載入專屬年級與學習進度
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTap();
              onClose();
            }}
            aria-label="關閉選擇學習者"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  playTap();
                  onSelectProfile(profile.id);
                  onClose();
                }}
                className={`flex items-center gap-4 rounded-2xl border-3 p-4 text-left transition active:scale-[0.98] ${
                  isActive
                    ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40'
                }`}
              >
                <HeroSprite
                  avatarId={profile.selectedAvatarId}
                  className="h-16 w-16 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-lg font-black text-slate-800">
                      {profile.nickname}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        <UserCheck className="h-3 w-3" />
                        目前
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {profile.defaultGrade ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          profile.defaultGrade <= 2
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {profile.defaultGrade} 年級專屬
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                        自由年級
                      </span>
                    )}
                    {profile.defaultGrade && profile.defaultGrade <= 2 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                        自動朗讀
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {!showAddForm ? (
            <button
              type="button"
              onClick={() => {
                playTap();
                setShowAddForm(true);
              }}
              className="flex min-h-[96px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm font-extrabold text-slate-600 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
            >
              <Plus className="h-5 w-5" />
              新增孩子學習檔案
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border-2 border-amber-300 bg-white p-4 shadow-sm sm:col-span-2"
            >
              <div className="mb-2 text-sm font-black text-slate-800">
                建立新學習檔案
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={12}
                  placeholder="輸入暱稱（例如：弟弟、姊姊）"
                  className="flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 focus:border-amber-400 focus:outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    綁定年級：
                  </span>
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`h-8 w-8 rounded-lg text-xs font-black transition ${
                        grade === g
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600"
                  >
                    建立並進入
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
                  >
                    取消
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileSelectorModal;
