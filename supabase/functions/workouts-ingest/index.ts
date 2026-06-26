// Edge Function: workouts-ingest
// Recebe treinos do Apple Health e grava em app_state.activity do usuário.
// Aceita dois formatos de corpo:
//   1) Health Auto Export (HAE):  { "data": { "workouts": [ {id,start,name,duration,
//        activeEnergyBurned:{qty},heartRate:{max:{qty},avg:{qty}}} ] } }
//   2) Simples (Atalho/curl):     { "workouts": [ {start,type,dur,kcal,hrAvg,hrMax} ] }
//
// Autenticação (qualquer um dos dois):
//   - Headers:  x-ingest-secret: <segredo>   x-user-id: <uuid>      (use com o HAE)
//   - Corpo:    { "secret": "...", "user_id": "..." , "workouts":[...] }  (curl/Atalho)
//
// Deploy:  pelo Dashboard (Verify JWT = OFF) ou
//          supabase functions deploy workouts-ingest --no-verify-jwt
// Segredo: INGEST_SECRET (Edge Function secret)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-ingest-secret, x-user-id, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

function num(v: unknown): number | null {
  if (v && typeof v === 'object' && 'qty' in (v as Record<string, unknown>)) {
    v = (v as Record<string, unknown>).qty; // formato HAE { qty, units }
  }
  const n = typeof v === 'string' ? parseFloat((v as string).replace(',', '.')) : Number(v);
  return isFinite(n) ? Math.round(n * 10) / 10 : null;
}

// energia em kcal, convertendo kJ→kcal quando o HAE exporta em kJ (units: "kJ")
function kcalOf(v: unknown): number | null {
  if (v == null) return null;
  let qty: number, units = '';
  if (typeof v === 'object' && 'qty' in (v as Record<string, unknown>)) {
    const o = v as Record<string, unknown>;
    qty = Number(o.qty);
    units = String(o.units || '').toLowerCase();
  } else {
    qty = typeof v === 'string' ? parseFloat((v as string).replace(',', '.')) : Number(v);
  }
  if (!isFinite(qty)) return null;
  if (units === 'kj') qty = qty / 4.184; // kJ → kcal
  return Math.round(qty);
}

// chave de dedupe: id do HAE quando existir, senão início + tipo
function key(w: Record<string, unknown>): string {
  if (w.id) return 'id:' + String(w.id);
  return String(w.start || '') + '|' + String(w.type || '');
}

// converte um treino (HAE ou simples) pro formato interno do app
function normalize(w: Record<string, unknown>) {
  const start = String(w.start || '');
  const date = start.slice(0, 10); // "2026-06-25 07:33:55 -0300" → "2026-06-25"

  // duração: w.dur (min, formato simples) ou w.duration (HAE, geralmente segundos)
  let dur = num(w.dur);
  if (dur == null && w.duration != null) {
    const raw = num(w.duration);
    dur = raw != null && raw > 180 ? Math.round(raw / 60) : raw; // >180 = segundos
  }

  // kcal: simples (kcal) ou HAE (activeEnergyBurned / activeEnergy / totalEnergyBurned),
  // convertendo kJ→kcal pela unidade
  const kcal = kcalOf(w.kcal) ?? kcalOf(w.activeEnergyBurned) ?? kcalOf(w.activeEnergy) ?? kcalOf(w.totalEnergyBurned);

  // FC: simples (hrAvg/hrMax) ou HAE (heartRate.avg.qty / heartRate.max.qty)
  const hr = (w.heartRate || {}) as Record<string, unknown>;
  const hrAvg = num(w.hrAvg) ?? num(hr.avg);
  const hrMax = num(w.hrMax) ?? num(hr.max);

  const type = String(w.type || w.name || 'Treino').trim();

  const out: Record<string, unknown> = { date, start, type };
  if (w.id) out.id = w.id;
  if (dur != null) out.dur = dur;
  if (kcal != null) out.kcal = kcal;
  if (hrAvg != null) out.hrAvg = Math.round(hrAvg);
  if (hrMax != null) out.hrMax = Math.round(hrMax);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'json' }, 400); }

  // auth: headers (HAE) ou corpo (curl/Atalho)
  const secret = req.headers.get('x-ingest-secret') || (body.secret as string);
  const userId = req.headers.get('x-user-id') || (body.user_id as string);

  const expected = Deno.env.get('INGEST_SECRET');
  if (!expected || secret !== expected) return json({ error: 'unauthorized' }, 401);
  if (!userId) return json({ error: 'user_id' }, 400);

  // workouts: formato HAE (data.workouts) ou simples (workouts)
  const data = (body.data || {}) as Record<string, unknown>;
  const incoming = Array.isArray(body.workouts) ? body.workouts
    : Array.isArray(data.workouts) ? data.workouts : [];

  const clean = incoming
    .map((w) => normalize(w as Record<string, unknown>))
    .filter((w) => w.date && w.start);

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

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
    .slice(0, 500);

  const { error: upErr } = await sb.from('app_state').upsert({
    user_id: userId,
    activity: merged,
    updated_at: new Date().toISOString(),
  });
  if (upErr) return json({ error: 'write', detail: upErr.message }, 500);

  return json({ ok: true, received: clean.length, added, total: merged.length });
});
