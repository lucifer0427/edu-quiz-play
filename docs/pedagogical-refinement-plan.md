# EduQuiz Play — 教育品質與評量精準度精進計畫

> 定位：以學習科學、評量學與台灣國小 108 課綱教學現場需求為核心，針對現行系統進行精準度與適齡化升級
> 關聯文件：[實證記憶策略與認知防禦升級計畫](./cognitive-memory-upgrade-plan.md)、[課程教學模組實作計畫](./lesson-module-plan.md)
> 建立日期：2026-11-24
> 狀態：Phase 1–4 全部已完成 ✅

---

## 一、 計畫目標

在現行 116 份課綱題庫包（650 關、5,200 題）與 2,399 幕微課程的既有基礎上，進一步消除評量效度干擾（Construct-Irrelevant Variance）、強化提取練習真實性，並將課綱知識點數據轉化為親師生皆可讀的診斷回饋：

1. **評量模式與遊戲淘汰機制脫鉤**：確保模擬考（診斷性評量）與 FSRS 錯題複習戰能完整收集作答樣本，不因連錯 3 題中斷。
2. **杜絕回合內重測的位置記憶**：對靜態重測題洗牌選項順序、對動態數學題優先重出同構題，確保真正達成語意提取。
3. **降低低年級（G1–G2）識字與認知門檻**：補齊自動朗讀導讀與低干擾專注模式引導。
4. **課綱標籤（`tags`）診斷視覺化**：將現有 108 課綱指標與 `fsrsCards` 穩定度彙整為家長與老師易讀的單元強弱項報告。
5. **健康化遊戲激勵機制**：保護連續學習動機並引導有效練習，降低純刷簡單關卡賺金幣的誘因。

---

## 二、 分階段實作藍圖

### Phase 1：評量完整度與提取真實性修復（高優先序）

**目標**：修正現行戰鬥規則對「診斷評量」與「錯題再提取」造成的效度干擾。

#### 1. 模擬考與錯題複習戰解除「3 顆愛心淘汰制」（`src/components/BattleArena.tsx`）
- **現況問題**：`mock-exam`（10–20 題）與 `wrong-review` 目前與一般關卡共用 `hearts = 3` 歸零即中止戰鬥的邏輯，導致學童前 3 題失誤就無法完成後半段診斷或更新剩餘到期 FSRS 卡片。
- **改造設計**：
  - 在 `BattleArena.tsx` 依 `effectiveBattleMode` 區分生命值規則：
    - `stage`（一般闖關）：維持 3 顆愛心 RPG 挑戰制。
    - `mock-exam` 與 `wrong-review`：改為「完整作答不中斷」模式（UI 隱藏淘汰倒數或改顯示「作答進度與即時正確率」），答錯仍扣分／標記錯題與顯示解析，但必須完整走完全部題目才進入 `BattleSummary`。
  - 在 `BattleSummary.tsx` 針對 `mock-exam` 呈現完整正確率與待補強單元列表，不因中途淘汰而缺失數據。

#### 2. 回合內錯題重測「選項洗牌／同構重出」（`src/components/BattleArena.tsx`、`src/utils/generators/registry.ts`）
- **現況問題**：靜態題目答錯插回 `currentIndex + 3` 時選項順序不變，學童容易靠「記位置（例如剛才選 A 錯、正解是 C）」直接作答。
- **改造設計**：
  - 新增純函式 `shuffleQuestionOptions(question: Question): Question`，於題目插入 `retryQueue` 時重新隨機排列 `options` 並同步更新 `answerIndex`（維持原 `id` 以便對應 FSRS 與 `repairedIds`）。
  - 若為 `isDynamicStage(stage)` 動態數學題，插入重測時可呼叫單題同構生成（不同數字、相同知識點），保留原 `originId` 追蹤修復狀態。

---

### Phase 2：低年級（G1–G2）無障礙與認知保護強化

**目標**：讓剛入學或識字量尚不足的低年級學童能獨立使用，同時確保認知護欄預設保護到目標族群。

#### 1. 進題自動語音導讀開關（`src/types/quiz.ts`、`src/utils/storage.ts`、`src/components/BattleArena.tsx`、`src/components/LessonPlayer.tsx`）
- 在 `PlayerProgress` 新增 optional 欄位 `autoReadQuestion?: boolean`。
- 切換至 `grade <= 2` 或於設定開啟時，進入新題目或切換微課程幕數自動呼叫 `speakText(...)`（沿用低年級預設 `0.85` 語速，並於切換／離開／作答時自動 `stopSpeech()`）。
- 於 `BattleArena` 與 `LessonPlayer` 頂部工具列提供一鍵靜音／關閉自動導讀切換，兼顧教室安靜環境與居家自學情境。

#### 2. 低年級「專注模式」與「慢速語音」智慧引導（`src/components/WorldMap.tsx`、`src/types/quiz.ts`）
- 在 `PlayerProgress` 新增 optional 欄位 `lowerGradeNudgeDismissed?: boolean`。
- 當使用者首次選擇 `grade <= 2` 且 `focusMode` 尚未開啟時，顯示輕量提示橫幅：「一年級／二年級推薦開啟『專注模式』與『慢速朗讀』，減少畫面晃動更專心！」，提供「一鍵開啟」與「先不用」按鈕。

