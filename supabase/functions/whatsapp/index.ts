// Envio automático por WhatsApp. O número fica conectado (por QR) a um servidor Evolution API que o Whitney hospeda;
// esta função é a ponte segura entre o sistema e esse servidor. O navegador nunca vê a chave do servidor.
//
// Segredos da função (definidos pelo administrador, nunca no código):
//   EVOLUTION_URL        endereço https do servidor, sem barra no fim (ex.: https://zap.fatran.com.br)
//   EVOLUTION_APIKEY     chave global do servidor
//   EVOLUTION_INSTANCE   nome da instância (opcional; padrão "fatran")
//
// Entrada (POST, JSON), sempre com o login do usuário:
//   { acao: "status" }                                   quem vê o quadro
//   { acao: "contatos", busca? }                         quem vê o quadro
//   { acao: "enviar", conjunto_id, motorista_id?, numero, texto, itens: [{ id, rotulo }] }   quem vê o quadro
//   { acao: "conectar", numero? }                        quem gerencia usuários (gera o QR ou o código de pareamento)
//   { acao: "desconectar" }                              quem gerencia usuários

import { createClient } from "npm:@supabase/supabase-js@2";
import { corpoMidia, corpoTexto, filtrarContatos, lerEstado, lerQr, nomeParaEnvio, normalizarNumero } from "./evo.ts";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ORIGEM_PERMITIDA") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_ITENS = 8, MAX_TEXTO = 3500, LIMITE_POR_MINUTO = 6;

