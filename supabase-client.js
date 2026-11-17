// ---------- SUPABASE (shared by every page) ----------
// Both values are PUBLIC by design. Row Level Security protects the data.
// NEVER put a secret / service_role key in this file.
const SUPABASE_URL = "https://srfalmsrlmfgmhnfimow.supabase.co";
const SUPABASE_KEY = "sb_publishable__EDQX1-o-38PIHakzfTg7g_UMCSnBXi";

// The CDN script created a global called "supabase", so our client gets another name.
// Scripts loaded after this one (script.js, games.js) can use "db".
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
