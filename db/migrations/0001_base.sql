-- Programação de Frota Fatran
-- 0001 · Esquema base
-- Todas as tabelas usam o prefixo prog_ para conviver com outros sistemas no mesmo projeto.

-- ============================================================
-- Acesso: papéis, permissões e perfis de usuário
-- ============================================================
create table public.prog_papeis (
  codigo    text primary key,
  nome      text not null,
  descricao text
);

create table public.prog_permissoes_catalogo (
  codigo    text primary key,
  descricao text not null
);

create table public.prog_papel_permissoes (
  papel     text not null references public.prog_papeis (codigo) on update cascade on delete cascade,
  permissao text not null references public.prog_permissoes_catalogo (codigo) on update cascade on delete cascade,
  primary key (papel, permissao)
);

create table public.prog_perfis (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome              text not null,
  papel             text not null references public.prog_papeis (codigo) on update cascade,
  ativo             boolean not null default true,
  deve_trocar_senha boolean not null default true,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index prog_perfis_papel_idx on public.prog_perfis (papel);

-- ============================================================
-- Cadastro: tipos, conjuntos, motoristas e status
-- ============================================================
create table public.prog_tipos_conjunto (
  codigo        text primary key,
  descricao     text,
  capacidade_kg integer check (capacidade_kg is null or capacidade_kg > 0),
  cor           text
);

create table public.prog_status (
  codigo text primary key,
  ordem  integer not null unique,
  cor    text not null
);

-- Placa sempre em maiúsculas, sem hífen e sem espaço (ex.: RQP-3E15 vira RQP3E15)
create function public.prog_normalizar_placa(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

create table public.prog_conjuntos (
  id               bigint generated always as identity primary key,
  placa_cavalo     text not null,
  placa_implemento text,
  tipo             text references public.prog_tipos_conjunto (codigo) on update cascade,
  rastreador       boolean not null default false,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint prog_conjuntos_placa_padrao check (placa_cavalo ~ '^[A-Z0-9]{7}$')
);
create unique index prog_conjuntos_placa_uq on public.prog_conjuntos (placa_cavalo);

create function public.prog_normalizar_conjunto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.placa_cavalo     := public.prog_normalizar_placa(new.placa_cavalo);
  new.placa_implemento := public.prog_normalizar_placa(new.placa_implemento);
  new.atualizado_em    := now();
  return new;
end
$$;
create trigger prog_conjuntos_normalizar
  before insert or update on public.prog_conjuntos
  for each row execute function public.prog_normalizar_conjunto();

create table public.prog_motoristas (
  id        bigint generated always as identity primary key,
  nome      text not null check (length(btrim(nome)) > 1),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index prog_motoristas_nome_uq on public.prog_motoristas (lower(btrim(nome)));

-- ============================================================
-- Programação: um registro por conjunto por dia
-- ============================================================
create table public.prog_dias (
  dia        date primary key,
  origem     text not null default 'manual'
             check (origem in ('automatico', 'manual', 'sob_demanda', 'importacao')),
  gerado_em  timestamptz not null default now(),
  fechado    boolean not null default false,
  fechado_em timestamptz
);

create table public.prog_programacao (
  id               bigint generated always as identity primary key,
  dia              date   not null references public.prog_dias (dia),
  conjunto_id      bigint not null references public.prog_conjuntos (id),
  motorista_id     bigint references public.prog_motoristas (id),
  placa_implemento text,
  tipo             text references public.prog_tipos_conjunto (codigo) on update cascade,
  ordem            integer not null default 9999,
  status           text not null default 'AG. PROGRAMAÇÃO' references public.prog_status (codigo) on update cascade,

  -- carregamento
  embarcador       text,
  destino          text,
  data_programacao date,
  cheg_carga       timestamptz,
  carregou_em      timestamptz,

  -- descarga
  prog_entrega     date,
  cheg_descarga    timestamptz,
  fim_descarga     timestamptz,

  -- situação
  localizacao      text,
  posicao_em       timestamptz,
  obs              text,

  -- planejamento
  proxima_carga    text,
  proxima_regiao   text check (proxima_regiao is null or proxima_regiao in ('ES', 'SP', 'RJ', 'SC', 'OUTRA')),

  -- controle
  versao           integer not null default 1,
  atualizado_em    timestamptz not null default now(),
  atualizado_por   uuid references auth.users (id) on delete set null,

  constraint prog_programacao_dia_conjunto_uq unique (dia, conjunto_id),
  constraint prog_programacao_carga_coerente check (carregou_em is null or cheg_carga is null or carregou_em >= cheg_carga),
  constraint prog_programacao_descarga_coerente check (fim_descarga is null or cheg_descarga is null or fim_descarga >= cheg_descarga)
);
create index prog_programacao_dia_idx    on public.prog_programacao (dia);
create index prog_programacao_status_idx on public.prog_programacao (dia, status);
create index prog_programacao_conjunto_idx on public.prog_programacao (conjunto_id);
create index prog_programacao_motorista_idx on public.prog_programacao (motorista_id);

-- Histórico de mudanças de status (substitui comparar abas lado a lado)
create table public.prog_status_eventos (
  id               bigint generated always as identity primary key,
  programacao_id   bigint references public.prog_programacao (id) on delete cascade,
  dia              date   not null,
  conjunto_id      bigint not null,
  de               text,
  para             text   not null,
  por              uuid references auth.users (id) on delete set null,
  em               timestamptz not null default now()
);
create index prog_status_eventos_prog_idx on public.prog_status_eventos (programacao_id, em desc);

-- Auditoria geral: quem mudou o quê, com valor antigo e novo
create table public.prog_auditoria (
  id          bigint generated always as identity primary key,
  tabela      text not null,
  registro    text,
  acao        text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  antes       jsonb,
  depois      jsonb,
  por         uuid references auth.users (id) on delete set null,
  em          timestamptz not null default now()
);
create index prog_auditoria_tabela_idx on public.prog_auditoria (tabela, em desc);

-- Visão com as esperas calculadas em minutos (as datas continuam sendo a fonte)
create view public.prog_programacao_v
with (security_invoker = true) as
select
  p.*,
  c.placa_cavalo,
  m.nome as motorista,
  case when p.cheg_carga is not null then
    greatest(0, floor(extract(epoch from (
      coalesce(p.carregou_em, case when p.status = 'AG. CARREGAMENTO' then now() end) - p.cheg_carga
    )) / 60))::int
  end as espera_carga_min,
  case when p.cheg_descarga is not null then
    greatest(0, floor(extract(epoch from (
      coalesce(p.fim_descarga, case when p.status = 'AG. DESCARGA' then now() end) - p.cheg_descarga
    )) / 60))::int
  end as espera_descarga_min
from public.prog_programacao p
join public.prog_conjuntos c on c.id = p.conjunto_id
left join public.prog_motoristas m on m.id = p.motorista_id;
