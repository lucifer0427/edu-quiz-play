import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Info,
  Lightbulb,
  Swords,
  Volume2,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { LessonScript } from '../types/lesson';
import type { Stage } from '../types/quiz';
import { playCorrect, playTap, playWrong } from '../utils/sound';
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech';
import { LessonDiagram } from './lesson-diagrams/LessonDiagram';
import { WorkedExampleSplit } from './WorkedExampleSplit';

const Spatial3DScene = lazy(
  () => import('./lesson-diagrams/Spatial3DScene'),
);

export interface LessonPlayerProps {
  lesson: LessonScript;
  stage: Stage;
  alreadyCompleted: boolean;
  focusMode?: boolean;
  speechSlowMode?: boolean;
  autoReadQuestion?: boolean;
  onToggleSpeechSlow?: () => void;
  onToggleAutoRead?: () => void;
  onCompleteAndStartQuiz: () => void;
  onCompleteAndExit: () => void;
  onExit: () => void;
}

export function LessonPlayer({
  lesson,
  stage,
  alreadyCompleted,
  speechSlowMode = false,
  autoReadQuestion = false,
  onToggleSpeechSlow,
  onToggleAutoRead,
  onCompleteAndStartQuiz,
  onCompleteAndExit,
  onExit,
}: LessonPlayerProps) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [warmupSelected, setWarmupSelected] = useState<number | null>(null);
  const [checkedChunks, setCheckedChunks] = useState<Record<string, boolean>>(
    {},
  );
  const speechAvailable = isSpeechSupported();

  const scenes = lesson.scenes;
  const currentScene = scenes[sceneIndex];
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex >= scenes.length - 1;
  const speechGrade = lesson.ageBand === 'AGE_6_8_LOWER' ? 2 : 5;

  useEffect(() => {
    setSceneIndex(0);
    setWarmupSelected(null);
    setCheckedChunks({});
    return () => {
      stopSpeech();
    };
  }, [lesson.lessonId]);

  useEffect(() => {
    if (!autoReadQuestion || !speechAvailable || !currentScene) return;
    speakText(currentScene.narrationText, 'zh-TW', {
      grade: speechGrade,
      slowMode: speechSlowMode,
    });
  }, [
    autoReadQuestion,
    currentScene,
    sceneIndex,
    speechAvailable,
    speechGrade,
    speechSlowMode,
  ]);

  if (!currentScene) return null;

  const progressPercent = Math.round(((sceneIndex + 1) / scenes.length) * 100);

  const handlePrev = () => {
    if (isFirst) return;
    playTap();
    stopSpeech();
    setWarmupSelected(null);
    setSceneIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (isLast) return;
    playTap();
    stopSpeech();
    setWarmupSelected(null);
    setSceneIndex((prev) => prev + 1);
  };

  const handleSelectWarmup = (idx: number) => {
    if (!currentScene.warmupCheck) return;
    setWarmupSelected(idx);
    if (idx === currentScene.warmupCheck.answerIndex) {
      playCorrect(1);
    } else {
      playWrong();
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3 shadow-xs">
        <button
          type="button"
          onClick={() => {
            playTap();
            stopSpeech();
            onExit();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回地圖</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black text-slate-700 sm:text-sm">
            第 {sceneIndex + 1} / {scenes.length} 幕
          </span>
          <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-100 sm:w-40">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {speechAvailable && (
            <>
              <button
                type="button"
                onClick={() => {
                  const speechContent =
                    currentScene.componentType === 'WORKED_EXAMPLE_SPLIT' &&
                    currentScene.workedExampleData?.problemStatement
                      ? `${currentScene.narrationText}。例題：${currentScene.workedExampleData.problemStatement}`
                      : currentScene.narrationText;
                  speakText(speechContent, 'zh-TW', {
                    grade: speechGrade,
                    slowMode: speechSlowMode,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 hover:bg-violet-100"
              >
                <Volume2 className="h-4 w-4" />
                <span>朗讀本幕</span>
              </button>
              {onToggleSpeechSlow && (
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onToggleSpeechSlow();
                  }}
                  aria-pressed={speechSlowMode}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-black transition ${
                    speechSlowMode
                      ? 'border-violet-300 bg-violet-100 text-violet-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {speechSlowMode ? '慢速' : '標準'}
                </button>
              )}
              {onToggleAutoRead && (
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onToggleAutoRead();
                  }}
                  aria-pressed={autoReadQuestion}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-black transition ${
                    autoReadQuestion
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {autoReadQuestion ? '自動朗讀中' : '自動朗讀'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <article className="space-y-5 rounded-3xl border-2 border-sky-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-black text-sky-800">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{stage.title} · 先學觀念微課程</span>
            </div>
            <h2 className="mt-1.5 text-xl font-black text-slate-800 sm:text-2xl">
              {currentScene.title}
            </h2>
          </div>

          {!alreadyCompleted && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
              讀完可領 +10 XP
            </span>
          )}
        </div>

        {currentScene.componentType === 'ANCHOR_SCENE' && (
          <div className="space-y-4">
            {currentScene.visualSpec && (
              <LessonDiagram
                key={currentScene.sceneId}
                spec={currentScene.visualSpec}
              />
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-relaxed font-bold text-slate-800 sm:text-base">
                {currentScene.narrationText}
              </p>
            </div>

            {currentScene.analogyAnchor && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs font-bold text-amber-900 sm:text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>生活類比：{currentScene.analogyAnchor}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-[11px] font-black text-slate-400">
                點擊重點卡可單獨朗讀並標記「我看懂了」：
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {currentScene.cognitiveChunks.map((chunk, idx) => {
                  const key = `${currentScene.sceneId}-${idx}`;
                  const checked = Boolean(checkedChunks[key]);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playTap();
                        setCheckedChunks((prev) => ({
                          ...prev,
                          [key]: !prev[key],
                        }));
                        if (speechAvailable) {
                          speakText(chunk, 'zh-TW', {
                            grade: speechGrade,
                            slowMode: speechSlowMode,
                          });
                        }
                      }}
                      aria-pressed={checked}
                      className={`flex items-start justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-black transition sm:text-sm ${
                        checked
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-sky-200 bg-sky-50/70 text-sky-900 hover:bg-sky-100/70'
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            checked ? 'text-emerald-600' : 'text-sky-600'
                          }`}
                        />
                        <span>{chunk}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-black opacity-80">
                        {checked ? '✓ 懂了' : '點讀'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentScene.componentType === 'WORKED_EXAMPLE_SPLIT' && (
          <div className="space-y-4">
            {currentScene.visualSpec && (
              <LessonDiagram
                key={currentScene.sceneId}
                spec={currentScene.visualSpec}
              />
            )}

            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed font-bold text-slate-800">
              {currentScene.narrationText}
            </p>

            {currentScene.workedExampleData && (
              <WorkedExampleSplit
                data={currentScene.workedExampleData}
                title="正反示範對比（看懂步驟與常見陷阱）"
              />
            )}

            <div className="flex flex-wrap gap-2">
              {currentScene.cognitiveChunks.map((chunk, idx) => {
                const key = `${currentScene.sceneId}-we-${idx}`;
                const checked = Boolean(checkedChunks[key]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTap();
                      setCheckedChunks((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }));
                      if (speechAvailable) {
                        speakText(chunk, 'zh-TW', {
                          grade: speechGrade,
                          slowMode: speechSlowMode,
                        });
                      }
                    }}
                    aria-pressed={checked}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                      checked
                        ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    {checked ? '✓ 已懂：' : '✓ '}
                    {chunk}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentScene.componentType === 'TOPIC_SIGNAL_BOX' && (
          <div className="space-y-4 rounded-2xl border-2 border-indigo-300 bg-indigo-50/60 p-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">
              <Info className="h-3.5 w-3.5" />
              <span>
                延伸補充（非核心考點）
                {currentScene.topicSignalTitle
                  ? ` · ${currentScene.topicSignalTitle}`
                  : ''}
              </span>
            </div>

            <p className="text-sm leading-relaxed font-bold text-slate-800 sm:text-base">
              {currentScene.narrationText}
            </p>

            <ul className="space-y-2">
              {currentScene.cognitiveChunks.map((chunk, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-950 sm:text-sm"
                >
                  • {chunk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {currentScene.componentType === 'SPATIAL_3D_SCENE' && (
          <div className="space-y-4">
            {currentScene.spatial3dSpec && (
              <Suspense
                fallback={
                  <div className="flex h-72 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-black text-slate-500">
                    正在載入 3D 空間互動模型...
                  </div>
                }
              >
                <Spatial3DScene spec={currentScene.spatial3dSpec} />
              </Suspense>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-relaxed font-bold text-slate-800 sm:text-base">
                {currentScene.narrationText}
              </p>
            </div>

            {currentScene.analogyAnchor && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs font-bold text-amber-900 sm:text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>生活類比：{currentScene.analogyAnchor}</span>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {currentScene.cognitiveChunks.map((chunk, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-xs font-black text-sky-900 sm:text-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{chunk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentScene.componentType === 'WARMUP_CHECK' && (
          <div className="space-y-4">
            {currentScene.visualSpec && (
              <LessonDiagram
                key={currentScene.sceneId}
                spec={currentScene.visualSpec}
              />
            )}

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs font-black text-emerald-900 sm:text-sm">
              🎯 進場前零扣血暖身確認：{currentScene.narrationText}
            </div>

            {currentScene.warmupCheck && (
              <div className="space-y-3 rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-4">
                <div className="text-base font-black text-slate-800 sm:text-lg">
                  {currentScene.warmupCheck.prompt}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {currentScene.warmupCheck.options.map((opt, idx) => {
                    const isPicked = warmupSelected === idx;
                    const isRight =
                      idx === currentScene.warmupCheck!.answerIndex;
                    let cls =
                      'border-slate-200 bg-white text-slate-800 hover:bg-amber-50';
                    if (isPicked) {
                      cls = isRight
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-rose-400 bg-rose-500 text-white';
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectWarmup(idx)}
                        className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-black transition ${cls}`}
                      >
                        {idx + 1}. {opt}
                      </button>
                    );
                  })}
                </div>

                {warmupSelected !== null && (
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold sm:text-sm ${
                      warmupSelected === currentScene.warmupCheck.answerIndex
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-rose-300 bg-rose-50 text-rose-900'
                    }`}
                  >
                    {warmupSelected === currentScene.warmupCheck.answerIndex
                      ? `✅ ${currentScene.warmupCheck.feedbackCorrect}`
                      : `💡 再想想看：${currentScene.warmupCheck.feedbackRetry}`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={isFirst}
            onClick={handlePrev}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>上一幕</span>
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-3d inline-flex items-center gap-1.5 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#0284c7] hover:bg-sky-400"
            >
              <span>下一幕</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  stopSpeech();
                  onCompleteAndExit();
                }}
                className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                完成並返回地圖
              </button>
              <button
                type="button"
                onClick={() => {
                  playTap();
                  stopSpeech();
                  onCompleteAndStartQuiz();
                }}
                className="btn-3d inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-900 shadow-[0_4px_0_#d97706] hover:bg-amber-300 sm:text-base"
              >
                <Swords className="h-5 w-5" />
                <span>完成學習，進入實戰驗證！</span>
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export default LessonPlayer;
