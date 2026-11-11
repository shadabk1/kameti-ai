// Supabase scaffold — Shadab, step 3.
// Not wired into App.jsx yet, so the app still builds/runs without keys.
// To use it:
//  1. npm install @supabase/supabase-js
//  2. Create a free project at supabase.com, run supabase-members.sql in the SQL Editor
//  3. Copy .env.example to .env and set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
//  4. In App.jsx, replace loadSavedMembers() with loadMembersFromSupabase(),
//     falling back to demoMembers when Supabase is not configured.

let clientPromise = null

export function supabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

async function getClient() {
  if (!supabaseConfigured()) return null
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    )
  }
  return clientPromise
}

export async function loadMembersFromSupabase(fallback) {
  const client = await getClient()
  if (!client) return fallback
  const { data, error } = await client.from('members').select('*').order('id')
  if (error || !data?.length) return fallback
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    history: row.history || [],
    paidThisMonth: row.paid_this_month || false,
  }))
}

export async function saveMemberToSupabase(member) {
  const client = await getClient()
  if (!client) return false
  const { error } = await client.from('members').upsert({
    id: member.id,
    name: member.name,
    history: member.history,
    paid_this_month: member.paidThisMonth,
  })
  return !error
}
