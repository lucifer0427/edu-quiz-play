# 知識大冒險 EduQuiz Play

專為國小學童設計的遊戲化線上測驗平台，完全純前端靜態架構，透過 GitHub Pages 免費部署即可給班級或親子使用。

## 特色功能

- **RPG 闖關打怪**：答對題目攻擊知識怪獸、累積 `3 Combo` 觸發爆擊傷害與彩帶慶祝，答錯不倒扣時間並立即顯示「小老師解析」。
- **四大科目世界 + 動態無限數學出題**：
  - 數學王國（演算法動態出題：加減法草原、九九乘法城堡）
  - 國語森林（成語小達人、字音字形大挑戰）
  - 英語島嶼（單字與日常會話，支援瀏覽器 Web Speech API 朗讀發音）
  - 自然實驗室（動植物奧秘、太空與天氣探險）
- **英雄圖鑑與養成**：賺取金幣解鎖 6 位可愛原創英雄，經驗值累積自動升級。
- **自動錯題本**：答錯自動收錄解析，發起「錯題複習戰」答對即移除錯題並獲得雙倍金幣。
- **零後端老師出題工具**：
  - 下載並上傳 CSV / JSON 自訂題庫
  - 貼上 Google Sheets「發佈到網路 → CSV」公開連結即時匯入
  - 一鍵產生專屬分享連結（寫入 URL Hash `#quiz=...`），免登入即可開玩
  - 支援一鍵匯出學生學習紀錄 JSON
- **零外部音效檔**：使用 Web Audio API 即時合成可愛遊戲音效（支援靜音切換）。

## 本地開發

```bash
npm install
npm run dev
```

建置靜態檔案（輸出至 `dist/`）：

```bash
npm run build
```

## GitHub Pages 自動部署步驟

本專案已內建 `.github/workflows/deploy.yml`：

1. 將程式碼推上 GitHub `main` 分支。
2. 到 GitHub Repository 的 **Settings → Pages**。
3. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
4. 等待 Action 跑完，即可透過 `https://lucifer0427.github.io/edu-quiz-play/` 開啟網站。

## 老師匯入 CSV / Google Sheets 格式說明

CSV 欄位順序（第一列標題可省略）：

`題目,選項A,選項B,選項C,選項D,正確答案(1-4或A-D),解析,提示(選填)`

若使用 Google 試算表：
1. 建立符合上述欄位的試算表。
2. 點選 **檔案 → 共用 → 發布到網路**，格式選擇 **逗號分隔值 (.csv)**。
3. 複製產生的連結，到網站內的「老師出題」分頁貼上即可即時匯入。
