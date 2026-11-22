# EduQuiz Play — 實證記憶策略與認知防禦升級計畫

> 依據來源：NotebookLM《學童記憶策略實證白皮書》（《學童課程記憶實證策略》、《AI 賦能學習與認知防禦調研》、《AI驅動Remotion教育影片架構調研》）
> 適用對象：國小 1–6 年級（6–12 歲），兼容現有 115-s1/115-s2 共 116 份題庫包與 90 個數學動態出題器
> 建立日期：2026-11-22
> 執行進度：Phase 0–4 全部已完成 ✅（`schemaVersion: 3` + `ts-fsrs` 6.0.0 + 數學交錯與鷹架 + 圖文雙重編碼／減壓／語速 + PWA 與本機多檔匯入還原）

---

## 一、 核心目標與設計原則

在不破壞現有遊戲化體驗與 `npm run build`（`sync:curriculum` + `test:generators` + `tsc`）驗證管線的前提下，將白皮書的核心實證機制落地至目前架構：

1. **阻斷錯誤記憶固著**：答錯後不能只看解析就跳過，必須在回合內完成「理解後遮蔽再提取」。
2. **以 FSRS 取代「答對一次即刪除」**：建立跨日／跨週（Day 1 → Day 3–4 → Day 7 → Day 21–30）遺忘曲線排程，取代單純靜態錯題列表。
3. **分科與分齡認知護欄**：
   - **數學科**：導入「1 新 + 2 舊」交錯練習（Interleaving）與答錯降階示範提示（Worked Example）。
   - **語文科（國語／英語／閩南語／客語）**：嚴格維持同單元分塊（Blocking），禁止跨單元混排。
   - **低年級（G1–G2，6–8 歲）**：降低外在認知負荷，支援「專注模式」（移除待機晃動與彩帶干擾）與圖文緊鄰呈現。
4. **向後相容**：所有資料欄位擴充皆採 optional（`?`），確保現有 `src/data/curriculum/packs/` 內的 1,980 題與 `validate:content` 規則完全相容。

---

## 二、 階段性實作藍圖

### Phase 0：回合內「即時糾錯＋強制再提取」與「專注模式」（已完成 ✅）

**目標**：解決答錯只看解析就跳下一題造成的「錯誤記憶固著」，並提供低干擾選項防範「誘惑細節效應」。

#### 1. 回合內錯題強制再提取（[BattleArena.tsx](../src/components/BattleArena.tsx)）
- **現況問題**：`handleSelectOption` 答錯後直接展開 `explanation`，點「下一題」即結束該題，未要求重新提取。
- **改造設計**：
  - 新增回合狀態 `retryQueue: Question[]` 與 `retriedIds: Set<string>`。
  - 當學童答錯時：
    1. 顯示 `explanation` 並給予提示：「看懂解析了嗎？這題等一下還會再考一次喔！」
    2. 將該題推入 `retryQueue`（若為 `isDynamicStage(stage)` 數學動態題，可選擇同構重新生成一題或原題重考，避免死記選項位置）。
    3. 在間隔 **1–2 題** 後（或主題列結束後）從 `retryQueue` 取出重測；該題需在重測答對後才算真正通關（或結算時標記「已完成即時修復」）。
  - **可選進階**：在解析展開後設定短暫閱讀鎖定（例如 1.5–2 秒或提供「我懂了，繼續」按鈕），防止連點直接跳過解析。

#### 2. 低干擾「專注模式（Focus Mode）」（[storage.ts](../src/utils/storage.ts)、[BattleArena.tsx](../src/components/BattleArena.tsx)、[Navbar.tsx](../src/components/Navbar.tsx)）
- **現況問題**：持續晃動的 `animate-bob` 勇者／怪物、飄浮傷害字 `floatingDmg`、`canvas-confetti` 彩帶對低工作記憶學童容易造成誘惑細節干擾（保留 `d = -0.30`、遷移 `d = -0.48`）。
- **改造設計**：
  - 在 `PlayerProgress`（[quiz.ts](../src/types/quiz.ts)）新增 `focusMode?: boolean`（預設可為 `false`，G1–G2 首次進入可建議開啟）。
  - 開啟 `focusMode` 時：
    - 停用 `animate-bob`、`animate-shake`、飄浮傷害數字與勝利 `confetti()`。
    - 保留核心「進度條、愛心血量、即時對錯色塊與解析面板」（符合 2025 ADHD RCT 認可的安全激勵邊界）。

---

### Phase 1：錯題本升級為「FSRS 自適應間隔複習引擎」（已完成 ✅）

**目標**：淘汰「復仇戰答對一次就從 `wrongQuestionIds` 刪除」的短期記憶錯覺，建立真正的長期保留排程。

