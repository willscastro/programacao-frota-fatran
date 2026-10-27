-- Programação de Frota Fatran
-- 0005 · Agenda diária (00:10 de Brasília) e atualização em tempo real
--
-- 00:10 em Brasília = 03:10 UTC (o Brasil não usa mais horário de verão).
-- Aplicar somente depois dos scripts 0001 a 0004.

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'prog-gerar-dia-diario',
  '10 3 * * *',
  $$ select public.prog_gerar_dia_interno(public.prog_hoje(), 'automatico') $$
);

-- Tempo real: o quadro de todos os usuários atualiza quando alguém mexe num cartão
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'prog_programacao'
  ) then
    alter publication supabase_realtime add table public.prog_programacao;
  end if;
end
$$;
