-- Programação de Frota Fatran
-- 0007 · Funções de gatilho não devem ser chamáveis por usuários (apontado pelo verificador de segurança)

revoke execute on function public.prog_auditar() from public, anon, authenticated;
revoke execute on function public.prog_registrar_status() from public, anon, authenticated;