#### 1. 套件與資料結構擴充（[quiz.ts](../src/types/quiz.ts)、[storage.ts](../src/utils/storage.ts)）
- 引入輕量 TypeScript FSRS 套件 `ts-fsrs`（純前端計算、無後端依賴）。
- 在 `PlayerProgress` 新增：
  ```ts
  export interface FsrsCardState {
    questionId: string;
    stability: number;     // 記憶穩定性（天）
    difficulty: number;    // 難度係數
    dueAt: string;         // ISO 時間戳：下次應複習時間
    lastReviewedAt: string;
    reps: number;
    lapses: number;
    state: 'new' | 'learning' | 'review' | 'relearning';
  }
  ```
  - 新增 `fsrsCards?: Record<string, FsrsCardState>`（並在 `schemaVersion` 升至 `3` 時於 `loadProgress` 自動遷移舊 `wrongQuestionIds`）。

#### 2. 複習評級與到期佇列（[WrongBook.tsx](../src/components/WrongBook.tsx)、[BattleArena.tsx](../src/components/BattleArena.tsx)）
- **答題表現自動轉換 FSRS Rating**（降低兒童手動自評負擔）：
  - **Again（忘記）**：答錯。
  - **Hard（困難）**：開啟 `hint` 後才答對，或作答耗時過長（例如 > 15 秒）。
  - **Good（良好）**：無提示且正常時間內答對。
  - **Easy（熟練）**：連續兩次以上複習皆快速無提示答對。
- **錯題本介面改版（[WrongBook.tsx](../src/components/WrongBook.tsx)）**：
  - 頂部顯示「**今日到期複習（Due Today）**」與「尚未到期（已排程鞏固中）」數量。
  - **微回合切塊（Micro-Quiz Cap ≤ 5 題）**：即使到期複習累積較多，每次「今日複習戰」最多切出 **5 題**（`.slice(0, 5)`），防止長佇列造成兒童疲勞棄坑。
  - **熟練度成長隱喻（隱藏冷冰冰的天數）**：兒童端不顯示「下次複習：12 天後」，改依 `stability` 轉譯為視覺進度（`🌱 剛學會` → `🌿 穩固中` → `🌳 長期記憶大師`）。
  - 復仇戰答對後**不再直接刪除**，而是更新 `dueAt`（例如推遲至 1 天 → 3 天 → 7 天 → 21 天後）；只有當 `stability >= 21` 且連續正確達標時，標記為「已長期掌握（Mastered）」並可選擇歸檔。

---

### Phase 2：數學科「1 新 + 2 舊」交錯練習與分科護欄（已完成 ✅）

**目標**：解決數學單元獨立刷題在學年底累積評量衰減至 `+0.04 SD` 的問題，同時嚴守語文科不可混排的認知邊界。

#### 1. 數學交錯生成器（[registry.ts](../src/utils/generators/registry.ts)、[BattleArena.tsx](../src/components/BattleArena.tsx)）
- **觸發條件**：僅限 `stage.subjectId === 'math'` 且 `stage.isDynamicMath === true`。
- **實作邏輯**：
  - 依 `stage.curriculum`（`grade`、`semester`、`unitNo`）從 `registry.ts` 找出同年級前 1–3 個已註冊的數學單元生成器。
  - 在「複習模式」或單元熟練後（例如該關卡已拿過 2 星以上），自動組裝 **「4 題當前單元新題 + 2 題前單元易混淆舊題」** 的交錯題組（`interleavingOriginTag: 'CURRENT_UNIT' | 'PREVIOUS_UNIT_REVIEW'`）。
  - **絕對護欄**：語文科（`mandarin`、`english`、`minnan`、`hakka`）嚴禁啟用跨單元混排，維持同單元分塊練習。

#### 2. 數學示範題（Worked Examples）降階鷹架與三層提示
- 當學童在同一數學單元連續答錯 2 題時，於解析面板或題目上方展開「**步驟對比卡**」（正確 3–4 步驟拆解 vs. 常見錯誤陷阱），並維持步驟小卡可見後再出下一題同構題，待答對後撤除提示。
- **三層漸進提示（Hint Hierarchy）**：將單純文字提示升級為漸進展開：Level 1（高亮題幹關鍵字）→ Level 2（引導思考提問）→ Level 3（自動填入第一步示範）。

---

### Phase 3：圖文雙重編碼（SVG / `imageUrl`）與低年級語音／鷹架優化（已完成 ✅）

**目標**：補強目前 `Question.imageUrl` 未渲染的缺口，落實外部空間緊鄰圖解（`d = 1.39`）與低年級高成功率校準（75%–87%）。

#### 1. 作答區圖文緊鄰渲染（[BattleArena.tsx](../src/components/BattleArena.tsx)、[quiz.ts](../src/types/quiz.ts)）
- 在 `BattleArena.tsx` 的題幹區支援渲染 `currentQuestion.imageUrl`（純淨白底、高對比、不加裝飾邊框）。
- 可選擴充 `visualDiagram?: { type: string; params: Record<string, unknown> }`，針對分數、周長面積、時鐘、角度等數學／自然題型直接渲染程式化純淨 SVG（標籤緊貼圖形錨點，避免圖文分離）。

