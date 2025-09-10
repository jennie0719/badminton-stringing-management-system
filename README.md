# 穿線服務多租戶網站

這個專案是一個為羽毛球穿線服務設計的多租戶（Multi-Tenant）網站。每個客戶都有獨立的資料空間，並可根據自身需求客製化表單欄位。

## 功能特色
- **安全登入**：使用 JWT 進行使用者驗證，確保資料安全。
- **多租戶架構**：每個客戶的資料都儲存在獨立的資料庫 Schema 中，資料彼此隔離，互不干擾。
- **動態表單**：客戶可以根據需求設定自己的表單欄位，前端會根據設定動態生成。
- **專業級部署**：後端 API 部署在 Vercel Serverless Functions，前端部署在 Vercel 靜態網站。

## 技術堆疊
- **前端**：HTML, CSS, JavaScript
- **後端**：Node.js (Express.js)
- **資料庫**：PostgreSQL
- **部署**：GitHub Actions + Vercel

## 安裝與執行
### 1. 複製專案
首先，將專案從 GitHub 複製到你的本機：
```bash
git clone [https://github.com/你的用戶名稱/你的專案名稱.git](https://github.com/你的用戶名稱/你的專案名稱.git)
cd 你的專案名稱
```

### 2. 設定後端環境
 * 進入 server 資料夾：`cd server`
 * 安裝套件：`npm install`
 * 在 `server/` 資料夾中建立 `.env` 檔案，並填入你的資料庫連線字串和 JWT 密鑰。
### 3. 啟動後端伺服器
```
npm run dev
```

後端伺服器將在 http://localhost:3000 運行。
### 4. 執行前端
 * 前端程式碼在 `frontend/` 資料夾中。你可以在瀏覽器中直接開啟 `login.html` 來測試。
 * 注意： 在部署到 Vercel 之前，`login.js` 和 `script.js` 檔案中的 `API_BASE_URL` 需要保持為本機網址 (http://localhost:3000)。
部署流程
 * GitHub Secrets：請在你的 GitHub 專案中設定 VERCEL_TOKEN。
 * Vercel 環境變數：在 Vercel 後台設定 DATABASE_URL 和 JWT_SECRET。
 * 當你將程式碼推送到 main 分支時，GitHub Actions 會自動觸發部署，將你的前後端部署到 Vercel。
<!-- end list -->