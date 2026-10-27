-- APLICADO no Supabase: ativa o tempo real nas tabelas do quadro
alter publication supabase_realtime add table public.prog_programacao, public.prog_status;
