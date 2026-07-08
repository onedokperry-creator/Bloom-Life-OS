import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function getBloomOsHome(userId) {
  const { data, error } = await supabase
    .from("bloom_os_home")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function completeTask(taskId) {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveMoodLog({ userId, mood, memo }) {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("mood_logs")
    .upsert(
      {
        user_id: userId,
        logged_on: today,
        mood,
        memo,
        source_app: "bloom_os",
      },
      { onConflict: "user_id,logged_on" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addRewardSavingAmount({ savingGoalId, amount, title = "ごほうび貯金" }) {
  const { data: goal, error: goalError } = await supabase
    .from("reward_saving_goals")
    .select("id,user_id,current_amount")
    .eq("id", savingGoalId)
    .single();

  if (goalError) throw goalError;

  const { error: transactionError } = await supabase.from("finance_transactions").insert({
    user_id: goal.user_id,
    reward_saving_goal_id: goal.id,
    title,
    amount,
    kind: "saving",
    category: "reward",
    paid_on: new Date().toISOString().slice(0, 10),
    source_app: "finance_app",
  });

  if (transactionError) throw transactionError;

  const { data, error } = await supabase
    .from("reward_saving_goals")
    .update({
      current_amount: Number(goal.current_amount) + Number(amount),
    })
    .eq("id", goal.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
