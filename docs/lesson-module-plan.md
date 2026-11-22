# EduQuiz Play — 課程教學模組（互動微課程）獨立實作計畫

> 定位：專為 **GitHub Pages 純靜態部署**（Vite + React 19 + Tailwind v4）設計的「先學觀念、後測驗」微課程系統
> 理論依據：NotebookLM《學童記憶策略實證白皮書》（雙重編碼、示範題效應、認知負荷理論、雙層 Zod Schema）
> 關聯文件：[實證記憶策略與認知防禦升級計畫](./cognitive-memory-upgrade-plan.md)
> 建立日期：2026-11-22
> 執行進度：Phase A、Phase B 與 Phase C 全部已完成 ✅（`LessonPlayer` + 6 種 SVG 模板 + `Spatial3DScene` 按需渲染 3D + 3 份試點微課程 13 單元 41 幕 + 雙層護欄）

---

## 一、 核心架構原則（GitHub Pages 最佳解）

1. **純前端零後端（路線 A）**：不依賴 Node.js 伺服器、不暴露雲端 API Key、不引入 Remotion 商業授權與大量 MP3 音檔，確保 `npm run build` 產出靜態 `dist/` 後可直接穩定部署於 GitHub Pages。
2. **Schema 與未來 Remotion 管線 100% 相容**：所有課程資料以標準化 `LessonScript` JSON 儲存並通過雙層認知護欄驗證；未來若需額外產出離線 MP4 影片，可直接沿用同一批 JSON，無須重寫課程。
3. **極簡高訊噪比設計**：每堂微課程嚴格控制在 **3–5 幕（約 2–3 分鐘）**，徹底排除無關動畫、擬人化吉祥物與背景音樂（防範誘惑細節效應 `d = -0.30` / 遷移 `d = -0.48`）。

---

## 二、 使用者學習閉環與介面整合

### 1. 關卡入口雙軌制（[WorldMap.tsx](../src/components/WorldMap.tsx)）
點選任一關卡時，彈出或展開操作面板提供兩個入口：
- **「📖 先學觀念（2–3 分鐘）」**：當該關卡 `stageStars[id]` 為 `0`（尚未通關）時設為預設主按鈕。
- **「⚔️ 直接挑戰測驗」**：已通關或想直接檢核時，直接進入 [BattleArena.tsx](../src/components/BattleArena.tsx)。

### 2. 微課程播放器（新增 `src/components/LessonPlayer.tsx`）
- 採用全螢幕或置中卡片式步進播放（上一頁 / 下一頁 / 朗讀按鈕 / 進度條）。
- 最後一幕完成後，直接顯示「**進入實戰驗證（Exit Ticket）**」按鈕，無縫切換至該關卡的 `BattleArena`，將剛建立的基模立即透過提取練習鞏固。

---

## 三、 四種確定性教學元件設計（嚴禁自由排版）

所有微課程畫面僅能由以下 4 種預審元件組合渲染，把認知負荷規範硬編碼進系統：

### 1. `AnchorScene`（概念錨定＋雙重編碼）
- **適用**：全學科概念導入、詞彙具象化、自然／社會構造。
- **版面規範**：
  - 純白底程式化 SVG 圖解（或純淨圖標），**標籤文字直接寫在 SVG 同一座標系內緊鄰錨點**，杜絕「左圖右文」造成的注意力分散（Split-Attention）。
  - 單幕 `spatialLabels` 嚴格限制 **0–4 個**，每個標籤 **1–12 字**。
  - 可附帶 1 句生活熟悉類比（`analogyAnchor`，例如「電路中的電流就像水管裡的水流」）。
  - **Mathigon 式參數連動（可選）**：分數長條或長方形幾何模板可內嵌 `+ / -` 或滑桿，數值調整時 SVG 圖解即時同步變化，強化「符號 ↔ 數量」直覺。

### 2. `WorkedExampleSplit`（正反示範對比幕）
- **適用**：數學運算與應用題、自然科學實驗變因控制。
- **版面規範**：
  - **左欄（正確示範）**：1–4 步驟拆解，6–8 歲低年級強制維持步驟小卡可見（`keepStepCardVisible: true`）。
  - **步驟逐層解鎖（Brilliant 式 Gated Reveal）**：後續步驟預設先收折或半透明遮蔽，由學童點擊「下一步」或回答微提問才逐行展開，防止工作記憶一次被 4 步塞滿。
  - **右欄（常見錯誤對比）**：紅框標示「最容易寫錯的步驟與原因」，直接建立錯誤區辨力。
  - **中高年級同步自我解釋**：9–12 歲單元於下方附 1 句引導思考框（「想一想：為什麼這一步要選這個做法？」）。

### 3. `TopicSignalBox`（延伸補充隔離框）
- **適用**：確有必要保留的背景故事或生活延伸知識。
- **認知護欄**：
  - 使用高對比邊框與明確標題標示「**延伸補充（非核心考點）**」，降低對主脈絡的干擾。
  - **絕對禁止出現在第 1 幕（`scenes[0]`）**，防止兒童在課堂開頭激活錯誤的認知基模。

