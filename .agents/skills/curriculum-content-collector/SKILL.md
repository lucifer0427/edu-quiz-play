---
name: curriculum-content-collector
description: >-
  Use this skill when collecting, verifying, or structuring elementary school
  curriculum content (table of contents, units, lessons, vocabulary, sentence
  patterns, learning objectives, and quiz source material) for specific grades,
  subjects, and textbook editions. Enforces strict evidence-first collection
  with mandatory provenance and zero speculative inference or guesswork.
---

# Curriculum Content Collector（證據優先課程內容蒐集）

本 skill 用於蒐集並結構化國小各年級、科目與指定教科書版本的課程內容（單元目次、課次標題、生字／單字、句型、學習重點與出題素材），為後續題庫建置提供可稽核的依據。

## 核心鐵律（Iron Rules — Evidence First, Zero Guessing）

1. **嚴禁推論與腦補**：
   - 不得憑模型記憶補齊單元名稱、課次順序、生字表、單字清單、句型、文法點或頁碼。
   - 不得跨維度混用或套用：嚴禁將不同學年度（例如 114 學年度當作 115 學年度）、不同學期（上／下學期）、不同年級或不同出版社版本的內容直接替補。
2. **證據來源分級（Source Tiers）**：
   - **`tier1`（權威一手來源）**：學校官方選書表、出版社官網／電子書／課程計畫書（康軒、翰林、南一、何嘉仁、真平、宏全、無限可能、巨岩等）、國家教育研究院「十二年國教教科書審定資訊網」（`censor.naer.edu.tw`）、縣市教育局／學校公開課程計畫書 PDF、使用者直接提供的課本掃描檔／照片／教材文件。
   - **`tier2`（輔助交叉驗證）**：明確標註「學年度＋學期＋年級＋科目＋版本」的公開教師講義、段考試題或學習單（例如全國中小學題庫網 `exam.naer.edu.tw`）。若無 `tier1` 直接佐證，輸出條目必須標記 `"confidence": "secondary"`。
   - **`tier3`（禁止作為事實）**：模型先驗記憶、未標註學年度或版本的部落格／論壇整理、AI 生成摘要、或「去年應該一樣」的經驗推測。**一律禁用**。
3. **強制溯源（Mandatory Provenance）**：
   - 每一筆單元、課次、單字、句型或學習重點，皆須可回溯至具體來源，附帶：
     - `source_url` 或 `local_file`
     - `source_title`
     - `source_tier`（`tier1` | `tier2`）
     - `retrieved_at`（ISO 8601 日期時間）
     - `matched_metadata`（`academic_year`, `semester`, `grade`, `subject`, `publisher`, `book_series`）
     - `verbatim_excerpt`（從來源擷取的逐字原文片段）
4. **缺口透明化（Explicit Gap Reporting）**：
   - 遇到需要帳號登入、付費牆、新學年度教材尚未上架、來源查無資料、或五軸中繼資料不一致時，**嚴禁硬填**。
   - 缺失欄位保留 `null` 或 `[]`，不可填入猜測值，並寫入 `gaps` 陣列，明確記錄 `reason`（`login_required` | `year_mismatch` | `not_published_yet` | `source_not_found` | `ambiguous_edition`）與 `recommended_action`（例如：請使用者提供課本目次頁照片或學校課程計畫書 PDF）。
   - 若僅查到舊學年度資料（例如 114 學年度），**不得靜默替代 115 學年度**；必須先記入 `gaps`（`year_mismatch`）向使用者回報，只有在獲得使用者明確同意後，才可另行標註為 `fallback_pending_verification`。

---

## 標準蒐集流程（5 步驟）

### 步驟 1：鎖定目標規格
- 先查閱預載選書基準表 [dazhong-115-textbooks.md](./references/dazhong-115-textbooks.md)（或使用者指定的其他選書表），確認並鎖定目標規格七要素：
  `(school, academic_year, semester, grade, subject, publisher, book_series)`
- 若該年級未開設該科目（例如 1～2 年級無自然科學、社會、藝術、綜合活動與電腦；3～6 年級無生活），直接中止並回報該科不適用。
- 若目標學期或版本系列不明確，先向使用者確認或標記為 `ambiguous_edition`。

