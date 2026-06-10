import { createClient } from '@supabase/supabase-js'

// These env vars get set in Vercel dashboard — see README
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase env vars not set — entries will not persist. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file or Vercel dashboard.')
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// ─── DB HELPERS ──────────────────────────────────────────────
// Table: bracket_entries
// Columns: id (uuid), name (text), email (text), submitted_at (timestamptz),
//          g_picks (jsonb), third_picks (jsonb), winners (jsonb),
//          score (int4 default 0), correct_picks (int4 default 0)

export async function dbLoadEntries() {
  if (!supabase) return localLoadEntries()
  const { data, error } = await supabase
    .from('bracket_entries')
    .select('*')
    .order('score', { ascending: false })
  if (error) { console.error('Supabase load error:', error); return localLoadEntries() }
  return (data || []).map(row => ({
    id:           row.id,
    name:         row.name,
    email:        row.email,
    submittedAt:  row.submitted_at,
    gPicks:       row.g_picks,
    thirdPicks:   row.third_picks,
    winners:      row.winners,
    score:        row.score,
    correctPicks: row.correct_picks,
  }))
}

export async function dbSaveEntry(entry) {
  if (!supabase) return localSaveEntry(entry)
  const row = {
    name:         entry.name,
    email:        entry.email,
    submitted_at: entry.submittedAt,
    g_picks:      entry.gPicks,
    third_picks:  entry.thirdPicks,
    winners:      entry.winners,
    score:        entry.score || 0,
    correct_picks:entry.correctPicks || 0,
  }
  // Upsert on email — one bracket per person
  const { error } = await supabase
    .from('bracket_entries')
    .upsert(row, { onConflict: 'email' })
  if (error) { console.error('Supabase save error:', error); localSaveEntry(entry) }
}

// ─── LOCAL STORAGE FALLBACK ───────────────────────────────────
function localLoadEntries() {
  try {
    const raw = localStorage.getItem('wc26_entries')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function localSaveEntry(entry) {
  try {
    const all = localLoadEntries()
    const idx = all.findIndex(e => e.email?.toLowerCase() === entry.email?.toLowerCase())
    const updated = idx >= 0 ? all.map((e,i) => i===idx ? entry : e) : [...all, entry]
    localStorage.setItem('wc26_entries', JSON.stringify(updated))
  } catch {}
}
