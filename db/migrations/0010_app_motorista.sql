-- APLICADO no Supabase (27/10/2026)
-- 0010 · App do motorista (APK): perfil, ações de status e posição
-- O motorista não acessa tabelas: só chama as funções prog_app_* abaixo.

insert into public.prog_papeis (codigo, nome, descricao)
values ('motorista', 'Motorista', 'Usa só o app do motorista (sem acesso ao quadro)')
on conflict do nothing;

alter table public.prog_perfis
  add column if not exists motorista_id bigint unique references public.prog_motoristas (id),
  add column if not exists ciencia_em timestamptz;   -- ciência do rastreamento (LGPD)

alter table public.prog_programacao
  add column if not exists ultima_lat double precision,
  add column if not exists ultima_lng double precision,
  add column if not exists ultima_posicao_em timestamptz;

create table if not exists public.prog_posicoes (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  motorista_id bigint references public.prog_motoristas (id),
  conjunto_id bigint references public.prog_conjuntos (id),
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  precisao_m  real,
  registrado_em timestamptz not null default now()
);
create index if not exists prog_posicoes_conj_idx on public.prog_posicoes (conjunto_id, registrado_em desc);
alter table public.prog_posicoes enable row level security;
revoke all on public.prog_posicoes from anon, authenticated;
grant select on public.prog_posicoes to authenticated;
create policy prog_posicoes_ler on public.prog_posicoes for select to authenticated
  using (public.prog_tem_permissao('quadro.ver'));

-- View do quadro com a última posição (colunas novas no fim)
create or replace view public.prog_programacao_v with (security_invoker = true) as
 select p.id, p.dia, p.conjunto_id, p.motorista_id, p.placa_implemento, p.tipo, p.ordem, p.status, p.embarcador, p.destino,
        p.data_programacao, p.cheg_carga, p.carregou_em, p.prog_entrega, p.cheg_descarga, p.fim_descarga, p.localizacao,
        p.posicao_em, p.obs, p.proxima_carga, p.proxima_regiao, p.versao, p.atualizado_em, p.atualizado_por,
        c.placa_cavalo, m.nome as motorista,
        case when p.cheg_carga is not null then greatest(0::numeric, floor(extract(epoch from coalesce(p.carregou_em,
          case when p.status = 'AG. CARREGAMENTO' then now() else null end) - p.cheg_carga) / 60::numeric))::integer end as espera_carga_min,
        case when p.cheg_descarga is not null then greatest(0::numeric, floor(extract(epoch from coalesce(p.fim_descarga,
          case when p.status = 'AG. DESCARGA' then now() else null end) - p.cheg_descarga) / 60::numeric))::integer end as espera_descarga_min,
        p.ultima_lat, p.ultima_lng, p.ultima_posicao_em
   from public.prog_programacao p
   join public.prog_conjuntos c on c.id = p.conjunto_id
   left join public.prog_motoristas m on m.id = p.motorista_id;

-- Gatilho: rotinas do app (marcadas dentro das funções) passam sem exigir permissões de gestor
create or replace function public.prog_validar_edicao()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_fechado boolean;
  v_ignorar text[] := array['status', 'proxima_carga', 'proxima_regiao', 'versao', 'atualizado_em', 'atualizado_por'];
begin
  if (select auth.uid()) is null or current_setting('prog.app_motorista', true) = '1' then
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
  if (new.proxima_carga is distinct from old.proxima_carga or new.proxima_regiao is distinct from old.proxima_regiao)
     and not public.prog_tem_permissao('proxima_carga.editar') then
    raise exception 'Seu perfil não pode editar a próxima carga' using errcode = '42501';
  end if;
  if (to_jsonb(new) - v_ignorar - array['ultima_lat','ultima_lng','ultima_posicao_em']) is distinct from (to_jsonb(old) - v_ignorar - array['ultima_lat','ultima_lng','ultima_posicao_em'])
     and not public.prog_tem_permissao('programacao.editar') then
    raise exception 'Seu perfil não pode editar os dados da viagem' using errcode = '42501';
  end if;
  return new;
end $$;

