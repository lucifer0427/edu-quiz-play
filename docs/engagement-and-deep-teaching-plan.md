# EduQuiz Play — 深度理解教學強化與學童使用意願提升計畫

> 定位：在不違背「低干擾認知防禦」的前提下，同步強化 **微課程深度理解機制** 與 **學童持續使用動機（自我決定論 SDT：勝任感、自主感、歸屬感）**
> 關聯文件：[實證記憶策略與認知防禦升級計畫](./cognitive-memory-upgrade-plan.md)、[課程教學模組實作計畫](./lesson-module-plan.md)、[教育品質與評量精準度精進計畫](./pedagogical-refinement-plan.md)
> 建立日期：2026-11-24
> 狀態：Phase 1–5 全部已完成 ✅

---

## 一、 核心設計理念

1. **「真懂了」才是最強的動機**：國小學童抗拒學習工具，主因常是「看不懂又一直答錯」。因此本計畫將**深度教學強化**列為第一優先，先讓孩子從「看懂 → 會做」建立勝任感。
2. **激勵放在作答外，專注留在作答內**：所有徽章、花園養成、兌換券與獎狀皆設計於**作答前（任務）與作答後（結算／商店／花園）**；進入題目作答區仍維持低干擾、零浮誇特效的認知防禦邊界。
3. **零後端、純前端持久化**：所有新增進度欄位（徽章、家庭兌換券、核銷紀錄）皆以 optional（`?`）擴充於 `PlayerProgress` 並兼容 JSON 備份還原。

---

## 二、 雙主軸分階段實作藍圖

### Phase 1：課程教學深度理解升級（核心優先）

**目標**：將 [LessonPlayer.tsx](../src/components/LessonPlayer.tsx) 從「靜態翻頁看文字」升級為「可操作、可點讀、測驗中可即時回查」的主動理解系統。

#### 1. 戰鬥中「即時回看觀念」抽屜（Just-In-Time Remediation）
- **現況問題**：學童在 [BattleArena.tsx](../src/components/BattleArena.tsx) 答錯時只能看 2–3 行文字解析，若基礎觀念根本沒懂，必須撤退回到地圖才能重新打開微課程，中斷學習流。
- **改造設計**：
  - 在 `BattleArena` 答錯展開解析區時，提供「**📖 回看本單元觀念圖解**」按鈕。
  - 點擊後以彈窗／抽屜即時載入該關卡對應的 `LessonScript`（顯示 `ANCHOR_SCENE` 圖解與 `WORKED_EXAMPLE_SPLIT` 步驟對比），看完關閉即可無縫繼續戰鬥，不丟失進度與佇列。

#### 2. 結算畫面「觀念補強導引」閉環（[BattleSummary.tsx](../src/components/BattleSummary.tsx)）
- **改造設計**：
  - 當學童在關卡僅獲得 `0–1 星` 或答錯 ≥ 3 題時，於結算卡片優先顯示主按鈕：「**📖 回到微課程再看一次關鍵步驟**」，引導回到 `LessonPlayer` 補齊基模後再重戰，而非盲目重刷題目。

#### 3. 微課程「重點點讀＋理解檢核」（[LessonPlayer.tsx](../src/components/LessonPlayer.tsx)、[WorkedExampleSplit.tsx](../src/components/WorkedExampleSplit.tsx)）
- **重點卡片點讀與勾選**：點擊任一張 `cognitiveChunks` 核心重點卡或示範步驟，可單獨朗讀該句並切換「✓ 我看懂了」標記，避免一整頁文字造成低年級視覺壓迫。
- **步驟卡互動確認**：在 `WorkedExampleSplit` 將「常見錯誤陷阱」設為先思考再展開或高亮標示關鍵詞；中高年級的 `selfExplanationPrompt` 加入「我想好了（+看重點確認）」互動按鈕，降低秒按「下一幕」跳過課程的機率。
- **互動式圖解擴充**（[LessonDiagram.tsx](../src/components/lesson-diagrams/LessonDiagram.tsx)）：讓 `number_line`（數線跳格）與 `clock_face`（時鐘調時分）支援與 `fraction_bar`、`rect_geometry` 相同的 `+ / -` 即時操作，讓孩子透過動手調整建立直覺。

---

### Phase 2：平板手寫國字練習（識字筆順與描紅模組）

**目標**：專為 iPad / Android 平板（手指與 Apple Pencil / 觸控筆）打造「看筆順 → 描紅 → 盲寫」三段式國字識字練習，與現有 1–6 年級國語課綱與每日任務無縫整合。

#### 1. 三段式識字手寫畫布（新增 `src/components/HanziPractice.tsx`、`React.lazy` 懶載入）
- **引擎選型與離線降級（GitHub Pages 最佳解）**：
  - 引入輕量 MIT 授權筆順套件 `hanzi-writer`（按需動態載入，絕不膨脹首屏），並按字懶載入繁體國字筆順資料。
  - **100% 離線與生僻字降級（Canvas Fallback）**：當離線或遇到無筆順資料的國字時，自動切換為 HTML5 `<canvas>` Pointer Events 標楷體淡色田字格描紅畫布，支援 Apple Pencil / 手指粗細筆觸、清除重寫與自評完成，確保任何繁體國字皆能順暢練寫。
