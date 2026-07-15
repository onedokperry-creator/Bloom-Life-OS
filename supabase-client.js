import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = import.meta.env ?? {};

function normalizeSupabaseUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch (_error) {
    return value.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  }
}

const supabaseUrl = normalizeSupabaseUrl(
  env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? ""
);
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function getCurrentUser() {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export async function getCalendarEvents({ userId, days = 7 }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const { data, error } = await supabase
    .from("calendar_events")
    .select("id,title,starts_at,ends_at,kind,source_app")
    .eq("user_id", userId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getTodayTasks({ userId, limit = 6 }) {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,status,due_date,due_at,completed_at,source_app,updated_at")
    .eq("user_id", userId)
    .neq("status", "archived")
    .or(`due_date.eq.${today},due_date.is.null`)
    .order("status", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function updateTaskStatus({ userId, taskId, done }) {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "todo",
      completed_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("id,title,status,due_date,due_at,completed_at,source_app,updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCalendarEvent({
  userId,
  eventId,
  title,
  dateLabel,
  dateValue,
  time,
  kind = "personal",
  currentStartsAt,
}) {
  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      title,
      kind,
      starts_at: planStartIso({ dateLabel, dateValue, time, baseIso: currentStartsAt }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("user_id", userId)
    .select("id,title,starts_at,ends_at,kind,source_app")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent({ userId, eventId }) {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUpWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getGoalLifeMap({ userId }) {
  const { data, error } = await supabase
    .from("goal_life_maps")
    .select("user_id,year_theme,categories,recent_wins,ideal_day,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("goal_life_maps")
      .select("user_id,year_theme,categories,recent_wins,updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  if (error) throw error;
  return data;
}

export async function upsertGoalLifeMap({ userId, goalMap }) {
  const payload = {
    user_id: userId,
    year_theme: goalMap.yearTheme,
    categories: goalMap.categories,
    recent_wins: goalMap.recentWins ?? [],
    ideal_day: goalMap.idealDay ?? [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("goal_life_maps")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id,year_theme,categories,recent_wins,ideal_day,updated_at")
    .single();

  if (error?.code === "42703") {
    const { ideal_day: _idealDay, ...fallbackPayload } = payload;
    const fallback = await supabase
      .from("goal_life_maps")
      .upsert(fallbackPayload, { onConflict: "user_id" })
      .select("user_id,year_theme,categories,recent_wins,updated_at")
      .single();

    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  if (error) throw error;
  return data;
}

export async function getVisionBoards({ userId }) {
  const { data: boards, error: boardError } = await supabase
    .from("vision_boards")
    .select("id,user_id,title,background,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (boardError) throw boardError;
  if (!boards?.length) return [];

  const boardIds = boards.map((board) => board.id);
  const { data: items, error: itemError } = await supabase
    .from("vision_items")
    .select("id,user_id,board_id,type,content,color,x,y,width,height,rotation,z_index,created_at,updated_at")
    .eq("user_id", userId)
    .in("board_id", boardIds)
    .order("z_index", { ascending: true });

  if (itemError) throw itemError;

  const itemsWithUrls = await Promise.all(
    (items ?? []).map(async (item) => {
      if (item.type !== "image" || !item.content) return item;

      const { data } = await supabase.storage
        .from("vision-assets")
        .createSignedUrl(item.content, 60 * 60);

      return { ...item, display_url: data?.signedUrl ?? "" };
    })
  );

  return boards.map((board) => ({
    ...board,
    items: itemsWithUrls.filter((item) => item.board_id === board.id),
  }));
}

export async function createVisionBoard({ userId, title }) {
  const { data, error } = await supabase
    .from("vision_boards")
    .insert({
      user_id: userId,
      title,
      background: "dream",
    })
    .select("id,user_id,title,background,created_at,updated_at")
    .single();

  if (error) throw error;
  return { ...data, items: [] };
}

export async function updateVisionBoard({ userId, board }) {
  const { data, error } = await supabase
    .from("vision_boards")
    .update({
      title: board.title,
      background: board.background ?? "dream",
      updated_at: new Date().toISOString(),
    })
    .eq("id", board.id)
    .eq("user_id", userId)
    .select("id,user_id,title,background,created_at,updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function createVisionItem({ userId, item }) {
  const { data, error } = await supabase
    .from("vision_items")
    .insert({
      user_id: userId,
      board_id: item.board_id,
      type: item.type,
      content: item.content,
      color: item.color ?? "butter",
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation ?? 0,
      z_index: item.z_index ?? 1,
    })
    .select("id,user_id,board_id,type,content,color,x,y,width,height,rotation,z_index,created_at,updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateVisionItem({ userId, item }) {
  const { data, error } = await supabase
    .from("vision_items")
    .update({
      content: item.content,
      color: item.color ?? "butter",
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation ?? 0,
      z_index: item.z_index ?? 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("user_id", userId)
    .select("id,user_id,board_id,type,content,color,x,y,width,height,rotation,z_index,created_at,updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVisionItem({ userId, item }) {
  const { error } = await supabase
    .from("vision_items")
    .delete()
    .eq("id", item.id)
    .eq("user_id", userId);

  if (error) throw error;

  if (item.type === "image" && item.content) {
    await supabase.storage.from("vision-assets").remove([item.content]);
  }
}

export async function uploadVisionImage({ userId, file }) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("vision-assets").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/png",
    upsert: false,
  });

  if (error) throw error;

  const { data } = await supabase.storage.from("vision-assets").createSignedUrl(path, 60 * 60);
  return { path, signedUrl: data?.signedUrl ?? "" };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function planStartIso({ dateLabel = "today", dateValue, time = "", baseIso } = {}) {
  const startsAt = baseIso ? new Date(baseIso) : new Date();
  if (dateValue) {
    const [year, month, day] = dateValue.split("-").map(Number);
    startsAt.setFullYear(year, month - 1, day);
  }

  if (!dateValue && dateLabel === "today") {
    startsAt.setTime(Date.now());
  }

  if (!dateValue && dateLabel === "tomorrow") {
    startsAt.setTime(Date.now());
    startsAt.setDate(startsAt.getDate() + 1);
  }
  const [hour = "0", minute = "0"] = (time || "").split(":");
  startsAt.setHours(Number(hour), Number(minute), 0, 0);
  return startsAt.toISOString();
}

function normalizeMood(draft) {
  const text = `${draft.mood ?? ""} ${draft.raw ?? ""}`;
  if (/\u6182\u9b31|\u3086\u3046\u3046\u3064|\u843d\u3061\u8fbc|\u3057\u3093\u3069|\u60b2\u3057|\u5bc2\u3057|\u96e8|\u3082\u3084\u3082\u3084|sad/i.test(text)) return "sad";
  if (/\u75b2\u308c|\u3064\u304b\u308c|\u7720\u3044|\u306d\u3080\u3044|\u7dca\u5f35|\u7126|tired/i.test(text)) return "tired";
  if (/\u5b09\u3057|\u3046\u308c\u3057|\u697d\u3057|happy|good|joy/i.test(text)) return "happy";
  return "calm";
}
async function getUserStats(userId) {
  const { data, error } = await supabase
    .from("user_stats")
    .select("user_id,level,exp,coins,current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from("user_stats")
    .insert({ user_id: userId, level: 1, exp: 0, coins: 0 })
    .select("user_id,level,exp,coins,current_streak")
    .single();

  if (createError) throw createError;
  return created;
}

export async function saveBloomDraft({ userId, draft }) {
  const loggedOn = today();
  const mood = normalizeMood(draft);

  const { data: moodLog, error: moodError } = await supabase
    .from("mood_logs")
    .upsert(
      {
        user_id: userId,
        logged_on: loggedOn,
        mood,
        memo: draft.journal,
        source_app: "bloom_os",
      },
      { onConflict: "user_id,logged_on" }
    )
    .select("id")
    .single();

  if (moodError) throw moodError;

  const { data: journalEntry, error: journalError } = await supabase
    .from("ai_journal_entries")
    .insert({
      user_id: userId,
      mood_log_id: moodLog.id,
      title: draft.memory || "Bloom Log",
      body: draft.raw,
      ai_summary: draft.journal,
      source_app: "bloom_os",
    })
    .select("id")
    .single();

  if (journalError) throw journalError;

  const records = [];

  records.push(
    supabase.from("ai_conversation_messages").insert([
      {
        user_id: userId,
        journal_entry_id: journalEntry.id,
        role: "user",
        content: draft.raw,
        source_app: "bloom_os",
      },
      {
        user_id: userId,
        journal_entry_id: journalEntry.id,
        role: "assistant",
        content: draft.growth,
        source_app: "bloom_os",
      },
    ])
  );

  if (draft.memory) {
    records.push(
      supabase.from("accomplishment_logs").insert({
        user_id: userId,
        title: draft.memory,
        note: draft.growth,
        logged_on: loggedOn,
        source_app: "bloom_os",
      })
    );
  }

  if (draft.amount) {
    records.push(
      supabase.from("finance_transactions").insert({
        user_id: userId,
        title: draft.spendingTitle || "Spending",
        amount: draft.amount,
        kind: "expense",
        category: "daily",
        paid_on: loggedOn,
        source_app: "bloom_os",
      })
    );
  }

  if (draft.plans?.length) {
    records.push(
      supabase.from("calendar_events").insert(
        draft.plans.map((plan) => ({
        user_id: userId,
          title: plan.title,
          starts_at: planStartIso({ dateLabel: plan.date, dateValue: plan.dateValue, time: plan.time || "" }),
        kind: "personal",
        source_app: "bloom_os",
        }))
      )
    );
  }

  if (draft.vision) {
    records.push(
      supabase.from("vision_board_items").insert({
        user_id: userId,
        title: draft.vision,
        progress_percent: 1,
      })
    );
  }

  const results = await Promise.all(records);
  const writeError = results.find((result) => result.error)?.error;
  if (writeError) throw writeError;

  const stats = await getUserStats(userId);
  const nextExp = Number(stats.exp ?? 0) + 15;
  const nextCoins = Number(stats.coins ?? 0) + 5;
  const nextLevel = Math.max(1, 1 + Math.floor(nextExp / 3000));

  const { error: statsError } = await supabase
    .from("user_stats")
    .update({
      exp: nextExp,
      coins: nextCoins,
      level: nextLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (statsError) throw statsError;

  return { moodLog, journalEntry, stats: { exp: nextExp, coins: nextCoins, level: nextLevel } };
}
