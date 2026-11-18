// Funções puras para falar com o servidor do WhatsApp (Evolution API v2). Sem dependências, para testar fora do Deno.

export type Contato = { nome: string; numero: string };

// Aceita "28 99257-5032", "5528992575032", "+55 (28) 99257-5032". Devolve só dígitos com DDI 55, ou null.
export function normalizarNumero(txt: unknown): string | null {
  let d = String(txt ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 15 ? d : null;
}

// O estado vem como { instance: { state } } (v2) ou { state }. "open" = conectado.
export function lerEstado(j: unknown): string {
  const o = j as { instance?: { state?: string }; state?: string } | null;
  return String(o?.instance?.state ?? o?.state ?? "desconhecido").toLowerCase();
}

// Resposta do /instance/connect e do /instance/create: o QR vem em base64 (data URL) quando o servidor o gera.
export function lerQr(j: unknown): { qr: string | null; codigo: string | null; pairingCode: string | null } {
  const o = j as Record<string, unknown> | null;
  const q = (o?.qrcode ?? o) as Record<string, unknown> | null;
  const b64 = typeof q?.base64 === "string" ? q.base64 : null;
  return {
    qr: b64 ? (b64.startsWith("data:") ? b64 : "data:image/png;base64," + b64) : null,
    codigo: typeof q?.code === "string" ? q.code : null,
    pairingCode: typeof q?.pairingCode === "string" ? q.pairingCode : null,
  };
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Lista de contatos do WhatsApp conectado: só pessoas (@s.whatsapp.net), filtradas por nome ou número.
export function filtrarContatos(lista: unknown, busca: string, limite = 30): Contato[] {
  if (!Array.isArray(lista)) return [];
  const q = semAcento(busca.trim()), qd = busca.replace(/\D/g, "");
  const vistos = new Set<string>(), out: Contato[] = [];
  for (const c of lista as Record<string, unknown>[]) {
    const jid = String(c.remoteJid ?? c.id ?? "");
    if (!jid.endsWith("@s.whatsapp.net")) continue;
    const numero = jid.split("@")[0].replace(/\D/g, "");
    if (!numero || vistos.has(numero)) continue;
    const nome = String(c.pushName ?? c.name ?? c.verifiedName ?? "").trim();
    if (q && !(semAcento(nome).includes(q) || (qd && numero.includes(qd)))) continue;
    vistos.add(numero); out.push({ nome: nome || "+" + numero, numero });
  }
  out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return out.slice(0, limite);
}

export function corpoTexto(numero: string, texto: string, atrasoMs = 1200) {
  return { number: numero, text: texto, delay: atrasoMs, linkPreview: false };
}

// Imagem vai como imagem; o resto (PDF) como documento.
export function corpoMidia(numero: string, mime: string, url: string, nomeArquivo: string, legenda: string, atrasoMs = 1500) {
  return { number: numero, mediatype: mime.startsWith("image/") ? "image" : "document", mimetype: mime, caption: legenda, media: url, fileName: nomeArquivo, delay: atrasoMs };
}

// Nome de arquivo seguro para o destinatário: "CNH - ADAO.pdf"
export function nomeParaEnvio(rotulo: string, extensao: string): string {
  const base = rotulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w ()\-.]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "documento";
  return base + "." + extensao.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
