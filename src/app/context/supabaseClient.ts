import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co'; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = 'sb_publishable_KjVW1x9pLbfJ0cbH3UwlzQ_JzfO6Mbw'; // Reemplaza con tu clave pública

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);