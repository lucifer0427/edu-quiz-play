# EduQuiz Play — 115 學年度下學期（`115-s2`）題庫建置執行計畫

> 目標：補齊 Phase 2 全校 1–6 年級下學期共 **58 份題庫包（320 關、1,920 題）**，使全學年覆蓋率從 **58 / 116（50.0%）** 推進至 **116 / 116（100.0%）**。
> 建議開工時程：過幾天再啟動，預估採 5 波平行派工即可一氣呵成完成並逐波 commit。

---

## 一、目前前置就緒狀態（直接開工免盤點）

| 項目 | 狀態 | 說明 |
| :--- | :--- | :--- |
| 上學期題庫（`115-s1`） | **58 / 58 完成 ✅** | 1–6 年級共 330 關、1,980 題已全數通過驗證並提交 |
| 下學期課綱來源（`115-s2`） | **58 / 58 就緒 ✅** | 位於 `content/curriculum-sources/115-s2/g1..g6/`（共 320 單元） |
| 下學期數學動態出題器 | **44 / 44 就緒 ✅** | 已實作並註冊進 [registry.ts](../src/utils/generators/registry.ts)（全庫累計 90 個已通過 `test:generators` 抽測），**不需再寫出題器**，建置 `math.json` 時直接掛載 `generatorId` 即可 |
| 驗證管線 | **就緒 ✅** | `npm run validate:content`、`npm run test:generators`、`npm run build` |

### 已註冊的下學期數學 `generatorId` 總表（共 44 個）
- **六下（`g6Math.ts`，5 個）**：`g6s2-math-u1`, `g6s2-math-u2`, `g6s2-math-u3`, `g6s2-math-u4`, `g6s2-math-u5`（`u6` 圓形圖為靜態關）
- **五下（`g5s2Math.ts`，9 個）**：`g5s2-math-u1`..`g5s2-math-u9`（`u10` 線對稱圖形為靜態關）
- **四下（`g4Math.ts`，7 個）**：`g4s2-math-u1`, `g4s2-math-u2`, `g4s2-math-u4`, `g4s2-math-u6`, `g4s2-math-u7`, `g4s2-math-u8`, `g4s2-math-u9`（`u3`, `u5`, `u10` 為靜態關）
- **三下（`g3Math.ts`，8 個）**：`g3s2-math-u1`, `g3s2-math-u2`, `g3s2-math-u3`, `g3s2-math-u5`, `g3s2-math-u6`, `g3s2-math-u7`, `g3s2-math-u8`, `g3s2-math-u9`（`u4` 圓為靜態關）
- **二下（`g2Math.ts`，8 個）**：`g2s2-math-u1`, `g2s2-math-u3`, `g2s2-math-u5`, `g2s2-math-u6`, `g2s2-math-u7`, `g2s2-math-u8`, `g2s2-math-u9`, `g2s2-math-u10`（`u2`, `u4` 為靜態關）
- **一下（`g1Math.ts`，7 個）**：`g1s2-math-u1`, `g1s2-math-u2`, `g1s2-math-u4`, `g1s2-math-u6`, `g1s2-math-u7`, `g1s2-math-u8`, `g1s2-math-u9`（`u3`, `u5` 為靜態關）

---

## 二、5 波並行建置排程（共 58 包 / 320 關 / 1,920 題）

沿用上學期實測最穩定的 **`quiz-pack-author` 平行 `invoke_subagent` 模式**（每波依年級按 4 路或 6 路平行產出；**每波完成後立刻跑 `npm run validate:content` 確認 0 錯誤後獨立 commit**）：

