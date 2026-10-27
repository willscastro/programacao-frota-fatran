// Recebe os dados da planilha (enviados por um script que só LÊ a planilha) e atualiza o quadro de HOJE.
// Regras:
//  - só aceita chamadas de e-mails Google autorizados (tabela prog_sync_emails), confirmados no Google;
//  - só mexe no dia de hoje;
//  - aplica somente os campos que MUDARAM na planilha desde a última leitura (o que o motorista/gestor
//    lançou no sistema e não mudou na planilha é preservado);
//  - nunca apaga nada; veículos que só existem no sistema ficam como estão.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const txt = (v: unknown) => { const s = v == null ? "" : String(v).trim(); return s || null; };
const semAguardando = (v: string | null) => (v && v.toUpperCase().startsWith("AGUARDANDO") ? null : v);
const placa = (v: unknown) => (txt(v) ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const hora = (v: unknown) => { const m = /(\d{1,2}):(\d{2})/.exec(String(v ?? "")); return m ? m[1].padStart(2, "0") + ":" + m[2] : null; };
const data = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);
const ts = (d: unknown, h: unknown) => { const dd = data(d), hh = hora(h); return dd && hh ? `${dd}T${hh}:00-03:00` : null; };

function normalizar(l: Record<string, unknown>, dia: string) {
  const prox = txt(l.proxima);
  const m = /^A DEFINIR\s+(ES|SP|RJ|SC|MG|BA)\b/.exec((prox ?? "").toUpperCase());
  return {
    impl: placa(l.impl) || null,
    tipo: txt(l.tipo),
    mot: txt(l.mot),
    data_programacao: data(l.data_programacao),
    cheg_carga: ts(l.cheg_carga_d, l.cheg_carga_h),
    carregou_em: ts(l.carregou_d, l.carregou_h),
    embarcador: semAguardando(txt(l.embarcador)),
    destino: semAguardando(txt(l.destino)),
    prog_entrega: data(l.prog_entrega),
    cheg_descarga: ts(l.cheg_desc_d, l.cheg_desc_h),
    fim_descarga: ts(l.fim_desc_d, l.fim_desc_h),
    status: txt(l.status),
    posicao_em: hora(l.posicao_h) ? `${dia}T${hora(l.posicao_h)}:00-03:00` : null,
    localizacao: txt(l.localizacao),
    obs: semAguardando(txt(l.obs)),
    proxima_carga: prox,
    proxima_regiao: m ? m[1] : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);

  // 1) Quem chama: token do Google -> e-mail -> precisa estar autorizado
  const tk = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!tk) return json({ erro: "Sem credencial" }, 401);
  const g = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tk}` } });
  if (!g.ok) return json({ erro: "Credencial do Google inválida" }, 401);
  const info = await g.json();
  const email = String(info.email ?? "").toLowerCase();
  if (!email || info.email_verified === false) return json({ erro: "E-mail não verificado" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ok } = await admin.from("prog_sync_emails").select("email").eq("email", email).maybeSingle();
  if (!ok) return json({ erro: "E-mail não autorizado a sincronizar" }, 403);

  // 2) Corpo
  let corpo: { dia?: string; linhas?: Record<string, unknown>[] };
  try { corpo = await req.json(); } catch { return json({ erro: "Corpo inválido" }, 400); }
  const dia = String(corpo.dia ?? "");
  const linhas = Array.isArray(corpo.linhas) ? corpo.linhas : [];
  const { data: hoje } = await admin.rpc("prog_hoje");
  if (dia !== hoje) return json({ erro: `Só o dia de hoje (${hoje}) pode ser sincronizado` }, 400);
  if (!linhas.length) return json({ erro: "Nenhuma linha recebida" }, 400);

  const [st, tp, mo, snaps] = await Promise.all([
    admin.from("prog_status").select("codigo"),
    admin.from("prog_tipos_conjunto").select("codigo"),
    admin.from("prog_motoristas").select("id,nome"),
    admin.from("prog_planilha_snap").select("placa,dados").eq("dia", dia),
  ]);
  const statusOk = new Set((st.data ?? []).map((x) => x.codigo));
  const tiposOk = new Set((tp.data ?? []).map((x) => x.codigo));
  const motoristas = new Map((mo.data ?? []).map((x) => [x.nome.trim().toLowerCase(), x.id as number]));
  const snap = new Map((snaps.data ?? []).map((x) => [x.placa, x.dados as Record<string, unknown>]));

  const resumo = { lidas: 0, atualizadas: 0, criadas: 0, sem_mudanca: 0, primeira_leitura: 0, ignoradas: 0 };
  const vistos = new Set<string>();

  for (const l of linhas) {
    const pl = placa(l.placa);
    if (!pl || vistos.has(pl)) continue;
    vistos.add(pl);
    const n = normalizar(l, dia);
    if (!n.status || n.status === "ENTREGUE" || !statusOk.has(n.status)) { resumo.ignoradas++; continue; }
    resumo.lidas++;

    const antes = snap.get(pl);
    const { data: conj } = await admin.from("prog_conjuntos").select("id").eq("placa_cavalo", pl).maybeSingle();
    let conjId = conj?.id as number | undefined;
    const { data: reg } = conjId
      ? await admin.from("prog_programacao").select("id").eq("dia", dia).eq("conjunto_id", conjId).maybeSingle()
      : { data: null };

    // Veículo novo na planilha: cria conjunto, motorista e a linha de hoje
    if (!reg) {
      if (!conjId) {
        const { data: novo, error } = await admin.from("prog_conjuntos")
          .insert({ placa_cavalo: pl, placa_implemento: n.impl, tipo: n.tipo && tiposOk.has(n.tipo) ? n.tipo : null }).select("id").single();
        if (error) { resumo.ignoradas++; continue; }
        conjId = novo.id;
      }
      let motId: number | null = null;
      if (n.mot) {
        motId = motoristas.get(n.mot.toLowerCase()) ?? null;
        if (!motId) { const { data: m } = await admin.from("prog_motoristas").insert({ nome: n.mot }).select("id").single(); motId = m?.id ?? null; if (motId) motoristas.set(n.mot.toLowerCase(), motId); }
      }
      const { error } = await admin.from("prog_programacao").insert({
        dia, conjunto_id: conjId, motorista_id: motId, placa_implemento: n.impl, tipo: n.tipo && tiposOk.has(n.tipo) ? n.tipo : null, status: n.status,
        embarcador: n.embarcador, destino: n.destino, data_programacao: n.data_programacao, cheg_carga: n.cheg_carga, carregou_em: n.carregou_em,
        prog_entrega: n.prog_entrega, cheg_descarga: n.cheg_descarga, fim_descarga: n.fim_descarga, localizacao: n.localizacao, posicao_em: n.posicao_em,
        obs: n.obs, proxima_carga: n.proxima_carga, proxima_regiao: n.proxima_regiao,
      });
      if (error) { resumo.ignoradas++; continue; }
      resumo.criadas++;
      await admin.from("prog_planilha_snap").upsert({ dia, placa: pl, dados: n, atualizado_em: new Date().toISOString() });
      continue;
    }

    // Primeira leitura deste veículo hoje: só guarda a foto, sem alterar o sistema
    if (!antes) {
      resumo.primeira_leitura++;
      await admin.from("prog_planilha_snap").upsert({ dia, placa: pl, dados: n, atualizado_em: new Date().toISOString() });
      continue;
    }

    // Aplica só o que mudou na planilha desde a última leitura
    const mudou: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) {
      if (JSON.stringify(v ?? null) === JSON.stringify((antes as Record<string, unknown>)[k] ?? null)) continue;
      if (k === "mot") {
        let id: number | null = null;
        if (v) {
          id = motoristas.get(String(v).toLowerCase()) ?? null;
          if (!id) { const { data: m } = await admin.from("prog_motoristas").insert({ nome: v }).select("id").single(); id = m?.id ?? null; if (id) motoristas.set(String(v).toLowerCase(), id); }
        }
        mudou.motorista_id = id;
      } else if (k === "impl") mudou.placa_implemento = v;
      else if (k === "tipo") { if (!v || tiposOk.has(String(v))) mudou.tipo = v; }
      else mudou[k] = v;
    }
    if (Object.keys(mudou).length) {
      const { error } = await admin.from("prog_programacao").update(mudou).eq("id", reg.id);
      if (error) { resumo.ignoradas++; continue; }
      resumo.atualizadas++;
    } else resumo.sem_mudanca++;
    await admin.from("prog_planilha_snap").upsert({ dia, placa: pl, dados: n, atualizado_em: new Date().toISOString() });
  }
  return json({ ok: true, dia, ...resumo });
});