---

### Phase 3：課綱知識點（`tags`）診斷與親師可視化

**目標**：把題庫內既有的 108 課綱學習表現代碼與 `fsrsCards` 數據轉化為可行動的學習洞察。

#### 1. 知識點掌握度聚合引擎（新增 `src/utils/learningDiagnostics.ts`）
- 讀取 `PlayerProgress.fsrsCards`、`stageStars`、`wrongQuestionIds` 與已載入科目之 `QuizPack` 題目 `tags`：
  - 計算各單元與主要知識點標籤的「已掌握數 / 鞏固中數 / 待加強數」。
  - 產出結構化摘要供前端渲染，完全純前端運算、無需後端資料庫。

#### 2. 考前複習與學習診斷卡（`src/components/ExamReview.tsx`、`src/components/WrongBook.tsx`、`src/components/TeacherPanel.tsx`）
- 在 `ExamReview.tsx` 新增「知識點強弱項雷達／摘要條」，讓家長與學生在考前一眼看出各單元熟練度。
- 新增可列印（`@media print` 友善排版）的「本週／期中學習診斷單」，標示已穩固能力與建議優先複習的 1–3 個單元，補足現行 `TeacherPanel` 僅有原始 JSON 匯出的不足。

---

### Phase 4：學習動機平衡與防刷分保護

**目標**：維護長期學習的內在動機，避免極端懲罰或無效刷分。

#### 1. 連續學習天數「彈性保護」（`src/utils/dailyStudy.ts`、`src/types/quiz.ts`）
- 在 `PlayerProgress` 新增 optional 欄位 `streakGraceUsedWeek?: string`（紀錄本週是否已使用過 1 次免歸零保護）。
- 若距離 `lastStudyDate` 僅中斷 1 天（例如週末出遊或生病），且當週尚未使用保護，維持 `streakDays` 不歸零並顯示暖心提醒，減少「一斷就棄坑」的心理挫折。

#### 2. 關卡重複挑戰獎勵引導（`src/components/BattleArena.tsx`、`src/App.tsx`）
- 若一般關卡（`stage`）先前已達成 `3 星`（`previousStars === 3`）且非數學交錯複習模式，再次挑戰僅給予基礎探索金幣（例如 `30%` 倍率），並在關卡說明或結算時溫和引導：「這關已經滿星畢業囉！挑戰新關卡或『今日 FSRS 複習戰』可獲得完整雙倍金幣與經驗值！」

---

## 三、 驗證與品質關卡（Release Gate）

每個 Phase 完成後，必須通過以下檢查：

1. **自動化測試與建置全過**：
   - `npm run validate:content`（116 份題庫包與微課程雙層護欄零錯誤）
   - `npm run test:fsrs`、`npm run test:interleaving`、`npm run test:daily-study`、`npm run test:ui`
   - `npm run build`（`tsc --noEmit` + `vite build` 零錯誤）
2. **新增專項單元測試**：
   - `mock-exam` 與 `wrong-review` 在連錯 3 題以上時不會提早結束戰鬥，且完整寫入 `attemptOutcomes` 與 FSRS 狀態。
   - `shuffleQuestionOptions` 洗牌後選項內容與 `answerIndex` 對應正確率 100% 一致。
   - `learningDiagnostics` 對舊版無 `fsrsCards` 存檔具向後相容性（不拋錯、正確回傳空或基礎統計）。
   - `dailyStudy` 單日斷簽保護僅每週觸發 1 次，連續中斷 2 天以上仍正確歸零。

---

## 四、 建議執行順序與影響範圍

| 優先序 | 階段 | 預估改動範圍 | 預期教育效益 | 狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Phase 1**：評量完整度與重測洗牌 | `BattleArena.tsx`、`BattleSummary.tsx`、`questionUtils.ts`、`LearningFlow.test.tsx` | 確保模擬考與錯題複習樣本完整，杜絕位置記憶假象 | **已完成 ✅** |
| **2** | **Phase 2**：低年級自動導讀與專注引導 | `quiz.ts`、`progressImport.ts`、`BattleArena.tsx`、`LessonPlayer.tsx`、`WorldMap.tsx`、`App.tsx` | 消除小一、小二識字門檻與注意力干擾 | **已完成 ✅** |
| **3** | **Phase 3**：課綱知識點診斷報告 | `learningDiagnostics.ts`、`ExamReview.tsx`、`LearningFlow.test.tsx` | 讓家長與教師獲得可執行的弱點診斷，而非僅看總分 | **已完成 ✅** |
| **4** | **Phase 4**：連勝保護與有效練習引導 | `dailyStudy.ts`、`quiz.ts`、`BattleArena.tsx`、`test-daily-study.mjs` | 降低斷簽挫敗感，引導時間投入高價值新單元與 FSRS 複習 | **已完成 ✅** |
