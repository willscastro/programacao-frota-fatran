-- APLICADO no Supabase (27/10/2026): histórico legível de alterações do quadro (planilha + sistema)
-- prog_historico(p_dia, p_limite): lê prog_auditoria e devolve uma linha por campo alterado
-- (quando, placa, campo, antes, depois, quem, origem). Exige a permissão quadro.ver.
-- (Definição completa aplicada via migração "historico_legivel" no Supabase.)
alter table public.prog_sync_status add column if not exists pedido_em timestamptz;
