# MOA Market

TXT 周邊商品交換社群平台原型，支援 CD、照片小卡、小物的交換分享。介面風格參考 IG / FB 動態牆，使用韓式清爽視覺，不包含任何金流或付款流程。

## 功能

- 帳號密碼登入與註冊示範
- 發佈交換貼文：照片、內容、分類、狀態、標籤
- Feed、按讚、留言、私訊
- 搜尋與分類篩選
- 個人頁與管理後台示範
- Mobile-first 響應式底部導航

## Demo 帳號

- 一般會員：`yeonbin` / `txt123`
- 一般會員：`sora` / `txt123`
- 管理員：`admin` / `admin123`

## 開發

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 驗證

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

## 備註

目前資料以 `localStorage` 模擬，適合前端原型展示。正式產品建議接 Firebase Auth / Firestore / Storage，或 PostgreSQL + 物件儲存服務。
