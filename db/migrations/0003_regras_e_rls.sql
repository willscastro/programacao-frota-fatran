-- Programação de Frota Fatran
-- 0003 · Permissões, validações por perfil, auditoria e segurança por linha (RLS)
--
-- Princípio: quem decide o que cada perfil pode fazer é o banco, não a tela.

-- ============================================================
-- Funções de apoio
-- ============================================================
create function public.prog_hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create function public.prog_papel_atual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pf.papel
  from public.prog_perfis pf
  where pf.id = (select auth.uid()) and pf.ativo
$$;

create function public.prog_tem_permissao(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.prog_perfis pf
    join public.prog_papel_permissoes pp on pp.papel = pf.papel
    where pf.id = (select auth.uid())
      and pf.ativo
      and pp.permissao = p
  )
$$;

-- O usuário confirma que trocou a senha (só altera o próprio perfil)
create function public.prog_concluir_troca_senha()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.prog_perfis
     set deve_trocar_senha = false, atualizado_em = now()
   where id = (select auth.uid());
$$;

-- ============================================================
-- Regras de edição da programação (por perfil e por dia)
-- ============================================================
create function public.prog_validar_edicao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fechado boolean;
  v_ignorar text[] := array['status', 'proxima_carga', 'proxima_regiao', 'versao', 'atualizado_em', 'atualizado_por'];
begin
  -- Sem usuário logado = rotina interna (agenda diária, SQL do administrador do banco)
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.dia is distinct from old.dia or new.conjunto_id is distinct from old.conjunto_id then
    raise exception 'O dia e o conjunto de um registro não podem ser alterados' using errcode = '42501';
  end if;

  select d.fechado into v_fechado from public.prog_dias d where d.dia = old.dia;
  if (coalesce(v_fechado, false) or old.dia < public.prog_hoje())
     and not public.prog_tem_permissao('dia.editar_passado') then
    raise exception 'Este dia já está fechado. Peça a um gestor para corrigir.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status and not public.prog_tem_permissao('status.mover') then
    raise exception 'Seu perfil não pode mudar o status' using errcode = '42501';
  end if;

  if (new.proxima_carga is distinct from old.proxima_carga
      or new.proxima_regiao is distinct from old.proxima_regiao)
     and not public.prog_tem_permissao('proxima_carga.editar') then
    raise exception 'Seu perfil não pode editar a próxima carga' using errcode = '42501';
  end if;

  if (to_jsonb(new) - v_ignorar) is distinct from (to_jsonb(old) - v_ignorar)
     and not public.prog_tem_permissao('programacao.editar') then
    raise exception 'Seu perfil não pode editar os dados da viagem' using errcode = '42501';
  end if;

  return new;
end
$$;

create function public.prog_marcar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.versao         := old.versao + 1;
  new.atualizado_em  := now();
  new.atualizado_por := (select auth.uid());
  return new;
end
$$;

-- Os nomes começam com a_ e b_ porque o Postgres executa os gatilhos em ordem alfabética
create trigger a_prog_programacao_validar
  before update on public.prog_programacao
  for each row execute function public.prog_validar_edicao();

create trigger b_prog_programacao_marcar
  before update on public.prog_programacao
  for each row execute function public.prog_marcar_atualizacao();

