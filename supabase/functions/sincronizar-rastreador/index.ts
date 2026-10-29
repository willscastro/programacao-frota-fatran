// Lê o rastreador (WebService da Trucks Control) e guarda a última posição de cada veículo.
// Só pode ser chamada com a chave de serviço (pelo agendador do banco). Login e senha vêm de segredos da função
// (TC_LOGIN e TC_SENHA); sem eles a função apenas registra o aviso e não chama o rastreador.
//
// Regras da documentação respeitadas:
//  - POST de XML puro em https, resposta em ZIP/GZIP;
//  - mensagens: no mínimo 30 s entre chamadas, a partir do último mId recebido (1 na primeira vez), máx. 30 por chamada;
//  - veículos: no mínimo 5 min entre chamadas;
//  - se a conta não tiver veículos vinculados, NÃO consulta mensagens (risco de bloqueio automático do usuário).

import { createClient } from "npm:@supabase/supabase-js@2";
import { gunzipSync, unzipSync } from "npm:fflate@0.8.2";
import { maiorMid, parseErro, parseMensagens, parseVeiculos, tipoResposta, ultimaPorVeiculo } from "./parse.ts";

const URL_TC = "https://webservice.newrastreamentoonline.com.br";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

async function chamar(xml: string): Promise<string> {
  const r = await fetch(URL_TC, { method: "POST", headers: { "Content-Type": "text/xml" }, body: new TextEncoder().encode(xml) });
  if (!r.ok) throw new Error(`Rastreador respondeu HTTP ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  const tipo = tipoResposta(bytes);
  if (tipo === "gzip") return new TextDecoder().decode(gunzipSync(bytes));
  if (tipo === "zip") {
    const arq = unzipSync(bytes);
    const nome = Object.keys(arq).find((n) => /\.(txt|xml)$/i.test(n)) ?? Object.keys(arq)[0];
    if (!nome) throw new Error("Pacote ZIP vazio");
    return new TextDecoder().decode(arq[nome]);
  }
  return new TextDecoder().decode(bytes);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${chave}`) return json({ erro: "Não autorizado" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, chave);
  const agora = new Date();
  const registrar = (campos: Record<string, unknown>) => admin.from("prog_rastreador_estado").upsert({ id: 1, ...campos });
  const falhar = async (msg: string, status = 500) => {
    await registrar({ ultimo_erro: msg, ultimo_erro_em: agora.toISOString() });
    return json({ ok: false, erro: msg }, status);
  };

  const login = Deno.env.get("TC_LOGIN"), senha = Deno.env.get("TC_SENHA");
  if (!login || !senha) return falhar("Credenciais do rastreador ainda não configuradas (TC_LOGIN e TC_SENHA).", 412);

  const { data: est } = await admin.from("prog_rastreador_estado").select("*").eq("id", 1).single();
  const desde = (t?: string | null) => (t ? agora.getTime() - Date.parse(t) : Infinity);
  if (desde(est?.ultima_em) < 25_000) return json({ ok: true, ignorado: "intervalo mínimo de 30 s ainda não passou" });

  const cred = `<login>${xmlEsc(login)}</login><senha>${xmlEsc(senha)}</senha>`;
  const resumo: Record<string, unknown> = {};
  try {
    // 1) Veículos (a cada 5 min): liga o código do equipamento (veiID) à placa
    if (desde(est?.ultima_veiculos_em) >= 5 * 60_000 + 5_000) {
      const xml = await chamar(`<RequestVeiculo>${cred}</RequestVeiculo>`);
      const erro = parseErro(xml);
      if (erro) return falhar(`Rastreador recusou a consulta de veículos (código ${erro.codigo ?? "?"}): ${erro.mensagem}`);
      const veic = parseVeiculos(xml);
      if (veic.length) {
        const { error } = await admin.from("prog_rastreador_veiculos").upsert(veic.map((v) => ({ ...v, atualizado_em: agora.toISOString() })));
        if (error) throw error;
      }
      resumo.veiculos = veic.length;
      await registrar({ ultima_veiculos_em: agora.toISOString() });
    }

    // 2) Sem veículos vinculados não se consultam mensagens
    const { count } = await admin.from("prog_rastreador_veiculos").select("vei_id", { count: "exact", head: true });
    if (!count) return falhar("Nenhum veículo vinculado à conta do rastreador; mensagens não consultadas.", 409);

    // 3) Mensagens a partir do último mId
    const mIdAtual = Number(est?.ultimo_mid ?? 1);
    const xml = await chamar(`<RequestMensagemCB>${cred}<mId>${mIdAtual}</mId></RequestMensagemCB>`);
    const erro = parseErro(xml);
    if (erro) return falhar(`Rastreador recusou a consulta de mensagens (código ${erro.codigo ?? "?"}): ${erro.mensagem}`, erro.codigo === 7 ? 429 : 502);
    const msgs = parseMensagens(xml);
    const ult = ultimaPorVeiculo(msgs);

    // só grava se for mais nova que a posição que já temos
    let gravadas = 0;
    if (ult.length) {
      const { data: atuais } = await admin.from("prog_rastreador_posicao").select("vei_id,dt").in("vei_id", ult.map((x) => x.vei_id));
      const dtAtual = new Map((atuais ?? []).map((x) => [x.vei_id as number, Date.parse(x.dt as string)]));
      const novas = ult.filter((x) => !((dtAtual.get(x.vei_id) ?? 0) >= Date.parse(x.dt)));
      if (novas.length) {
        const { error } = await admin.from("prog_rastreador_posicao").upsert(novas.map((x) => ({
          vei_id: x.vei_id, mid: x.mid, dt: x.dt, lat: x.lat, lon: x.lon, municipio: x.municipio, uf: x.uf, rodovia: x.rodovia, rua: x.rua,
          velocidade: x.velocidade, ignicao: x.ignicao, evento_gerador: x.evento_gerador, motorista_id: x.motorista_id, motorista: x.motorista,
          odometro: x.odometro, recebido_em: agora.toISOString(),
        })));
        if (error) throw error;
        gravadas = novas.length;
      }
    }
    const novoMid = maiorMid(msgs);
    resumo.mensagens = msgs.length; resumo.posicoes_atualizadas = gravadas;
    // 30 mensagens é o teto por chamada: se vieram 30, ainda há mais para buscar logo em seguida
    const atrasado = msgs.length >= 30;
    await registrar({
      ultimo_mid: novoMid != null && novoMid >= mIdAtual ? novoMid : mIdAtual,
      ultima_em: agora.toISOString(), proxima_em: new Date(agora.getTime() + (atrasado ? 30_000 : 60_000)).toISOString(),
      ultimo_resumo: resumo, ultimo_erro: null,
    });
    return json({ ok: true, ...resumo, ainda_ha_mensagens: atrasado });
  } catch (e) {
    return falhar("Falha ao consultar o rastreador: " + (e instanceof Error ? e.message : String(e)));
  }
});
