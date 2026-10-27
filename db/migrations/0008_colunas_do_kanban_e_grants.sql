-- STATUS: aplicado em partes no Supabase. Já no banco: permissão colunas.gerenciar, colunas ativo/protegido, checagens de código/cor e privilégios mínimos de tabela. AINDA NÃO no banco: função prog_validar_coluna + gatilhos + políticas de escrita de prog_status (o pedido foi cancelado pelo ambiente).
-- Programação de Frota Fatran
-- 0008 · Administrador gerencia as colunas do Kanban (criar, renomear, reordenar, ocultar, excluir)
--        + privilégios de tabela explícitos (mínimo necessário; sem TRUNCATE)

-- 1) Nova permissão, só do administrador (as demais seguem "todos com todas", como decidido)
insert into public.prog_permissoes_catalogo (codigo, descricao)
values ('colunas.gerenciar', 'Criar, renomear, reordenar, ocultar e excluir as colunas (status) do Kanban')
on conflict (codigo) do nothing;

insert into public.prog_papel_permissoes (papel, permissao)
values ('admin', 'colunas.gerenciar')
on conflict do nothing;

-- 2) Colunas: ativo (oculta sem apagar) e protegido (usadas pelas regras do sistema)
alter table public.prog_status
  add column if not exists ativo boolean not null default true,
  add column if not exists protegido boolean not null default false;

-- Estas duas são usadas pela geração automática do dia; não podem sumir nem mudar de nome
update public.prog_status set protegido = true where codigo in ('AG. PROGRAMAÇÃO', 'ENTREGUE');

alter table public.prog_status
  drop constraint if exists prog_status_codigo_valido,
  drop constraint if exists prog_status_cor_valida;
alter table public.prog_status
  add constraint prog_status_codigo_valido check (codigo = upper(btrim(codigo)) and char_length(codigo) between 2 and 30),
  add constraint prog_status_cor_valida check (cor ~ '^#[0-9A-Fa-f]{6}$');

-- 3) Regras de proteção
create or replace function public.prog_validar_coluna()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.codigo := upper(btrim(new.codigo));
    new.protegido := false;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.protegido then
      if new.codigo is distinct from old.codigo then
        raise exception 'A coluna "%" é usada pelo sistema e não pode ser renomeada', old.codigo using errcode = '42501';
      end if;
      if not new.ativo then
        raise exception 'A coluna "%" é usada pelo sistema e não pode ser ocultada', old.codigo using errcode = '42501';
      end if;
    end if;
    new.protegido := old.protegido;
    new.codigo := upper(btrim(new.codigo));

    if old.ativo and not new.ativo and exists (
      select 1 from public.prog_programacao p where p.status = old.codigo and p.dia >= public.prog_hoje()
    ) then
      raise exception 'Mova os cartões da coluna "%" para outra antes de ocultá-la', old.codigo using errcode = '23514';
    end if;
    return new;
  end if;

  -- DELETE
  if old.protegido then
    raise exception 'A coluna "%" é usada pelo sistema e não pode ser excluída', old.codigo using errcode = '42501';
  end if;
  if exists (select 1 from public.prog_programacao p where p.status = old.codigo) then
    raise exception 'A coluna "%" já tem histórico. Oculte-a em vez de excluir.', old.codigo using errcode = '23503';
  end if;
  return old;
end
$$;

drop trigger if exists prog_status_validar on public.prog_status;
create trigger prog_status_validar
  before insert or update or delete on public.prog_status
  for each row execute function public.prog_validar_coluna();

drop trigger if exists prog_auditar_status on public.prog_status;
create trigger prog_auditar_status
  after insert or update or delete on public.prog_status
  for each row execute function public.prog_auditar();

-- 4) RLS: todos com acesso ao quadro leem; só quem tem "colunas.gerenciar" altera
drop policy if exists prog_status_inserir on public.prog_status;
drop policy if exists prog_status_alterar on public.prog_status;
drop policy if exists prog_status_excluir on public.prog_status;
create policy prog_status_inserir on public.prog_status for insert to authenticated
  with check ((select public.prog_tem_permissao('colunas.gerenciar')));
create policy prog_status_alterar on public.prog_status for update to authenticated
  using ((select public.prog_tem_permissao('colunas.gerenciar')))
  with check ((select public.prog_tem_permissao('colunas.gerenciar')));
create policy prog_status_excluir on public.prog_status for delete to authenticated
  using ((select public.prog_tem_permissao('colunas.gerenciar')));

-- 5) Privilégios de tabela explícitos (RLS decide as linhas; aqui só o mínimo de operações).
--    TRUNCATE não passa por RLS, por isso é retirado de todos.
do $$
declare t text;
begin
  foreach t in array array[
    'prog_papeis','prog_permissoes_catalogo','prog_papel_permissoes','prog_perfis','prog_tipos_conjunto',
    'prog_status','prog_conjuntos','prog_motoristas','prog_dias','prog_programacao','prog_status_eventos','prog_auditoria'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

grant insert, update, delete on public.prog_programacao   to authenticated;
grant insert, update, delete on public.prog_conjuntos     to authenticated;
grant insert, update, delete on public.prog_motoristas    to authenticated;
grant insert, update, delete on public.prog_tipos_conjunto to authenticated;
grant insert, update, delete on public.prog_status        to authenticated;
grant insert, delete         on public.prog_papel_permissoes to authenticated;
grant update                 on public.prog_dias          to authenticated;
grant update                 on public.prog_perfis        to authenticated;
