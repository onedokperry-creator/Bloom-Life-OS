# AI相談・ジャーナリング連携設計

できます。アプリ上には「ChatGPT風のAI相談アイコン」を置き、初期MVPではルールベースのAI風分類、本番拡張ではOpenAI APIによる相談応答に差し替える構成がよいです。

重要なのは、OpenAI APIキーをWebブラウザへ直接入れないことです。Bloom OSのフロントエンドはSupabaseへログインし、相談文をSupabase Edge Functionなどのサーバー側処理へ送ります。そのサーバー側だけがOpenAI APIキーを持ちます。

参考: OpenAIの公式APIドキュメントでは、テキスト生成はResponses APIなどで実装できます。
https://developers.openai.com/api/docs/guides/text

## 画面上の使い方

Bloom OSに `Chat` アイコンを追加しました。

できる想定:

- 今日の気持ちをジャーナリングする
- 不安や迷いをやさしく整理する
- 今日できたことを一緒に見つける
- 明日の小さな一歩を提案する
- 相談内容を `ai_journal_entries` に保存する
- AIとのやりとりを `ai_conversation_messages` に保存する

## データ保存先

`supabase-schema.sql` に以下を追加しています。

- `ai_journal_entries`: ジャーナル本文、AI要約、振り返りプロンプト
- `ai_conversation_messages`: ユーザーとAIの会話ログ

どちらも `user_id` でSupabase Authのユーザーに紐づきます。

## 推奨構成

初期MVP:

```txt
Web App
  -> 自由入力
  -> ブラウザ内のAI風分類
  -> 保存前確認
  -> Supabase DBへ保存
```

本番AI連携:

```txt
Web App
  -> Supabase Authでログイン
  -> Supabase Edge Functionへ相談文を送信
  -> Edge FunctionがOpenAI APIを呼ぶ
  -> 結果をSupabase DBへ保存
  -> Web Appへ返す
```

## Edge Functionのイメージ

```ts
import OpenAI from "npm:openai";
import { createClient } from "npm:@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const { message } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader ?? "" } } }
  );

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await openai.responses.create({
    model: "gpt-5.5",
    input: [
      {
        role: "system",
        content:
          "あなたはBloom OS内のライフ整理アシスタントです。ユーザーの自然な入力から、予定、支出、感情、Memories、Growth、目標進捗をやさしく整理してください。医療・法律・金融の断定は避け、ユーザーを責めず、短く確認しやすく返してください。",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const reply = response.output_text;

  await supabase.from("ai_conversation_messages").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: reply, model: "gpt-5.5" },
  ]);

  return Response.json({ reply });
});
```

## 注意点

- メンタルヘルスの診断や治療の代替にはしない
- 深刻な自傷・他害の内容には緊急窓口や信頼できる人への相談を促す
- 家計データや感情ログをAIへ送る場合、送信範囲をユーザーに明示する
- 相談履歴を保存する/しないを設定で選べるようにする
- APIキーはVercelやSupabaseの環境変数に置き、フロントエンドへ出さない
