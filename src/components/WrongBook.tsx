import {
  Archive,
  BookCheck,
  Clock,
  Play,
  Sprout,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { BUILTIN_STAGES } from '../data/quizzes';
import { SUBJECT_META, SUBJECT_ORDER } from '../data/subjects';
import type {
  FsrsCardState,
  PlayerProgress,
  Question,
  Stage,
  SubjectId,
} from '../types/quiz';
import {
  getMasteryStage,
  isCardDue,
  isCardMastered,
  type MasteryStageInfo,
} from '../utils/fsrs';
import { playTap } from '../utils/sound';
import { isSpeechSupported, speakText } from '../utils/speech';
import { QuestionVisual } from './QuestionVisual';

interface WrongBookProps {
  progress: PlayerProgress;
  onRemoveWrongId: (questionId: string) => void;
  onStartWrongReview: (reviewStage: Stage) => void;
}

interface WrongQuestionItem {
  question: Question;
  subjectId: SubjectId;
  stageTitle?: string;
  card?: FsrsCardState;
  isDue: boolean;
  isMastered: boolean;
  mastery: MasteryStageInfo;
  dueTimestamp: number;
}

const MICRO_QUIZ_CAP = 5;

export function WrongBook({
  progress,
  onRemoveWrongId,
  onStartWrongReview,
}: WrongBookProps) {
  const speechAvailable = isSpeechSupported();
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | 'all'>('all');

  const wrongItems = useMemo(() => {
    const now = new Date();
    const fallbackLookup = new Map<
      string,
      { question: Question; subjectId: SubjectId; stageTitle: string }
    >();
    [...BUILTIN_STAGES, ...progress.customStages].forEach((stage) => {
      stage.questions.forEach((q) => {
        fallbackLookup.set(q.id, {
          question: q,
          subjectId: stage.subjectId,
          stageTitle: stage.title,
        });
      });
    });

    const items: WrongQuestionItem[] = [];
    for (const id of progress.wrongQuestionIds) {
      const snap = progress.wrongQuestionSnapshots?.[id];
      const fallback = fallbackLookup.get(id);
      const question = snap ?? fallback?.question;
      if (!question) continue;

      const card = progress.fsrsCards?.[id];
      const due = isCardDue(card, now);
      const mastered = isCardMastered(card);
      const parsedDue = card ? new Date(card.dueAt).getTime() : 0;

      items.push({
        question,
        subjectId: snap?.subjectId ?? fallback?.subjectId ?? 'custom',
        stageTitle: snap?.stageTitle ?? fallback?.stageTitle,
        card,
        isDue: due,
        isMastered: mastered,
        mastery: getMasteryStage(card),
        dueTimestamp: Number.isNaN(parsedDue) ? 0 : parsedDue,
      });
    }

    items.sort((a, b) => {
      if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
      return a.dueTimestamp - b.dueTimestamp;
    });

    return items;
  }, [
    progress.customStages,
    progress.fsrsCards,
    progress.wrongQuestionIds,
    progress.wrongQuestionSnapshots,
  ]);

  const subjectCounts = useMemo(() => {
    const counts = new Map<SubjectId, number>();
    for (const item of wrongItems) {
      counts.set(item.subjectId, (counts.get(item.subjectId) ?? 0) + 1);
    }
    return counts;
  }, [wrongItems]);

  const availableSubjects = useMemo(
    () => SUBJECT_ORDER.filter((id) => subjectCounts.has(id)),
    [subjectCounts],
  );

  const effectiveFilter: SubjectId | 'all' =
    subjectFilter === 'all' || subjectCounts.has(subjectFilter)
      ? subjectFilter
      : 'all';

  const filteredItems = useMemo(
    () =>
      effectiveFilter === 'all'
        ? wrongItems
        : wrongItems.filter((item) => item.subjectId === effectiveFilter),
    [effectiveFilter, wrongItems],
  );

  const dueFilteredItems = useMemo(
    () => filteredItems.filter((item) => item.isDue),
    [filteredItems],
  );

  const totalDueCount = useMemo(
    () => wrongItems.filter((item) => item.isDue).length,
    [wrongItems],
  );
  const totalScheduledCount = wrongItems.length - totalDueCount;
  const totalMasteredCount = useMemo(
    () => wrongItems.filter((item) => item.isMastered).length,
    [wrongItems],
  );
  const gardenCounts = useMemo(() => {
    let seeds = 0;
    let sprouts = 0;
    let trees = 0;
    for (const item of wrongItems) {
      if (item.mastery.level === 'mastered') trees++;
      else if (item.mastery.level === 'growing') sprouts++;
      else seeds++;
    }
    return { seeds, sprouts, trees };
  }, [wrongItems]);

  const launchReview = (sourceItems: WrongQuestionItem[], earlyPractice: boolean) => {
    if (sourceItems.length === 0) return;
    playTap();
    const reviewQuestions = sourceItems
      .slice(0, MICRO_QUIZ_CAP)
      .map((item) => item.question);
    const reviewSubjectId =
      effectiveFilter === 'all' ? 'custom' : effectiveFilter;
    const prefix = earlyPractice ? '提前鞏固' : '今日複習';
    const reviewStage: Stage = {
      id: 'wrong-review-stage',
      subjectId: reviewSubjectId,
      title:
        effectiveFilter === 'all'
          ? `${prefix}特訓戰`
          : `${SUBJECT_META[effectiveFilter].shortName}${prefix}戰`,
      description:
        '每次精選最多 5 題高效率回想，答對後記憶樹會自動成長並延長複習間隔！',
      difficulty: 'medium',
      monsterId: 'bookSpirit',
      monsterName: '遺忘曲線魔王',
      monsterHp: reviewQuestions.length * 20,
      questions: reviewQuestions,
    };
    onStartWrongReview(reviewStage);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <section className="space-y-4 rounded-3xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              記憶樹錯題本（FSRS 排程）
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              答對不會立刻消失，而是依記憶曲線跨日鞏固。每次微複習最多{' '}
              {MICRO_QUIZ_CAP} 題，輕鬆把錯題種成長期記憶大樹！
            </p>
          </div>

          {dueFilteredItems.length > 0 ? (
            <button
              type="button"
              onClick={() => launchReview(dueFilteredItems, false)}
              className="btn-3d inline-flex shrink-0 items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-base font-black text-white shadow-[0_4px_0_#be123c] hover:bg-rose-400"
            >
              <Play className="h-5 w-5 fill-white" />
              <span>
                啟動今日複習戰 ({Math.min(dueFilteredItems.length, MICRO_QUIZ_CAP)}{' '}
                題)
              </span>
            </button>
          ) : (
            filteredItems.length > 0 && (
              <button
                type="button"
                onClick={() => launchReview(filteredItems, true)}
                className="btn-3d inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-emerald-400 bg-white px-4 py-2.5 text-sm font-black text-emerald-800 shadow-[0_3px_0_#34d399] hover:bg-emerald-50"
              >
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                <span>
                  提前練習 ({Math.min(filteredItems.length, MICRO_QUIZ_CAP)}{' '}
                  題 · 今日已達標)
                </span>
              </button>
            )
          )}
        </div>

        {wrongItems.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-2xl border border-rose-200 bg-white/90 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <Clock className="h-3.5 w-3.5" />
                <span>今日到期複習</span>
              </div>
              <div className="mt-0.5 text-xl font-black text-rose-600">
                {totalDueCount} 題
              </div>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-white/90 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
                <Sprout className="h-3.5 w-3.5" />
                <span>尚未到期（鞏固中）</span>
              </div>
              <div className="mt-0.5 text-xl font-black text-teal-700">
                {totalScheduledCount} 題
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/90 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Archive className="h-3.5 w-3.5" />
                <span>🌳 已長期掌握</span>
              </div>
              <div className="mt-0.5 text-xl font-black text-emerald-700">
                {totalMasteredCount} 題
              </div>
            </div>
          </div>
        )}
        {wrongItems.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-black text-emerald-900">
                🏡 我的知識花園（每答對一次複習，就幫小樹澆水！）
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black">
                <span className="text-amber-800">🌱 種子 {gardenCounts.seeds}</span>
                <span className="text-emerald-700">🌿 嫩芽 {gardenCounts.sprouts}</span>
                <span className="text-green-800">🌳 大樹 {gardenCounts.trees}</span>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 rounded-xl bg-white/80 p-2.5 text-xl">
              {Array.from({ length: Math.min(12, gardenCounts.trees) }).map((_, i) => (
                <span key={`t-${i}`} title="長期記憶大樹">🌳</span>
              ))}
              {Array.from({ length: Math.min(12, gardenCounts.sprouts) }).map((_, i) => (
                <span key={`s-${i}`} title="穩固成長嫩芽">🌿</span>
              ))}
              {Array.from({ length: Math.min(12, gardenCounts.seeds) }).map((_, i) => (
                <span key={`g-${i}`} title="剛播下的種子">🌱</span>
              ))}
              {wrongItems.length > 36 && (
                <span className="self-center text-xs font-black text-slate-500">
                  ⋯等共 {wrongItems.length} 株
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {availableSubjects.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
          <button
            type="button"
            onClick={() => {
              playTap();
              setSubjectFilter('all');
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
              effectiveFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部錯題 ({wrongItems.length})
          </button>
          {availableSubjects.map((subjectId) => {
            const meta = SUBJECT_META[subjectId];
            const isSelected = effectiveFilter === subjectId;
            return (
              <button
                key={subjectId}
                type="button"
                onClick={() => {
                  playTap();
                  setSubjectFilter(subjectId);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                  isSelected
                    ? `${meta.iconBgClass} text-white`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {meta.shortName} ({subjectCounts.get(subjectId) ?? 0})
              </button>
            );
          })}
        </div>
      )}

      {wrongItems.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-emerald-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <BookCheck className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-800">
            太棒了！目前沒有任何錯題
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            繼續去「冒險地圖」挑戰新的關卡吧！
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, idx) => {
            const { question: q, subjectId, stageTitle, isDue, isMastered, mastery } =
              item;
            const meta = SUBJECT_META[subjectId];
            return (
              <div
                key={q.id}
                className={`rounded-3xl border-2 bg-white p-5 shadow-xs ${
                  isDue ? 'border-rose-200' : 'border-slate-200'
                }`}
              >
                <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${meta.badgeClass}`}
                  >
                    {meta.shortName}
                  </span>
                  {stageTitle && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      {stageTitle}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-black ${mastery.badgeClass}`}
                  >
                    {mastery.emoji} {mastery.label}
                  </span>
                  {isDue ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-700">
                      ⏰ 今日待複習
                    </span>
                  ) : (
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700">
                      ⏳ 鞏固排程中
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-xs font-black text-rose-700">
                      {idx + 1}
                    </span>
                    <h3 className="text-lg font-black text-slate-800">
                      {q.prompt}
                    </h3>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {speechAvailable && (
                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            q.speechText || q.prompt,
                            q.speechLang || 'zh-TW',
                            { audioUrl: q.audioUrl },
                          )
                        }
                        className="rounded-xl bg-violet-50 p-2 text-violet-600 hover:bg-violet-100"
                        title="朗讀題目"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    )}
                    {isMastered ? (
                      <button
                        type="button"
                        onClick={() => {
                          playTap();
                          onRemoveWrongId(q.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-100"
                        title="已長期掌握，歸檔移出錯題本"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>歸檔掌握</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          playTap();
                          onRemoveWrongId(q.id);
                        }}
                        className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-rose-100 hover:text-rose-600"
                        title="暫時移出錯題本"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <QuestionVisual question={q} />

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = oIdx === q.answerIndex;
                    return (
                      <div
                        key={oIdx}
                        className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                          isCorrect
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {isCorrect ? '✓ ' : ''}
                        {opt}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-900">
                  <span className="font-black">小老師解析：</span>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
