-- Programação de Frota Fatran
-- 0002 · Dados iniciais (papéis, permissões, matriz de acesso, status e tipos de conjunto)

insert into public.prog_papeis (codigo, nome, descricao) values
  ('admin',        'Administrador',   'Gerencia usuários, perfis e permissões. Acesso total.'),
  ('gestor_frota', 'Gestor de frota', 'Coordena a frota: edita tudo da programação e o cadastro.'),
  ('programador',  'Programador',     'Opera o quadro do dia: status, viagens e próxima carga.'),
  ('comercial',    'Comercial',       'Acompanha a frota e informa a próxima carga.'),
  ('diretoria',    'Diretoria',       'Somente consulta, indicadores e exportação.');

insert into public.prog_permissoes_catalogo (codigo, descricao) values
  ('quadro.ver',          'Ver o quadro Kanban e os dados da programação'),
  ('status.mover',        'Mudar o status de um veículo (arrastar)'),
  ('programacao.editar',  'Editar os dados da viagem (carga, descarga, datas, observações)'),
  ('proxima_carga.editar','Editar a próxima carga'),
  ('cadastro.editar',     'Editar o cadastro de conjuntos e motoristas'),
  ('dashboard.ver',       'Ver o painel de indicadores'),
  ('exportar',            'Exportar dados'),
  ('dia.gerar',           'Gerar o dia manualmente'),
  ('dia.editar_passado',  'Corrigir dias já fechados'),
  ('programacao.excluir', 'Excluir registros da programação'),
  ('usuarios.gerenciar',  'Criar, editar e desativar usuários, perfis e permissões'),
  ('auditoria.ver',       'Ver a auditoria e o histórico de alterações');

-- Matriz inicial: TODOS os perfis com TODAS as permissões (decisão do administrador).
-- O administrador restringe depois pela tela de administração.
-- A matriz sugerida para uso definitivo está em db/ajustes/matriz_sugerida.sql.
insert into public.prog_papel_permissoes (papel, permissao)
select p.codigo, c.codigo
from public.prog_papeis p
cross join public.prog_permissoes_catalogo c;

-- Colunas do Kanban, na ordem do fluxo
insert into public.prog_status (codigo, ordem, cor) values
  ('AG. PROGRAMAÇÃO',   1, '#94A3B8'),
  ('PROGRAMADO',        2, '#6366F1'),
  ('AG. CARREGAMENTO',  3, '#F59E0B'),
  ('EM TRÂNSITO',       4, '#2563EB'),
  ('PERNOITE',          5, '#7C3AED'),
  ('DSR',               6, '#0EA5E9'),
  ('AG. DESCARGA',      7, '#F97316'),
  ('AG. TROCA DE NOTA', 8, '#CA8A04'),
  ('ENTREGUE',          9, '#16A34A'),
  ('EM MANUTENÇÃO',    10, '#DC2626');

-- Tipos de conjunto e capacidades (aba AUX COM da planilha).
-- O significado das siglas SD e GB ainda deve ser confirmado.
insert into public.prog_tipos_conjunto (codigo, descricao, capacidade_kg, cor) values
  ('4º SD',   '4º eixo SD',   37000, '#D5A6BD'),
  ('4º GB',   '4º eixo GB',   38500, '#EBA8EE'),
  ('VD SD',   'Vanderléia SD', 33000, '#CBD5E1'),
  ('VD GB',   'Vanderléia GB', 34500, '#9CC5EA'),
  ('BITRUCK', 'Bitruck',       18000, '#BFE3C6');
