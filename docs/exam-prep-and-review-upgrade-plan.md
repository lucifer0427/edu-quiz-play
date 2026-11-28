# EduQuiz Play — 課業複習與考前準備全面優化實作計畫

> 定位：在不破壞純前端靜態架構（GitHub Pages）、低干擾認知防禦原則與本機 JSON 備份相容性的前提下，全面強化學童的**平時課業複習閉環**與**考前實戰準備力**
> 關聯文件：[實證記憶策略與認知防禦升級計畫](./cognitive-memory-upgrade-plan.md)、[課程教學模組實作計畫](./lesson-module-plan.md)、[教育品質與評量精準度精進計畫](./pedagogical-refinement-plan.md)、[深度理解教學強化與學童使用意願提升計畫](./engagement-and-deep-teaching-plan.md)
> 建立日期：2026-11-27
> 狀態：規劃中 📋

---

## 一、現況盤點與核心痛點

既有系統已完成 115 學年度 1–6 年級 116 份課綱題庫包（1,001 關、10,010 題）、專屬微課程、114 個數學動態出題器、FSRS 錯題排程、手寫筆順練習與雙人對戰。針對「**平常課業複習**」與「**考前準備**」兩個核心場景，盤點出以下 5 個最高優先級缺口：

1. **模擬考缺乏真實考場感**：[`BattleArena.tsx`](../src/components/BattleArena.tsx) 的 `mock-exam` 模式僅關閉愛心淘汰，作答時仍即時公佈對錯、允許三層提示與微課抽屜，且答錯會插隊重測；缺少限時倒數、跳題標記、百分制成績單、歷次成績曲線與 A4 空白模擬試卷列印。
2. **自然／社會題庫存在大量課綱目標樣板題**：抽檢現有 10,010 題，數學、英語與國語字詞題品質優良，但自然（1,240 題中約 80%）與社會部分關卡重複使用「學習目標／議題融入」文字作為正確答案，干擾選項過於明顯，缺乏段考實戰鑑別度。
3. **段考倒數計畫未連動首頁每日任務**：[`ExamPlan`](../src/types/quiz.ts) 目前僅記錄單一科目與日期，且首頁 [`DailyMissionCard.tsx`](../src/components/DailyMissionCard.tsx) 未讀取段考計畫，無法依倒數天數自動拆解今日複習任務。
4. **缺少非選擇題的主動回想訓練**：除手寫國字外，全站測驗皆為四選一，與台灣國小段考常見的「國字聽寫、英語單字拼寫、數學直接計算填空」仍有落差。
5. **複習閉環細節與錯題掃雷限制**：[`App.tsx`](../src/App.tsx) 的 `handleOpenLessonForWrongQuestion` 僅依當前選取的年級／學期查找微課程，跨學期錯題會定位失敗；[`WrongBook.tsx`](../src/components/WrongBook.tsx) 固定每次最多抽 5 題，缺少段考範圍篩選、頑固錯題累計與錯因標記。

---

## 二、設計與相容性原則

1. **向後相容持久化**：所有新增於 [`PlayerProgress`](../src/types/quiz.ts) 的欄位皆以 optional（`?`）擴充，並同步更新 [`progressImport.ts`](../src/utils/progressImport.ts) 的 `normalizeProgress`，確保舊版 JSON 備份可無縫還原。
2. **低干擾認知防禦邊界**：測驗作答區維持簡潔專注；激勵回饋、成績分析與衝刺排程集中在作答前與交卷後。
3. **純前端零後端**：維持 Vite 靜態建置與 GitHub Pages 直接部署能力，不引入後端服務或付費 API。

---

## 三、分階段實作藍圖

### Phase 1：真實段考模式、A4 模擬考卷列印與成績曲線（P0）

#### 1.1 資料模型擴充（[`src/types/quiz.ts`](../src/types/quiz.ts)）
新增模擬考歷史成績結構，並於 `PlayerProgress` 加入 `mockExamHistory?: MockExamRecord[]`（保留最近 30 筆）：

```ts
export interface MockExamUnitScore {
  stageTitle: string;
  correct: number;
  total: number;
}

export interface MockExamRecord {
  id: string;
  takenAt: string; // ISO timestamp
  grade: Grade;
  semester: Semester;
  subjectId: SubjectId;
  title: string;
  score: number; // 0-100 百分制
  correctCount: number;
  totalCount: number;
  durationSec: number;
  timeLimitSec?: number;
  unitBreakdown: MockExamUnitScore[];
}
```