### 4. `WarmupCheck`（微檢核過渡幕，可選）
- 在進入 `BattleArena` 前提供 1 題零扣血暖身確認（低年級三選一／看圖配對），確認概念已進入工作記憶再開始計分戰鬥。

### 5. `Spatial3DScene`（功能型極簡 3D 空間元件 — 僅限立體幾何與天文）
- **適用範圍（白名單制）**：嚴格限定於 **2D 無法清楚表達空間關係** 的單元，例如 G5 下長方體體積（`g5s2-math-u3`）與表面積展開圖（`g5s2-math-u9`）、G6 下角柱與圓柱展開（`g6s2-math-u3`），以及自然科地球自轉公轉／月相變化。其餘 90% 單元維持 2D 程式化 SVG。
- **認知安全規格（防誘惑細節）**：
  - 採**純色幾何＋高對比邊線（`EdgesGeometry`）**，關閉擬真光影貼圖、陰影投射與粒子特效。
  - **受控互動**：只開放服務於解題思考的控制項（例如「展開／摺疊滑桿」、「逐層顯示積木」、「重設標準視角」），避免無目的自由把玩造成注意力劫持。
  - 預設固定初始視角並搭配固定 2D 圖例標註長／寬／高，避免鏡頭旋轉導致標籤遮擋。
- **GitHub Pages 效能護欄**：
  - 必須透過 `React.lazy()` 與動態 `import()` 隔離 `three` 套件，**絕不進入首屏 bundle**，僅在載入 3D 單元時才下載。
  - **按需渲染（`frameloop="demand"`）**：模型靜止時完全停止重繪，僅於使用者拖曳旋轉或拉動滑桿時呼叫 `invalidate()` 渲染，避免低階平板過熱降頻。
  - **Draw Call 與記憶體優化**：單位積木堆疊必須使用 `InstancedMesh` 合併為單一 Draw Call；採用 `MeshBasicMaterial`／`MeshLambertMaterial`、限制 `devicePixelRatio <= 1.5`，並於元件卸載或切換題目時明確呼叫 `.dispose()` 釋放幾何與材質。
  - 單一畫面最多同時存在 1 個 WebGL `<Canvas>`，避免學校低階平板／Chromebook 掉幀或耗盡 WebGL Context。

---

## 四、 資料契約與雙層認知護欄

### 1. TypeScript 型別定義（新增 `src/types/lesson.ts`）
```ts
export type AgeBand = 'AGE_6_8_LOWER' | 'AGE_9_12_UPPER';
export type LessonSubject = 'LANGUAGE' | 'MATH' | 'SCIENCE_SOCIAL';
export type SceneComponentType =
  | 'ANCHOR_SCENE'
  | 'WORKED_EXAMPLE_SPLIT'
  | 'TOPIC_SIGNAL_BOX'
  | 'WARMUP_CHECK'
  | 'SPATIAL_3D_SCENE';

export interface SpatialLabel {
  id: string;
  text: string;          // 1-12 字繁中精簡標籤
  anchorPointId: string; // 對應 SVG 座標錨點
}

export interface LessonScene {
  sceneId: string;
  componentType: SceneComponentType;
  title: string;
  narrationText: string;     // 台灣繁體中文口語講解，供顯示與朗讀
  cognitiveChunks: string[]; // 本幕核心意元，嚴格 1-4 項
  analogyAnchor?: string;    // 生活類比
  visualSpec?: {
    templateId: string;      // 對應系統內建 SVG 模板 ID
    params?: Record<string, unknown>;
    spatialLabels: SpatialLabel[]; // 0-4 項
  };
  workedExampleData?: {
    problemStatement: string;
    steps: string[];              // 1-4 步
    commonErrorContrast: string;  // 常見錯誤對比
    selfExplanationPrompt?: string;
    keepStepCardVisible: boolean; // AGE_6_8_LOWER 必須為 true
  };
  topicSignalTitle?: string;      // 僅 TOPIC_SIGNAL_BOX 必填
  spatial3dSpec?: {               // 僅 SPATIAL_3D_SCENE 必填
    modelType: 'CUBOID_BLOCKS' | 'NET_UNFOLD' | 'CYLINDER_UNFOLD' | 'EARTH_MOON_SUN';
    params: Record<string, number | string>;
    allowedControls: ('UNFOLD_SLIDER' | 'LAYER_SLICE' | 'ORBIT_RESET')[];
  };
  factGroundingSourceId: string;  // 綁定 content/curriculum-sources/ 課綱單元
}

export interface LessonScript {
  schemaVersion: '2026.1';
  lessonId: string;
  stageId: string; // 對應 Stage.id
  title: string;
  ageBand: AgeBand;
  subject: LessonSubject;
  scenes: LessonScene[]; // 建議 3-5 幕
}
```

