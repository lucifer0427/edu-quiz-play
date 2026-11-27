import { RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type { Grade, Question } from '../../types/quiz';
import {
  SPEED_TARGET_SCORE,
  TARGET_VERSUS_SCORE,
  type DuoMode,
  type PlayerState,
  type SpeedRoundState,
} from './duoTypes';

interface DuoSplitPanelProps {
  who: 'A' | 'B';
  duoMode: DuoMode;
  playerName: string;
  playerGrade: Grade;
  state: PlayerState;
  question: Question | null;
  flipTop: boolean;
  onAnswer: (who: 'A' | 'B', optIdx: number) => void;
}

export function DuoSplitPanel({
  who,
  duoMode,
  playerName,
  playerGrade,
  state,
  question,
  flipTop,
  onAnswer,
}: DuoSplitPanelProps) {
  const isA = who === 'A';
  const themeBg = isA
    ? 'border-sky-300 bg-gradient-to-b from-sky-50 to-white'
    : 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-white';

  return (
    <div
      data-testid={`duo-panel-${who}`}
      className={`flex flex-1 flex-col justify-between rounded-3xl border-3 p-4 shadow-sm ${themeBg} ${
        isA && flipTop ? 'rotate-180' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black text-white ${
              isA ? 'bg-sky-600' : 'bg-emerald-600'
            }`}
          >
            {playerName} · {playerGrade}年級
          </span>
          {state.combo >= 2 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
              {state.combo} 連擊
            </span>
          )}
        </div>
        <div className="text-sm font-black text-slate-700">
          得分：{state.score}
          {duoMode === 'versus' ? ` / ${TARGET_VERSUS_SCORE}` : ''}
        </div>
      </div>

      {question ? (
        <div>
          <div className="mb-3 rounded-2xl bg-white/90 px-4 py-3 text-base font-black text-slate-800 shadow-inner sm:text-lg">
            {question.prompt}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((opt, idx) => {
              let btnCls =
                'border-slate-200 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-50';
              if (state.feedback !== null) {
                if (idx === question.answerIndex) {
                  btnCls = 'border-emerald-500 bg-emerald-100 text-emerald-900';
                } else {
                  btnCls = 'border-slate-200 bg-slate-100 text-slate-400';
                }
              }
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={state.feedback !== null}
                  onClick={() => onAnswer(who, idx)}
                  className={`rounded-2xl border-2 px-3 py-3 text-left text-sm font-extrabold transition active:scale-[0.98] sm:text-base ${btnCls}`}
                >
                  <span className="mr-1.5 inline-block font-black text-slate-400">
                    {['A', 'B', 'C', 'D'][idx]}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-sm font-bold text-slate-400">
          載入題目中...
        </div>
      )}
    </div>
  );
}

interface DuoSpeedBuzzPanelProps {
  who: 'A' | 'B';
  playerName: string;
  score: number;
  combo: number;
  question: Question | undefined;
  speedState: SpeedRoundState;
  flipTop: boolean;
  onBuzzAnswer: (who: 'A' | 'B', optIdx: number) => void;
}

export function DuoSpeedBuzzPanel({
  who,
  playerName,
  score,
  combo,
  question,
  speedState,
  flipTop,
  onBuzzAnswer,
}: DuoSpeedBuzzPanelProps) {
  const isA = who === 'A';
  const isLocked = isA ? speedState.lockedA : speedState.lockedB;
  const isRoundDone = speedState.winnerThisRound !== null;
  const keys = isA ? ['1', '2', '3', '4'] : ['7', '8', '9', '0'];

  return (
    <div
      data-testid={`speed-panel-${who}`}
      className={`flex flex-1 flex-col justify-between rounded-3xl border-3 p-4 shadow-sm ${
        isA
          ? 'border-sky-300 bg-gradient-to-b from-sky-50 to-white'
          : 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-white'
      } ${isA && flipTop ? 'rotate-180' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black text-white ${
              isA ? 'bg-sky-600' : 'bg-emerald-600'
            }`}
          >
            {playerName}
          </span>
          {combo >= 2 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
              {combo} 連擊
            </span>
          )}
          {isLocked && !isRoundDone && (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-700">
              本題鎖定
            </span>
          )}
        </div>
        <div className="text-sm font-black text-slate-700">
          積分：{score} / {SPEED_TARGET_SCORE}
        </div>
      </div>

      {question && (
        <div>
          <div className="mb-2.5 rounded-2xl bg-white/95 px-4 py-2.5 text-sm font-black text-slate-800 shadow-inner sm:text-base">
            {question.prompt}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((opt, idx) => {
              let btnCls =
                'border-slate-200 bg-white text-slate-800 hover:border-violet-400 hover:bg-violet-50';
              if (isRoundDone) {
                if (idx === question.answerIndex) {
                  btnCls = 'border-emerald-500 bg-emerald-100 text-emerald-900';
                } else {
                  btnCls = 'border-slate-200 bg-slate-100 text-slate-400';
                }
              } else if (isLocked) {
                btnCls = 'border-slate-200 bg-slate-100 text-slate-400 opacity-60';
              }
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isLocked || isRoundDone}
                  onClick={() => onBuzzAnswer(who, idx)}
                  className={`rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-extrabold transition active:scale-[0.97] ${btnCls}`}
                >
                  <span className="mr-1.5 inline-flex items-center gap-1 font-black text-slate-400">
                    {['A', 'B', 'C', 'D'][idx]}.
                    <span className="hidden text-[10px] font-bold text-slate-300 md:inline">
                      [{keys[idx]}]
                    </span>
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface DuoFinishedCardProps {
  duoMode: DuoMode;
  nameA: string;
  nameB: string;
  gradeA: Grade;
  gradeB: Grade;
  scoreA: number;
  scoreB: number;
  onReplay: () => void;
  onClose: () => void;
}

export function DuoFinishedCard({
  duoMode,
  nameA,
  nameB,
  gradeA,
  gradeB,
  scoreA,
  scoreB,
  onReplay,
  onClose,
}: DuoFinishedCardProps) {
  return (
    <div className="mx-auto my-auto w-full max-w-md rounded-3xl border-4 border-amber-300 bg-white p-6 text-center shadow-lg">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-500">
        <Trophy className="h-9 w-9" />
      </div>
      <h2 className="text-2xl font-black text-slate-800">
        {duoMode === 'coop'
          ? '雙人合作打敗大魔王！'
          : scoreA === scoreB
            ? '勢均力敵！平手！'
            : scoreA > scoreB
              ? `恭喜 ${nameA} 獲勝！`
              : `恭喜 ${nameB} 獲勝！`}
      </h2>
      <p className="mt-2 text-sm font-bold text-slate-600">
        {nameA}（{gradeA}年級）{scoreA} 分 · {nameB}（{gradeB}年級）{scoreB} 分
      </p>
      <div className="my-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-black text-amber-800">
        <Sparkles className="h-4 w-4" />
        已為目前帳號加上 +
        {duoMode === 'coop' ? 40 : duoMode === 'speed' ? 50 : 30} 金幣！
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-amber-500 py-3 text-sm font-black text-white hover:bg-amber-600"
        >
          <RotateCcw className="h-4 w-4" />
          再玩一局
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
        >
          返回地圖
        </button>
      </div>
    </div>
  );
}
