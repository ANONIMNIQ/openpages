# Open pages

## Supabase setup

1. Create `.env.local` from `.env.example`.
2. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Run SQL from `/supabase/schema.sql` in Supabase SQL Editor.

## Cloudflare Pages

- Build command: `pnpm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
