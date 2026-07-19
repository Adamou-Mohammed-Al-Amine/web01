// /api/config.js
//
// Vercel serverless function (Node.js runtime).
// This is the ONLY place environment variables are read. It hands the
// public anon key + URL to the browser at runtime, so nothing is ever
// hardcoded or committed to the repo.
//
// Set these in Vercel: Project Settings > Environment Variables
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//
// For local development, see .env.example.

export default function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({
      error:
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. " +
        "Set them in Vercel Project Settings > Environment Variables.",
    });
    return;
  }

  // Cache for a short time in the browser/CDN — these values rarely change.
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  });
}
