// Importa o HISTÓRICO da planilha (um arquivo .xlsx baixado do Google Sheets, lido no navegador do administrador).
// Só ACRESCENTA dias que o sistema ainda não tem. Nunca altera nem apaga dia existente. A planilha original não é tocada.
//
// Entrada (POST, JSON, com o login do usuário; exige a permissão "usuarios.gerenciar"):
//   { acao: "simular",  abas: [{ nome, linhas: [[23 colunas a partir de "Placa"]] }] }
//   { acao: "importar", abas: [...], motoristas: { "NOME NA PLANILHA": <id> | null }  }   (null = cadastrar como novo, inativo)

import { createClient } from "npm:@supabase/supabase-js@2";
import { chaveNome, escolherAbas, normalizarAba, sugerirMotorista, type Aba, type Registro } from "./historico.ts";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ORIGEM_PERMITIDA") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const eu = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await eu.auth.getUser();
    if (!u?.user) return json({ erro: "Entre no sistema para importar." }, 401);
    const { data: pode } = await eu.rpc("prog_tem_permissao", { p: "usuarios.gerenciar" });
    if (!pode) return json({ erro: "Só quem gerencia usuários pode importar o histórico." }, 403);

    let corpo: { acao?: string; abas?: Aba[]; motoristas?: Record<string, number | null> };
    try { corpo = await req.json(); } catch { return json({ erro: "Corpo inválido." }, 400); }
    const abas = Array.isArray(corpo.abas) ? corpo.abas : [];
    if (!abas.length || abas.length > 400) return json({ erro: "Nenhuma aba recebida." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [dias, mots, conjs] = await Promise.all([
      admin.from("prog_dias").select("dia"), admin.from("prog_motoristas").select("id,nome"), admin.from("prog_conjuntos").select("id,placa_cavalo,placa_implemento,tipo"),
    ]);
    if (dias.error || mots.error || conjs.error) return json({ erro: "Não consegui ler o cadastro do sistema." }, 500);
    const existentes = new Set((dias.data ?? []).map((x) => x.dia as string));

    const { porDia, ignoradas, duplicadas } = escolherAbas(abas);
    const novos: { dia: string; regs: Registro[] }[] = [];
    let semStatus = 0, jaTem = 0;
    for (const d of [...porDia.keys()].sort()) {
      if (existentes.has(d)) { jaTem++; continue; }
      const r = normalizarAba(porDia.get(d)!, d);
      semStatus += r.semStatus;
      if (r.registros.length) novos.push({ dia: d, regs: r.registros });
    }
    const todos = novos.flatMap((n) => n.regs);
    const nomes = [...new Set(todos.map((r) => r.mot).filter(Boolean) as string[])].sort();
    const sugestoes = nomes.map((n) => ({ nome: n, ...sugerirMotorista(n, mots.data ?? []) }));
    // nomes novos que são o começo de outro nome novo (TIAGO / TIAGO RANGEL) viram um só cadastro
    const novosK = sugestoes.filter((s) => s.nome_novo).map((s) => s.nome_novo!);
    for (const s of sugestoes) if (s.nome_novo) { const mais = novosK.find((k) => k.startsWith(s.nome_novo + " ")); if (mais) s.nome_novo = mais; }
    const placasConhecidas = new Set((conjs.data ?? []).map((c) => c.placa_cavalo as string));
    const placasNovas = [...new Set(todos.map((r) => r.placa))].filter((p) => !placasConhecidas.has(p)).sort();

    const resumo = {
      dias_novos: novos.length, primeiro: novos[0]?.dia ?? null, ultimo: novos.at(-1)?.dia ?? null, linhas: todos.length,
      dias_que_ja_existem: jaTem, abas_ignoradas: ignoradas, abas_duplicadas: duplicadas, linhas_sem_status: semStatus,
      veiculos_novos: placasNovas, motoristas: sugestoes,
    };
    if (corpo.acao !== "importar") return json({ ok: true, simulacao: true, ...resumo });
    if (!novos.length) return json({ ok: true, dias: 0, linhas: 0, mensagem: "Nada novo para importar." });

    // 1) motoristas: o escolhido pelo administrador; "null" cadastra como novo (inativo, só para o histórico)
    const escolha = corpo.motoristas ?? {};
    const idPorNome = new Map<string, number>();
    const validos = new Set((mots.data ?? []).map((m) => m.id as number));
    const criarNomes = new Map<string, string>();
    for (const s of sugestoes) {
      const e = s.nome in escolha ? escolha[s.nome] : s.id;
      if (e != null && validos.has(e)) idPorNome.set(s.nome, e);
      else criarNomes.set(s.nome_novo ?? chaveNome(s.nome), s.nome);
    }
    const novosMot = new Map<string, number>();
    for (const [k] of criarNomes) {
      const { data: m, error } = await admin.from("prog_motoristas").insert({ nome: k, ativo: false }).select("id").single();
      if (error || !m) return json({ erro: "Não consegui cadastrar o motorista " + k + "." }, 500);
      novosMot.set(k, m.id);
    }
    for (const s of sugestoes) if (!idPorNome.has(s.nome)) idPorNome.set(s.nome, novosMot.get(s.nome_novo ?? chaveNome(s.nome))!);

    // 2) veículos que não existem mais no cadastro entram INATIVOS (não aparecem no dia a dia)
    const idPorPlaca = new Map((conjs.data ?? []).map((c) => [c.placa_cavalo as string, c.id as number]));
    for (const p of placasNovas) {
      const ex = todos.find((r) => r.placa === p)!;
      const { data: c, error } = await admin.from("prog_conjuntos").insert({ placa_cavalo: p, placa_implemento: ex.impl, tipo: ex.tipo, ativo: false }).select("id").single();
      if (error || !c) return json({ erro: "Não consegui cadastrar o veículo " + p + "." }, 500);
      idPorPlaca.set(p, c.id);
    }

    // 3) grava os dias (função do banco: só acrescenta, não mexe em dia existente)
    let totalDias = 0, totalLinhas = 0;
    for (let i = 0; i < novos.length; i += 10) {
      const lote = novos.slice(i, i + 10).map((n) => ({
        dia: n.dia,
        linhas: n.regs.map((r) => ({
          conjunto_id: idPorPlaca.get(r.placa), motorista_id: r.mot ? idPorNome.get(r.mot) ?? null : null, impl: r.impl, tipo: r.tipo, ordem: r.ordem, status: r.status,
          embarcador: r.embarcador, destino: r.destino, data_programacao: r.data_programacao, cheg_carga: r.cheg_carga, carregou_em: r.carregou_em,
          prog_entrega: r.prog_entrega, cheg_descarga: r.cheg_descarga, fim_descarga: r.fim_descarga, localizacao: r.localizacao, posicao_em: r.posicao_em,
          obs: r.obs, proxima_carga: r.proxima_carga, proxima_regiao: r.proxima_regiao,
        })),
      }));
      const { data: rr, error } = await admin.rpc("prog_importar_historico", { p_dias: lote });
      if (error) return json({ erro: "Falhou ao gravar a partir de " + novos[i].dia + ": " + error.message, dias: totalDias, linhas: totalLinhas }, 500);
      totalDias += rr?.dias ?? 0; totalLinhas += rr?.linhas ?? 0;
    }
    return json({ ok: true, dias: totalDias, linhas: totalLinhas, primeiro: novos[0].dia, ultimo: novos.at(-1)!.dia });
  } catch (e) {
    return json({ erro: "Erro inesperado: " + (e instanceof Error ? e.message : String(e)) }, 500);
  }
});
