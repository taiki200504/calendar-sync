# Supabase Authentication（Google）の設定手順

このプロジェクトでは **Supabase Authentication** の Google プロバイダーでログインします。以下の手順で Supabase と Google Cloud を設定してください。

---

## 1. Supabase Dashboard で Google を有効化

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. プロジェクト（例: `tthmjkltvrwlxtqanydk`）を選択
3. 左メニュー **Authentication** → **Providers**
4. **Google** を探して **Enable** にする
5. **Client ID** と **Client Secret** を入力（次のステップで取得した値）

---

## 2. Google Cloud で OAuth クライアントを用意

1. [Google Cloud Console](https://console.cloud.google.com/) → 対象プロジェクト
2. **API とサービス** → **認証情報** → **認証情報を作成** → **OAuth クライアント ID**
3. アプリケーションの種類: **ウェブアプリケーション**
4. **承認済みのリダイレクト URI** に次を追加:
   - `https://tthmjkltvrwlxtqanydk.supabase.co/auth/v1/callback`
   - 本番のフロントのオリジンを使う場合も、Supabase のコールバック URL は上記のまま
5. 作成後、**クライアント ID** と **クライアントシークレット** をコピー
6. Supabase の **Authentication → Providers → Google** に貼り付けて保存

※ 既に CalendarSync 用の OAuth クライアントがある場合は、その同じ Client ID / Secret の「承認済みのリダイレクト URI」に  
`https://tthmjkltvrwlxtqanydk.supabase.co/auth/v1/callback` を **追加** して使ってもかまいません。

---

## 3. 環境変数の設定

### バックエンド（Vercel / サーバー）

| 変数名 | 説明 | 取得場所 |
|--------|------|----------|
| `SUPABASE_JWT_SECRET` | JWT 検証用シークレット | Supabase: **Project Settings** → **API** → **JWT Secret** をコピー |

- Vercel の **Settings → Environment Variables** に `SUPABASE_JWT_SECRET` を追加

### フロントエンド（Vite）

| 変数名 | 説明 |
|--------|------|
| `VITE_SUPABASE_URL` | プロジェクト URL（例: `https://tthmjkltvrwlxtqanydk.supabase.co`） |
| `VITE_SUPABASE_ANON_KEY` | 匿名鍵（Project Settings → API → anon public） |

- ローカル: `frontend/.env` またはルートの `.env.production` に記載
- Vercel: **Settings → Environment Variables** に同じ名前で追加（ビルド時に `VITE_*` が埋め込まれます）

---

## 4. マイグレーション

Supabase ユーザーとアカウントを紐付けるために `accounts` に `supabase_user_id` を追加しています。

```bash
cd backend
export $(grep -v '^#' ../.env.production | xargs)
npm run migrate:up
```

※ 本番 DB に直接つなぐ場合は、事前に `DATABASE_URL` を本番用に設定してください。

---

## 5. 動作確認

1. フロントを開く（例: `https://calendar-sync-os.vercel.app`）
2. **Googleでログイン** をクリック
3. Google 認証後に Supabase 経由でアプリに戻り、ダッシュボードが表示されれば OK

---

## 補足: Google カレンダー連携

- **ログイン**は Supabase Auth (Google) で行います。
- **Google カレンダーのトークン**（同期用）は、これまで通りバックエンドの `/api/auth/google` フローで取得します。
- ダッシュボードなどで「Googleカレンダーを接続」などのリンクから `/api/auth/google` に飛ばし、同じアカウントにカレンダー用トークンを紐付けてください。
