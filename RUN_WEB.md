# RisuAI：用 Web 模式跑起來（Vite）

> 更新日期：2025-12-26

本文件記錄如何在 **Web（瀏覽器）** 模式啟動 RisuAI（Svelte + Vite），方便日後快速復現。

## 1) 必要條件

- Windows / macOS / Linux 皆可
- Node.js（建議使用 LTS，但本專案在 Windows + Node 25 也可跑）
- 套件管理器：**pnpm**（本專案使用 `pnpm-lock.yaml`）

### 如果你的 `pnpm` 指令找不到（Windows 常見）

你可以用以下任一種方式：

- **方式 A：用 npm 安裝 pnpm（最直觀）**
  - `npm install -g pnpm@9`
  - 並確認你的 PATH 包含：
    - `C:\Users\<你的使用者>\AppData\Roaming\npm`

- **方式 B：把 npm 的 global bin 加到 PATH**
  - 在 PowerShell 暫時加（只影響當前 Terminal）：
    - `$env:Path += ";C:\Users\<你的使用者>\AppData\Roaming\npm"`

> 註：如果你要永久生效，請到 Windows「環境變數」把該路徑加入 `Path`。

## 2) 安裝依賴

在專案根目錄（有 `package.json` 那層）執行：

- `pnpm install`

> 第一次安裝可能會花幾分鐘。若看到某些 optional dependency 的安裝腳本失敗（例如 canvas），通常不影響 Web 開發伺服器啟動。

## 3) 啟動 Web 開發伺服器（Development）

在專案根目錄執行：

- `pnpm dev -- --host`

啟動後會看到類似輸出：

- Local：`http://localhost:5174/`
- Network：會列出你的區網 IP（用手機/其他電腦測試時用）

### 停止伺服器

在執行中的 Terminal 視窗按 `Ctrl + C`。

## 4) Production 方式（Build + Preview）

若你想用接近正式環境的方式驗證：

1. `pnpm build`
2. `pnpm preview -- --host`

`preview` 會啟動一個靜態伺服器來預覽 `dist/`。

## 5) 常見問題

### Q1：啟動後 port 不是 5174？

Vite 會在預設 port 被佔用時自動換一個可用的 port。請以 Terminal 顯示的 URL 為準。

### Q2：公司網路/防火牆導致手機無法連線？

請確認：

- 你使用的是 `pnpm dev -- --host`
- Windows 防火牆允許 Node/Vite 對外監聽
- 手機與電腦在同一個網段

---

## 參考

- `package.json` scripts：`dev`, `build`, `preview`
- 專案前端技術：Svelte 5 + Vite
