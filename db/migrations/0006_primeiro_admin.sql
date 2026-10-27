-- Programação de Frota Fatran
-- 0006 · Primeiro administrador (modelo)
--
-- Como ainda não existe nenhum admin, o primeiro perfil é criado direto no banco.
-- 1) Crie o usuário em Authentication > Users (ou use um já existente).
-- 2) Troque os dois valores abaixo e execute UMA vez.
-- Depois disso, todos os outros usuários são criados pela tela de administração.

insert into public.prog_perfis (id, nome, papel, ativo, deve_trocar_senha)
select u.id, 'NOME DO ADMINISTRADOR', 'admin', true, false
from auth.users u
where lower(u.email) = lower('EMAIL-DO-ADMINISTRADOR')
on conflict (id) do update set papel = 'admin', ativo = true;
