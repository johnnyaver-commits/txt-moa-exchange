# MOA Market

TXT 周邊交換社群平台，提供 CD、照片小卡、小物交換分享、留言、收藏、追蹤、私訊、檢舉與管理員審核功能。

## 功能

- 僅限 E-mail 與密碼登入、註冊
- 發佈、編輯、刪除自己的交換貼文
- 留言、刪除自己的留言、收藏、追蹤與私訊
- 交換流程狀態、完成後互評與信用分數
- 檢舉貼文/留言、管理員隱藏貼文與封鎖會員
- AI 管理員巡查提示，優先標示高風險檢舉
- 使用規範與隱私政策頁
- Mobile-first 響應式介面

## 重要聲明

本平台只提供 TXT 周邊交換分享，不提供金流、不代收款、不保管款項，也不負責任何付款交易或私下買賣糾紛。

使用者不應公開地址、電話、付款資訊、身分證件或其他個資。遇到要求先付款、代購、抽獎、外部連結或廣告導流，請立即檢舉。

## Demo 帳號

Demo seed 僅建立一般會員，不再建立 demo admin。

- `yeonbin@example.com` / `txt123`
- `sora@example.com` / `txt123`

正式管理員請在網站註冊自己的 E-mail 帳號後，於 Supabase SQL Editor 手動授權：

```sql
update public.profiles
set is_admin = true
where username = '你的username';
```

## 本機開發

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Supabase + Cloudinary

1. 建立 Supabase 專案。
2. 在 Supabase SQL Editor 執行 `supabase/schema.sql`。
3. 在 Supabase Auth 設定正式 Site URL 與 Redirect URL。
4. 建立 Cloudinary unsigned upload preset，限制 image 檔案與檔案大小。
5. 將 `.env.example` 內容填入 `.env.local` 與 Vercel Environment Variables。
6. 需要 demo data 時執行：

```bash
npm run seed:supabase
```

## 環境變數

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

Seed script 另需：

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## 正式維運

- 每日查看管理後台檢舉列表與 AI 高風險提示。
- 每週在 Supabase 後台匯出資料備份，重大改版前額外備份一次。
- 定期檢查 Cloudinary 用量，避免大量不當圖片消耗免費額度。

## 測試

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```
