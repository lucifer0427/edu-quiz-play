import { BookCheck, Play, Trash2, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BUILTIN_STAGES } from '../data/quizzes';
import { SUBJECT_META, SUBJECT_ORDER } from '../data/subjects';
import type { PlayerProgress, Question, Stage, SubjectId } from '../types/quiz';
import { playTap } from '../utils/sound';
import { isSpeechSupported, speakText } from '../utils/speech';

interface WrongBookProps {
  progress: PlayerProgress;
  onRemoveWrongId: (questionId: string) => void;
  onStartWrongReview: (reviewStage: Stage) => void;
}

interface WrongQuestionItem {
  question: Question;
  subjectId: SubjectId;
  stageTitle?: string;
}

export function WrongBook({
  progress,
  onRemoveWrongId,
  onStartWrongReview,
}: WrongBookProps) {
  const speechAvailable = isSpeechSupported();
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | 'all'>('all');

  const wrongItems = useMemo(() => {
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

      items.push({
        question,
        subjectId: snap?.subjectId ?? fallback?.subjectId ?? 'custom',
        stageTitle: snap?.stageTitle ?? fallback?.stageTitle,
      });
    }
    return items;
  }, [
    progress.customStages,
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

  const handleStartReview = () => {
    if (filteredItems.length === 0) return;
    playTap();
    const reviewQuestions = filteredItems
      .slice(0, 10)
      .map((item) => item.question);
    const reviewSubjectId =
      effectiveFilter === 'all' ? 'custom' : effectiveFilter;
    const reviewStage: Stage = {
      id: 'wrong-review-stage',
      subjectId: reviewSubjectId,
      title:
        effectiveFilter === 'all'
          ? '錯題復仇特訓戰'
          : `${SUBJECT_META[effectiveFilter].shortName}錯題復仇戰`,
      description: '把曾經答錯的題目重新攻克，每題答對都能賺 15 金幣！',
      difficulty: 'medium',
      monsterId: 'bookSpirit',
      monsterName: '錯題大魔王',
      monsterHp: reviewQuestions.length * 20,
      questions: reviewQuestions,
    };
    onStartWrongReview(reviewStage);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">專屬錯題本</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            複習答錯過的題目是最快變強的方法！在特訓戰中答對會自動將題目從錯題本移除。
          </p>
        </div>
        {filteredItems.length > 0 && (
          <button
            type="button"
            onClick={handleStartReview}
            className="btn-3d inline-flex shrink-0 items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-base font-black text-white shadow-[0_4px_0_#be123c] hover:bg-rose-400"
          >
            <Play className="h-5 w-5 fill-white" />
            <span>
              啟動錯題複習戰 ({Math.min(filteredItems.length, 10)} 題)
            </span>
          </button>
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
          {filteredItems.map(({ question: q, subjectId, stageTitle }, idx) => {
            const meta = SUBJECT_META[subjectId];
            return (
              <div
                key={q.id}
                className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-xs"
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
                          )
                        }
                        className="rounded-xl bg-violet-50 p-2 text-violet-600 hover:bg-violet-100"
                        title="朗讀題目"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        onRemoveWrongId(q.id);
                      }}
                      className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-rose-100 hover:text-rose-600"
                      title="我已經會了，移除這題"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

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
