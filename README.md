# Custo AI

B2B e-commerce personalization platform. Next.js 15, TypeScript, Tailwind, Supabase (Auth, PostgreSQL with row level security, Storage), Recharts, Lucide.

## Set up with your Supabase project

1. Create a project at supabase.com.
2. In the SQL editor run, in order: `supabase/migrations/0001_schema.sql`, `0002_functions.sql`, `0003_storage.sql`.
3. Authentication settings:
   - Email provider on, **Confirm email** on (email verification).
   - Site URL: your app URL. Redirect URLs: `https://YOUR_APP/auth/callback` and `http://localhost:3000/auth/callback`.
4. Copy `.env.example` to `.env.local` and fill in the URL, anon key, service role key (server only) and site URL.
5. `npm install && npm run dev`

Optional: set `ANTHROPIC_API_KEY` to enable AI answers in the Commerce Assistant and AI query understanding in Search. Without it both use the built in analysis.

## Security model
- Every table has row level security scoped by organization membership; roles gate writes.
- Integration credentials live in `integration_credentials` with no policies: only the server (service role) can read them.
- The service role key and Anthropic key are used only in server routes under `src/app/api`.
- Storefront tracking uses a per store tracking key and stores events only when `consent: true` is sent.

## Pricing
Edit plan prices and intervals in `src/app/(marketing)/pricing/page.tsx` (`price` and `interval`). Selar URLs are unchanged.

## Logo
All pages use `src/components/Logo.tsx`. Replace it once the final logo is chosen. `public/favicon.svg` is a placeholder.

## Local test stack
`local-stack/start.sh` starts Postgres, Supabase GoTrue, PostgREST and a mail catcher for offline testing.