| 波次 | 年級範圍 | 包數 | 關卡 / 題數 | 派工方式 | 驗收目標與 Commit |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Wave 1** | `115-s2/g6` | 11 | 54 關 / 324 題 | 4 路平行（A/B/C/D） | 覆蓋達 `69/116`（0 錯誤）→ `feat(content): add 115-s2 g6 full 11-subject quiz packs` |
| **Wave 2** | `115-s2/g5` | 11 | 63 關 / 378 題 | 4 路平行（A/B/C/D） | 覆蓋達 `80/116`（0 錯誤）→ `feat(content): add 115-s2 g5 full 11-subject quiz packs` |
| **Wave 3** | `115-s2/g4` | 11 | 62 關 / 372 題 | 4 路平行（A/B/C/D） | 覆蓋達 `91/116`（0 錯誤）→ `feat(content): add 115-s2 g4 full 11-subject quiz packs` |
| **Wave 4** | `115-s2/g3` | 11 | 61 關 / 366 題 | 4 路平行（A/B/C/D） | 覆蓋達 `102/116`（0 錯誤）→ `feat(content): add 115-s2 g3 full 11-subject quiz packs` |
| **Wave 5** | `115-s2/g2` + `115-s2/g1` | 7 + 7 | 41 + 39 關 / 246 + 234 題 | 6 路平行（g2 3 路 + g1 3 路） | 覆蓋達 **`116/116`（100.0%）** → 分別 commit `g2` 與 `g1` |

---

## 三、各年級 58 科明細與特殊提醒

### Wave 1：`115-s2/g6`（11 包、54 關、324 題）
- **批次 A（主科）**：
  - `mandarin`：南一 第十二冊（`unitNo: 1..4`，4 關）
  - `english`：翰林 Here We Go 第八冊（`unitNo: 0..6`，7 關，`speechLang: "en-US"`）
  - `math`：康軒 第十二冊（`unitNo: 1..6`，6 關；`u1..u5` 設 `isDynamicMath: true` + `g6s2-math-u1..u5`，`u6` 圓形圖靜態）
- **批次 B（自然 / 社會 / 電腦）**：
  - `science`：南一 第八冊（`unitNo: 1..3`，3 關）
  - `social`：康軒 第八冊（`unitNo: 1..3`，3 關）
  - `computer`：數位創客六下（`unitNo: 1..4`，4 關；含 Micro:bit 麥坤自駕車、Canva＋Gemini 簡報、威力導演畢業影音）
- **批次 C（藝文 / 健體 / 綜合）**：
  - `arts`：康軒 第八冊（`unitNo: 1..6`，6 關）
  - `health-pe`：南一 第十二冊（`unitNo: 1..11`，11 關）
  - `integrative`：翰林 第八冊（`unitNo: 1..3`，3 關）
- **批次 D（本土語）**：
  - `minnan`：康軒 第 12 冊（`unitNo: 1..4`，4 關；禁純聽辨發音題）
  - `hakka`：康軒 第 12 冊（`unitNo: 1..3`，3 關；禁純聽辨發音題）

### Wave 2：`115-s2/g5`（11 包、63 關、378 題）
- **批次 A（主科）**：
  - `mandarin`：康軒 第十冊（`unitNo: 1..6`，6 關）
  - `english`：翰林 Here We Go 第六冊（`unitNo: 0..6`，7 關，`speechLang: "en-US"`；含看病症狀 `What's Wrong?` / `Headache`、職業志向等）
  - `math`：翰林 第十冊（`unitNo: 1..10`，10 關；`u1..u9` 設 `isDynamicMath: true` + `g5s2-math-u1..u9`，`u10` 線對稱圖形靜態）
- **批次 B（自然 / 社會 / 電腦）**：
  - `science`：翰林 第六冊（`unitNo: 1..4`，4 關）
  - `social`：康軒 第六冊（`unitNo: 1..5`，5 關）
  - `computer`：數位創客五下（`unitNo: 1..4`，4 關；Inkscape 向量幾何與海底故事＋Tinkercad 3D 建模）
- **批次 C（藝文 / 健體 / 綜合）**：
  - `arts`：康軒 第六冊（`unitNo: 1..6`，6 關）
  - `health-pe`：翰林 第十冊（`unitNo: 1..8`，8 關）
  - `integrative`：南一 第六冊（`unitNo: 1..5`，5 關）