-- Quem é o motorista logado (perfil ativo, papel motorista e vinculado a um cadastro)
create or replace function public.prog_app_perfil()
returns table (motorista_id bigint, nome text, ciencia_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select pf.motorista_id, pf.nome, pf.ciencia_em from public.prog_perfis pf
  where pf.id = (select auth.uid()) and pf.ativo and pf.papel = 'motorista' and pf.motorista_id is not null
$$;

create or replace function public.prog_app_dar_ciencia()
returns void language sql security definer set search_path = '' as $$
  update public.prog_perfis set ciencia_em = now() where id = (select auth.uid()) and papel = 'motorista';
$$;

-- Conjuntos de hoje para o motorista escolher
create or replace function public.prog_app_conjuntos()
returns table (conjunto_id bigint, placa_cavalo text, placa_implemento text, ocupado boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.prog_app_perfil()) then raise exception 'Sem acesso ao app' using errcode = '42501'; end if;
  return query
    select p.conjunto_id, c.placa_cavalo, p.placa_implemento, (p.motorista_id is not null and p.motorista_id <> (select a.motorista_id from public.prog_app_perfil() a))
    from public.prog_programacao p join public.prog_conjuntos c on c.id = p.conjunto_id
    where p.dia = public.prog_hoje() order by c.placa_cavalo;
end $$;

-- Situação atual do motorista (o cartão dele de hoje)
create or replace function public.prog_app_situacao()
returns table (conjunto_id bigint, placa_cavalo text, status text, embarcador text, destino text, cheg_carga timestamptz, carregou_em timestamptz, cheg_descarga timestamptz, fim_descarga timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select p.conjunto_id, c.placa_cavalo, p.status, p.embarcador, p.destino, p.cheg_carga, p.carregou_em, p.cheg_descarga, p.fim_descarga
    from public.prog_programacao p join public.prog_conjuntos c on c.id = p.conjunto_id
    where p.dia = public.prog_hoje() and p.motorista_id = (select a.motorista_id from public.prog_app_perfil() a);
end $$;

-- O motorista escolhe o conjunto em que está (gestor corrige pelo quadro se errar)
create or replace function public.prog_app_escolher_conjunto(p_conjunto_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mot bigint; v_ocupado bigint;
begin
  select a.motorista_id into v_mot from public.prog_app_perfil() a;
  if v_mot is null then raise exception 'Sem acesso ao app' using errcode = '42501'; end if;
  select p.motorista_id into v_ocupado from public.prog_programacao p where p.dia = public.prog_hoje() and p.conjunto_id = p_conjunto_id;
  if not found then raise exception 'Conjunto não está no quadro de hoje'; end if;
  if v_ocupado is not null and v_ocupado <> v_mot then raise exception 'Este conjunto já está com outro motorista. Fale com o programador.'; end if;
  perform set_config('prog.app_motorista', '1', true);
  update public.prog_programacao set motorista_id = null where dia = public.prog_hoje() and motorista_id = v_mot and conjunto_id <> p_conjunto_id;
  update public.prog_programacao set motorista_id = v_mot where dia = public.prog_hoje() and conjunto_id = p_conjunto_id;
end $$;

-- Botões do motorista: o horário é sempre o do servidor
create or replace function public.prog_app_acao(p_acao text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mot bigint; v_id bigint;
begin
  select a.motorista_id into v_mot from public.prog_app_perfil() a;
  if v_mot is null then raise exception 'Sem acesso ao app' using errcode = '42501'; end if;
  select id into v_id from public.prog_programacao where dia = public.prog_hoje() and motorista_id = v_mot;
  if v_id is null then raise exception 'Escolha primeiro o seu veículo'; end if;
  perform set_config('prog.app_motorista', '1', true);
  case p_acao
    when 'chegou_carga'     then update public.prog_programacao set cheg_carga = now(), carregou_em = null, status = 'AG. CARREGAMENTO' where id = v_id;
    when 'saiu_carregado'   then update public.prog_programacao set carregou_em = now(), status = 'EM TRÂNSITO' where id = v_id;
    when 'chegou_descarga'  then update public.prog_programacao set cheg_descarga = now(), fim_descarga = null, status = 'AG. DESCARGA' where id = v_id;
    when 'fim_descarga'     then update public.prog_programacao set fim_descarga = now(), status = 'AG. TROCA DE NOTA' where id = v_id;
    else raise exception 'Ação inválida';
  end case;
end $$;

-- Posição do celular (guarda histórico e a última posição no cartão)
create or replace function public.prog_app_posicao(p_lat double precision, p_lng double precision, p_precisao real default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mot bigint; v_conj bigint;
begin
  select a.motorista_id into v_mot from public.prog_app_perfil() a;
  if v_mot is null then raise exception 'Sem acesso ao app' using errcode = '42501'; end if;
  select conjunto_id into v_conj from public.prog_programacao where dia = public.prog_hoje() and motorista_id = v_mot;
  if v_conj is null then return; end if;   -- só rastreia com veículo escolhido
  if exists (select 1 from public.prog_posicoes where usuario_id = (select auth.uid()) and registrado_em > now() - interval '20 seconds') then return; end if;
  insert into public.prog_posicoes (usuario_id, motorista_id, conjunto_id, lat, lng, precisao_m)
  values ((select auth.uid()), v_mot, v_conj, p_lat, p_lng, p_precisao);
  perform set_config('prog.app_motorista', '1', true);
  update public.prog_programacao set ultima_lat = p_lat, ultima_lng = p_lng, ultima_posicao_em = now() where dia = public.prog_hoje() and conjunto_id = v_conj;
end $$;

revoke all on function public.prog_app_perfil(), public.prog_app_dar_ciencia(), public.prog_app_conjuntos(), public.prog_app_situacao(),
  public.prog_app_escolher_conjunto(bigint), public.prog_app_acao(text), public.prog_app_posicao(double precision, double precision, real) from public, anon;
grant execute on function public.prog_app_perfil(), public.prog_app_dar_ciencia(), public.prog_app_conjuntos(), public.prog_app_situacao(),
  public.prog_app_escolher_conjunto(bigint), public.prog_app_acao(text), public.prog_app_posicao(double precision, double precision, real) to authenticated;

-- Guarda o histórico de posições por 90 dias
select cron.schedule('prog_limpar_posicoes', '30 3 * * *', $$delete from public.prog_posicoes where registrado_em < now() - interval '90 days'$$);
