// Interpretação das respostas XML do WebService da Trucks Control (sem dependências, para poder testar fora do Deno).
// Documentação: suporte.truckscontrol.com.br/integracao (versão 7). As respostas são XML "plano": cada bloco
// (<MensagemCB>, <Veiculo>) tem só tags simples, então uma leitura por expressão regular é suficiente.

export type Mensagem = {
  mid: number; vei_id: number; dt: string; lat: number | null; lon: number | null;
  municipio: string | null; uf: string | null; rodovia: string | null; rua: string | null;
  velocidade: number | null; ignicao: number | null; evento_gerador: number | null;
  motorista_id: number | null; motorista: string | null; odometro: number | null; tp_msg: number | null;
};
export type Veiculo = { vei_id: number; placa: string; eqp: number | null; ident: string | null; em_manutencao: boolean; motorista: string | null };
export type ErroTC = { codigo: number | null; mensagem: string };

const desescapar = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function filhos(bloco: string): Record<string, string> {
  const o: Record<string, string> = {};
  for (const m of bloco.matchAll(/<([A-Za-z][A-Za-z0-9_]*)>([\s\S]*?)<\/\1>/g)) o[m[1]] = desescapar(m[2].trim());
  return o;
}
function blocos(xml: string, tag: string): Record<string, string>[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => filhos(m[1]));
}
const num = (v: string | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const txt = (v: string | undefined): string | null => (v == null || v.trim() === "" ? null : v.trim());

export function parseErro(xml: string): ErroTC | null {
  if (!/<ErrorRequest>/i.test(xml)) return null;
  const f = blocos(xml, "ErrorRequest")[0] ?? {};
  return { codigo: num(f.codigo), mensagem: f.erro ?? f.Erro ?? "Erro retornado pelo rastreador" };
}

export function parseVeiculos(xml: string): Veiculo[] {
  return blocos(xml, "Veiculo").flatMap((f) => {
    const id = num(f.veiID);
    const placa = (f.placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (id == null || !placa) return [];
    return [{ vei_id: id, placa, eqp: num(f.eqp), ident: txt(f.ident), em_manutencao: f.vManut === "1" || f.vManut === "true", motorista: txt(f.mot) }];
  });
}

export function parseMensagens(xml: string): Mensagem[] {
  return blocos(xml, "MensagemCB").flatMap((f) => {
    const mid = num(f.mId), vei = num(f.veiID);
    if (mid == null || vei == null || !f.dt) return [];
    const tp = num(f.tpMsg);
    // evt4 = ignição. Ausente significa desligada, mas só nas mensagens que trazem estado (tipos 1 e 5);
    // log de posição, macro e antena não informam ignição. Valor -1 = a mensagem não sabe.
    const trazEstado = tp == null || tp === 1 || tp === 5;
    let ign: number | null = null;
    if (trazEstado) { const v = num(f.evt4); ign = v == null ? 0 : v < 0 ? null : v; }
    const vel = num(f.vel);
    return [{
      mid, vei_id: vei, dt: f.dt,
      lat: num(f.lat), lon: num(f.lon),
      municipio: txt(f.mun), uf: txt(f.uf), rodovia: txt(f.rod), rua: txt(f.rua),
      velocidade: vel == null || vel < 0 ? null : Math.round(vel),
      ignicao: ign, evento_gerador: num(f.evtG),
      motorista_id: num(f.motID), motorista: txt(f.mot), odometro: num(f.odm), tp_msg: tp,
    }];
  });
}

// Fica só com a mensagem mais recente (por data) de cada veículo
export function ultimaPorVeiculo(msgs: Mensagem[]): Mensagem[] {
  const m = new Map<number, Mensagem>();
  for (const x of msgs) {
    const a = m.get(x.vei_id);
    if (!a || Date.parse(x.dt) > Date.parse(a.dt) || (Date.parse(x.dt) === Date.parse(a.dt) && x.mid > a.mid)) m.set(x.vei_id, x);
  }
  return [...m.values()];
}

export const maiorMid = (msgs: Mensagem[]): number | null => (msgs.length ? msgs.reduce((a, x) => (x.mid > a ? x.mid : a), 0) : null);

// A resposta pode vir em ZIP (padrão, com um .txt dentro), GZIP ou XML puro.
export function tipoResposta(b: Uint8Array): "zip" | "gzip" | "texto" {
  if (b.length > 3 && b[0] === 0x50 && b[1] === 0x4b) return "zip";
  if (b.length > 2 && b[0] === 0x1f && b[1] === 0x8b) return "gzip";
  return "texto";
}
