// Leitura do histórico da planilha (uma aba por dia). Funções puras, testadas em historico.test.mts.
// A planilha só é LIDA: o navegador manda os valores das abas e esta lógica decide o que vira registro do sistema.

export type Linha = (string | number | null)[]; // 23 colunas a partir de "Placa"
export type Aba = { nome: string; linhas: Linha[] };
export type Registro = {
  dia: string; placa: string; impl: string | null; tipo: string | null; mot: string | null;
  data_programacao: string | null; cheg_carga: string | null; carregou_em: string | null;
  embarcador: string | null; destino: string | null; prog_entrega: string | null;
  cheg_descarga: string | null; fim_descarga: string | null; status: string;
  localizacao: string | null; posicao_em: string | null; obs: string | null;
  proxima_carga: string | null; proxima_regiao: string | null; ordem: number;
};

export const STATUS_OK = new Set(["PROGRAMADO", "AG. DESCARGA", "EM MANUTENÇÃO", "AG. PROGRAMAÇÃO", "EM TRÂNSITO", "AG. CARREGAMENTO", "PERNOITE", "DSR", "AG. TROCA DE NOTA", "ENTREGUE"]);
const STATUS_ALIAS: Record<string, string> = { "AG. CARREG": "AG. CARREGAMENTO", "CUMPRINDO JORNADA": "PERNOITE" };
const TIPO_ALIAS: Record<string, string> = { "4° SD": "4º SD", "4º SD": "4º SD", "4° GB": "4º GB", "4º GB": "4º GB", "4°GB": "4º GB", "VD SD": "VD SD", "VD GB": "VD GB", "VG GB": "VD GB", "BITR GB": "BITRUCK", "BITRUCK": "BITRUCK" };