type Resp = { status: number; corpo: unknown };
async function evo(metodo: string, caminho: string, corpo?: unknown): Promise<Resp> {
  const base = Deno.env.get("EVOLUTION_URL")!.replace(/\/+$/, "");
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", apikey: Deno.env.get("EVOLUTION_APIKEY")! },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(25_000),
  });
  let j: unknown = null;
  try { j = await r.json(); } catch { /* resposta sem corpo */ }
  return { status: r.status, corpo: j };
}
const msgErro = (r: Resp) => {
  const o = r.corpo as { message?: unknown; response?: { message?: unknown } } | null;
  const m = o?.response?.message ?? o?.message;
  return `HTTP ${r.status}${m ? ": " + (Array.isArray(m) ? m.join("; ") : typeof m === "string" ? m : JSON.stringify(m)) : ""}`.slice(0, 300);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ erro: "Faça login para continuar" }, 401);
  const comoUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await comoUsuario.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return json({ erro: "Sessão inválida. Entre de novo." }, 401);
  const pode = async (p: string) => (await comoUsuario.rpc("prog_tem_permissao", { p })).data === true;

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ erro: "Corpo inválido" }, 400); }
  const acao = String(b.acao ?? "");
  const inst = Deno.env.get("EVOLUTION_INSTANCE") || "fatran";
  const configurado = !!(Deno.env.get("EVOLUTION_URL") && Deno.env.get("EVOLUTION_APIKEY"));

  const admin = acao === "enviar" ? createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!) : null;

  try {
    // ---------- estado da conexão ----------
    if (acao === "status") {
      if (!(await pode("quadro.ver"))) return json({ erro: "Sem permissão" }, 403);
      if (!configurado) return json({ configurado: false, conectado: false, estado: "nao_configurado" });
      const r = await evo("GET", `/instance/connectionState/${encodeURIComponent(inst)}`);
      if (r.status === 404) return json({ configurado: true, conectado: false, estado: "sem_instancia" });
      if (r.status >= 400) return json({ configurado: true, conectado: false, estado: "servidor_com_erro", detalhe: msgErro(r) });
      const estado = lerEstado(r.corpo);
      return json({ configurado: true, conectado: estado === "open", estado });
    }

    if (!configurado) return json({ erro: "O servidor do WhatsApp ainda não foi configurado (segredos EVOLUTION_URL e EVOLUTION_APIKEY)." }, 412);

    // ---------- conectar (QR) / desconectar ----------
    if (acao === "conectar" || acao === "desconectar") {
      if (!(await pode("usuarios.gerenciar"))) return json({ erro: "Só quem gerencia usuários pode conectar o WhatsApp." }, 403);
      if (acao === "desconectar") {
        const r = await evo("DELETE", `/instance/logout/${encodeURIComponent(inst)}`);
        if (r.status >= 400 && r.status !== 404) return json({ erro: "Não consegui desconectar: " + msgErro(r) }, 502);
        return json({ ok: true });
      }
      let est = await evo("GET", `/instance/connectionState/${encodeURIComponent(inst)}`);
      let qr = { qr: null as string | null, codigo: null as string | null, pairingCode: null as string | null };
      if (est.status === 404) {
        const c = await evo("POST", "/instance/create", { instanceName: inst, qrcode: true, integration: "WHATSAPP-BAILEYS" });
        if (c.status >= 400) return json({ erro: "Não consegui criar a conexão: " + msgErro(c) }, 502);
        qr = lerQr(c.corpo);
      } else if (est.status >= 400) {
        return json({ erro: "O servidor do WhatsApp respondeu com erro: " + msgErro(est) }, 502);
      } else if (lerEstado(est.corpo) === "open") {
        return json({ ok: true, estado: "open", conectado: true });
      }
      if (!qr.qr && !qr.pairingCode) {
        const numero = normalizarNumero(b.numero);
        const c = await evo("GET", `/instance/connect/${encodeURIComponent(inst)}` + (numero ? `?number=${numero}` : ""));
        if (c.status >= 400) return json({ erro: "Não consegui gerar o QR: " + msgErro(c) }, 502);
        qr = lerQr(c.corpo);
      }
      return json({ ok: true, estado: "connecting", conectado: false, ...qr });
    }

    // ---------- contatos do WhatsApp conectado ----------
    if (acao === "contatos") {
      if (!(await pode("quadro.ver"))) return json({ erro: "Sem permissão" }, 403);
      const r = await evo("POST", `/chat/findContacts/${encodeURIComponent(inst)}`, { where: {} });
      if (r.status >= 400) return json({ erro: "Não consegui ler os contatos: " + msgErro(r) }, 502);
      return json({ contatos: filtrarContatos(r.corpo, String(b.busca ?? "")) });
    }

    // ---------- enviar ----------
    if (acao === "enviar") {
      if (!(await pode("quadro.ver"))) return json({ erro: "Sem permissão" }, 403);
      const numero = normalizarNumero(b.numero);
      if (!numero) return json({ erro: "Número inválido. Use DDD + número." }, 400);
      const texto = String(b.texto ?? "").trim();
      if (!texto) return json({ erro: "A mensagem está vazia." }, 400);
      if (texto.length > MAX_TEXTO) return json({ erro: "Mensagem longa demais." }, 400);
      const conjuntoId = Number(b.conjunto_id), motoristaId = b.motorista_id == null ? null : Number(b.motorista_id);
      const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, MAX_ITENS) as { id: number; rotulo?: string }[];
      if (!Number.isInteger(conjuntoId)) return json({ erro: "Conjunto inválido." }, 400);

      // limite por minuto (proteção contra clique repetido e contra abuso)
      const desde = new Date(Date.now() - 60_000).toISOString();
      const { count } = await admin!.from("prog_envios").select("id", { count: "exact", head: true }).eq("por", uid).eq("canal", "whatsapp-automatico").gte("em", desde);
      if ((count ?? 0) >= LIMITE_POR_MINUTO) return json({ erro: "Muitos envios em sequência. Aguarde um minuto." }, 429);

      const est = await evo("GET", `/instance/connectionState/${encodeURIComponent(inst)}`);
      if (est.status >= 400 || lerEstado(est.corpo) !== "open") return json({ erro: "O WhatsApp não está conectado. Peça ao administrador para ler o QR de novo." }, 409);

      // só documentos do próprio conjunto: placas dele, motorista dele, ou o comprovante ANTT da empresa
      const { data: conj } = await admin!.from("prog_conjuntos").select("placa_cavalo,placa_implemento").eq("id", conjuntoId).single();
      if (!conj) return json({ erro: "Conjunto não encontrado." }, 404);
      const ids = itens.map((i) => Number(i.id)).filter(Number.isInteger);
      const { data: docs } = ids.length ? await admin!.from("prog_documentos").select("id,tipo,placa,motorista_id,arquivo,mime").in("id", ids) : { data: [] };
      const placas = new Set([conj.placa_cavalo, conj.placa_implemento].filter(Boolean));
      const validos = (docs ?? []).filter((d) => d.tipo === "ANTT" || (d.placa && placas.has(d.placa)) || (d.motorista_id != null && d.motorista_id === motoristaId));
      const rotuloDe = (id: number) => String(itens.find((i) => Number(i.id) === id)?.rotulo ?? "").slice(0, 100);

      const resultado: { item: string; ok: boolean; erro?: string }[] = [];
      const t = await evo("POST", `/message/sendText/${encodeURIComponent(inst)}`, corpoTexto(numero, texto));
      let status = "enviado", erroGeral: string | null = null;
      if (t.status >= 400) {
        status = "erro"; erroGeral = "Texto não enviado: " + msgErro(t);
      } else {
        for (const d of validos) {
          await espera(1500 + Math.floor(Math.random() * 1500)); // pausa entre mensagens, mais natural e mais seguro para o número
          const rot = rotuloDe(d.id) || d.tipo;
          const ext = String(d.arquivo).split(".").pop() ?? "pdf";
          const { data: s } = await admin!.storage.from("prog-docs").createSignedUrl(d.arquivo, 300);
          if (!s) { resultado.push({ item: rot, ok: false, erro: "arquivo indisponível" }); continue; }
          const m = await evo("POST", `/message/sendMedia/${encodeURIComponent(inst)}`, corpoMidia(numero, d.mime || "application/pdf", s.signedUrl, nomeParaEnvio(rot, ext), rot));
          resultado.push(m.status >= 400 ? { item: rot, ok: false, erro: msgErro(m) } : { item: rot, ok: true });
        }
        if (resultado.some((r) => !r.ok)) status = "parcial";
      }
      await admin!.from("prog_envios").insert({
        por: uid, conjunto_id: conjuntoId, motorista_id: motoristaId, destino: numero, canal: "whatsapp-automatico",
        itens: validos.map((d) => rotuloDe(d.id) || d.tipo), status, erro: erroGeral ?? (resultado.filter((r) => !r.ok).map((r) => r.item + ": " + r.erro).join(" | ") || null),
      });
      if (status === "erro") return json({ ok: false, erro: erroGeral }, 502);
      return json({ ok: true, status, texto_enviado: true, itens: resultado, ignorados: itens.length - validos.length });
    }

    return json({ erro: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ erro: "Falha ao falar com o servidor do WhatsApp: " + (e instanceof Error ? e.message : String(e)) }, 502);
  }
});
