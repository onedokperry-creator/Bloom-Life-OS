-- Required API grants for Bloom OS tables.
--
-- Run this in Supabase SQL Editor if the app shows errors such as:
-- "permission denied for table mood_logs"
--
-- RLS policies still protect rows by auth.uid(); these grants only allow
-- authenticated users to use the tables through the Supabase API.

grant usage on schema public to anon, authenticated;

grant select on public.bloom_os_home to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_stats to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.mood_logs to authenticated;
grant select, insert, update, delete on public.accomplishment_logs to authenticated;
grant select, insert, update, delete on public.vision_board_items to authenticated;
grant select, insert, update, delete on public.reward_saving_goals to authenticated;
grant select, insert, update, delete on public.finance_transactions to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert on public.xp_events to authenticated;
grant select, insert, update, delete on public.ai_journal_entries to authenticated;
grant select, insert, update, delete on public.ai_conversation_messages to authenticated;
