import {
  Check,
  Download,
  FileSpreadsheet,
  Link2,
  Play,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import type { Difficulty, MonsterId, PlayerProgress, Stage } from '../types/quiz';
import {
  downloadCsvTemplate,
  parseCsvQuestions,
  parseJsonQuestions,
} from '../utils/csvParser';
import { playTap, playUnlock } from '../utils/sound';
import {
  encodeCustomStageToHash,
  exportProgressJson,
  parseImportedProgressJson,
} from '../utils/storage';

interface TeacherPanelProps {
  progress: PlayerProgress;
  onAddCustomStage: (stage: Stage) => void;
  onDeleteCustomStage: (stageId: string) => void;
  onImportProgress: (imported: PlayerProgress) => void;
  onStartStage: (stage: Stage) => void;
}

const MONSTER_CHOICES: Array<{ id: MonsterId; label: string }> = [
  { id: 'slime', label: '知識史萊姆' },
  { id: 'mathCube', label: '魔方守衛' },
  { id: 'bookSpirit', label: '成語書靈' },
  { id: 'parrotKing', label: '英語鸚鵡王' },
  { id: 'treeGuardian', label: '森林樹精' },
  { id: 'flameDragon', label: '小火龍' },
];

export function TeacherPanel({
  progress,
  onAddCustomStage,
  onDeleteCustomStage,
  onImportProgress,
  onStartStage,
}: TeacherPanelProps) {
  const [title, setTitle] = useState('本週班級挑戰賽');
  const [description, setDescription] = useState(
    '老師準備的專屬練習題庫，加油拿三顆星！',
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [monsterId, setMonsterId] = useState<MonsterId>('slime');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    messages: string[];
  } | null>(null);
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleImportProgressFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedProgressJson(text);
      if (!parsed.ok) {
        setImportFeedback({ type: 'error', message: parsed.error });
        return;
      }
      onImportProgress(parsed.progress);
      playUnlock();
      setImportFeedback({
        type: 'success',
        message: `已成功還原「${parsed.progress.nickname}」的學習紀錄（XP ${parsed.progress.xp}、錯題排程 ${parsed.progress.wrongQuestionIds.length} 題）！`,
      });
    } catch {
      setImportFeedback({
        type: 'error',
        message: '讀取備份檔案失敗，請重試一次。',
      });
    }
  };

  const createStageFromQuestions = (
    questions: Stage['questions'],
    sourceLabel: string,
  ) => {
    const monsterMeta =
      MONSTER_CHOICES.find((m) => m.id === monsterId) ?? MONSTER_CHOICES[0];
    const newStage: Stage = {
      id: `custom-${Date.now()}`,
      subjectId: 'custom',
      title: title.trim() || `${sourceLabel} 測驗`,
      description: description.trim() || '老師自訂測驗關卡',
      difficulty,
      monsterId,
      monsterName: monsterMeta.label,
      monsterHp: Math.max(100, questions.length * 20),
      questions,
    };
    onAddCustomStage(newStage);
    playUnlock();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith('.json');
    const result = isJson ? parseJsonQuestions(text) : parseCsvQuestions(text);

    if (result.questions.length === 0) {
      setFeedback({
        type: 'error',
        messages:
          result.errors.length > 0
            ? result.errors
            : ['沒有讀到有效的題目，請檢查檔案格式。'],
      });
      return;
    }

    createStageFromQuestions(result.questions, file.name);
    setFeedback({
      type: 'success',
      messages: [
        `成功匯入 ${result.questions.length} 題並建立新關卡！`,
        ...result.errors.slice(0, 3),
      ],
    });
  };

  const handleImportSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = sheetUrl.trim();
    if (!trimmed) return;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      setFeedback({
        type: 'error',
        messages: ['請輸入有效的 https:// 網址。'],
      });
      return;
    }

    if (parsedUrl.protocol !== 'https:') {
      setFeedback({
        type: 'error',
        messages: ['基於安全考量，僅支援 https:// 開頭的公開 CSV 連結。'],
      });
      return;
    }

    if (
      parsedUrl.hostname === 'docs.google.com' &&
      parsedUrl.pathname.includes('/spreadsheets/') &&
      parsedUrl.pathname.includes('/edit') &&
      !parsedUrl.search.includes('output=csv') &&
      !parsedUrl.search.includes('format=csv')
    ) {
      setFeedback({
        type: 'error',
        messages: [
          '這是試算表「編輯」網址，無法直接讀取。請點選 Google 試算表的「檔案 → 共用 → 發布到網路」，格式選「逗號分隔值 (.csv)」後再複製連結！',
        ],
      });
      return;
    }

    setLoadingSheet(true);
    setFeedback(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const csvText = await response.text();
      const result = parseCsvQuestions(csvText);

      if (result.questions.length === 0) {
        setFeedback({
          type: 'error',
          messages:
            result.errors.length > 0
              ? result.errors
              : ['抓不到有效題目，請確認 Google Sheets 已選擇「發佈到網路 → CSV」。'],
        });
      } else {
        createStageFromQuestions(result.questions, 'Google Sheets');
        setFeedback({
          type: 'success',
          messages: [
            `從 Google Sheets 成功匯入 ${result.questions.length} 題！`,
          ],
        });
      }
    } catch (err) {
      const isAbort =
        err instanceof DOMException && err.name === 'AbortError';
      setFeedback({
        type: 'error',
        messages: [
          isAbort
            ? '連線逾時（超過 10 秒），請檢查網路狀態或確認連結是否可公開存取。'
            : '無法讀取此連結。請確認在 Google 試算表使用「檔案 → 共用 → 發布到網路」並選取「逗號分隔值 (.csv)」。',
        ],
      });
    } finally {
      window.clearTimeout(timeoutId);
      setLoadingSheet(false);
    }
  };

  const handleCopyShareUrl = async (stage: Stage) => {
    playTap();
    const hash = encodeCustomStageToHash(stage);
    const shareUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(stage.id);
      window.setTimeout(() => setCopiedId(null), 2200);
      if (shareUrl.length > 4000) {
        setFeedback({
          type: 'success',
          messages: [
            `已複製分享連結（長度 ${shareUrl.length} 字元）。提醒：題數較多時部分通訊軟體可能會截斷超長網址，建議改用 JSON 檔傳送給學生。`,
          ],
        });
      }
    } catch {
      window.prompt('請複製下方分享連結傳給學生：', shareUrl);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              老師與家長出題專區（零後端免帳號）
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              支援上傳 CSV / JSON 題庫或貼上 Google 試算表公開 CSV 連結，還能一鍵產生專屬分享網址給學生作答！
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                playTap();
                downloadCsvTemplate();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" />
              <span>下載 CSV 題庫範本</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTap();
                exportProgressJson(progress);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-black text-sky-700 hover:bg-sky-100"
            >
              <Download className="h-4 w-4" />
              <span>匯出學習紀錄 JSON</span>
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100">
              <Upload className="h-4 w-4" />
              <span>匯入還原 JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportProgressFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {importFeedback && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-2.5 text-xs font-bold sm:text-sm ${
              importFeedback.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-rose-300 bg-rose-50 text-rose-800'
            }`}
          >
            {importFeedback.message}
          </div>
        )}

        <div className="mt-6 grid gap-4 rounded-2xl bg-amber-50/80 p-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-black text-slate-700">
              關卡名稱
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">
              關卡說明
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">
              難度標籤
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            >
              <option value="easy">基礎冒險 (Easy)</option>
              <option value="medium">進階挑戰 (Medium)</option>
              <option value="hard">魔王試煉 (Hard)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">
              守關怪獸
            </label>
            <select
              value={monsterId}
              onChange={(e) => setMonsterId(e.target.value as MonsterId)}
              className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            >
              {MONSTER_CHOICES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-6 text-center transition hover:bg-sky-50">
            <Upload className="h-8 w-8 text-sky-500" />
            <span className="mt-2 text-base font-black text-slate-800">
              上傳 CSV 或 JSON 題庫檔
            </span>
            <span className="mt-1 text-xs font-medium text-slate-500">
              欄位格式：題目, 選項A, 選項B, 選項C, 選項D, 答案(1-4或A-D), 解析, 提示
            </span>
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <form
            onSubmit={handleImportSheet}
            className="flex flex-col justify-between rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5"
          >
            <div>
              <div className="flex items-center gap-2 text-base font-black text-slate-800">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span>串接 Google Sheets 公開 CSV</span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">
                在 Google 試算表點選「檔案 → 共用 → 發布到網路」，格式選「逗號分隔值 (.csv)」，將網址貼到下方：
              </p>
              <input
                type="url"
                required
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className="mt-3 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
              />
            </div>
            <button
              type="submit"
              disabled={loadingSheet}
              className="btn-3d mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#047857] hover:bg-emerald-400 disabled:opacity-60"
            >
              <Link2 className="h-4 w-4" />
              <span>{loadingSheet ? '讀取試算表中...' : '即時匯入題庫'}</span>
            </button>
          </form>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
              feedback.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-rose-300 bg-rose-50 text-rose-800'
            }`}
          >
            {feedback.messages.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-xl font-black text-slate-800">
          已建立的自訂關卡 ({progress.customStages.length})
        </h3>
        {progress.customStages.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-slate-500">
            目前還沒有自訂關卡。上傳上方的 CSV 範本或貼上 Google Sheets 連結即可立刻建立！
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {progress.customStages.map((stage) => (
              <div
                key={stage.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
              >
                <div>
                  <div className="text-lg font-black text-slate-800">
                    {stage.title}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    {stage.questions.length} 題 · {stage.description}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyShareUrl(stage)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-50"
                  >
                    {copiedId === stage.id ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>已複製分享連結！</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        <span>複製分享連結</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      onStartStage(stage);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-slate-900 hover:bg-amber-300"
                  >
                    <Play className="h-3.5 w-3.5 fill-slate-900" />
                    <span>試玩</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      onDeleteCustomStage(stage.id);
                    }}
                    className="rounded-xl bg-white p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="刪除關卡"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