### 步驟 2：精準檢索一手來源
- 優先檢索順序：
  1. 使用者本地提供的檔案（PDF、圖片、教材檔案）。
  2. 學校／縣市公開「課程計畫書」（通常含完整各週進度與單元名稱）。
  3. 國家教育研究院審定資訊網（`censor.naer.edu.tw`）與出版社官方教材頁／公開目錄。
  4. `tier2` 具明確年度與版本標註的公開試卷庫（`exam.naer.edu.tw`）作為單元／題型輔助對照。
- 檢索關鍵字應包含完整五軸：`"<學年度>" "<學期/上冊/下冊>" "<年級>" "<科目>" "<出版社>" "<書名/系列>"`。
- 若目標頁面為 JavaScript 動態渲染（無法由靜態抓取取得完整目錄），委派 `browser` subagent 開啟檢視；若遇到登入牆、權限阻擋或 CAPTCHA，**立即停手**，將該來源記為 `gaps`（`login_required`），不得繞過或猜測頁面內容。

### 步驟 3：核對五軸並擷取原文
- 開啟實際來源內容，**不得僅憑搜尋引擎的截斷摘要（snippet）下結論**。
- 逐一比對來源內文是否同時符合：
  1. `academic_year`（學年度，如 `115`）
  2. `semester`（學期／冊別，如上學期第1冊）
  3. `grade`（年級）
  4. `subject`（科目）
  5. `publisher` & `book_series`（版本與書名，例如 `翰林 Here We Go 3`）
- 擷取足夠證明單元編號、名稱與重點的 `verbatim_excerpt` 原文片段。若發現頁面實際年份為舊年度（如 113、114），立即標記 `year_mismatch` 並停止將其列為已驗證事實。

### 步驟 4：輸出結構化資料
- 嚴格依照 [schema.md](./references/schema.md) 定義的 JSON 格式輸出蒐集結果。
- 預設儲存路徑：`content/curriculum-sources/<academic_year>-s<semester>/g<grade>/<subject_slug>.json`（未指定學期時為 `content/curriculum-sources/<academic_year>/g<grade>/<subject_slug>.json`，或依使用者指示路徑寫入）。
- 標準 `<subject_slug>` 對照表（全 12 科，統一使用以下 slug）：
  - 語文（國語文）→ `mandarin`
  - 數學 → `math`
  - 英語 → `english`
  - 生活（1–2 年級）→ `life`
  - 自然科學 → `science`
  - 社會 → `social`
  - 藝術 → `arts`
  - 健康與體育 → `health-pe`
  - 綜合活動 → `integrative`
  - 電腦 → `computer`
  - 本土語言（閩南語）→ `minnan`
  - 本土語言（客語）→ `hakka`
- `local_file` 規範：僅記錄檔名（如 `115學年教科書版本.pdf`）或專案內相對路徑，嚴禁寫入作業系統絕對路徑或本機使用者目錄路徑。
- 若該目標僅部分單元查獲 `tier1` 證據、其餘單元缺少一手佐證，頂層 `status` 必須設為 `"partial"`；完全未取得有效證據則設為 `"unverified"`，`units` 為 `[]`。

### 步驟 5：交付前自我稽核（Validation Gate）
交付結果前，逐項檢查以下六條是否全數通過（任一未過不得交付）：
- [ ] **零無據條目**：`units` 內每一筆單元與課次皆有有效 `source_ref`、`verbatim_excerpt` 與 `confidence`。
- [ ] **零跨期混用**：所有採用來源的 `matched_metadata` 皆與 `target` 的學年度、學期、年級、科目、版本一致（或明確經同意列為 `fallback_pending_verification`）。
- [ ] **缺口完整揭露**：所有未能驗證的單元、生字、單字、句型或學期差異，皆已完整記錄於 `gaps[]`。
- [ ] **雙向可追溯**：`source_ref` 皆能在 `sources[]` 找到對應的具體 `url` 或 `local_file` 與 `retrieved_at`。
- [ ] **路徑脫敏**：`local_file` 僅為檔名或專案內相對路徑，不含任何作業系統絕對路徑。
- [ ] **誠實狀態標記**：`status`（`verified` | `partial` | `unverified`）與實際覆蓋率完全相符，不在回覆中誇大已驗證範圍。
