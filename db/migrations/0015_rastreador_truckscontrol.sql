-- APLICADO no Supabase (29/10/2026): integração com o rastreador (Trucks Control)
-- prog_rastreador_veiculos: veiID <-> placa; prog_rastreador_posicao: última posição por veículo;
-- prog_rastreador_estado: último mId lido e situação da leitura. Leitura liberada com quadro.ver; escrita só service_role.
create table if not exists public.prog_rastreador_veiculos (
  vei_id int primary key, placa text not null, eqp int, ident text,
  em_manutencao boolean not null default false, motorista text, atualizado_em timestamptz not null default now());
create index if not exists prog_rastreador_veiculos_placa on public.prog_rastreador_veiculos (placa);
create table if not exists public.prog_rastreador_posicao (
  vei_id int primary key, mid bigint not null, dt timestamptz not null, lat numeric(9,6), lon numeric(9,6),
  municipio text, uf text, rodovia text, rua text, velocidade int, ignicao smallint, evento_gerador int,
  motorista_id int, motorista text, odometro bigint, recebido_em timestamptz not null default now());
create table if not exists public.prog_rastreador_estado (
  id int primary key default 1 check (id = 1), ultimo_mid bigint not null default 1, ultima_em timestamptz, proxima_em timestamptz,
  ultima_veiculos_em timestamptz, ultimo_resumo jsonb, ultimo_erro text, ultimo_erro_em timestamptz);
insert into public.prog_rastreador_estado (id) values (1) on conflict do nothing;
alter table public.prog_rastreador_veiculos enable row level security;
alter table public.prog_rastreador_posicao enable row level security;
alter table public.prog_rastreador_estado enable row level security;
create policy rastreador_veiculos_ler on public.prog_rastreador_veiculos for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
create policy rastreador_posicao_ler on public.prog_rastreador_posicao for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
create policy rastreador_estado_ler on public.prog_rastreador_estado for select to authenticated using ((select public.prog_tem_permissao('quadro.ver')));
grant select on public.prog_rastreador_veiculos, public.prog_rastreador_posicao, public.prog_rastreador_estado to authenticated;
grant select, insert, update, delete on public.prog_rastreador_veiculos, public.prog_rastreador_posicao to service_role;
grant select, insert, update on public.prog_rastreador_estado to service_role;
alter publication supabase_realtime add table public.prog_rastreador_posicao;
