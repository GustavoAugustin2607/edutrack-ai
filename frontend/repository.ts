import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { emptyWorkspace, validateWorkspace, type Workspace } from './model';
export const supabase =
  config.supabaseUrl && config.supabasePublishableKey
    ? createClient(config.supabaseUrl, config.supabasePublishableKey)
    : null;
export async function loadCloud(user_id: string) {
  if (!supabase)
    throw new Error('A conexão com o Supabase ainda não foi configurada.');
  const { data, error } = await supabase
    .from('study_workspaces')
    .select('payload,revision')
    .eq('user_id', user_id)
    .maybeSingle();
  if (error) throw error;
  if (data && !validateWorkspace(data.payload))
    throw new Error('Os dados salvos usam um formato incompatível.');
  return {
    state: data ? (data.payload as Workspace) : emptyWorkspace(),
    revision: data?.revision ?? 0,
  };
}
export async function saveCloud(state: Workspace, revision: number) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const { data, error } = await supabase.rpc('save_study_workspace', {
    new_payload: state,
    expected_revision: revision,
  });
  if (error) {
    if (error.code === '40001')
      throw new Error(
        'Os dados foram alterados em outra aba. Recarregue antes de continuar para preservar as duas versões.',
      );
    throw error;
  }
  return data as number;
}
export type LeaderRow = {
  user_id: string;
  display_name: string;
  title: string | null;
  frame: string | null;
  xp: number;
  level: number;
  streak: number;
  week_start: string;
  week_xp: number;
  house: string | null;
};
export async function publishScore(row: LeaderRow) {
  if (!supabase) return;
  const { error } = await supabase
    .from('leaderboard')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
export async function removeScore(user_id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('leaderboard').delete().eq('user_id', user_id);
  if (error) throw error;
}
export async function loadLeaderboard(scope: 'week' | 'all', week_start: string) {
  if (!supabase) return [] as LeaderRow[];
  let query = supabase
    .from('leaderboard')
    .select('user_id,display_name,title,frame,xp,level,streak,week_start,week_xp,house')
    .limit(50);
  query =
    scope === 'week'
      ? query.eq('week_start', week_start).order('week_xp', { ascending: false })
      : query.order('xp', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}
export async function loadHouseCup(week_start: string) {
  if (!supabase) return {} as Record<string, { xp: number; members: number }>;
  const { data, error } = await supabase
    .from('leaderboard')
    .select('house,week_xp')
    .eq('week_start', week_start)
    .not('house', 'is', null)
    .limit(1000);
  if (error) throw error;
  const cup: Record<string, { xp: number; members: number }> = {};
  for (const row of data ?? []) {
    const key = row.house as string;
    cup[key] ??= { xp: 0, members: 0 };
    cup[key].xp += row.week_xp as number;
    cup[key].members++;
  }
  return cup;
}