### 2. 懶載入與驗證管線
- **儲存位置**：`src/data/curriculum/lessons/<semester>/<grade>/<subject>.json`
- **懶載入（新增 `src/data/curriculum/lessonLoader.ts`）**：比照現有 [loader.ts](../src/data/curriculum/loader.ts) 使用 `import.meta.glob`，僅在使用者點擊「先學觀念」時載入對應科目 JSON，不膨脹首屏 JS。
- **自動化護欄（新增 `scripts/validate-lessons.mjs` 並接入 `npm run validate:content`）**：
  - 檢查 `scenes.length`（1–6 幕）與 `scenes[0].componentType !== 'TOPIC_SIGNAL_BOX'`。
  - 檢查每幕 `cognitiveChunks.length` 介於 `1–4`。
  - 檢查 `spatialLabels.length <= 4` 且標籤長度 `1–12` 字。
  - 掃描 `narrationText` 與 `templateId` 是否命中誘惑細節禁用詞（如吉祥物、魔法棒、超炫特效、撒花等）。
  - 檢查 `AGE_6_8_LOWER` 的 `WORKED_EXAMPLE_SPLIT` 必為 `keepStepCardVisible: true`。
  - 檢查 `SPATIAL_3D_SCENE` 僅能出現於數學／自然科，嚴禁出現於語文科（`LANGUAGE`），且 `spatial3dSpec` 必須明確宣告受控互動項目。
  - 檢查 `factGroundingSourceId` 非空且 `stageId` 可對應現有題庫關卡。

---

## 五、 程式化 SVG 模板庫與語音設計

### 1. 可複用 SVG 圖解模板（新增 `src/components/lesson-diagrams/`）
先從國小數學與自然最常卡關的通用圖解起步，避免手刻過多單一圖檔：
- **數學類**：`FractionBarDiagram`（分數長條／圓餅分割）、`RectGeometryDiagram`（長方形周長與面積標註）、`NumberLineDiagram`（數線與加減乘除跳格）、`ClockDiagram`（時鐘指針判讀）。
- **通用／自然社會類**：`FlowCauseDiagram`（2–4 節點因果流程箭頭圖）、`ConceptCompareTable`（兩欄概念特徵對比圖）。
- 所有模板統一接收 `spatialLabels` 與 `anchorCoordinates`，確保文字與圖形在同一個 `<svg viewBox>` 內零重疊。

### 2. 語音朗讀調整（[speech.ts](../src/utils/speech.ts)）
- 沿用瀏覽器原生 `window.speechSynthesis`（零流量、GitHub Pages 零負擔）。
- 新增語速參數支援：G1–G2 課程預設 `rate = 0.85`（較清晰），G3–G6 維持 `0.95`，並於 `LessonPlayer` 介面提供「正常 / 慢速」切換。

---

## 六、 學習紀錄整合（[quiz.ts](../src/types/quiz.ts)、[storage.ts](../src/utils/storage.ts)）

- 在 `PlayerProgress` 新增 optional 欄位（完全向後相容）：
  - `completedLessonIds?: string[]`：紀錄已讀完的微課程 ID，完成後給予固定探索獎勵（如 +10 XP），並在 `WorldMap` 標示「已學過」。

---

## 七、 分階段執行路線

| 階段 | 目標與交付物 | 驗證標準 |
| :--- | :--- | :--- |
| **Phase A：播放器與基礎架構（已完成 ✅）** | 1. `src/types/lesson.ts`、`lessonLoader.ts`<br>2. `LessonPlayer.tsx`（含 4 種元件與朗讀，`React.lazy` 懶載入）<br>3. 6 個通用 SVG 模板（`LessonDiagram.tsx`：分數、幾何、數線、流程、對比、扇形時鐘，含互動參數）<br>4. `scripts/validate-lessons.mjs` 雙層護欄腳本<br>5. `WorldMap.tsx` 雙入口整合 ＋ `App.tsx` `+10 XP` 獎勵 | `npm run validate:content` 通過；`LessonPlayer` 獨立 async chunk（21.87 kB）；`npm run build` 零錯誤 |
| **Phase B：試點科目內容產出（已完成 ✅）** | 完成 **G5 上學期數學（`115-s1/g5/math.json`）** 全 10 單元共 32 幕微課程 | 全 10 單元通過雙層護欄（含自測）與 `npm run build` |
| **Phase C：記憶升級匯流與 3D 空間擴充（已完成 ✅）** | 1. 數學連錯 2 題自動抽出共用 `WorkedExampleSplit` 作為降階鷹架<br>2. 以 `React.lazy()` 導入純 `three` `Spatial3DScene`（試點 G5 下 `u3` 體積積木分層、`u9` 長方體展開圖與 G6 下 `u3` 圓柱展開圖） | 連錯降階已通過；`Spatial3DScene` 拆為獨立 async chunk（`539.62 kB` / gzip `135.59 kB`），首屏 `index` 維持 `449.16 kB`（未引入 `three`）；`npm run build` 零錯誤 |