#### 1.2 擬真考場元件（新增 `src/components/MockExamArena.tsx`）
- **考前設定**（整合於 [`ExamReview.tsx`](../src/components/ExamReview.tsx) 模擬測驗頁籤）：
  - 模式切換：**「練習模擬（即時解析）」** vs **「真實段考（交卷統一批改）」**。
  - 時間限制：`不限時` / `15 分鐘` / `25 分鐘` / `40 分鐘`（低年級預設不限時）。
  - 題數擴充：`10 / 15 / 20 / 25 題`。
- **作答體驗**：
  - 頂部顯示倒數計時器（最後 3 分鐘柔和提醒，時間到自動交卷）與題號導覽格（區分：未作答 / 已作答 / `🚩待檢查`）。
  - 支援自由跳題、上一題／下一題、標記待檢查，保留數學計算紙（`MathScratchpad`）與語音朗讀；關閉三層提示、微課抽屜與即時解析。
  - 交卷前若有未作答或標記題，彈出覆核確認清單，點擊題號可立即跳回檢查。
- **交卷成績單**：
  - 顯示百分制分數（0–100 分）、答題耗時、與前一次同科模擬考分數對比。
  - **各單元得分率診斷條**（綠燈 ≥ 85%、黃燈 60–84%、紅燈 < 60%），紅燈單元提供回看微課程／重點入口。
  - 錯題逐題解析清單 ＋ **一鍵「只重考本次錯題」**。
  - 交卷後自動寫入 `wrongQuestionIds`、`wrongQuestionSnapshots`、`fsrsCards` 與 `mockExamHistory`。

#### 1.3 A4 空白模擬考卷＋解答卷列印 & 歷次成績紀錄（[`ExamReview.tsx`](../src/components/ExamReview.tsx)）
- 新增 **「列印 A4 空白模擬考卷（含解答卷）」** 功能：沿用組卷抽題邏輯，產出含姓名／範圍／日期／得分欄的紙本試卷，並於 `break-before-page` 獨立分頁印出參考答案與解析。
- 於模擬測驗頁籤顯示**歷次模擬考成績紀錄與進步趨勢**（依科目篩選）。

---

### Phase 2：多科段考衝刺計畫連動首頁每日任務（P1）

#### 2.1 擴充 `ExamPlan`（[`src/types/quiz.ts`](../src/types/quiz.ts)）
```ts
export interface ExamPlan {
  title: string;
  examDate: string; // YYYY-MM-DD
  grade?: Grade;
  semester?: Semester;
  preset?: 'midterm' | 'final' | 'all' | 'custom';
  subjectIds: SubjectId[]; // 支援多科勾選（如國語＋數學＋自然＋社會＋英語）
  stageIdsBySubject?: Record<string, string[]>; // 各科自選範圍單元 ID
}
```

#### 2.2 每日衝刺排程引擎（新增 `src/utils/examPlanner.ts`）
- 實作純函式 `buildExamSprintPlan(examPlan, subjectPacks, progress, today)`：
  - **基礎補強期（D-4 以上）**：從各科考試範圍中優先挑出未滿 3 星或有錯題的單元，排定每日 1–2 個推薦複習單元。
  - **錯題清零期（D-2 ～ D-3）**：引導集中清空考試範圍內的到期與未掌握錯題。
  - **實戰衝刺期（D-1 ～ D-0）**：引導執行各科限時模擬考驗收。
- 計算各科**考前準備度百分比**（範圍內單元星數達成率與錯題清零率），產出親師可讀的紅黃綠燈弱點摘要。

#### 2.3 首頁與考前中心整合
- **[`DailyMissionCard.tsx`](../src/components/DailyMissionCard.tsx)** & **[`WorldMap.tsx`](../src/components/WorldMap.tsx)**：有進行中的 `examPlan` 時，於首頁任務卡頂部顯示**段考倒數衝刺條**與今日推薦任務一鍵直達按鈕。
- **[`ExamReview.tsx`](../src/components/ExamReview.tsx)**：升級計畫編輯表單支援多科勾選與範圍綁定，並新增**多科考前準備度總覽**卡片。

---

### Phase 3：複習閉環修復、錯題本考前掃雷與重點遮罩背誦（P1–P2）

