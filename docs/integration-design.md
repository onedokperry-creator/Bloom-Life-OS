# 3アプリ共通データ連携設計

対象アプリ:

- タスク管理Webアプリ: `https://habit-tracker-mauve-pi.vercel.app/`
- 家計管理Webアプリ: `https://summary-xi.vercel.app/`
- Bloom OS: Memories、Growth、感情、ビジョンボード、家計、カレンダー、AIチャットを統合するライフOS

## 方針

3つのWebアプリは別URLのままでよい。認証とデータだけを同じSupabaseプロジェクトへ寄せる。

すべての主要テーブルは `user_id` を持ち、`auth.users.id` に紐づく。各アプリはSupabase Authでログインした同一ユーザーのデータだけを読み書きする。

## 共通ユーザーID

Supabase Authの `auth.users.id` を唯一の共通ユーザーIDにする。

- `profiles.id`: 表示名、タイムゾーン、アバター
- `user_stats.user_id`: レベル、EXP、コイン、連続記録
- その他すべてのテーブル: `user_id`

各アプリのフロントエンドでは、ログイン後に次のように現在ユーザーを取得する。

```js
const { data } = await supabase.auth.getUser();
const userId = data.user.id;
```

## アプリ別の責務

### タスク管理アプリ

主に書き込むテーブル:

- `tasks`
- `goals`
- `calendar_events`

タスクを完了すると `tasks.status = 'done'` に更新する。Supabase側のトリガーで次が自動反映される。

- `accomplishment_logs`: Bloom OSのMemoriesに表示する「今日できたこと」
- `xp_events`: EXP付与履歴
- `user_stats`: EXP、コイン、レベル更新
- `vision_board_items`: 紐づく目標の進捗更新

### 家計管理アプリ

主に書き込むテーブル:

- `finance_transactions`
- `reward_saving_goals`
- `calendar_events`

Bloom OS側では以下を読む。

- ごほうび貯金: `reward_saving_goals`
- 支出予定: `finance_transactions.scheduled_on`
- カレンダー表示: `calendar_events`

### Bloom OS

主に読むテーブル:

- `bloom_os_home` view
- `tasks`
- `mood_logs`
- `accomplishment_logs`
- `ai_journal_entries`
- `ai_conversation_messages`
- `vision_board_items`
- `reward_saving_goals`
- `finance_transactions`
- `calendar_events`
- `user_stats`

主に書き込むテーブル:

- `mood_logs`
- `accomplishment_logs`
- `ai_journal_entries`
- `ai_conversation_messages`
- `vision_board_items`
- `reward_saving_goals`

AI相談とジャーナリングは、フロントエンドから直接OpenAI APIを呼ばず、Supabase Edge Functionなどのサーバー側処理を通す。相談文と返信は `ai_conversation_messages` に、日記として残す本文やAI要約は `ai_journal_entries` に保存する。

初期MVPでは本物のAI接続を必須にせず、Bloom OS内の「AI風分類」で自由入力をルールベースに整理する。例えば「今日はダンス楽しかった！帰りにカフェで1,200円使って、先生にも褒められた」と入力されたら、感情ログ、日記、支出、Memories、目標進捗の保存候補を表示し、ユーザーが確認してから保存する。将来OpenAI APIへ差し替える時も、保存前確認のUIとDB構造はそのまま使う。

## ホーム画面のデータ取得

Bloom OSのホームは `bloom_os_home` view を1回読むだけで、以下をまとめて取得できる。

- うさぎキャラに出すユーザー名
- レベル、EXP、コイン
- 今日の予定
- 今日の気分
- ごほうび貯金
- 今日のカレンダー

```js
const { data, error } = await supabase
  .from("bloom_os_home")
  .select("*")
  .eq("user_id", userId)
  .single();
```

## タスク達成からBloom OSへの反映

1. タスク管理アプリでタスクを完了する
2. `tasks.status` を `done` に更新する
3. DBトリガー `apply_task_completion_rewards` が実行される
4. 「今日できたこと」にタスク名が追加される
5. EXPとコインが加算される
6. EXPが一定値を超えるとレベルが上がる
7. `goal_id` が紐づいていればビジョンボードの進捗が進む

タスク管理アプリ側で複雑な連携処理を書く必要はない。完了状態だけを正しく更新すれば、共通DBが反映を担当する。

## 家計データからBloom OSへの反映

家計管理アプリでごほうび貯金を更新する場合:

- `reward_saving_goals.current_amount` を更新する
- Bloom OSのホーム画面で進捗バーとして表示する

支出予定をカレンダーに出す場合:

- `finance_transactions.scheduled_on` に日付を入れる
- 必要に応じて `calendar_events` に `kind = 'finance'` で同期する

## URLが別でも連携できる理由

別URLでも、同じSupabaseプロジェクト、同じAuth、同じ匿名公開キーを使えば、ユーザーは同一アカウントで各アプリにログインできる。

各Vercelプロジェクトには同じ環境変数を設定する。

```txt
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

Next.jsの場合は `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` にする。

## セキュリティ

`supabase-schema.sql` ではRow Level Securityを有効化している。

ユーザーは `auth.uid() = user_id` のデータだけを読み書きできる。別URLのアプリが同じDBを使っても、ログインユーザー以外のデータにはアクセスできない。

## 次に実装する順番

1. Supabaseプロジェクトを1つ作る
2. `supabase-schema.sql` をSQL Editorで実行する
3. 3つのVercelプロジェクトに同じSupabase環境変数を入れる
4. 各アプリにSupabase Authログインを追加する
5. タスク管理アプリの完了処理を `tasks.status = 'done'` 更新に寄せる
6. 家計管理アプリのごほうび貯金を `reward_saving_goals` に保存する
7. Bloom OSのホームを `bloom_os_home` から描画する
