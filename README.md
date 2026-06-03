# MOA Market

TXT 周邊商品交換社群平台原型，支援 CD、照片小卡、小物的交換分享。介面風格參考 IG / FB 動態牆，使用韓式清爽視覺，不包含任何金流或付款流程。

## 功能

- 僅限 E-mail 與密碼登入、註冊
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
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Supabase + Cloudinary

這個專案可在沒有金鑰時使用 demo 模式；設定下列環境變數後會自動切換為雲端資料。

1. 在 Supabase 建立新專案。
2. 到 Supabase SQL Editor 執行 `supabase/schema.sql`。
3. 在 Supabase Auth 設定中，若要使用 `帳號@moa.local` 這種示範帳號，建議關閉 email confirmation。
4. 在 Cloudinary 建立 unsigned upload preset。
5. 將 `.env.example` 的值填入 `.env.local`，並同步設定到 Vercel Environment Variables。
6. 如需建立 demo 帳號與初始貼文，可執行：

```bash
npm run seed:supabase
```

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

## 驗證

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

## 備註

未設定環境變數時，資料以 `localStorage` 模擬。設定 Supabase 與 Cloudinary 後，會員、貼文、留言、按讚會使用 Supabase，圖片會上傳到 Cloudinary。

目前 Supabase 可透過 Vercel Marketplace 建立與同步環境變數。Cloudinary 不是本專案 Vercel Marketplace 可直接 provision 的 integration，需到 Cloudinary 建立 unsigned upload preset 後再把 cloud name 與 preset name 加到 Vercel。