#### 3.1 修復跨年級／跨學期「回看微課」定位
- 於 [`Question`](../src/types/quiz.ts) 補存 optional 欄位：`sourceGrade?: Grade`、`sourceSemester?: Semester`、`sourceStageId?: string`。
- [`App.tsx`](../src/App.tsx) 儲存 `wrongQuestionSnapshots` 時寫入來源資訊，`handleOpenLessonForWrongQuestion` 優先依來源年級／學期／stageId 精準定位微課程。

#### 3.2 錯題本考前集中掃雷（[`WrongBook.tsx`](../src/components/WrongBook.tsx)）
- 於 `PlayerProgress` 新增 optional 欄位：
  - `wrongMistakeCounts?: Record<string, number>`（累計答錯次數，≥ 2 次標記 `🔥頑固錯題`）
  - `wrongReasonTags?: Record<string, 'careless' | 'misread' | 'concept'>`（一鍵標註錯因：粗心算錯／看錯題意／觀念不熟）
- 新增篩選條件：`全部` / `僅看段考範圍內` / `🔥頑固錯題`。
- 新增考前複習題數切換：`日常 5 題` / `考前掃雷 10 題` / `15 題` / `全部一次清`。

#### 3.3 考前重點「遮罩背誦模式」（[`ExamReview.tsx`](../src/components/ExamReview.tsx)）
- 在重點速覽工具列新增**「遮罩背誦」**開關，將重點中的「」『』關鍵詞與數字／公式遮蔽為可點擊翻開的方塊，將被動閱讀轉化為主動回想。

---

### Phase 4：非選擇題主動回想訓練（貼近真實段考題型）（P1）

1. **國語「生字聽寫小考」**（擴充 [`HanziPractice.tsx`](../src/components/HanziPractice.tsx)）：
   - 新增聽寫測驗模式：隱藏目標國字與描紅底圖，僅顯示注音、語詞填空與語音唸讀，由學童憑記憶手寫並計分，寫錯字自動加入加強清單。
2. **數學「數字鍵盤直填模式」**（擴充 [`BattleArena.tsx`](../src/components/BattleArena.tsx)）：
   - 對純數值答案的動態數學題提供「直填挑戰」切換，隱藏四個選項，改以觸控數字／小數點／分數小鍵盤直接輸入答案。
3. **英語「聽音拼字積木」**（新增 `src/components/EnglishSpellingModal.tsx`）：
   - 依英語單元單字播放發音與中文提示，提供打亂的字母積木點擊拼字，避免打字挫折又能紮實記住拼寫。

---

### Phase 5：自然／社會／生活題庫品質大升級（P0 內容工程）

#### 5.1 品質守門腳本強化（[`scripts/sync-curriculum.mjs`](../scripts/sync-curriculum.mjs)）
- 加入題庫品質掃描規則：
  - 偵測同一關卡內重複的正確答案文字。
  - 偵測課綱樣板句型（如「最核心的學習目標是下列哪一項」、「融入〇〇教育」）。
- 先以統計報告輸出各科樣板題數量，並對已完成改寫的年級／科目開啟嚴格把關。

#### 5.2 分批實戰題改寫策略
- **優先順序**：依實際使用年級與當學期優先改寫 **自然 → 社會 → 生活 → 國語樣板首題**，再逐步覆蓋 1–6 年級。
- **出題品質標準**：
  - **自然**：實驗操縱／控制／應變變因判斷、現象原理解釋、數據圖表判讀、常見科學迷思辨析。
  - **社會**：地理方位與地形氣候因果、歷史時間軸與事件脈絡、公民權利義務情境題。
  - **干擾選項**：全面改為學童真實易混淆的迷思選項，消除明顯荒謬的態度敘述。

---

## 四、驗證與測試計畫

每個階段實作完成後須完成以下檢核：

1. **新增自動化單元與元件測試**（`src/components/__tests__/`）：
   - `MockExamArena`：限時倒數與自動交卷、跳題與標記待檢查、百分制分數與單元診斷、寫入 `mockExamHistory`。
   - `examPlanner`：不同倒數天數的階段判斷、每日任務拆解與多科準備度計算。
   - `WrongBook` & `App`：頑固錯題計數、段考範圍篩選、來源年級微課精準回看。
   - `progressImport`：新欄位正規化與舊版 JSON 備份向後相容驗證。
2. **全站建置與驗證指令**：
   ```bash
   npm run build
   ```
   確保 `sync:curriculum`、`validate:lessons`、`test:generators`、`test:fsrs`、`test:interleaving`、`test:phase3-4`、`test:lesson-synthesizer`、`test:daily-study`、`vitest run`、`tsc --noEmit` 與 `vite build` 全數通過。