-- Histórico de status
create function public.prog_registrar_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.prog_status_eventos (programacao_id, dia, conjunto_id, de, para, por)
    values (new.id, new.dia, new.conjunto_id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end
$$;
create trigger prog_programacao_status_evento
  after update on public.prog_programacao
  for each row execute function public.prog_registrar_status();

-- Auditoria geral
create function public.prog_auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.prog_auditoria (tabela, registro, acao, antes, depois, por)
  values (
    tg_table_name,
    coalesce(j ->> 'id', j ->> 'codigo', (j ->> 'papel') || '/' || (j ->> 'permissao')),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    (select auth.uid())
  );
  return null;
end
$$;

create trigger prog_auditar_programacao      after insert or update or delete on public.prog_programacao      for each row execute function public.prog_auditar();
create trigger prog_auditar_conjuntos        after insert or update or delete on public.prog_conjuntos        for each row execute function public.prog_auditar();
create trigger prog_auditar_motoristas       after insert or update or delete on public.prog_motoristas       for each row execute function public.prog_auditar();
create trigger prog_auditar_perfis           after insert or update or delete on public.prog_perfis           for each row execute function public.prog_auditar();
create trigger prog_auditar_papel_permissoes after insert or update or delete on public.prog_papel_permissoes for each row execute function public.prog_auditar();

-- ============================================================
-- Segurança por linha (RLS)
-- ============================================================
alter table public.prog_papeis               enable row level security;
alter table public.prog_permissoes_catalogo  enable row level security;
alter table public.prog_papel_permissoes     enable row level security;
alter table public.prog_perfis               enable row level security;
alter table public.prog_tipos_conjunto       enable row level security;
alter table public.prog_status               enable row level security;
alter table public.prog_conjuntos            enable row level security;
alter table public.prog_motoristas           enable row level security;
alter table public.prog_dias                 enable row level security;
alter table public.prog_programacao          enable row level security;
alter table public.prog_status_eventos       enable row level security;
alter table public.prog_auditoria            enable row level security;

-- Papéis, catálogo e matriz: qualquer usuário ativo lê; só quem gerencia usuários altera a matriz
create policy prog_papeis_ler on public.prog_papeis
  for select to authenticated using ((select public.prog_papel_atual()) is not null);

create policy prog_catalogo_ler on public.prog_permissoes_catalogo
  for select to authenticated using ((select public.prog_papel_atual()) is not null);

create policy prog_matriz_ler on public.prog_papel_permissoes
  for select to authenticated using ((select public.prog_papel_atual()) is not null);
create policy prog_matriz_inserir on public.prog_papel_permissoes
  for insert to authenticated with check ((select public.prog_tem_permissao('usuarios.gerenciar')));
create policy prog_matriz_excluir on public.prog_papel_permissoes
  for delete to authenticated using ((select public.prog_tem_permissao('usuarios.gerenciar')));

-- Perfis: cada um vê o seu; o admin vê e altera todos. A criação passa pela função segura do servidor.
create policy prog_perfis_ler on public.prog_perfis
  for select to authenticated
  using (id = (select auth.uid()) or (select public.prog_tem_permissao('usuarios.gerenciar')));
create policy prog_perfis_alterar on public.prog_perfis
  for update to authenticated
  using ((select public.prog_tem_permissao('usuarios.gerenciar')))
  with check ((select public.prog_tem_permissao('usuarios.gerenciar')));

-- Cadastro: ler com quadro.ver, alterar com cadastro.editar
create policy prog_tipos_ler on public.prog_tipos_conjunto
  for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
create policy prog_tipos_escrever on public.prog_tipos_conjunto
  for all to authenticated
  using ((select public.prog_tem_permissao('cadastro.editar')))
  with check ((select public.prog_tem_permissao('cadastro.editar')));

create policy prog_status_ler on public.prog_status
  for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));

create policy prog_conjuntos_ler on public.prog_conjuntos
  for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
create policy prog_conjuntos_escrever on public.prog_conjuntos
  for all to authenticated
  using ((select public.prog_tem_permissao('cadastro.editar')))
  with check ((select public.prog_tem_permissao('cadastro.editar')));

create policy prog_motoristas_ler on public.prog_motoristas
  for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
create policy prog_motoristas_escrever on public.prog_motoristas
  for all to authenticated
  using ((select public.prog_tem_permissao('cadastro.editar')))
  with check ((select public.prog_tem_permissao('cadastro.editar')));

-- Dias: leitura com quadro.ver; fechar/reabrir com dia.editar_passado. Criação só pelas funções de geração.
create policy prog_dias_ler on public.prog_dias
  for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
create policy prog_dias_alterar on public.prog_dias
  for update to authenticated
  using ((select public.prog_tem_permissao('dia.editar_passado')))
  with check ((select public.prog_tem_permissao('dia.editar_passado')));

-- Programação: as colunas que cada perfil pode mudar são conferidas pelo gatilho prog_validar_edicao
create policy prog_programacao_ler on public.prog_programacao
  for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
create policy prog_programacao_alterar on public.prog_programacao
  for update to authenticated
  using ((select public.prog_tem_permissao('quadro.ver')))
  with check ((select public.prog_tem_permissao('quadro.ver')));
create policy prog_programacao_inserir on public.prog_programacao
  for insert to authenticated with check ((select public.prog_tem_permissao('programacao.editar')));
create policy prog_programacao_excluir on public.prog_programacao
  for delete to authenticated using ((select public.prog_tem_permissao('programacao.excluir')));

create policy prog_eventos_ler on public.prog_status_eventos
  for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));

create policy prog_auditoria_ler on public.prog_auditoria
  for select to authenticated using ((select public.prog_tem_permissao('auditoria.ver')));

-- ============================================================
-- Privilégios: visitantes sem login não enxergam nada do sistema
-- ============================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'prog\_%' loop
    execute format('revoke all on public.%I from anon', t);
  end loop;
end
$$;
revoke all on public.prog_programacao_v from anon;
grant select on public.prog_programacao_v to authenticated;

-- Funções: só usuários logados podem chamá-las
revoke execute on function public.prog_hoje()                  from public, anon;
revoke execute on function public.prog_papel_atual()           from public, anon;
revoke execute on function public.prog_tem_permissao(text)     from public, anon;
revoke execute on function public.prog_concluir_troca_senha()  from public, anon;
grant  execute on function public.prog_hoje()                  to authenticated;
grant  execute on function public.prog_papel_atual()           to authenticated;
grant  execute on function public.prog_tem_permissao(text)     to authenticated;
grant  execute on function public.prog_concluir_troca_senha()  to authenticated;