- **批次 D（本土語）**：
  - `minnan`：康軒 第 10 冊（`unitNo: 1..4`，4 關）
  - `hakka`：康軒 第 10 冊（`unitNo: 1..4`，4 關）

### Wave 3：`115-s2/g4`（11 包、62 關、372 題）
- **批次 A（主科）**：
  - `mandarin`：康軒 第八冊（`unitNo: 1..4`，4 關）
  - `english`：翰林 Here We Go 第四冊（`unitNo: 0..6`，7 關，`speechLang: "en-US"`）
  - `math`：翰林 第八冊（`unitNo: 1..10`，10 關；`u1, u2, u4, u6, u7, u8, u9` 設 `isDynamicMath: true` + `g4s2-math-u<n>`；⚠️ **`u3, u5, u10` 為靜態關共 18 題（>= 16 題），此 3 關合計 `answerIndex` 必須 0..3 全用且每個索引 `<= 7`**）
- **批次 B（自然 / 社會 / 電腦）**：
  - `science`：康軒 第四冊（`unitNo: 1..4`，4 關）
  - `social`：南一 第四冊（`unitNo: 1..5`，5 關）
  - `computer`：數位創客四下／PowerPoint 2021（`unitNo: 1..8`，8 關）
- **批次 C（藝文 / 健體 / 綜合）**：
  - `arts`：翰林 第四冊（`unitNo: 1..4`，4 關）
  - `health-pe`：翰林 第八冊（`unitNo: 1..8`，8 關）
  - `integrative`：南一 第四冊（`unitNo: 1..5`，5 關）
- **批次 D（本土語）**：
  - `minnan`：真平 第 8 冊（`unitNo: 1..3`，3 關）
  - `hakka`：康軒 第 8 冊（`unitNo: 1..4`，4 關）

### Wave 4：`115-s2/g3`（11 包、61 關、366 題）
- **批次 A（主科）**：
  - `mandarin`：康軒 第六冊（`unitNo: 1..4`，4 關）
  - `english`：康軒 Wonder World 2 第二冊（`unitNo: 0..6`，7 關，`speechLang: "en-US"`）
  - `math`：翰林 第六冊（`unitNo: 1..9`，9 關；`u1, u2, u3, u5, u6, u7, u8, u9` 設 `isDynamicMath: true` + `g3s2-math-u<n>`，`u4` 圓靜態）
- **批次 B（自然 / 社會 / 電腦）**：
  - `science`：翰林 第二冊（`unitNo: 1..4`，4 關）
  - `social`：翰林 第二冊（`unitNo: 1..6`，6 關）
  - `computer`：數位創客三下／Word 2021（`unitNo: 1..8`，8 關）
- **批次 C（藝文 / 健體 / 綜合）**：
  - `arts`：翰林 第二冊（`unitNo: 1..4`，4 關）
  - `health-pe`：康軒 第六冊（`unitNo: 1..6`，6 關）
  - `integrative`：南一 第二冊（`unitNo: 1..5`，5 關）
- **批次 D（本土語）**：
  - `minnan`：真平 第 6 冊（`unitNo: 1..4`，4 關）
  - `hakka`：康軒 第 6 冊（`unitNo: 1..4`，4 關）

### Wave 5：`115-s2/g2`（7 包、41 關）＋ `115-s2/g1`（7 包、39 關）
> 低年級特化規則：題幹與選項簡短白話、貼近生活情境、全部附親切 `hint`；中文題 `speechText` 寫成適合朗讀給低年級聽的完整口語問句（避免生僻字與未替換 `?`/`×`/`÷`）。

- **`115-s2/g2`（7 科，3 路平行）**：
  - 主科：`mandarin`（康軒第四冊 `u1..5`）、`english`（何嘉仁 Fun World 3 / 唱跳趣閱家二下 `u1..4`，`en-US`）、`math`（翰林第四冊 `u1..10`；`u1, u3, u5, u6, u7, u8, u9, u10` 設 `g2s2-math-u<n>`，`u2, u4` 靜態）
  - 生活／健體：`life`（南一第四冊 `u1..6`）、`health-pe`（翰林第四冊 `u1..8`）
  - 本土語：`minnan`（真平第 4 冊 `u1..4`）、`hakka`（康軒第 4 冊 `u1..4`）
