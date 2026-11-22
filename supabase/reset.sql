-- Custo AI: RESET. Run this ONLY on a project with no data you want to keep.
-- It deletes everything in the public schema (all Custo AI tables, functions and the signup trigger),
-- then recreates an empty public schema with the standard Supabase permissions.
-- After it finishes, run all_migrations.sql once.

drop policy if exists "Editors upload product images" on storage.objects;
drop policy if exists "Editors update product images" on storage.objects;
drop policy if exists "Editors delete product images" on storage.objects;
drop policy if exists "Public read product images" on storage.objects;

drop trigger if exists on_auth_user_created on auth.users;
drop schema public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
