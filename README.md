# 知識大冒險 EduQuiz Play

[![Deploy to GitHub Pages](https://github.com/lucifer0427/edu-quiz-play/actions/workflows/deploy.yml/badge.svg)](https://github.com/lucifer0427/edu-quiz-play/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

專為台灣國小（1–6 年級）學童設計的遊戲化線上學習與測驗平台。採用純前端靜態架構與 PWA 離線快取，透過 GitHub Pages 免費部署即可給親子家庭或班級使用。

**線上體驗**：https://lucifer0427.github.io/edu-quiz-play/

---

## 核心特色

- **115 學年度 1–6 年級全科一課一關課綱**
  - 覆蓋上、下學期共 **116 份課綱題庫包**、**1,001 個關卡（10,010 題）**。
  - 低年級涵蓋國語、數學、英語、生活、藝術、健體、綜合；中高年級涵蓋國語、數學、英語、自然、社會、藝術、健體、綜合、電腦與本土語（閩南語／客語）。
- **三幕式先學再測微課程（Micro-Lessons）**
  - 全站 **1,001 份微課程（3,321 幕）**，依序引導「核心概念錨點 → 精熟範例拆解 → 進場前暖身確認」，並內建低年級圖像與語文分齡護欄及 3D 空間視覺化（Three.js）。
- **114 個數學動態無限出題器 + 交錯複習**
  - 全學年 **109/109 數學單元 100% 動態出題**，搭配跨單元「4 新 + 2 舊」交錯複習機制與三層漸進提示。
- **雙人同機對戰模式（大寶小寶同樂）**
  - 支援 **合作打魔王**、**公平競速賽**（跨年級各自解題）與 **同題即時搶答**（12 秒倒數、答錯鎖定讓對方補答、連擊加分）。
  - 支援平板桌面 **面對面 180° 旋轉**、觸控搶答與桌機鍵盤快捷鍵（玩家 A `1–4`／玩家 B `7–0`），並覆蓋數學、國語、英語、生活／自然、社會與全科綜合。
- **FSRS 間隔重複錯題本與考前複習**
  - 整合 `ts-fsrs` 記憶樹演算法排程到期複習題，支援一鍵組卷「考前模擬考」、A4 紙本錯題卷列印，以及直接回看對應單元微課程。
- **平板手寫國字筆順練習**
  - 整合 `hanzi-writer` 與 1–6 年級國字注音詞彙庫，提供筆順動畫示範、描紅書寫與即時筆畫評分，並可透過 Service Worker 快取離線練習。
- **親子友善與零後端老師出題工具**
  - 支援多學童本機檔案切換、每日學習任務與連續打卡保護、20 分鐘護眼休息提醒、專注模式、數學教具（九九乘法閃電戰與互動時鐘）。
  - 支援 CSV / JSON 上傳、Google Sheets 公開 CSV 連結匯入、`#quiz=` URL Hash 一鍵分享，以及學習進度 JSON 匯出還原。

---

## 技術架構

- **前端框架**：React 19 + TypeScript 5.7（`strict: true`）+ Tailwind CSS v4 + Vite 6
- **互動與學習引擎**：`ts-fsrs`（間隔重複）、`hanzi-writer`（漢字筆順）、`three`（3D 幾何教具）、Web Audio API（無外部音檔音效合成）、Web Speech API（分齡語速唸題與英語發音）
- **離線與 PWA**：`public/sw.js`（Vite hashed assets 與筆順資料 Cache-First，HTML Network-First）
- **測試與驗證**：Vitest + Testing Library（jsdom）搭配 8 支領域自動化檢查腳本

---

## 本地開發與驗證指令

安裝依賴並啟動開發伺服器：

```bash
npm install
npm run dev
```

常用檢查與測試指令：

```bash
npm run validate:content       # 檢查課綱來源同步與微課程雙層護欄
npm run test:generators        # 抽測全部 114 個數學動態出題器（各 24 題）
npm run test:fsrs              # 驗證 FSRS 記憶排程引擎
npm run test:interleaving      # 驗證交錯練習與三層提示遮蔽
npm run test:lesson-synthesizer # 驗證 1,001 關微課程合成與分齡護欄
npm run test:daily-study       # 驗證每日學習目標與連續打卡寬限
npm run test:ui                # 執行 Vitest UI 與元件互動測試
```

執行完整驗證與正式建置（輸出至 `dist/`）：

```bash
npm run build
```

---

## 專案結構概覽

```text
edu-quiz-play/
├── content/curriculum-sources/   # 115 學年度 116 份課綱證據來源 JSON
├── public/                       # PWA manifest、icon 與 Service Worker (sw.js)
├── scripts/                      # 課綱同步、微課程護欄與各引擎自動化測試腳本
├── src/
│   ├── components/               # 關卡地圖、測驗戰鬥、微課程、雙人對戰、手寫國字等介面
│   │   ├── duo/                  # 雙人對戰模式模組（設定、分屏／搶答面板、題庫載入）
│   │   └── __tests__/            # Vitest 元件與 hook 自動化測試
│   ├── data/curriculum/          # 同步後的年級目錄、116 份題庫包與微課程腳本
│   ├── hooks/                    # 自訂 React Hooks（如 useEyeCareTimer）
│   └── utils/                    # FSRS、114 個數學出題器、語音、音效、本機儲存與匯入匯出
└── .github/workflows/deploy.yml  # GitHub Pages 自動驗證與部署流程
```

---

## 老師匯入 CSV / Google Sheets 格式說明

CSV 欄位順序（第一列標題可省略）：

`題目,選項A,選項B,選項C,選項D,正確答案(1-4或A-D),解析,提示(選填)`

若使用 Google 試算表：
1. 建立符合上述欄位的試算表。
2. 點選 **檔案 → 共用 → 發布到網路**，格式選擇 **逗號分隔值 (.csv)**。
3. 複製產生的連結，到網站內的「老師出題」分頁貼上即可即時匯入。

---

## GitHub Pages 自動部署

本專案已內建 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：

1. 推送程式碼至 `main` 分支（或手動觸發 `workflow_dispatch`）。
2. 於 GitHub Repository 的 **Settings → Pages** 將 **Source** 設為 **GitHub Actions**。
3. Workflow 會自動執行 `npm ci` 與完整 `npm run build` 驗證，通過後部署至 GitHub Pages。

---

## 授權條款

本專案採用 [MIT License](LICENSE) 授權。
