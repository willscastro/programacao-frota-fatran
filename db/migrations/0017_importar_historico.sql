-- APLICADO no Supabase (18/11/2026): importação do histórico da planilha (dias antigos), só acrescenta.
-- 1) prog_auditar: não registra nada quando a sessão tem prog.importando = '1' (evita milhares de linhas "criadas por ninguém" na auditoria)
-- 2) prog_importar_historico(p_dias jsonb): grava dia + linhas e fecha o dia; dia que já existe é pulado (nunca altera nem apaga).
--    Executável só pelo service_role (a função de borda "importar-historico" confere a permissão usuarios.gerenciar).
-- (as definições completas foram aplicadas direto no Supabase; ver supabase/functions/importar-historico)
revoke all on function public.prog_importar_historico(jsonb) from public, anon, authenticated;
grant execute on function public.prog_importar_historico(jsonb) to service_role;