- **`115-s2/g1`（7 科，3 路平行）**：
  - 主科：`mandarin`（翰林第二冊 `u1..4`）、`english`（翰林 Twinkle 1 / 唱跳趣閱家一下 `u1..4`，`en-US`）、`math`（康軒第二冊 `u1..9`；`u1, u2, u4, u6, u7, u8, u9` 設 `g1s2-math-u<n>`，`u3, u5` 靜態）
  - 生活／健體：`life`（南一第二冊 `u1..6`）、`health-pe`（翰林第二冊 `u1..8`）
  - 本土語：`minnan`（真平第 2 冊 `u1..4`）、`hakka`（康軒第 2 冊 `u1..4`）

---

## 四、品質紅線與上學期實戰避雷備忘

1. **派工方式選擇**：直接以 `define_subagent`（`quiz-pack-author`）+ `invoke_subagent` 平行執行。若父對話處於雙模型 Execution Turn，`run_workflow` 會因工作流代理觸發 `[plan review due]` 死鎖而失敗，避免再次踩雷。
2. **Zero Guessing（證據邊界）**：嚴格依據來源 JSON 的 `title`、`learning_points`、`vocabulary` 出題；禁止捏造來源未列出的課文情節、生字表或 Word List。
3. **`stage.title` 清理**：去掉來源 JSON 內的編目註記（例如「`(課程架構表為圖片未擷取...)`」「`(見 5-2 教學進度總表)`」「`(5-1-1 課程架構表列第X章)`」），維持學生友善的單元名稱。
4. **Schema 與白名單**：
   - `packId`: `"115-s2-g<grade>-<subject>"`、`stage.id`: `"115-s2-g<grade>-<subject>-u<unitNo>"`、`question.id`: `"115-s2-g<grade>-<subject>-u<unitNo>-q<1..6>"`
   - `monsterId` 僅限：`"slime" | "mathCube" | "bookSpirit" | "parrotKing" | "treeGuardian" | "flameDragon"`
   - 每題 `options` 恰 4 個非空互異字串；`answerIndex` 為 `0..3`；單關內同一索引 `<= 3`；整包靜態題 `>= 16` 題時 `0..3` 全用且單一索引占比 `<= 40%`。
5. **跨全庫題幹去重**：寫完每批後務必用 Node 唯讀比對 `src/data/curriculum/packs/` **包含整個 `115-s1`（1,980 題）在內**的全庫標準化 `prompt`（`trim().replace(/\s+/g, ' ')`），確認 0 重複後才結束。

---

## 五、開工或收尾時的架構優化與總驗收 Checklist

1. **（建議順手優化）數學出題器按需懶載入**：
   - 目前 90 個出題器皆靜態匯入 [registry.ts](../src/utils/generators/registry.ts)，使 `vite build` 主 chunk 達 `634 kB`（觸發 Vite >500 kB 警告）。
   - 可將 `resolveStageQuestions`（或題目載入層）改為依年級 `g1..g6` 動態 `import('./g<grade>Math.ts')`（同時保留 `test-generators.mjs` 的測試能力），讓首屏主 bundle 降回 `~370 kB`。
2. **116 / 116 總驗收指令**：
   - [ ] `npm run validate:content` → **116 份課綱來源、116 份題庫包（0 錯誤），覆蓋 116/116（100.0%）**，12 個槽位全數 `✓`
   - [ ] `npm run test:generators` → **90 個出題器 × 24 題（0 錯誤）**
   - [ ] `npm run build` → `sync:curriculum`、`test:generators`、`tsc --noEmit`、`vite build` 全部通過
   - [ ] 同步更新 [curriculum-quiz-roadmap.md](curriculum-quiz-roadmap.md) §一 與 §二 進度表並提交收尾 commit
