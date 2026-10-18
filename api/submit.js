// POST /api/submit: checks a finished run and saves it to the leaderboard.
// Needs two environment variables in Vercel: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { validateRun } from "./_validate.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: "server not set up yet" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "bad json" }); }
  }

  const check = validateRun(body);
  if (!check.ok) return res.status(400).json({ error: check.error });

  const r = await fetch(`${url}/rest/v1/scores`, {
    method: "POST",
    headers: {
      apikey: key,
      // legacy service_role keys are JWTs (eyJ…); newer sb_secret_ keys only go in apikey
      ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(check.row),
  });
  if (!r.ok) return res.status(502).json({ error: "couldn't save score" });

  return res.status(200).json({ ok: true, wpm: check.row.wpm });
}