export const txt = (v: unknown): string | null => {
  const s = v == null ? "" : String(v).trim();
  return !s || s.startsWith("#") ? null : s;
};
const semAguardando = (v: string | null) => (v && v.toUpperCase().startsWith("AGUARDANDO") ? null : v);
export const placa = (v: unknown) => (txt(v) ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Nome da aba -> data. DDMM (2026), DDMMAA, DDMMAAAA. Ano 2025 nas abas é erro de digitação nesta planilha (conteúdo é de 2026).
export function dataDaAba(nome: string): string | null {
  const m = /^\s*(\d{2})(\d{2})(\d{2}|\d{4})?\.?\s*$/.exec(nome) ?? /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/.exec(nome);
  if (!m) return null;
  const d = +m[1], mo = +m[2];
  const y = !m[3] ? 2026 : m[3].length === 2 ? 2000 + +m[3] : +m[3] === 2025 ? 2026 : +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

// serial do Excel/Sheets (dias desde 30/12/1899) ou texto -> aaaa-mm-dd
export function data(v: unknown): string | null {
  let iso: string | null = null;
  if (typeof v === "number" && v >= 1) iso = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10);
  else {
    const s = String(v ?? "").trim();
    const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(s), b = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (a) iso = `${a[1]}-${a[2]}-${a[3]}`;
    else if (b) iso = `${b[3]}-${b[2].padStart(2, "0")}-${b[1].padStart(2, "0")}`;
  }
  if (!iso) return null;
  const t = new Date(iso + "T00:00:00Z");
  if (isNaN(+t) || t.toISOString().slice(0, 10) !== iso) return null; // ex.: "2026-00-03"
  const ano = +iso.slice(0, 4);
  return ano >= 2025 && ano <= 2027 ? iso : null;
}
// fração do dia (0.4819) ou "11:34" -> "11:34"
export function hora(v: unknown): string | null {
  if (typeof v === "number" && v >= 0) {
    const f = v - Math.floor(v); // alguns campos vêm como data+hora (ex.: 4,6736 = 16:10)
    if (v >= 1 && f === 0) return null;
    const min = Math.round(f * 1440) % 1440;
    return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
  }
  const m = /(\d{1,2}):(\d{2})/.exec(String(v ?? ""));
  return m ? m[1].padStart(2, "0") + ":" + m[2] : null;
}
const ts = (d: string | null, h: string | null) => (d && h ? `${d}T${h}:00-03:00` : null);

// Uma aba por dia. Se o mesmo dia aparece em mais de uma aba (ex.: "28092026." e "28092026"), vale a com mais veículos.
export function escolherAbas(abas: Aba[]): { porDia: Map<string, Aba>; ignoradas: { nome: string; motivo: string }[]; duplicadas: string[] } {
  const porDia = new Map<string, Aba>(), ignoradas: { nome: string; motivo: string }[] = [], duplicadas: string[] = [];
  for (const a of abas) {
    const d = dataDaAba(a.nome);
    if (!d) { ignoradas.push({ nome: a.nome, motivo: "o nome não é uma data" }); continue; }
    const atual = porDia.get(d);
    if (atual) duplicadas.push(`${atual.nome} / ${a.nome}`);
    if (!atual || a.linhas.length > atual.linhas.length) porDia.set(d, a);
  }
  return { porDia, ignoradas, duplicadas };
}

export function normalizarAba(a: Aba, dia: string): { registros: Registro[]; semStatus: number } {
  const registros: Registro[] = [], vistos = new Set<string>();
  let semStatus = 0, ordem = 0;
  for (const r of a.linhas) {
    const p = placa(r[0]);
    if (!/^[A-Z0-9]{7}$/.test(p) || vistos.has(p)) continue;
    let st = (txt(r[18]) ?? "").toUpperCase(); st = STATUS_ALIAS[st] ?? st;
    if (!STATUS_OK.has(st)) { semStatus++; continue; }
    vistos.add(p);
    const prox = txt(r[22]);
    const mm = /^A DEFINIR\s+(ES|SP|RJ|SC|MG|BA)\b/.exec((prox ?? "").toUpperCase());
    const regiao = mm ? (["ES", "SP", "RJ", "SC"].includes(mm[1]) ? mm[1] : "OUTRA") : null;
    let cc = ts(data(r[5]), hora(r[6])), ce = ts(data(r[7]), hora(r[8]));
    if (cc && ce && ce < cc) ce = null;
    let cd = ts(data(r[13]), hora(r[14])), fd = ts(data(r[15]), hora(r[16]));
    if (cd && fd && fd < cd) fd = null;
    const h = hora(r[19]);
    registros.push({
      dia, placa: p, impl: placa(r[1]) || null, tipo: TIPO_ALIAS[(txt(r[2]) ?? "")] ?? null, mot: txt(r[3]),
      data_programacao: data(r[4]), cheg_carga: cc, carregou_em: ce,
      embarcador: semAguardando(txt(r[10])), destino: semAguardando(txt(r[11])), prog_entrega: data(r[12]),
      cheg_descarga: cd, fim_descarga: fd, status: st,
      localizacao: txt(r[20]), posicao_em: h ? `${dia}T${h}:00-03:00` : null, obs: semAguardando(txt(r[21])),
      proxima_carga: prox, proxima_regiao: regiao, ordem: ++ordem,
    });
  }
  return { registros, semStatus };
}

// ---- motoristas: o nome da planilha vira um motorista cadastrado (sugestão; quem importa pode trocar na tela) ----
export const chaveNome = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().split(/\s*-\s+/)[0].replace(/\s+/g, " ").trim();
function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
export type Sugestao = { id: number | null; nome_novo: string | null; motivo: "igual" | "parecido" | "novo" };
export function sugerirMotorista(nomePlanilha: string, existentes: { id: number; nome: string }[]): Sugestao {
  const k = chaveNome(nomePlanilha);
  const ex = existentes.map((e) => ({ id: e.id, k: chaveNome(e.nome) }));
  const igual = ex.find((e) => e.k === k);
  if (igual) return { id: igual.id, nome_novo: null, motivo: "igual" };
  const tipo = ex.filter((e) => lev(e.k, k) <= 1);
  if (tipo.length === 1) return { id: tipo[0].id, nome_novo: null, motivo: "parecido" };
  const prefixo = ex.filter((e) => k.startsWith(e.k + " ") || e.k.startsWith(k + " "));
  if (prefixo.length === 1) return { id: prefixo[0].id, nome_novo: null, motivo: "parecido" };
  return { id: null, nome_novo: k, motivo: "novo" };
}