- **三段式教學法（符合雙重編碼與提取練習）**：
  1. **👀 筆順示範＋聽讀音**：逐筆動畫示範筆順（支援標準／慢速），並搭配 Web Speech API 朗讀字音與造詞。
  2. **✍️ 田字格描紅（鷹架練習）**：顯示淡灰輪廓與下一筆起筆提示；寫錯筆畫即時溫和提醒並閃爍正確筆順。
  3. **🧠 空白田字格盲寫（獨立提取）**：隱藏字形輪廓，讓學童憑記憶完整寫出國字，真正建立字形長期記憶。
- **平板防誤觸體驗**：
  - 書寫區域鎖定 `touch-action: none`、`user-select: none`，防止手指滑動時造成頁面捲動或誤縮放；大尺寸田字格（`280×280px` 以上）並附十字／米字輔助虛線。

#### 2. 國語課綱字庫對齊＋家長自訂生字簿（新增 `src/data/hanziVocab.ts` 或從國語題庫動態萃取）
- **依年級／單元練字**：整合 1–6 年級國語單元常用生字與語詞（尤其強化 G1–G2 低年級基礎識字高頻字），並可從國語關卡直接點選「✍️ 練習本單元國字」。
- **家長／老師自訂生字簿**：提供文字輸入框，家長貼上孩子今天學校聯絡簿要考的生字（例如「春風雨花草」），一鍵過濾出繁體國字立即開始手寫特訓。
- **學習紀錄整合**：在 `PlayerProgress` 新增 optional 欄位 `practicedHanzi?: Record<string, { count: number; masteredAt?: string }>`，每完成 1 個國字練習可獲得 XP／金幣、計入每日學習進度，並解鎖「小小書法家」徽章。

---

### Phase 3：FSRS 視覺化「知識花園」與「努力導向徽章牆」

**目標**：把孩子最排斥的「錯題複習」轉化為有成就感的養成體驗，並解決現有 6 位英雄（總價 810 金幣）3–5 天就買完的目標斷層。

#### 1. 視覺化「知識花園」（[WrongBook.tsx](../src/components/WrongBook.tsx)）
- 依據 `PlayerProgress.fsrsCards` 的 `stability` 狀態，在錯題本頂部呈現一塊純淨 SVG 視覺化小花園：
  - `new / learning` → 🌱 剛種下的種子
  - `growing` → 🌿 澆水成長中的嫩芽
  - `mastered` → 🌳 開花結果的知識大樹
- 每次完成「今日 FSRS 複習戰」答對題目，明確提示「你剛幫 X 棵小樹澆水成長了！」，將複習轉化為正向養成。

#### 2. 努力導向「成就徽章牆」（新增 `src/data/badges.ts`、`src/utils/badges.ts`，整合於 [HeroShop.tsx](../src/components/HeroShop.tsx)）
- 設計 **10–12 枚「努力與習慣」徽章**（不以單次滿分為唯一標準，照顧各程度學童）：
  - `first-lesson`（小小學者）：完成第 1 堂微課程
  - `lesson-explorer`（觀念探索家）：累計完成 10 堂微課程
  - `hanzi-starter` / `hanzi-master`（小小書法家）：手寫練完 5 個／20 個國字
  - `error-healer`（錯題修復師）：回合內成功修復 10 題錯題
  - `streak-3` / `streak-7`（堅持小火苗／一週不間斷）：連續學習達 3 天／7 天
  - `tree-planter`（知識園丁）：種出 5 棵 🌳 長期記憶大樹
  - `subject-allrounder`（全科探險家）：挑戰過 4 個以上不同科目
  - `hero-collector`（英雄夥伴團）：解鎖 3 位以上英雄
- 達成徽章時給予一次性金幣／稱號獎勵，並於英雄基地展示已點亮與進行中進度條。

---

### Phase 4：親子正向互動 — 「家庭實體獎勵兌換券」與「一鍵榮譽獎狀」

**目標**：打通虛擬金幣與真實生活獎勵，讓家長與老師能輕鬆給予具體肯定（純前端零後端）。

#### 1. 家長自訂「家庭獎勵兌換券」（[TeacherPanel.tsx](../src/components/TeacherPanel.tsx)、[HeroShop.tsx](../src/components/HeroShop.tsx)、[quiz.ts](../src/types/quiz.ts)）
- 在 `PlayerProgress` 新增 optional 欄位：
  - `familyRewards?: FamilyRewardItem[]`（包含 `id`、`title`、`costCoins`、`emoji`）
  - `redeemedRewards?: RedeemedRewardRecord[]`（包含 `id`、`title`、`costCoins`、`redeemedAt`、`used`）
