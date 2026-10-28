-- APLICADO no Supabase (28/10/2026): veículo parado em manutenção (dias e custo)
-- prog_programacao.parado_desde (date); prog_config(custo_dia_parado = 1500);
-- view prog_programacao_v ganha parado_desde; prog_gerar_dia_interno copia parado_desde só se continuar em manutenção.
alter table public.prog_programacao add column if not exists parado_desde date;
-- (definições completas aplicadas via migração "manutencao_parado_desde_e_custo")
