import { createClient } from '@supabase/supabase-js'

// One Supabase project ("Semestre") serves every weekly ship — each ship gets its
// own TABLES, prefixed with the ship name (e.g. w02_registros), never a new project.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
