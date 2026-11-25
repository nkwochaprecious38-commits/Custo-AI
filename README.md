# Custo AI

E-commerce personalization platform: marketing site, working authentication and a multi tenant dashboard.
Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (Auth, Postgres, RLS), Recharts, Lucide.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor. It creates every table, row level security policy and the sign up trigger that creates each user's organization.
3. In Supabase, Authentication, URL Configuration: set Site URL to your site and add `<site>/auth/callback` to Redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the three values.
5. `npm install`, then `npm run dev` (or `npm run build && npm start`).

Email verification follows your Supabase setting (Authentication, Providers, Email, "Confirm email"). When on, sign up shows a "check your email" screen and the link lands on the dashboard.

## Security model

* Every business table has `org_id` and RLS policies using `is_member`, `can_write` and `is_org_admin`. Analysts and Team Members are read only at the database level.
* `/dashboard/*` is protected in middleware and again in the server layout.
* Store credentials go through `/api/integrations/shopify`, which tests them against Shopify and writes them with the service role to `integration_secrets`. That table has no policies, so browsers can never read it.
* `audit_logs` is append only (no update or delete policy).

## Honest status

* Real: auth, organizations, roles, invitations, catalog (CSV import), recommendation, segment, merchandising, content, campaign and experiment records, synonyms, audit log, Shopify connect, test and product import.
* Demo data, labeled in the UI: traffic, conversion, revenue and search metrics, until an event collection script exists. The `behavioral_events`, `rec_impressions`, `rec_clicks`, `orders` and `search_queries` tables are ready for it.
* Not built yet: connectors other than Shopify, invitation emails (links are copied manually), a storefront script that serves recommendations, and an LLM behind the assistant (it answers from demo data with rules).
* Logo: the final mark is in `public/logo-mark.svg` (favicon `app/icon.svg`) and rendered by `components/Logo.tsx`.
* Pricing: prices are not shown. Edit `PLANS` in `app/(site)/pricing/page.tsx` once confirmed. The three Selar links are in `lib/content.ts`.
