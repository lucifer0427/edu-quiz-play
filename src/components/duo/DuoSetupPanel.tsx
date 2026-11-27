import { Shield, Swords, Zap } from 'lucide-react';
import type { Grade, LocalProfileMeta } from '../../types/quiz';
import { playTap } from '../../utils/sound';
import {
  DUO_GRADES,
  DUO_SUBJECT_OPTIONS,
  type DuoMode,
  type DuoSubject,
} from './duoTypes';

interface DuoSetupPanelProps {
  profiles: LocalProfileMeta[];
  duoMode: DuoMode;
  subject: DuoSubject;
  flipTop: boolean;
  gradeA: Grade;
  gradeB: Grade;
  nameA: string;
  nameB: string;
  loading: boolean;
  onChangeMode: (mode: DuoMode) => void;
  onChangeSubject: (subject: DuoSubject) => void;
  onChangeFlipTop: (flip: boolean) => void;
  onChangeGradeA: (grade: Grade) => void;
  onChangeGradeB: (grade: Grade) => void;
  onChangeNameA: (name: string) => void;
  onChangeNameB: (name: string) => void;
  onStart: () => void;
}

export function DuoSetupPanel({
  profiles,
  duoMode,
  subject,
  flipTop,
  gradeA,
  gradeB,
  nameA,
  nameB,
  loading,
  onChangeMode,
  onChangeSubject,
  onChangeFlipTop,
  onChangeGradeA,
  onChangeGradeB,
  onChangeNameA,
  onChangeNameB,
  onStart,
}: DuoSetupPanelProps) {
  return (
    <div className="mx-auto my-auto w-full max-w-3xl rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-center text-2xl font-black text-slate-800">
        雙人對戰模式
      </h2>
      <p className="mt-1 text-center text-xs font-medium text-slate-500">
        支援 1–6 年級全科目與動態數學出題，同一台平板就能同樂競技！
      </p>

      {/* 3 Mode cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            playTap();
            onChangeMode('coop');
          }}
          className={`rounded-2xl border-3 p-3.5 text-left transition ${
            duoMode === 'coop'
              ? 'border-amber-400 bg-amber-50 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Shield className="h-5 w-5 text-emerald-600" />
            合作打魔王
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            各答各年級題目，協力扣大魔王血量，共享 +40 金幣！
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            playTap();
            onChangeMode('versus');
          }}
          className={`rounded-2xl border-3 p-3.5 text-left transition ${
            duoMode === 'versus'
              ? 'border-amber-400 bg-amber-50 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Swords className="h-5 w-5 text-rose-500" />
            公平競速賽
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            跨年級各自解題，先答對 5 題者獲勝，共享 +30 金幣！
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            playTap();
            onChangeMode('speed');
          }}
          className={`rounded-2xl border-3 p-3.5 text-left transition ${
            duoMode === 'speed'
              ? 'border-violet-500 bg-violet-50 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Zap className="h-5 w-5 text-violet-600" />
            同題即時搶答
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            12 秒限時搶答同一題！答對 +2 分、答錯 -1 分，共享 +50 金幣！
          </p>
        </button>
      </div>

      {/* Players config */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-3.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-black text-sky-700">
              上方玩家（玩家 A）
            </span>
            {profiles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profiles.slice(0, 3).map((pf) => (
                  <button
                    key={`a-${pf.id}`}
                    type="button"
                    onClick={() => {
                      onChangeNameA(pf.nickname);
                      if (pf.defaultGrade) onChangeGradeA(pf.defaultGrade);
                    }}
                    className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-sky-700 shadow-xs hover:bg-sky-100"
                  >
                    {pf.nickname}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={nameA}
            onChange={(e) => onChangeNameA(e.target.value)}
            maxLength={10}
            aria-label="玩家 A 暱稱"
            className="mb-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-800"
          />
          <div className="flex items-center gap-1">
            {DUO_GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChangeGradeA(g)}
                className={`h-8 flex-1 rounded-lg text-xs font-black ${
                  gradeA === g
                    ? 'bg-sky-600 text-white'
                    : 'bg-white text-slate-600'
                }`}
              >
                {g}年
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-3.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-black text-emerald-700">
              下方玩家（玩家 B）
            </span>
            {profiles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profiles.slice(0, 3).map((pf) => (
                  <button
                    key={`b-${pf.id}`}
                    type="button"
                    onClick={() => {
                      onChangeNameB(pf.nickname);
                      if (pf.defaultGrade) onChangeGradeB(pf.defaultGrade);
                    }}
                    className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-xs hover:bg-emerald-100"
                  >
                    {pf.nickname}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={nameB}
            onChange={(e) => onChangeNameB(e.target.value)}
            maxLength={10}
            aria-label="玩家 B 暱稱"
            className="mb-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-800"
          />
          <div className="flex items-center gap-1">
            {DUO_GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChangeGradeB(g)}
                className={`h-8 flex-1 rounded-lg text-xs font-black ${
                  gradeB === g
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600'
                }`}
              >
                {g}年
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subject picker */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black text-slate-600">對戰科目：</span>
          {DUO_SUBJECT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeSubject(opt.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                subject === opt.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={flipTop}
            onChange={(e) => onChangeFlipTop(e.target.checked)}
            className="h-4 w-4 rounded accent-violet-600"
          />
          平板放桌面面對面玩（旋轉上方畫面）
        </label>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onStart}
        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-base font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
      >
        {loading
          ? '正在準備對戰題庫...'
          : duoMode === 'speed'
            ? '開始即時搶答賽！'
            : '開始雙人對戰！'}
      </button>
    </div>
  );
}
