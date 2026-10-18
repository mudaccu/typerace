// Leaderboard reads, world-record ghosts, and posting scores.
// Reads go straight to Supabase; writes go through /api/submit so the server can check for cheating.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { todayKey } from "./words.js";

export const online = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;
export async function sb() {
  if (!online) return null;
  if (!client) {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export function since(period) {
  if (period === "today") return todayKey() + "T00:00:00Z";
  if (period === "week") return new Date(Date.now() - 7 * 864e5).toISOString();
  return "1970-01-01T00:00:00Z";
}

// Best score per name, top 25.
export async function leaderboard(mode, period) {
  const c = await sb();
  const { data, error } = await c.from("scores")
    .select("name,wpm,acc,car,created_at")
    .eq("mode", mode)
    .gte("created_at", since(period))
    .order("wpm", { ascending: false })
    .limit(200);
  if (error) throw error;
  const seen = new Set();
  return data.filter(r => {
    const k = r.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 25);
}

// The #1 run (with its keystroke timeline) to race as a ghost.
export async function topGhost(mode) {
  const c = await sb();
  let q = c.from("scores").select("name,wpm,car,timeline").eq("mode", mode);
  if (mode === "daily") q = q.eq("day", todayKey());
  const { data, error } = await q.order("wpm", { ascending: false }).limit(1);
  if (error) throw error;
  return data[0] || null;
}

export async function submit(run) {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(run),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "server didn't answer");
  return body;
}

export async function rankToday(mode, wpm) {
  const c = await sb();
  const { count } = await c.from("scores")
    .select("id", { count: "exact", head: true })
    .eq("mode", mode)
    .gt("wpm", wpm)
    .gte("created_at", since("today"));
  return (count || 0) + 1;
}
