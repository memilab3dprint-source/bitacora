// Rellena estos dos valores con los de tu proyecto de Supabase:
// Project Settings -> API -> Project URL / Project API keys -> anon public
const SUPABASE_URL = "https://craelmprvhfaamdebicb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYWVsbXBydmhmYWFtZGViaWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzYzNjQsImV4cCI6MjEwNDU1MjM2NH0.XaiG7rLcbc7TEbYww8Hzt-nhEv8KpSFgDqVjMCdIh_o";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
