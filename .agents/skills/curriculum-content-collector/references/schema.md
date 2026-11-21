# 課程內容蒐集輸出格式規範（Schema）

所有透過 `curriculum-content-collector` 蒐集並產出的檔案（預設存放於 `content/curriculum-sources/<academic_year>-s<semester>/g<grade>/<subject_slug>.json`，未指定學期時為 `content/curriculum-sources/<academic_year>/g<grade>/<subject_slug>.json`），皆必須嚴格遵守以下 JSON 結構與驗證規則。

---

## 頂層欄位定義

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `schema_version` | `string` | 是 | 固定為 `"1.0.0"` |
| `target` | `object` | 是 | 目標規格：`school`, `academic_year`（如 `115`）, `semester`（`1` \| `2` \| `null`）, `grade`（`1`–`6`）, `subject`, `publisher`, `book_series`（無系列書名時填 `null`） |
| `status` | `string` | 是 | `"verified"`（全單元具 `tier1` 佐證且無關鍵缺口）\| `"partial"`（部分驗證或部分依賴 `tier2` / 尚有 `gaps`）\| `"unverified"`（尚未取得可採信來源） |
| `collected_at` | `string` | 是 | ISO 8601 時間戳記（如 `"2026-11-21T12:30:00+08:00"`） |
| `sources` | `Source[]` | 是 | 所有引用來源的完整清單（可為空陣列，但若 `units` 非空則必至少有一筆） |
| `units` | `Unit[]` | 是 | 已驗證的單元與課次資料；無證據時必須為 `[]` |
| `gaps` | `Gap[]` | 是 | 所有缺口、阻礙或未確認項目的清單；無缺口時為 `[]` |

---

## 子物件結構

### `Source`
```json
{
  "id": "src-1",
  "source_tier": "tier1",
  "source_title": "桃園市大忠國小 115 學年度四年級課程計畫書（英語）",
  "source_url": "https://example.edu.tw/plan.pdf",
  "local_file": null,
  "retrieved_at": "2026-11-21T12:30:00+08:00",
  "matched_metadata": {
    "academic_year": 115,
    "semester": 1,
    "grade": 4,
    "subject": "英語",
    "publisher": "翰林",
    "book_series": "Here We Go 3"
  }
}
```
> 規則：`source_url` 與 `local_file` 至少須有一個為非 `null` 值；`local_file` 僅填檔名或專案內相對路徑，不得填入作業系統絕對路徑。

### `Unit` 與 `Lesson`
```json
{
  "unit_no": 1,
  "title": "Unit 1（逐字來源標題）",
  "lessons": [
    {
      "lesson_no": 1,
      "title": "課次或主題標題（無獨立課次時可與單元同或填 null）",
      "learning_points": ["（僅填來源明文列出的學習重點或句型）"],
      "vocabulary": ["（僅填來源明文列出的單字或生字）"],
      "source_ref": "src-1",
      "verbatim_excerpt": "來源原文逐字摘錄片段（含單元名稱與內容依據）",
      "confidence": "primary"
    }
  ]
}
```
> 規則：
> - `confidence` 僅允許 `"primary"`（對應 `tier1` 來源）、`"secondary"`（僅有 `tier2` 來源）、`"fallback_pending_verification"`（僅於使用者明確同意採用舊年度暫代時使用）。
> - 若來源僅有單元名稱、沒有細部生字或單字列表，`vocabulary` 與 `learning_points` 必須保持 `[]`，並在 `gaps` 記錄缺少細部詞彙／重點，嚴禁自行補充。

### `Gap`
```json
{
  "field": "units[1].vocabulary",
  "reason": "login_required | year_mismatch | not_published_yet | source_not_found | ambiguous_edition",
  "detail": "具體說明查到什麼、為何無法採信或被什麼阻擋",
  "recommended_action": "建議使用者如何補件（例如提供課本目次頁照片或課程計畫 PDF）"
}
```

---

## 合格與不合格對照範例

### 合格範例（證據優先＋誠實標記缺口）

```json
{
  "schema_version": "1.0.0",
  "target": {
    "school": "桃園市大忠國小",
    "academic_year": 115,
    "semester": 1,
    "grade": 4,
    "subject": "英語",
    "publisher": "翰林",
    "book_series": "Here We Go 3"
  },
  "status": "partial",
  "collected_at": "2026-11-21T12:30:00+08:00",
  "sources": [
    {
      "id": "src-1",
      "source_tier": "tier1",
      "source_title": "桃園市大忠國小115學年度各年級教科書選用版本一覽表",
      "source_url": null,
      "local_file": "115學年教科書版本.pdf",
      "retrieved_at": "2026-11-21T12:11:19+08:00",
      "matched_metadata": {
        "academic_year": 115,
        "semester": null,
        "grade": 4,
        "subject": "英語",
        "publisher": "翰林",
        "book_series": "Here We Go 3"
      }
    }
  ],
  "units": [],
  "gaps": [
    {
      "field": "units",
      "reason": "source_not_found",
      "detail": "選書表已確認 115 學年度四年級英語為翰林 Here We Go 3，但尚未取得 115 學年度公開課程計畫書或課本目次頁。",
      "recommended_action": "請提供大忠國小 115 學年度課程計畫 PDF 或翰林 Here We Go 3 目次頁照片。"
    }
  ]
}
```

### 不合格範例（違反鐵律 — 嚴禁出現）

```json
{
  "status": "verified",
  "units": [
    {
      "unit_no": 1,
      "title": "Unit 1 Where Are You From?",
      "lessons": [
        {
          "lesson_no": 1,
          "title": "Unit 1",
          "learning_points": ["Where are you from? / I'm from Taiwan."],
          "vocabulary": ["Taiwan", "Japan", "USA"],
          "source_ref": "memory",
          "verbatim_excerpt": "",
          "confidence": "primary"
        }
      ]
    }
  ],
  "gaps": []
}
```
> **不合格原因**：
> 1. `source_ref: "memory"` 屬於禁用 `tier3`，無實際 `tier1`/`tier2` 出處。
> 2. `verbatim_excerpt` 為空，無法證明 115 學年度確為此單元名稱與單字。
> 3. 將未驗證內容標為 `"status": "verified"`，且未記錄缺口。
