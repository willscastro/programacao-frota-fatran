-- Programação de Frota Fatran
-- 0004 · Geração automática do dia
--
-- gerar_dia_interno  : faz o trabalho. Só a agenda e o administrador do banco chamam.
-- prog_gerar_dia     : botão "Gerar dia" (exige a permissão dia.gerar).
-- prog_garantir_dia  : chamada ao abrir o sistema; cria o dia de hoje se ainda não existir.

create function public.prog_gerar_dia_interno(p_dia date, p_origem text default 'automatico')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev date;
  v_n    integer;
begin
  -- Evita dois geradores ao mesmo tempo
  perform pg_advisory_xact_lock(hashtext('prog_gerar_dia'));

  -- Já existe: não duplica (a função pode rodar quantas vezes for preciso)
  if exists (select 1 from public.prog_dias where dia = p_dia) then
    return jsonb_build_object('dia', p_dia, 'criado', false);
  end if;

  select max(dia) into v_prev from public.prog_dias where dia < p_dia;

  insert into public.prog_dias (dia, origem) values (p_dia, p_origem);

  if v_prev is null then
    -- Primeiro dia do sistema: todos os conjuntos ativos aguardando programação
    insert into public.prog_programacao (dia, conjunto_id, placa_implemento, tipo, status, ordem)
    select p_dia, c.id, c.placa_implemento, c.tipo, 'AG. PROGRAMAÇÃO',
           (row_number() over (order by c.placa_cavalo))::int
    from public.prog_conjuntos c
    where c.ativo;
  else
    -- Copia o dia anterior. Quem foi ENTREGUE volta a aguardar programação, com a viagem em branco.
    insert into public.prog_programacao (
      dia, conjunto_id, motorista_id, placa_implemento, tipo, ordem, status,
      embarcador, destino, data_programacao, cheg_carga, carregou_em,
      prog_entrega, cheg_descarga, fim_descarga,
      localizacao, posicao_em, obs, proxima_carga, proxima_regiao
    )
    select
      p_dia, c.id, p.motorista_id,
      coalesce(p.placa_implemento, c.placa_implemento),
      coalesce(p.tipo, c.tipo),
      coalesce(p.ordem, 9999),
      case when p.status is null or p.status = 'ENTREGUE' then 'AG. PROGRAMAÇÃO' else p.status end,
      case when p.status = 'ENTREGUE' then null else p.embarcador end,
      case when p.status = 'ENTREGUE' then null else p.destino end,
      case when p.status = 'ENTREGUE' then null else p.data_programacao end,
      case when p.status = 'ENTREGUE' then null else p.cheg_carga end,
      case when p.status = 'ENTREGUE' then null else p.carregou_em end,
      case when p.status = 'ENTREGUE' then null else p.prog_entrega end,
      case when p.status = 'ENTREGUE' then null else p.cheg_descarga end,
      case when p.status = 'ENTREGUE' then null else p.fim_descarga end,
      p.localizacao,
      null,
      case when p.status = 'ENTREGUE' then null else p.obs end,
      p.proxima_carga,
      p.proxima_regiao
    from public.prog_conjuntos c
    left join public.prog_programacao p on p.conjunto_id = c.id and p.dia = v_prev
    where c.ativo;
  end if;

  get diagnostics v_n = row_count;

  -- Ao entrar um dia novo, os anteriores ficam fechados
  if p_dia >= public.prog_hoje() then
    update public.prog_dias
       set fechado = true, fechado_em = now()
     where dia < p_dia and not fechado;
  end if;

  return jsonb_build_object('dia', p_dia, 'criado', true, 'baseado_em', v_prev, 'linhas', v_n);
end
$$;

create function public.prog_gerar_dia(p_dia date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.prog_tem_permissao('dia.gerar') then
    raise exception 'Seu perfil não pode gerar o dia' using errcode = '42501';
  end if;
  return public.prog_gerar_dia_interno(coalesce(p_dia, public.prog_hoje()), 'manual');
end
$$;

create function public.prog_garantir_dia()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.prog_tem_permissao('quadro.ver') then
    raise exception 'Sem acesso ao quadro' using errcode = '42501';
  end if;
  return public.prog_gerar_dia_interno(public.prog_hoje(), 'sob_demanda');
end
$$;

revoke execute on function public.prog_gerar_dia_interno(date, text) from public, anon, authenticated;
revoke execute on function public.prog_gerar_dia(date)               from public, anon;
revoke execute on function public.prog_garantir_dia()                from public, anon;
grant  execute on function public.prog_gerar_dia(date)               to authenticated;
grant  execute on function public.prog_garantir_dia()                to authenticated;