#### 2. 低年級（G1–G2）高成功率選項校準
- **相容策略**：`validate:content` 目前強制 JSON 題庫包為 4 選項；因此無須改動既有 1,980 題格式，可在 `BattleArena.tsx` 執行期針對 `grade <= 2` 或「初學／連錯降階模式」提供「**50/50 減壓按鈕**」或預設排除 1 個干擾選項（呈現 3 選 1 高區辨選項），將低年級初始提取成功率維持在 **75%–87%** 安全區間。

#### 3. 語音輔助強化（[speech.ts](../src/utils/speech.ts)）
- 針對 G1–G2 將中文預設語速由 `0.95` 微調至更清晰的 `0.85`（符合白皮書 0.80–0.90 建議區間），並提供語速切換（標準 / 慢速）。
- 若未來導入預錄音檔（`Question.audioUrl`），優先播放 `audioUrl` 並保留 `speechSynthesis` 作為備援。

### Phase 4：居家個人平板本機進度保護（零後端方案）（已完成 ✅）

**目標**：針對家中學童固定使用個人平板的情境，在不架設後端資料庫的前提下，防止 `localStorage` 被 iOS Safari 自動清除或換平板時遺失 FSRS 記憶排程。

1. **PWA「加入主畫面」支援**：
   - 新增 `public/manifest.webmanifest` 與基礎離線快取，並於 iPad/Android 瀏覽器首次開啟時提供輕量「加入主畫面」提示，避開 iPadOS Safari 7 天未開啟清除本機資料的風險，同時獲得全螢幕無網址列體驗。
2. **進度「匯入還原」功能（[storage.ts](../src/utils/storage.ts)）**：
   - 現有 `exportProgressJson()` 已支援下載 JSON 備份；補上對應的 `importProgressJson()`（含結構校驗與版本遷移），讓家長在更換平板時可一鍵還原全部 FSRS 記憶卡片與關卡星星。
3. **本機多學童切換檔（Local Profiles，可選）**：
   - 若家中有多位學童共用同一台平板，於 `localStorage` 支援建立與切換多個本機檔案（如「哥哥」、「妹妹」），確保各自的 `fsrsCards` 與 `completedLessonIds` 互不干擾。

---

## 三、 驗證與品質關卡（Release Gate）

每個 Phase 完成後，必須通過以下既有與新增驗證：

1. **現有管線全過**：
   - `npm run validate:content`（確保題庫包格式、ID 唯一性與課綱對齊不中斷）
   - `npm run test:generators`（確保 90 個數學動態生成器與新增交錯組裝無異常）
   - `npm run build`（`tsc --noEmit` + `vite build` 零錯誤）
2. **新增單元／邏輯檢查**：
   - **FSRS 遷移測試**：舊版 `localStorage`（`schemaVersion: 2` 僅含 `wrongQuestionIds`）載入後不遺失錯題且正確初始化 `fsrsCards`。
   - **分科護欄檢查**：確認語文科關卡不會被注入跨單元舊題；數學交錯題組維持 `CURRENT_UNIT` 與 `PREVIOUS_UNIT_REVIEW` 比例正確。
   - **低干擾檢查**：開啟 `focusMode` 後確認無 `confetti` 與待機晃動動畫觸發。

---

## 四、 建議執行順序

| 優先序 | 項目 | 預估改動範圍 | 預期教學效益 | 狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Phase 0：回合內錯題再提取 + 專注模式 | `BattleArena.tsx`、`quiz.ts`、`storage.ts`、`Navbar.tsx` | 立即阻斷錯誤記憶固著與誘惑細節干擾 | **已完成 ✅** |
| **2** | Phase 1：錯題本接入 `ts-fsrs` 排程 | `package.json`、`fsrs.ts`、`storage.ts`、`WrongBook.tsx`、`BattleArena.tsx`、`App.tsx`、`WorldMap.tsx`、`test-fsrs.mjs` | 建立真實跨日／跨週長期記憶鞏固 | **已完成 ✅** |
| **3** | Phase 2：數學「1 新 + 2 舊」交錯練習 + 示範對比卡 + 三層提示 | `quiz.ts`、`registry.ts`、`workedExample.ts`、`WorkedExampleSplit.tsx`、`BattleArena.tsx`、`App.tsx`、`test-interleaving.mjs` | 防止跨學期累積測驗記憶衰減 | **已完成 ✅** |
| **4** | Phase 3：`imageUrl`/SVG 圖解 + 低年級 3 選 1 鷹架 + 語速調整 | `quiz.ts`、`QuestionVisual.tsx`、`workedExample.ts`、`speech.ts`、`BattleArena.tsx`、`WrongBook.tsx`、`test-phase3-4.mjs` | 強化雙重編碼與低年級 75%–87% 成功率校準 | **已完成 ✅** |
| **5** | Phase 4：PWA + JSON 匯入還原 + 本機多檔切換 | `public/manifest.webmanifest`、`public/sw.js`、`public/icon.svg`、`index.html`、`main.tsx`、`progressImport.ts`、`storage.ts`、`Navbar.tsx`、`TeacherPanel.tsx`、`App.tsx` | 防止 iPad 清除本機紀錄，支援無痛換機搬家 | **已完成 ✅** |
