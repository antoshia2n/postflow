import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://htzadzpckcpdrmpjvaut.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0emFkenBja2NwZHJtcGp2YXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjA2MTAsImV4cCI6MjA4NzM5NjYxMH0.8TJ-X-UojNvL-H-OiF5aaYOEksiveJ3zl7Lt6TZ6pCU";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── ユーザーID（ブラウザごとに固定UUID） ──────────────────────────────────────
export const getUserId = () => {
  let id = localStorage.getItem("pf_uid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("pf_uid", id);
  }
  return id;
};

// ── ワークスペース ─────────────────────────────────────────────────────────────
export const fetchWorkspaces = async (userId) => {
  const { data, error } = await sb
    .from("pf_workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  if (error) throw error;
  return data;
};

export const upsertWorkspace = async (ws, userId) => {
  const { error } = await sb.from("pf_workspaces").upsert({ ...ws, user_id: userId });
  if (error) throw error;
};

export const deleteWorkspace = async (wsId) => {
  const { error } = await sb.from("pf_workspaces").delete().eq("id", wsId);
  if (error) throw error;
};

// ── ワークスペースデータ（items / folders / links） ────────────────────────────
export const fetchWsData = async (wsId, userId) => {
  const { data, error } = await sb
    .from("pf_ws_data")
    .select("*")
    .eq("ws_id", wsId)
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data || null;
};

export const saveWsData = async (wsId, userId, patch) => {
  const { error } = await sb.from("pf_ws_data").upsert({
    ws_id: wsId,
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...patch,
  });
  if (error) throw error;
};