- 內建 3 個可編輯預設範例（如「選一道晚餐菜色 150 金幣」、「多看 15 分鐘卡通 200 金幣」、「週末公園放電券 300 金幣」），家長可在「老師／家長專區」自由新增、修改或刪除。
- 孩子在「英雄商店 → 家庭兌換券」分頁存夠金幣即可兌換，產生一張帶有日期與兌換編號的電子兌換券供家長點擊「已核銷」。

#### 2. 一鍵產生「冒險小獎狀」（新增 `src/components/CertificateModal.tsx`，整合於 [BattleSummary.tsx](../src/components/BattleSummary.tsx) 與 [WorldMap.tsx](../src/components/WorldMap.tsx)）
- 達成每日目標、連續學習里程碑或完成考前模擬考時，可點擊「🏆 領取小獎狀」，生成精美且支援 `@media print` 列印／手機截圖的專屬獎狀（顯示學童暱稱、日期、完成成就與鼓勵評語）。

---

### Phase 5：降低啟動阻力與家庭手足共學

**目標**：讓孩子「願意點開第一題」，並善用現有多學童檔案發揮手足良性帶動。

#### 1. 明確時間感「3 分鐘快閃任務」（[DailyMissionCard.tsx](../src/components/DailyMissionCard.tsx)）
- 在每日任務卡片明確標註預估時間（「📖 先學觀念 · 約 2 分鐘」、「✍️ 國字手寫練字 · 約 2 分鐘」、「⚡ 錯題快閃複習 · 約 3 分鐘」），降低面對 10 題關卡的心理壓迫感。

#### 2. 成長型結算回饋（[BattleSummary.tsx](../src/components/BattleSummary.tsx)）
- 特別突顯進步指標：「比上次進步了 +1 顆星！」、「你靠自己修復了 X 題錯題！」，讓原本拿 1 星的孩子也能感受到具體成長。

#### 3. 家庭本週努力牆（[Navbar.tsx](../src/components/Navbar.tsx) / [WorldMap.tsx](../src/components/WorldMap.tsx)）
- 當本機建立 **2 位以上學童檔案** 時，提供輕量「家庭本週努力牆」，僅展示各成員的「連續天數、今日練習進度與完成微課程數」（**不比較分數高低**），營造兄妹互相鼓勵的學習氛圍。

---

## 三、 驗證與品質關卡（Release Gate）

1. **既有驗證管線全過**：
   - `npm run validate:content`（116 份課綱、6,500 題與 2,399 幕微課程 0 錯誤）
   - `npm run test:generators`、`npm run test:fsrs`、`npm run test:interleaving`、`npm run test:daily-study`
   - `npm run build`（Vitest UI 測試 + `tsc --noEmit` + `vite build` 0 錯誤）
2. **新增專項測試**：
   - `BattleArena` 答錯後可開啟「回看觀念圖解」抽屜且關閉後原題佇列與作答狀態不受影響。
   - `HanziPractice` 能正確過濾非中文字元、支援自訂生字輸入、離線／無資料時平滑降級至田字格 Canvas 畫布，且完成練字正確更新 `practicedHanzi`。
   - `badges.ts` 對舊版無新欄位存檔完全向後相容，各類努力型徽章條件計算正確。
   - `familyRewards` 兌換扣幣邊界檢查（金幣不足不可兌換、核銷狀態持久化與 JSON 匯入還原完整）。

---

## 四、 建議執行順序

| 優先序 | 階段 | 核心交付物 | 預期效益 | 狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Phase 1：深度理解教學升級** | 戰鬥中即時回看微課程抽屜、重點點讀／勾選、互動數線與時鐘、結算回學導引 | 解決「沒看懂就亂猜」，大幅提升觀念理解與勝任感 | **已完成 ✅** |
| **2** | **Phase 2：平板手寫國字練習** | `HanziPractice.tsx`（`hanzi-writer`＋離線 Canvas 描紅降級）、三段式筆順／描紅／盲寫、年級字庫與自訂生字簿 | 支援 iPad／觸控筆手寫識字，強化低年級識字與正確筆順 | **已完成 ✅** |
| **3** | **Phase 3：知識花園與努力徽章牆** | FSRS 視覺化小花園、`badges.ts` 10+ 努力徽章、英雄基地展示 | 把錯題複習變養成遊戲，延續中長期學習動力 | **已完成 ✅** |
| **4** | **Phase 4：家庭兌換券與小獎狀** | 家長自訂實體獎勵兌換券、核銷紀錄、`CertificateModal` 可列印獎狀 | 串聯真實生活獎勵與家長肯定，建立正向親子循環 | **已完成 ✅** |
| **5** | **Phase 5：快閃入口與家庭努力牆** | 2–3 分鐘時間標示、成長型結算文案、多檔案本週努力牆 | 降低啟動門檻，發揮手足合作帶動效應 | **已完成 ✅** |
