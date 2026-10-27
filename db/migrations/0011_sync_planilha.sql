-- APLICADO no Supabase (27/10/2026): sincronização planilha -> sistema
create table if not exists public.prog_sync_emails (email text primary key);
create table if not exists public.prog_planilha_snap (
  dia date not null, placa text not null, dados jsonb not null, atualizado_em timestamptz not null default now(),
  primary key (dia, placa));
alter table public.prog_sync_emails enable row level security;
alter table public.prog_planilha_snap enable row level security;
revoke all on public.prog_sync_emails, public.prog_planilha_snap from anon, authenticated;
insert into public.prog_sync_emails (email) values ('whitscastro@gmail.com') on conflict do nothing;
