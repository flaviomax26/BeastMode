// Edge Function: workouts-ingest
// Recebe treinos do Apple Health (enviados por um Atalho do iPhone) e grava em
// app_state.activity do usuário. Protegida por um segredo compartilhado.
//
// Deploy:  supabase functions deploy workouts-ingest --no-verify-jwt
// Segredo: supabase secrets set INGEST_SECRET="<um-segredo-forte>"
//
// O Atalho faz POST com JSON:
// {
//   "secret": "<INGEST_SECRET>",
//   "user_id": "<uuid do usuário no Supabase Auth>",
//   "workouts": [
//     { "start": "2026-06-25T20:00:00-03:00", "type": "Artes Marciais",
//       "dur": 52, "kcal": 680, "hrAvg": 142, "hrMax": 168 }
//   ]
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

// chave de dedupe: instante de início (único por treino)
function key(w: Record<string, unknown>): string {
  return String(w.start || '') + '|' + String(w.type || '');
}

function normalize(w: Record<string, unknown>) {
  const start = String(w.start || '');
  const date = start.slice(0, 10); // YYYY-MM-DD
  const num = (v: unknown) => {
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
    return isFinite(n) ? Math.round(n * 10) / 10 : null;
  };
  return {
    date,
    start,
    type: String(w.type || 'Treino').trim(),
    dur: num(w.dur),
    kcal: num(w.kcal),
    hrAvg: num(w.hrAvg),
    hrMax: num(w.hrMax),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'json' }, 400); }

  const secret = Deno.env.get('INGEST_SECRET');
  if (!secret || body.secret !== secret) return json({ error: 'unauthorized' }, 401);

  const userId = String(body.user_id || '');
  if (!userId) return json({ error: 'user_id' }, 400);

  const incoming = Array.isArray(body.workouts) ? body.workouts : [];
  const clean = incoming
    .map((w) => normalize(w as Record<string, unknown>))
    .filter((w) => w.date && w.start); // descarta sem timestamp

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // lê o que já existe e faz merge dedup por chave
  const { data: row, error: readErr } = await sb
    .from('app_state').select('activity').eq('user_id', userId).maybeSingle();
  if (readErr) return json({ error: 'read', detail: readErr.message }, 500);

  const existing: Record<string, unknown>[] = Array.isArray(row?.activity) ? row!.activity : [];
  const map = new Map<string, Record<string, unknown>>();
  existing.forEach((w) => map.set(key(w), w));
  let added = 0;
  clean.forEach((w) => { const k = key(w); if (!map.has(k)) added++; map.set(k, w); });

  const merged = Array.from(map.values())
    .sort((a, b) => String(b.start).localeCompare(String(a.start)))
    .slice(0, 500); // teto de histórico

  const { error: upErr } = await sb.from('app_state').upsert({
    user_id: userId,
    activity: merged,
    updated_at: new Date().toISOString(),
  });
  if (upErr) return json({ error: 'write', detail: upErr.message }, 500);

  return json({ ok: true, received: clean.length, added, total: merged.length });
});
