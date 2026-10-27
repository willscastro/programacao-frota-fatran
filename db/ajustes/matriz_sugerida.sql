-- Programação de Frota Fatran
-- Matriz de permissões SUGERIDA (uso definitivo)
--
-- No início todos os perfis têm todas as permissões. Quando o administrador quiser restringir,
-- pode usar a tela de administração ou executar este script, que troca a matriz inteira
-- pela sugerida em docs/ARQUITETURA.md (seção 2). Rode uma única vez.

begin;

delete from public.prog_papel_permissoes;

insert into public.prog_papel_permissoes (papel, permissao)
select 'admin', codigo from public.prog_permissoes_catalogo;

insert into public.prog_papel_permissoes (papel, permissao) values
  ('gestor_frota', 'quadro.ver'),
  ('gestor_frota', 'status.mover'),
  ('gestor_frota', 'programacao.editar'),
  ('gestor_frota', 'proxima_carga.editar'),
  ('gestor_frota', 'cadastro.editar'),
  ('gestor_frota', 'dashboard.ver'),
  ('gestor_frota', 'exportar'),
  ('gestor_frota', 'dia.gerar'),
  ('gestor_frota', 'dia.editar_passado'),
  ('gestor_frota', 'auditoria.ver'),

  ('programador', 'quadro.ver'),
  ('programador', 'status.mover'),
  ('programador', 'programacao.editar'),
  ('programador', 'proxima_carga.editar'),
  ('programador', 'dashboard.ver'),

  ('comercial', 'quadro.ver'),
  ('comercial', 'proxima_carga.editar'),
  ('comercial', 'dashboard.ver'),
  ('comercial', 'exportar'),

  ('diretoria', 'quadro.ver'),
  ('diretoria', 'dashboard.ver'),
  ('diretoria', 'exportar');

commit;
