-- APLICADO no Supabase (27/10/2026): indicativo de última/próxima atualização da planilha
create table if not exists public.prog_sync_status (
  id int primary key default 1 check (id = 1),
  ultima_em timestamptz,
  proxima_em timestamptz,
  ultimo_resumo jsonb,
  ultimo_erro text,
  ultimo_erro_em timestamptz
);
insert into public.prog_sync_status (id) values (1) on conflict do nothing;
alter table public.prog_sync_status enable row level security;
drop policy if exists sync_status_ler on public.prog_sync_status;
create policy sync_status_ler on public.prog_sync_status for select to authenticated using (true);
grant select on public.prog_sync_status to authenticated;
grant select, insert, update on public.prog_sync_status to service_role;
do $$ begin
  alter publication supabase_realtime add table public.prog_sync_status;
exception when duplicate_object then null; end $$;
