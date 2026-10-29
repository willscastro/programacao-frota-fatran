// Programação de Frota · Fatran — front-end (HTML/JS puro + Supabase)
// A chave abaixo é a chave PÚBLICA (publishable). A segurança vem das regras do banco (RLS), não dela.
const SUPABASE_URL = "https://rmlbnqnnanrkvoeqntim.supabase.co";
const SUPABASE_KEY = "sb_publishable_AZsrZk-4UDIY_G0b8fJojg_DRXeiA7j";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const S = { custoDia: 1500, perfil: null, perms: new Set(), dia: null, status: [], rows: [], tipos: {}, lado: "right", aberto: null, canal: null, desfazer: [], tela: "quadro", motoristas: [], pref: JSON.parse(JSON.stringify({ piscar: { aguardando_carga: true, aguardando_desc: true, manutencao: true, esperas: true }, limiteMin: 120 })), filtro: { tipo: "", resumo: "" } };
const $app = document.getElementById("app");
const can = (p) => S.perms.has(p);

// ---------- utilidades ----------
function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat(Infinity)) if (f != null) el.append(f.nodeType ? f : document.createTextNode(String(f)));
  return el;
}

// ---------- ícones (SVG próprio, traço único; herdam a cor do texto) ----------
const ICONES = {
  planilha: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
  alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  atualizar: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  desfazer: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  mapa: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  historico: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  grafico: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  esq: '<path d="m15 18-6-6 6-6"/>',
  dir: '<path d="m9 18 6-6-6-6"/>',
  ambos: '<path d="m7 7-5 5 5 5"/><path d="m17 7 5 5-5 5"/>',
  pasta: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  seta: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  pino: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  gps: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>',
  cima: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  baixo: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  usuario: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  olho_off: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/>',
  olho: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
};
function ic(nome) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", "0 0 24 24"); el.setAttribute("class", "ic"); el.setAttribute("aria-hidden", "true");
  el.innerHTML = ICONES[nome] || ""; // markup fixo definido acima
  return el;
}
// Troca o conteúdo de um elemento por ícone + texto
function rot(el, nome, texto) { el.replaceChildren(...(nome ? [ic(nome)] : []), document.createTextNode(texto ? " " + texto : "")); }
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 3500);
}
function traduzErro(e) {
  const m = (e && e.message) || String(e);
  if (/Invalid login/i.test(m)) return "E-mail ou senha incorretos.";
  if (/row-level security|permission denied/i.test(m)) return "Seu perfil não tem permissão para isso.";
  if (/carga_coerente/.test(m)) return "O fim do carregamento não pode ser antes da chegada.";
  if (/descarga_coerente/.test(m)) return "O fim da descarga não pode ser antes da chegada.";
  if (/duplicate key|already exists/i.test(m)) return "Já existe um cadastro igual.";
  if (/placa/.test(m) && /check/i.test(m)) return "Placa inválida: use 7 letras/números.";
  return m;
}
function fmtMin(min) {
  if (min == null) return "";
  return Math.floor(min / 60) + "h" + String(min % 60).padStart(2, "0");
}
function semaforo(min) { return min == null ? "" : min >= 420 ? "v" : min >= 300 ? "r" : min >= 120 ? "y" : ""; }
function dataBR(d) { return d ? d.split("-").reverse().join("/") : ""; }

// ---------- login ----------
function telaLogin(msg) {
  const email = h("input", { type: "email", autocomplete: "username", required: true });
  const senha = h("input", { type: "password", autocomplete: "current-password", required: true });
  const erro = h("div", { class: "err" }, msg || "");
  const btn = h("button", { class: "pri", type: "submit" }, "Entrar");
  const form = h("form", { class: "box", onsubmit: async (ev) => {
    ev.preventDefault(); btn.disabled = true; erro.textContent = "";
    const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: senha.value });
    btn.disabled = false;
    if (error) { erro.textContent = traduzErro(error); return; }
    iniciar();
  } },
    h("h2", {}, "Programação de Frota"), h("div", { class: "hint" }, "Fatran Transportes"),
    h("label", {}, "E-mail"), email, h("label", {}, "Senha"), senha, erro, h("div", { class: "row" }, btn));
  $app.replaceChildren(h("div", { class: "login" }, form));
}

function telaTrocaSenha() {
  return new Promise((resolve) => {
    const n1 = h("input", { type: "password", autocomplete: "new-password", minlength: 10, required: true });
    const n2 = h("input", { type: "password", autocomplete: "new-password", minlength: 10, required: true });
    const erro = h("div", { class: "err" });
    const form = h("form", { class: "box", onsubmit: async (ev) => {
      ev.preventDefault(); erro.textContent = "";
      if (n1.value !== n2.value) { erro.textContent = "As senhas não são iguais."; return; }
      if (n1.value.length < 10) { erro.textContent = "Use pelo menos 10 caracteres."; return; }
      const { error } = await sb.auth.updateUser({ password: n1.value });
      if (error) { erro.textContent = traduzErro(error); return; }
      const r = await sb.rpc("prog_concluir_troca_senha");
      if (r.error) { erro.textContent = traduzErro(r.error); return; }
      resolve();
    } },
      h("h2", {}, "Crie sua senha"), h("div", { class: "hint" }, "Por segurança, troque a senha temporária antes de continuar."),
      h("label", {}, "Nova senha (mínimo 10 caracteres)"), n1, h("label", {}, "Repita a nova senha"), n2, erro,
      h("div", { class: "row" }, h("button", { class: "pri", type: "submit" }, "Salvar senha")));
    $app.replaceChildren(h("div", { class: "login" }, form));
  });
}

// ---------- inicialização ----------
async function iniciar() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return telaLogin();
  const p = await sb.from("prog_perfis").select("id,nome,papel,ativo,deve_trocar_senha").eq("id", user.id).maybeSingle();
  if (!p.data || !p.data.ativo) {
    await sb.auth.signOut();
    return telaLogin("Seu acesso não está liberado. Fale com o administrador.");
  }
  S.perfil = p.data;
  const salvo = (user.user_metadata && user.user_metadata.pref_piscar) || {};
  S.pref = { piscar: { ...S.pref.piscar, ...(salvo.piscar || {}) }, limiteMin: salvo.limiteMin ?? S.pref.limiteMin };
  if (S.perfil.deve_trocar_senha) { await telaTrocaSenha(); S.perfil.deve_trocar_senha = false; }
  const m = await sb.from("prog_papel_permissoes").select("permissao").eq("papel", S.perfil.papel);
  S.perms = new Set((m.data || []).map((x) => x.permissao));
  if (!can("quadro.ver")) { await sb.auth.signOut(); return telaLogin("Seu perfil não tem acesso ao quadro."); }

  await sb.rpc("prog_garantir_dia"); // cria o dia de hoje se ainda não existir
  const hoje = await sb.rpc("prog_hoje");
  S.dia = hoje.data; S.hoje = hoje.data;
  const dl = await sb.from("prog_dias").select("dia").order("dia", { ascending: false }).limit(800);
  S.diasLista = (dl.data || []).map((x) => x.dia);
  desenharEstrutura();
  await carregar();
  assinarTempoReal();
}

async function carregar() {
  const [st, rows, tp, mo, cfg, rv, rp] = await Promise.all([
    sb.from("prog_status").select("*").order("ordem"),
    sb.from("prog_programacao_v").select("*").eq("dia", S.dia).order("ordem").order("placa_cavalo"),
    sb.from("prog_tipos_conjunto").select("codigo,cor"),
    sb.from("prog_motoristas").select("id,nome,ativo").order("nome"),
    sb.from("prog_config").select("valor").eq("chave", "custo_dia_parado").maybeSingle(),
    sb.from("prog_rastreador_veiculos").select("vei_id,placa"),
    sb.from("prog_rastreador_posicao").select("*"),
  ]);
  if (cfg && cfg.data && cfg.data.valor != null) S.custoDia = Number(cfg.data.valor);
  // Rastreador (Trucks Control): última posição por placa. Fica vazio até a integração ser ligada.
  const placaPorVei = new Map(((rv && rv.data) || []).map((v) => [v.vei_id, v.placa]));
  S.rast = new Map(((rp && rp.data) || []).filter((p) => placaPorVei.has(p.vei_id)).map((p) => [placaPorVei.get(p.vei_id), p]));
  if (st.error || rows.error) { toast(traduzErro(st.error || rows.error)); return; }
  S.status = st.data; S.rows = rows.data;
  S.motoristas = mo.data || [];
  S.tipos = Object.fromEntries((tp.data || []).map((t) => [t.codigo, t.cor]));
  desenharQuadro();
  if (S.aberto === "manut") abrirGavetaManutencao();
  else if (S.aberto) { const r = S.rows.find((x) => x.id === S.aberto); r ? abrirGaveta(r) : fecharGaveta(); }
  carregarSync();
}

// ---------- sincronização com a planilha (última / próxima atualização) ----------
let $sync, $btnSync;
const BOTAO_ATUALIZAR_PLANILHA = true;
const horaBR = (ts) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
async function carregarSync() {
  const { data } = await sb.from("prog_sync_status").select("*").eq("id", 1).maybeSingle();
  if (data) { S.sync = data; desenharSync(); fimAguardando(); }
}
function desenharSync() {
  if (!$sync) return;
  if (S.dia !== S.hoje) { $sync.className = ""; $sync.textContent = ""; return; }
  const s = S.sync;
  if (!s || !s.ultima_em) { $sync.className = "sync"; rot($sync, "planilha", "Planilha: aguardando a 1ª leitura"); return; }
  const idade = Date.now() - new Date(s.ultima_em).getTime();
  const falta = new Date(s.proxima_em).getTime() - Date.now();
  const prox = falta > 60000 ? "em " + Math.ceil(falta / 60000) + " min" : "em instantes";
  const parado = idade > 12 * 60000;
  const r = s.ultimo_resumo || {};
  $sync.className = "sync" + (parado ? " atraso" : "");
  if (parado) rot($sync, "alerta", "Planilha sem atualizar desde " + horaBR(s.ultima_em) + " (" + Math.round(idade / 60000) + " min)");
  else rot($sync, "planilha", "Planilha · última " + horaBR(s.ultima_em) + " · próxima " + prox);
  $sync.title = "Última leitura às " + horaBR(s.ultima_em) + (r.lidas != null ? "\nVeículos lidos: " + r.lidas + " · alterados: " + (r.atualizadas || 0) + " · novos: " + (r.criadas || 0) : "") +
    "\nA planilha é lida automaticamente a cada 5 minutos.";
}
async function forcarSync() {
  if (S.aguardando) return;
  $btnSync.disabled = true; rot($btnSync, "relogio", "Pedido enviado…");
  const { data, error } = await sb.rpc("prog_pedir_sync");
  if (error) { toast(traduzErro(error)); $btnSync.disabled = false; rot($btnSync, "atualizar", "Atualizar da planilha"); return; }
  S.aguardando = new Date(data).getTime() - 2000;
  toast("Pedido enviado. A planilha será lida em até 1 minuto.");
  clearTimeout(S.tAguardando);
  S.tAguardando = setTimeout(() => { if (S.aguardando) { S.aguardando = null; $btnSync.disabled = false; rot($btnSync, "atualizar", "Atualizar da planilha"); toast("Ainda não leu a planilha. Confira se o script está ligado."); } }, 150000);
}
function fimAguardando() {
  const s = S.sync;
  if (!S.aguardando || !s || !s.ultima_em || new Date(s.ultima_em).getTime() < S.aguardando) return;
  S.aguardando = null; clearTimeout(S.tAguardando);
  if ($btnSync) { $btnSync.disabled = false; rot($btnSync, "atualizar", "Atualizar da planilha"); }
  const r = s.ultimo_resumo || {};
  toast(r.atualizadas || r.criadas ? "Planilha lida: " + (r.atualizadas || 0) + " alterado(s), " + (r.criadas || 0) + " novo(s)" : "Planilha lida: nada mudou desde a última leitura");
  carregar();
}

function assinarTempoReal() {
  if (S.canal) sb.removeChannel(S.canal);
  let t;
  const recarregar = () => { clearTimeout(t); t = setTimeout(carregar, 400); };
  S.canal = sb.channel("prog-quadro")
    .on("postgres_changes", { event: "*", schema: "public", table: "prog_programacao" }, recarregar)
    .on("postgres_changes", { event: "*", schema: "public", table: "prog_status" }, recarregar)
    .on("postgres_changes", { event: "*", schema: "public", table: "prog_sync_status" }, carregarSync)
    .subscribe();
  if (!S.relogioSync) S.relogioSync = setInterval(desenharSync, 20000);
  // Rede de segurança: se o tempo real falhar, atualiza ao voltar para a aba e a cada 10 s
  if (!S.poll) {
    const seguro = () => { if (document.visibilityState === "visible" && !document.querySelector(".modal") && !document.querySelector(".drawer input:focus, .drawer textarea:focus")) carregar(); };
    document.addEventListener("visibilitychange", seguro);
    window.addEventListener("focus", seguro);
    S.poll = setInterval(seguro, 10000);
  }
}

// ---------- veículo parado em manutenção: dias e custo ----------
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Conta o dia em que parou e o dia aberto no quadro (parou 19/10 → em 28/10 são 10 dias)
function diasParado(r) {
  if (r.status !== "EM MANUTENÇÃO" || !r.parado_desde) return null;
  const d = Math.round((new Date(r.dia + "T12:00:00") - new Date(r.parado_desde + "T12:00:00")) / 86400000) + 1;
  return d > 0 ? d : null;
}
const custoParado = (r) => { const d = diasParado(r); return d == null ? null : d * S.custoDia; };
const rotDias = (d) => d + (d === 1 ? " dia" : " dias");

// ---------- alertas e resumo ----------
const diaLocal = (ts) => (ts ? new Date(ts).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : null);
const semZero = (x) => x.replace(/\b0(\d)/g, "$1");
function esperaViva(r) {
  if (r.status === "AG. CARREGAMENTO") return r.espera_carga_min;
  if (r.status === "AG. DESCARGA") return r.espera_descarga_min;
  return null;
}
function alertas(r) {
  const a = [];
  const chegou = diaLocal(r.cheg_carga);
  if (r.prog_entrega && chegou && r.prog_entrega < chegou)
    a.push({ s: "crit", t: "Previsão de entrega (" + dataBR(r.prog_entrega) + ") anterior à chegada no carregamento (" + dataBR(chegou) + ")" });
  const citadas = (r.obs || "").match(/\b\d{1,2}\/\d{1,2}\b/g);
  if (citadas && r.prog_entrega && r.status !== "ENTREGUE") {
    const prev = semZero(dataBR(r.prog_entrega).slice(0, 5));
    if (!citadas.some((x) => semZero(x) === prev)) a.push({ s: "warn", t: "A observação cita " + citadas.join(", ") + ", mas a previsão de entrega é " + dataBR(r.prog_entrega) });
  }
  if (r.status === "EM MANUTENÇÃO" && !r.parado_desde) a.push({ s: "warn", t: "Em manutenção sem a data em que o veículo parou (informe no cartão para calcular o custo)" });
  if (r.status === "EM MANUTENÇÃO" && r.carregou_em) a.push({ s: "warn", t: "Em manutenção com carga já carregada — confirmar o status" });
  if (!r.proxima_carga && r.status !== "EM MANUTENÇÃO" && r.status !== "ENTREGUE") a.push({ s: "warn", t: "Sem próxima carga definida" });
  const e = esperaViva(r);
  if (e != null && e >= 300) a.push({ s: e >= 420 ? "crit" : "warn", t: (r.status === "AG. CARREGAMENTO" ? "Espera no carregamento" : "Espera na descarga") + " em " + fmtMin(e) });
  return a;
}
const pior = (al) => (al.some((x) => x.s === "crit") ? "crit" : al.length ? "warn" : "");

// Legendas que podem piscar (cada pessoa escolhe as suas; fica salva no usuário)
const LEGENDAS = [
  ["transito", "Em trânsito"], ["aguardando_carga", "Aguardando carregamento"], ["aguardando_desc", "Aguardando descarga"],
  ["manutencao", "Em manutenção"], ["esperas", "Esperas ≥ 5h"], ["alertas", "Com alerta"],
];
const PREF_PADRAO = { piscar: { aguardando_carga: true, aguardando_desc: true, manutencao: true, esperas: true }, limiteMin: 120 };
function piscaSe(chave, ativo) { return !!(S.pref.piscar[chave] && ativo); }
async function salvarPref() {
  const { error } = await sb.auth.updateUser({ data: { pref_piscar: S.pref } });
  if (error) toast(traduzErro(error));
}
function desenharResumo() {
  if (!$resumo) return;
  const ativos = S.rows.filter((r) => r.status !== "ENTREGUE").length;
  const n = (st) => S.rows.filter((r) => r.status === st).length;
  const esp = S.rows.filter((r) => (esperaViva(r) ?? 0) >= 300).length;
  const com = S.rows.filter((r) => alertas(r).length).length;
  const pillEspera = (st, txt, chave) => {
    const grupo = S.rows.filter((r) => r.status === st);
    const maior = Math.max(0, ...grupo.map((r) => esperaViva(r) ?? 0));
    const cls = semaforo(maior); // y ≥2h · r ≥5h · v ≥7h
    const pisca = piscaSe(chave, grupo.length > 0 && maior >= S.pref.limiteMin);
    return h("button", { class: "pill " + cls + (pisca ? " piscar" : "") + (S.filtro.resumo === "status:" + st ? " on" : ""), title: maior ? "Maior espera: " + fmtMin(maior) : "Sem espera relevante",
      onclick: () => alternarResumo("status:" + st) },
      h("b", {}, grupo.length), " " + txt, maior >= 120 ? h("span", { class: "hint" }, " · " + fmtMin(maior)) : null);
  };
  const pill = (num, txt, cls, chave, filtro) => h("button", { class: "pill " + (cls || "") + (chave && piscaSe(chave, num > 0) ? " piscar" : "") + (S.filtro.resumo === filtro ? " on" : ""), title: "Clique para filtrar o quadro", onclick: () => alternarResumo(filtro) }, h("b", {}, num), " " + txt);
  $resumo.replaceChildren(
    pill(ativos, "conjuntos ativos", "", null, "ativos"),
    pill(n("EM TRÂNSITO"), "em trânsito", "", "transito", "status:EM TRÂNSITO"),
    pillEspera("AG. CARREGAMENTO", "aguardando carregamento", "aguardando_carga"),
    pillEspera("AG. DESCARGA", "aguardando descarga", "aguardando_desc"),
    pillManutencao(),
    pill(esp, "esperas ≥ 5h", esp ? "crit" : "", "esperas", "esperas"),
    h("button", { class: "pill " + (com ? "warn" : "") + (piscaSe("alertas", com > 0) ? " piscar" : "") + (S.filtro.resumo === "alertas" ? " on" : ""), onclick: alternarAlerta }, h("b", {}, com), " com alerta ", ic("alerta")),
    h("span", { class: "hint grow" }, "Arraste os cartões para mudar o status · clique para abrir os detalhes"));
}
// Legenda "em manutenção": pisca enquanto houver veículo parado, mostra o prejuízo e abre a gaveta com as placas
function pillManutencao() {
  const lista = S.rows.filter((r) => r.status === "EM MANUTENÇÃO");
  const total = lista.reduce((t, r) => t + (custoParado(r) || 0), 0);
  const pisca = lista.length > 0 && (S.pref.piscar.manutencao ?? true);
  return h("button", { class: "pill " + (lista.length ? "crit" : "") + (pisca ? " piscar" : "") + (S.aberto === "manut" ? " on" : ""),
    title: lista.length ? "Clique para ver as placas em manutenção e quanto cada uma já custou" : "Nenhum veículo em manutenção",
    onclick: abrirGavetaManutencao },
    h("b", {}, lista.length), " em manutenção", total ? h("span", { class: "hint" }, " · " + BRL(total)) : null);
}
function abrirGavetaManutencao() {
  S.aberto = "manut";
  const lista = S.rows.filter((r) => r.status === "EM MANUTENÇÃO")
    .sort((a, b) => (diasParado(b) ?? -1) - (diasParado(a) ?? -1));
  const total = lista.reduce((t, r) => t + (custoParado(r) || 0), 0);
  const semData = lista.filter((r) => diasParado(r) == null).length;
  const aCadaDia = lista.filter((r) => diasParado(r) != null).length * S.custoDia;
  const item = (r) => {
    const d = diasParado(r);
    return h("button", { class: "manut-item", title: "Abrir o cartão de " + r.placa_cavalo, onclick: () => abrirGaveta(r) },
      h("span", { class: "manut-placa" }, h("b", {}, r.placa_cavalo), h("span", { class: "hint" }, [r.tipo, r.motorista].filter(Boolean).join(" · "))),
      d != null
        ? h("span", { class: "manut-custo" }, h("b", {}, BRL(custoParado(r))), h("span", { class: "hint" }, "parado há " + rotDias(d) + " (desde " + dataBR(r.parado_desde) + ")"))
        : h("span", { class: "manut-custo" }, h("b", {}, "Informar data"), h("span", { class: "hint" }, "desde quando parou?")));
  };
  const lado = S.lado === "left" ? "left" : "right";
  document.getElementById("gavetas").replaceChildren(h("aside", { class: "drawer " + lado },
    h("div", { class: "row" }, h("h3", { style: "flex:1" }, "Veículos em manutenção"), h("button", { onclick: fecharGaveta }, "Fechar")),
    h("div", { class: "sub hint" }, lista.length ? lista.length + (lista.length === 1 ? " veículo parado" : " veículos parados") + " · " + BRL(S.custoDia) + " por dia parado" : "Nenhum veículo em manutenção."),
    lista.length ? h("div", { class: "parado-box manut-total" }, ic("relogio"), " ", h("span", {}, "Prejuízo acumulado: ", h("b", {}, BRL(total)),
      aCadaDia ? " · a cada dia aumenta " + BRL(aCadaDia) : "", semData ? " · " + semData + " sem data informada" : "")) : null,
    h("div", { class: "manut-lista" }, lista.map(item)),
    lista.length ? h("p", { class: "hint" }, "Clique em uma placa para abrir o cartão e informar ou corrigir a data em que parou.") : null,
    lista.length ? h("button", { onclick: () => { alternarResumo("status:EM MANUTENÇÃO"); } }, (S.filtro.resumo === "status:EM MANUTENÇÃO" ? "Mostrar todos no quadro" : "Filtrar só estes no quadro")) : null));
  desenharResumoSeguro();
}
const desenharResumoSeguro = () => { try { desenharResumo(); } catch (e) {} };
function modalLegendas() {
  const marcas = LEGENDAS.map(([k, rot]) => {
    const cx = h("input", { type: "checkbox", style: "width:auto" });
    cx.checked = !!S.pref.piscar[k];
    cx.onchange = () => { S.pref.piscar[k] = cx.checked; salvarPref(); desenharResumo(); };
    return h("label", { style: "display:flex;gap:8px;align-items:center;color:var(--tx);font-size:14px" }, cx, rot);
  });
  const lim = h("select", {}, [[0, "Sempre que houver carros"], [60, "A partir de 1h de espera"], [120, "A partir de 2h de espera"], [300, "A partir de 5h de espera"], [420, "A partir de 7h de espera"]]
    .map(([v, t]) => h("option", { value: String(v) }, t)));
  lim.value = String(S.pref.limiteMin);
  lim.onchange = () => { S.pref.limiteMin = Number(lim.value); salvarPref(); desenharResumo(); };
  modal("Legendas que piscam", h("div", {},
    h("p", { class: "hint" }, "Marque as legendas do resumo que devem piscar para chamar atenção. Vale só para o seu usuário."),
    marcas, h("label", {}, "Aguardando carregamento/descarga pisca…"), lim));
}
function alternarResumo(k) {
  S.filtro.resumo = S.filtro.resumo === k ? "" : k;
  if ($btnAlerta) $btnAlerta.classList.toggle("on", S.filtro.resumo === "alertas");
  desenharQuadro();
}
function alternarAlerta() { alternarResumo("alertas"); }
function porResumo(r) {
  const k = S.filtro.resumo;
  if (!k) return true;
  if (k.startsWith("status:")) return r.status === k.slice(7);
  if (k === "esperas") return (esperaViva(r) ?? 0) >= 300;
  if (k === "alertas") return alertas(r).length > 0;
  if (k === "ativos") return r.status !== "ENTREGUE";
  return true;
}

// ---------- tela principal ----------
let $board, $busca, $resumo, $btnAlerta, $lados;
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
function setLado(v) {
  S.lado = v;
  for (const [k, b] of Object.entries($lados)) b.classList.toggle("on", k === v);
  if (S.aberto === "manut") abrirGavetaManutencao();
  else if (S.aberto) { const r = S.rows.find((x) => x.id === S.aberto); if (r) abrirGaveta(r); }
}
// ---------- navegar entre os dias (histórico guardado) ----------
async function irParaDia(d) {
  if (!d || d === S.dia) return;
  S.dia = d; S.desfazer = []; fecharGaveta();
  S.aguardando = null;
  desenharEstrutura();
  await carregar();
}
function vizinho(delta) {
  const l = (S.diasLista || []).slice().sort(); const i = l.indexOf(S.dia);
  return i < 0 ? null : l[i + delta] || null;
}

function desenharEstrutura() {
  $busca = h("input", { type: "search", placeholder: "Buscar placa, motorista, destino…", style: "max-width:240px", oninput: desenharQuadro });
  const tipo = h("select", { style: "width:auto", onchange: (e) => { S.filtro.tipo = e.target.value; desenharQuadro(); } },
    h("option", { value: "" }, "Todos os tipos"), Object.keys(S.tipos).map((t) => h("option", { value: t }, t)));
  $btnAlerta = h("button", { onclick: alternarAlerta }, [ic("alerta"), " Só com alerta"]);
  const compacto = h("button", { onclick: (e) => { document.body.classList.toggle("compact"); e.currentTarget.classList.toggle("on"); } }, "Compacto");
  $btnVazias = h("button", { onclick: alternarVazias, title: "Esconde os status que não têm nenhum veículo no momento" }, ic("olho_off"), " Ocultar colunas vazias");
  const reset = h("button", { title: "Atualizar o quadro", onclick: carregar }, ic("atualizar"));
  const legendas = h("button", { onclick: modalLegendas }, [ic("sino"), " Legendas"]);
  $btnDesfazer = h("button", { onclick: desfazerUltimo, disabled: true }, [ic("desfazer"), " Desfazer"]);
  const mapa = h("button", { onclick: abrirMapa }, [ic("mapa"), " Mapa"]);
  $sync = S.dia === S.hoje ? h("span", { class: "sync" }, ic("planilha"), " Planilha…") : h("span", { class: "sync" }, "");
  $btnSync = BOTAO_ATUALIZAR_PLANILHA && S.dia === S.hoje && can("programacao.editar") ? h("button", { onclick: forcarSync, title: "Pede para ler a planilha agora (leva até 1 minuto)" }, [ic("atualizar"), " Atualizar da planilha"]) : null;
  desenharSync();
  const hist = h("button", { onclick: abrirHistorico, title: "O que foi alterado hoje, de quê para quê e por quem" }, [ic("historico"), " Histórico"]);
  const painel = can("dashboard.ver") ? h("button", { onclick: abrirPainel }, [ic("grafico"), " Painel"]) : null;
  $lados = { left: h("button", { onclick: () => setLado("left") }, [ic("esq"), " Esquerda"]), both: h("button", { onclick: () => setLado("both") }, [ic("ambos"), " Ambos"]), right: h("button", { class: "on", onclick: () => setLado("right") }, ["Direita ", ic("dir")]) };
  const botoes = [];
  if (can("cadastro.editar")) botoes.push(h("button", { onclick: modalCadastro }, "Cadastro"));
  if (can("colunas.gerenciar")) botoes.push(h("button", { onclick: modalColunas }, "Colunas"));
  if (can("usuarios.gerenciar")) botoes.push(h("button", { onclick: modalUsuarios }, "Usuários"));
  botoes.push(h("button", { onclick: async () => { await sb.auth.signOut(); location.reload(); } }, "Sair"));
  const d = new Date(S.dia + "T12:00:00");
  $resumo = h("div", { class: "resumo" });
  $board = h("main", { class: "board" });
  $app.replaceChildren(
    h("header", { class: "top" },
      h("div", { style: "flex:1;min-width:170px" }, h("h1", {}, "Programação de Frota"), h("div", { class: "who" }, "Fatran · " + S.perfil.nome + " (" + S.perfil.papel + ")")),
      h("div", { class: "diaNav" },
        h("button", { title: "Dia anterior", disabled: !vizinho(-1), onclick: () => irParaDia(vizinho(-1)) }, ic("esq")),
        h("b", {}, DIAS[d.getDay()] + ", " + dataBR(S.dia)),
        h("button", { title: "Próximo dia", disabled: !vizinho(1), onclick: () => irParaDia(vizinho(1)) }, ic("dir")),
        h("input", { type: "date", value: S.dia, min: (S.diasLista || []).slice().sort()[0], max: S.hoje, title: "Ir para um dia", onchange: (e) => { const v = e.target.value; if ((S.diasLista || []).includes(v)) irParaDia(v); else if (v) toast("Não há registro desse dia."); } }),
        S.dia !== S.hoje ? h("button", { class: "on", onclick: () => irParaDia(S.hoje) }, "Voltar para hoje") : null,
        S.dia !== S.hoje ? h("span", { class: "passado" }, [ic("pasta"), " Dia anterior · consulta"]) : null),
      $sync, $btnSync,
      $busca, tipo, $btnAlerta,
      h("span", { class: "who" }, "Gaveta abre:"), h("span", { class: "seg" }, $lados.left, $lados.both, $lados.right),
      compacto, $btnVazias, legendas, $btnDesfazer, mapa, hist, painel, reset, ...botoes),
    $resumo, $board, h("div", { id: "gavetas" }));
}

function cartao(r) {
  const min = esperaViva(r) ?? (r.espera_carga_min ?? r.espera_descarga_min);
  const al = alertas(r);
  return h("div", { class: "card" + (can("status.mover") ? " drag" : ""), draggable: can("status.mover") ? "true" : false, style: "border-left-color:" + (S.tipos[r.tipo] || "#94a3b8"),
    onclick: () => abrirGaveta(r),
    ondragstart: (e) => { e.dataTransfer.setData("text/plain", String(r.id)); e.dataTransfer.effectAllowed = "move"; },
    ondragover: (e) => { if (!e.dataTransfer.types.includes("application/x-coluna") && can("programacao.editar")) { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("alvo"); } },
    ondragleave: (e) => e.currentTarget.classList.remove("alvo"),
    ondrop: (e) => {
      if (e.dataTransfer.types.includes("application/x-coluna") || !can("programacao.editar")) return;
      e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("alvo");
      soltarNoCartao(Number(e.dataTransfer.getData("text/plain")), r.id);
    } },
    h("div", { class: "pl" }, r.placa_cavalo, r.placa_implemento ? " / " + r.placa_implemento : "",
      al.length ? h("span", { class: "al " + pior(al), title: al.map((x) => x.t).join("\n") }, [ic("alerta"), " " + al.length]) : null),
    h("div", { class: "sub" }, [r.tipo, r.motorista].filter(Boolean).join(" · ")),
    r.destino ? h("div", { class: "sub dest" }, [ic("seta"), " " + r.destino]) : null,
    r.status === "EM MANUTENÇÃO" ? h("div", { class: "parado" }, ic("relogio"), diasParado(r) != null ? " Parado " + rotDias(diasParado(r)) + " · " + BRL(custoParado(r)) : " Informar desde quando parou") : null,
    r.localizacao ? h("div", { class: "sub dest" }, [ic("pino"), " " + r.localizacao]) : null,
    r.ultima_lat != null ? h("a", { class: "sub dest", href: "https://www.google.com/maps?q=" + r.ultima_lat + "," + r.ultima_lng, target: "_blank", rel: "noopener",
      title: "Abrir no mapa", onclick: (e) => e.stopPropagation() }, [ic("gps"), " GPS há " + fmtMin(Math.max(0, Math.round((Date.now() - new Date(r.ultima_posicao_em)) / 60000)))] ) : null,
    linhaRastreador(r),
    min != null && min > 0 ? h("span", { class: "badge dest " + semaforo(min) }, "espera " + fmtMin(min)) : null);
}

// Posição do rastreador (só no quadro de hoje): "Cachoeiro/ES · BR-101 · parado · há 3 min"
function textoRastreador(p) {
  const local = [p.municipio ? p.municipio + (p.uf ? "/" + p.uf : "") : null, p.rodovia].filter(Boolean).join(" · ");
  const mov = p.velocidade != null ? (p.velocidade > 0 ? "em movimento, " + p.velocidade + " km/h" : "parado") : p.ignicao === 0 ? "ignição desligada" : null;
  const min = Math.max(0, Math.round((Date.now() - new Date(p.dt)) / 60000));
  return { local: local || "posição recebida", mov, quando: "há " + fmtMin(min), velho: min > 60 };
}
function linhaRastreador(r) {
  const p = S.dia === S.hoje && S.rast ? S.rast.get(r.placa_cavalo) : null;
  if (!p) return null;
  const t = textoRastreador(p);
  const alvo = p.lat != null && p.lon != null ? { href: "https://www.google.com/maps?q=" + p.lat + "," + p.lon, target: "_blank", rel: "noopener", title: "Abrir no mapa", onclick: (e) => e.stopPropagation() } : {};
  return h(p.lat != null ? "a" : "div", { class: "sub dest rast" + (t.velho ? " velho" : ""), ...alvo },
    ic("gps"), " " + [t.local, t.mov, t.quando].filter(Boolean).join(" · "));
}

let $btnVazias;
function lerPrefVazias() { try { return localStorage.getItem("prog_ocultar_vazias") === "1"; } catch (e) { return false; } }
function alternarVazias() {
  S.ocultarVazias = !S.ocultarVazias;
  try { localStorage.setItem("prog_ocultar_vazias", S.ocultarVazias ? "1" : "0"); } catch (e) {}
  desenharQuadro();
}
function desenharQuadro() {
  if (!$board) return;
  if (S.ocultarVazias === undefined) S.ocultarVazias = lerPrefVazias();
  const q = ($busca.value || "").trim().toLowerCase();
  const ativos = S.status.filter((s) => s.ativo !== false);
  const passa = (r) => porResumo(r) && (!S.filtro.tipo || r.tipo === S.filtro.tipo) &&
    (!q || [r.placa_cavalo, r.placa_implemento, r.motorista, r.destino, r.embarcador, r.obs].some((v) => (v || "").toLowerCase().includes(q)));
  let ocultas = 0;
  const cols = ativos.map((s) => {
    const itens = S.rows.filter((r) => r.status === s.codigo && passa(r));
    if (S.ocultarVazias && !itens.length) { ocultas++; return null; }
    const col = h("section", { class: "col",
      ondragover: (e) => {
        const ehColuna = e.dataTransfer.types.includes("application/x-coluna");
        if (ehColuna ? can("colunas.gerenciar") : can("status.mover")) { e.preventDefault(); col.classList.add("over"); }
      },
      ondragleave: () => col.classList.remove("over"),
      ondrop: (e) => {
        e.preventDefault(); col.classList.remove("over");
        const dc = e.dataTransfer.getData("application/x-coluna");
        if (dc) moverColuna(dc, s.codigo); else mover(Number(e.dataTransfer.getData("text/plain")), s.codigo);
      } },
      h("h2", can("colunas.gerenciar") ? { class: "arrastavel", draggable: "true", title: "Arraste para mudar a ordem da coluna",
        ondragstart: (e) => { e.dataTransfer.setData("application/x-coluna", s.codigo); e.dataTransfer.effectAllowed = "move"; } } : {},
        h("span", {}, can("colunas.gerenciar") ? h("span", { class: "grip" }, "⠿ ") : null, h("span", { class: "dot", style: "background:" + s.cor }), s.codigo), h("span", { class: "hint" }, itens.length)),
      itens.map(cartao));
    return col;
  });
  $board.replaceChildren(...cols.filter(Boolean));
  if ($btnVazias) {
    $btnVazias.classList.toggle("on", !!S.ocultarVazias);
    if (S.ocultarVazias) rot($btnVazias, "olho", "Mostrar colunas vazias" + (ocultas ? " (" + ocultas + ")" : ""));
    else rot($btnVazias, "olho_off", "Ocultar colunas vazias");
  }
  desenharResumo();
}

// ---------- desfazer ----------
let $btnDesfazer;
function guardar(rotulo, fn) {
  S.desfazer.push({ rotulo, fn });
  if (S.desfazer.length > 20) S.desfazer.shift();
  atualizarDesfazer();
}
function atualizarDesfazer() {
  if (!$btnDesfazer) return;
  const ult = S.desfazer[S.desfazer.length - 1];
  $btnDesfazer.disabled = !ult;
  $btnDesfazer.title = ult ? "Desfazer: " + ult.rotulo + " (Ctrl+Z)" : "Nada para desfazer";
}
async function desfazerUltimo() {
  const ult = S.desfazer.pop();
  atualizarDesfazer();
  if (!ult) return toast("Nada para desfazer.");
  try { await ult.fn(); toast("Desfeito: " + ult.rotulo); } catch (e) { toast(traduzErro(e)); }
  carregar();
}
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) {
    e.preventDefault(); desfazerUltimo();
  }
});

// Grava a nova ordem das colunas (lista de códigos na ordem desejada).
// A ordem é única no banco, então primeiro vai para valores negativos e depois para os finais.
async function gravarOrdem(codigos, anterior) {
  const atual = Object.fromEntries((anterior || S.status).map((x) => [x.codigo, x.ordem]));
  const mudou = codigos.map((c, i) => [c, i + 1]).filter(([c, o]) => atual[c] !== o);
  for (const [c, o] of mudou) {
    const { error } = await sb.from("prog_status").update({ ordem: -o }).eq("codigo", c);
    if (error) { toast(traduzErro(error)); return false; }
  }
  for (const [c, o] of mudou) {
    const { error } = await sb.from("prog_status").update({ ordem: o }).eq("codigo", c);
    if (error) { toast(traduzErro(error)); return false; }
  }
  return true;
}
async function moverColuna(origem, destino) {
  if (origem === destino) return;
  const anterior = S.status;
  const ids = anterior.map((x) => x.codigo);
  const alvo = ids.indexOf(destino); // a coluna arrastada assume a posição da coluna onde foi solta
  const lista = ids.filter((c) => c !== origem);
  lista.splice(alvo, 0, origem);
  S.status = lista.map((c, i) => ({ ...anterior.find((x) => x.codigo === c), ordem: i + 1 })); desenharQuadro(); // mostra já
  if (!(await gravarOrdem(lista, anterior))) carregar();
}

async function mover(id, novo) {
  const r = S.rows.find((x) => x.id === id);
  if (!r || r.status === novo) return;
  const antigo = r.status; r.status = novo; desenharQuadro(); // mostra já; desfaz se der erro
  const { data, error } = await sb.from("prog_programacao").update({ status: novo }).eq("id", id).eq("versao", r.versao).select("id");
  if (error || !data || !data.length) {
    r.status = antigo; desenharQuadro();
    toast(error ? traduzErro(error) : "Outra pessoa alterou este cartão. Atualizando…");
    carregar();
    return;
  }
  guardar("mover " + r.placa_cavalo + " de " + antigo + " para " + novo, async () => {
    const { error: e } = await sb.from("prog_programacao").update({ status: antigo }).eq("id", id);
    if (e) throw e;
  });
}

// Reordena cartões dentro da coluna (ou move para outra coluna na posição do cartão alvo)
async function soltarNoCartao(idArr, idAlvo) {
  const arr = S.rows.find((x) => x.id === idArr), alvo = S.rows.find((x) => x.id === idAlvo);
  if (!arr || !alvo || arr.id === alvo.id) return;
  const mudaColuna = arr.status !== alvo.status;
  if (mudaColuna && !can("status.mover")) return toast("Seu perfil não pode mudar o status.");
  if (!can("programacao.editar")) return toast("Seu perfil não pode reordenar os cartões.");
  const ord = (a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999) || a.placa_cavalo.localeCompare(b.placa_cavalo);
  const col = S.rows.filter((x) => x.status === alvo.status && x.id !== arr.id).sort(ord);
  col.splice(col.findIndex((x) => x.id === alvo.id), 0, arr);
  const antes = new Map(); const mudancas = [];
  col.forEach((x, i) => {
    const novo = { ordem: i + 1, status: alvo.status };
    if (x.ordem !== novo.ordem || x.status !== novo.status) { antes.set(x.id, { ordem: x.ordem, status: x.status }); mudancas.push([x, novo]); }
  });
  mudancas.forEach(([x, novo]) => Object.assign(x, novo)); desenharQuadro(); // mostra já
  for (const [x, novo] of mudancas) {
    const { error } = await sb.from("prog_programacao").update(novo).eq("id", x.id);
    if (error) { toast(traduzErro(error)); return carregar(); }
  }
  guardar("reordenar " + arr.placa_cavalo, async () => {
    for (const [id, v] of antes) { const { error } = await sb.from("prog_programacao").update(v).eq("id", id); if (error) throw error; }
  });
  carregar();
}

// ---------- gaveta de detalhes (edição completa da viagem) ----------
const dtLocal = (ts) => (ts ? new Date(ts).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(" ", "T").slice(0, 16) : "");
const CAMPOS = [
  ["motorista_id", "Motorista", "motorista", "programacao.editar"],
  ["placa_implemento", "Implemento (placa)", "placa", "programacao.editar"],
  ["tipo", "Tipo do conjunto", "tipo", "programacao.editar"],
  ["parado_desde", "Parado em manutenção desde", "date", "programacao.editar"],
  ["data_programacao", "Data da programação", "date", "programacao.editar"],
  ["cheg_carga", "Chegada no carregamento", "dt", "programacao.editar"],
  ["carregou_em", "Fim do carregamento", "dt", "programacao.editar"],
  ["embarcador", "Embarcador", "txt", "programacao.editar"],
  ["destino", "Destino", "txt", "programacao.editar"],
  ["prog_entrega", "Previsão de entrega", "date", "programacao.editar"],
  ["cheg_descarga", "Chegada na descarga", "dt", "programacao.editar"],
  ["fim_descarga", "Fim da descarga", "dt", "programacao.editar"],
  ["localizacao", "Localização atual", "txt", "programacao.editar"],
  ["obs", "Observações", "area", "programacao.editar"],
  ["proxima_carga", "Próxima carga", "txt", "proxima_carga.editar"],
  ["proxima_regiao", "Região da próxima carga (ES, SP…)", "txt", "proxima_carga.editar"],
];
function fecharGaveta() { const eraManut = S.aberto === "manut"; S.aberto = null; document.getElementById("gavetas").replaceChildren(); if (eraManut) desenharResumoSeguro(); }
function abrirGaveta(r) {
  S.aberto = r.id;
  const els = CAMPOS.filter(([k]) => k !== "parado_desde" || r.status === "EM MANUTENÇÃO").map(([k, rot, tipo, perm]) => {
    let el;
    if (tipo === "motorista") {
      el = h("select", {}, h("option", { value: "" }, "(sem motorista)"),
        S.motoristas.filter((m) => m.ativo || m.id === r.motorista_id).map((m) => h("option", { value: String(m.id) }, m.nome)));
      el.value = r.motorista_id != null ? String(r.motorista_id) : "";
    } else if (tipo === "tipo") {
      el = h("select", {}, Object.keys(S.tipos).map((t) => h("option", { value: t }, t)));
      el.value = r.tipo || "";
    } else if (tipo === "date") { el = h("input", { type: "date" }); el.value = r[k] || ""; }
    else if (tipo === "dt") { el = h("input", { type: "datetime-local" }); el.value = dtLocal(r[k]); }
    else if (tipo === "area") { el = h("textarea", { rows: 3 }); el.value = r[k] ?? ""; }
    else { el = h("input", { type: "text" }); el.value = r[k] ?? ""; }
    el.dataset.k = k; el.dataset.t = tipo; el.dataset.i = el.value; el.disabled = !can(perm);
    return { k, el, bloco: [h("label", {}, rot), el] };
  });
  const salvar = h("button", { class: "pri", onclick: async () => {
    const alt = {};
    for (const { k, el } of els) {
      if (el.disabled || el.value === el.dataset.i) continue;
      const v = el.value.trim(), t = el.dataset.t;
      alt[k] = t === "motorista" ? (v ? Number(v) : null)
        : t === "dt" ? (v ? v + ":00-03:00" : null)
        : t === "placa" ? (v.toUpperCase().replace(/[^A-Z0-9]/g, "") || null)
        : (v || null);
    }
    if (!Object.keys(alt).length) return toast("Nada para salvar.");
    if ("localizacao" in alt) alt.posicao_em = new Date().toISOString();
    const { data, error } = await sb.from("prog_programacao").update(alt).eq("id", r.id).eq("versao", r.versao).select("id");
    if (error) return toast(traduzErro(error));
    toast(data.length ? "Salvo." : "Outra pessoa alterou este cartão. Atualizando…");
    if (data.length) {
      const antigo = Object.fromEntries(Object.keys(alt).map((k) => [k, r[k] ?? null]));
      guardar("editar " + r.placa_cavalo, async () => { const { error: e } = await sb.from("prog_programacao").update(antigo).eq("id", r.id); if (e) throw e; });
    }
    carregar();
  } }, "Salvar alterações");
  const remover = can("programacao.excluir") ? h("button", { class: "danger", onclick: async () => {
    if (!confirm("Remover " + r.placa_cavalo + " do quadro de hoje?\n(O conjunto continua cadastrado e volta nos próximos dias.)")) return;
    const { error } = await sb.from("prog_programacao").delete().eq("id", r.id);
    if (error) return toast(traduzErro(error));
    const copia = { dia: r.dia, conjunto_id: r.conjunto_id, motorista_id: r.motorista_id, placa_implemento: r.placa_implemento, tipo: r.tipo, ordem: r.ordem, status: r.status,
      embarcador: r.embarcador, destino: r.destino, data_programacao: r.data_programacao, cheg_carga: r.cheg_carga, carregou_em: r.carregou_em, prog_entrega: r.prog_entrega,
      cheg_descarga: r.cheg_descarga, fim_descarga: r.fim_descarga, localizacao: r.localizacao, posicao_em: r.posicao_em, obs: r.obs, proxima_carga: r.proxima_carga, proxima_regiao: r.proxima_regiao };
    guardar("remover " + r.placa_cavalo, async () => { const { error: e } = await sb.from("prog_programacao").insert(copia); if (e) throw e; });
    fecharGaveta(); toast("Removido do quadro de hoje. Use Desfazer para voltar."); carregar();
  } }, "Remover do quadro") : null;
  const mover_ = can("status.mover") ? [h("label", {}, "Status"),
    h("select", { onchange: (e) => mover(r.id, e.target.value) },
      S.status.filter((s) => s.ativo !== false || s.codigo === r.status).map((s) => h("option", { value: s.codigo, selected: s.codigo === r.status }, s.codigo)))] : null;
  const topo = (lado) => h("div", {},
    h("div", { class: "row" }, h("h3", { style: "flex:1" }, r.placa_cavalo), h("button", { onclick: fecharGaveta }, "Fechar")),
    h("div", { class: "sub hint" }, [r.tipo, r.motorista, r.status].filter(Boolean).join(" · ")),
    linhaRastreador(r),
    r.status === "EM MANUTENÇÃO" ? h("div", { class: "parado-box" }, ic("relogio"), " ", diasParado(r) != null
      ? h("span", {}, h("b", {}, "Parado há " + rotDias(diasParado(r))), " (desde " + dataBR(r.parado_desde) + ") · prejuízo estimado ", h("b", {}, BRL(custoParado(r))), " (" + BRL(S.custoDia) + " por dia)")
      : h("span", {}, "Informe abaixo desde quando está parado para calcular dias e custo.")) : null,
    lado !== "left" && r.espera_carga_min != null ? h("div", {}, "Espera no carregamento: " + fmtMin(r.espera_carga_min)) : null,
    lado !== "left" && r.espera_descarga_min != null ? h("div", {}, "Espera na descarga: " + fmtMin(r.espera_descarga_min)) : null,
    alertas(r).length ? h("ul", { class: "alertas" }, alertas(r).map((x) => h("li", { class: x.s }, x.t))) : null);
  const g = document.getElementById("gavetas");
  const corpo = (lado, lista, extra) => h("aside", { class: "drawer " + lado }, topo(lado), lista.map((x) => x.bloco), extra);
  const rodape = h("div", { class: "row", style: "margin-top:14px" }, salvar, remover);
  if (S.lado === "both") g.replaceChildren(corpo("left", els.slice(0, 8), mover_), corpo("right", els.slice(8), rodape));
  else g.replaceChildren(corpo(S.lado, els, [mover_, rodape]));
}

// ---------- cadastro de frota e motoristas ----------
async function modalCadastro() {
  const corpo = h("div");
  modal("Cadastro de frota e motoristas", corpo);
  async function desenhar() {
    const [cj, mt] = await Promise.all([sb.from("prog_conjuntos").select("*").order("placa_cavalo"), sb.from("prog_motoristas").select("*").order("nome")]);
    if (cj.error || mt.error) { corpo.replaceChildren(h("div", { class: "err" }, traduzErro(cj.error || mt.error))); return; }
    const alterna = (tabela, chave, valor, ativo) => async () => {
      const { error } = await sb.from(tabela).update({ ativo: !ativo }).eq(chave, valor);
      if (error) toast(traduzErro(error)); await carregar(); desenhar();
    };
    const placa = h("input", { type: "text", placeholder: "Placa do cavalo", maxlength: 8, style: "text-transform:uppercase" });
    const impl = h("input", { type: "text", placeholder: "Placa do implemento (opcional)", maxlength: 8, style: "text-transform:uppercase" });
    const tipo = h("select", {}, Object.keys(S.tipos).map((t) => h("option", { value: t }, t)));
    const norm = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const addConj = h("button", { class: "pri", onclick: async () => {
      const pc = norm(placa.value), pi = norm(impl.value) || null;
      if (pc.length !== 7) return toast("A placa do cavalo precisa ter 7 letras/números.");
      const novo = await sb.from("prog_conjuntos").insert({ placa_cavalo: pc, placa_implemento: pi, tipo: tipo.value }).select("id").single();
      if (novo.error) return toast(traduzErro(novo.error));
      if (can("programacao.editar")) { // já coloca no quadro de hoje
        const ordem = S.rows.reduce((m, x) => Math.max(m, x.ordem || 0), 0) + 1;
        const lin = await sb.from("prog_programacao").insert({ dia: S.dia, conjunto_id: novo.data.id, placa_implemento: pi, tipo: tipo.value, status: "AG. PROGRAMAÇÃO", ordem });
        if (lin.error) toast("Cadastrado, mas não entrou no quadro de hoje: " + traduzErro(lin.error));
      }
      toast("Conjunto cadastrado."); await carregar(); desenhar();
    } }, "Adicionar conjunto");
    const nome = h("input", { type: "text", placeholder: "Nome do motorista", maxlength: 80 });
    const addMot = h("button", { class: "pri", onclick: async () => {
      const n = nome.value.trim().toUpperCase();
      if (n.length < 2) return toast("Informe o nome do motorista.");
      const { error } = await sb.from("prog_motoristas").insert({ nome: n });
      if (error) return toast(traduzErro(error));
      toast("Motorista cadastrado."); await carregar(); desenhar();
    } }, "Adicionar motorista");
    const custo = h("input", { type: "number", min: "0", step: "50", value: String(S.custoDia), style: "max-width:140px" });
    const salvaCusto = h("button", { class: "pri", onclick: async () => {
      const v = Number(custo.value);
      if (!(v >= 0)) return toast("Informe um valor válido.");
      const { error } = await sb.from("prog_config").update({ valor: v, atualizado_em: new Date().toISOString() }).eq("chave", "custo_dia_parado");
      if (error) return toast(traduzErro(error));
      S.custoDia = v; toast("Valor salvo."); desenharQuadro();
    } }, "Salvar");
    corpo.replaceChildren(
      h("h3", {}, "Custo de veículo parado"),
      h("label", {}, "Valor por dia parado em manutenção (R$)"), h("div", { class: "row" }, custo, salvaCusto),
      h("p", { class: "hint" }, "Usado para calcular o prejuízo dos veículos em manutenção (dias parado × valor). Vale para todos os veículos."),
      h("h3", {}, "Conjuntos (" + cj.data.filter((x) => x.ativo).length + " ativos)"),
      h("table", {}, h("tbody", {}, cj.data.map((c) => h("tr", {}, h("td", {}, c.placa_cavalo), h("td", {}, c.placa_implemento || "—"), h("td", {}, c.tipo),
        h("td", {}, h("button", { onclick: alterna("prog_conjuntos", "id", c.id, c.ativo) }, c.ativo ? "Desativar" : "Ativar")))))),
      h("label", {}, "Novo conjunto"), h("div", { class: "row" }, placa, impl), h("div", { class: "row", style: "margin-top:6px" }, tipo, addConj),
      h("p", { class: "hint" }, "O conjunto novo já entra no quadro de hoje e nos dias seguintes. Desativar tira dos próximos dias (hoje continua)."),
      h("h3", {}, "Motoristas (" + mt.data.filter((x) => x.ativo).length + " ativos)"),
      h("table", {}, h("tbody", {}, mt.data.map((m) => h("tr", {}, h("td", {}, m.nome),
        h("td", {}, h("button", { onclick: alterna("prog_motoristas", "id", m.id, m.ativo) }, m.ativo ? "Desativar" : "Ativar")))))),
      h("label", {}, "Novo motorista"), h("div", { class: "row" }, nome, addMot));
  }
  desenhar();
}

// ---------- administração: colunas ----------
function modal(titulo, conteudo) {
  const fechar = () => m.remove();
  const m = h("div", { class: "modal", onclick: (e) => { if (e.target === m) fechar(); } },
    h("div", { class: "box" }, h("div", { class: "row" }, h("h2", { style: "flex:1;margin:0" }, titulo), h("button", { onclick: fechar }, "Fechar")), conteudo));
  document.body.append(m);
  return { el: m, fechar };
}

async function modalColunas() {
  const corpo = h("div");
  const m = modal("Colunas do Kanban", corpo);
  async function desenhar() {
    const { data, error } = await sb.from("prog_status").select("*").order("ordem");
    if (error) { corpo.replaceChildren(h("div", { class: "err" }, traduzErro(error))); return; }
    const trocar = async (a, b) => {
      const lista = data.map((x) => x.codigo);
      const i = lista.indexOf(a.codigo), j = lista.indexOf(b.codigo);
      [lista[i], lista[j]] = [lista[j], lista[i]];
      S.status = data; // gravarOrdem compara com a ordem atual do banco
      await gravarOrdem(lista);
      await carregar(); desenhar();
    };
    const linhas = data.map((s, i) => h("tr", {},
      h("td", {}, h("span", { class: "dot", style: "display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:" + s.cor }), s.codigo,
        s.protegido ? h("span", { class: "hint" }, " (do sistema)") : null, s.ativo === false ? h("span", { class: "hint" }, " (oculta)") : null),
      h("td", {},
        h("button", { disabled: i === 0, onclick: () => trocar(s, data[i - 1]) }, ic("cima")), " ",
        h("button", { disabled: i === data.length - 1, onclick: () => trocar(s, data[i + 1]) }, ic("baixo")), " ",
        s.protegido ? null : [
          h("button", { onclick: async () => {
            const { error: e } = await sb.from("prog_status").update({ ativo: s.ativo === false }).eq("codigo", s.codigo);
            if (e) toast(traduzErro(e)); await carregar(); desenhar(); } }, s.ativo === false ? "Mostrar" : "Ocultar"), " ",
          h("button", { class: "danger", onclick: async () => {
            if (!confirm('Excluir a coluna "' + s.codigo + '"?')) return;
            const { error: e } = await sb.from("prog_status").delete().eq("codigo", s.codigo);
            if (e) toast(traduzErro(e)); await carregar(); desenhar(); } }, "Excluir")])));
    const nome = h("input", { type: "text", placeholder: "Nome da nova coluna", maxlength: 30 });
    const cor = h("input", { type: "color", value: "#6366f1", style: "width:56px;padding:2px" });
    const add = h("button", { class: "pri", onclick: async () => {
      const codigo = nome.value.trim().toUpperCase();
      if (codigo.length < 2) return toast("Informe o nome da coluna.");
      const ordem = (data.reduce((mx, x) => Math.max(mx, x.ordem), 0)) + 1;
      const { error: e } = await sb.from("prog_status").insert({ codigo, ordem, cor: cor.value });
      if (e) return toast(traduzErro(e));
      nome.value = ""; await carregar(); desenhar();
    } }, "Adicionar");
    corpo.replaceChildren(
      h("table", {}, h("tbody", {}, linhas)),
      h("label", {}, "Nova coluna"), h("div", { class: "row" }, nome, cor, add),
      h("p", { class: "hint" }, "Colunas com histórico não podem ser excluídas, só ocultadas. \"AG. PROGRAMAÇÃO\" e \"ENTREGUE\" são usadas pela geração automática do dia."));
  }
  desenhar();
  return m;
}

// ---------- administração: usuários ----------
async function modalUsuarios() {
  const corpo = h("div");
  modal("Usuários", corpo);
  const [pf, pp] = await Promise.all([
    sb.from("prog_perfis").select("id,nome,papel,ativo").order("nome"),
    sb.from("prog_papeis").select("codigo,nome").order("codigo"),
  ]);
  const papeis = pp.data || [];
  const nome = h("input", { type: "text", placeholder: "Nome completo" });
  const email = h("input", { type: "email", placeholder: "E-mail" });
  const papel = h("select", {}, papeis.map((p) => h("option", { value: p.codigo }, p.nome)));
  const mot = h("select", {}, h("option", { value: "" }, "— escolha o motorista —"), S.motoristas.filter((m) => m.ativo).map((m) => h("option", { value: m.id }, m.nome)));
  const blocoMot = h("div", { style: "display:none" }, h("label", {}, "Motorista (cadastro)"), mot);
  papel.onchange = () => { blocoMot.style.display = papel.value === "motorista" ? "" : "none"; };
  const res = h("div", { class: "hint" });
  const criar = h("button", { class: "pri", onclick: async () => {
    if (papel.value === "motorista" && !mot.value) { res.textContent = "Escolha o motorista do cadastro."; return; }
    res.textContent = "Criando…";
    const { data, error } = await sb.functions.invoke("criar-usuario", { body: { nome: nome.value, email: email.value, papel: papel.value } });
    if (error || !data || data.erro) {
      let msg = (data && data.erro) || "Não foi possível criar.";
      try { if (error && error.context) msg = (await error.context.json()).erro || msg; } catch (_) {}
      res.textContent = msg; return;
    }
    if (papel.value === "motorista") {
      const v = await sb.from("prog_perfis").update({ motorista_id: Number(mot.value) }).eq("id", data.id);
      if (v.error) { res.textContent = "Usuário criado, mas não foi possível vincular ao motorista: " + traduzErro(v.error); return; }
    }
    res.replaceChildren(h("strong", {}, "Usuário criado. "), "Senha temporária (aparece só agora): ", h("code", {}, data.senha_temporaria),
      h("div", {}, "Envie por um canal seguro. Ele precisará trocá-la no primeiro acesso."));
    nome.value = ""; email.value = "";
  } }, "Criar usuário");
  const linhas = (pf.data || []).map((u) => h("tr", {}, h("td", {}, u.nome), h("td", {}, u.papel), h("td", {}, u.ativo ? "ativo" : "inativo"),
    h("td", {}, u.id === S.perfil.id ? "" : h("button", { onclick: async () => {
      const { error } = await sb.from("prog_perfis").update({ ativo: !u.ativo }).eq("id", u.id);
      toast(error ? traduzErro(error) : "Atualizado."); } }, u.ativo ? "Desativar" : "Ativar"))));
  corpo.replaceChildren(
    h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Nome"), h("th", {}, "Perfil"), h("th", {}, "Situação"), h("th", {}))), h("tbody", {}, linhas)),
    h("h3", {}, "Novo usuário"), h("label", {}, "Nome"), nome, h("label", {}, "E-mail"), email, h("label", {}, "Perfil"), papel, blocoMot,
    h("div", { class: "row", style: "margin-top:12px" }, criar), res);
}

// ---------- start ----------
sb.auth.getSession().then(({ data }) => (data.session ? iniciar() : telaLogin()));


// ---------- painel de indicadores ----------
const minEntre = (a, b) => {
  if (!a || !b) return null;
  const m = Math.round((new Date(b) - new Date(a)) / 60000);
  return m >= 0 && m < 7 * 24 * 60 ? m : null; // ignora datas incoerentes (> 7 dias)
};
const media = (v) => (v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : null);

function barras(titulo, itens, fmt = (v) => v, nota) {
  const max = Math.max(1, ...itens.map((i) => i.v));
  return h("section", { class: "pn-card" }, h("h3", {}, titulo),
    itens.length ? h("div", { class: "pn-bars" }, itens.map((i) =>
      h("div", { class: "pn-row", title: i.n + ": " + fmt(i.v) + (i.extra ? " · " + i.extra : "") },
        h("span", { class: "pn-lab" }, i.n),
        h("span", { class: "pn-trk" }, h("span", { class: "pn-bar", style: "width:" + Math.max(2, (i.v / max) * 100) + "%" })),
        h("b", { class: "pn-val" }, fmt(i.v))))) : h("p", { class: "hint" }, "Sem dados no período."),
    nota ? h("p", { class: "hint" }, nota) : null);
}
function contar(lista, chave) {
  const m = new Map();
  lista.forEach((r) => { const k = chave(r); if (k) m.set(k, (m.get(k) || 0) + 1); });
  return [...m].map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v);
}

async function abrirHistorico() {
  const corpo = h("div", {}, h("p", { class: "hint" }, "Carregando…"));
  const m = h("div", { class: "modal painel", onclick: (e) => { if (e.target === m) m.remove(); } },
    h("div", { class: "box" }, h("div", { class: "row" }, h("h2", { style: "flex:1;margin:0" }, "Histórico de alterações"), h("button", { onclick: () => m.remove() }, "Fechar")), corpo));
  document.body.append(m);
  const { data, error } = await sb.rpc("prog_historico", { p_dia: S.dia, p_limite: 500 });
  if (error) { corpo.replaceChildren(h("p", { class: "err" }, traduzErro(error))); return; }
  const todos = data || [];
  let origem = "", busca = "";
  const lista = h("div", { class: "hist" });
  const hm = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  function desenhar() {
    const q = busca.trim().toLowerCase();
    const vis = todos.filter((x) => (!origem || x.origem === origem) && (!q || [x.placa, x.campo, x.antes, x.depois, x.quem].join(" ").toLowerCase().includes(q)));
    if (!vis.length) { lista.replaceChildren(h("p", { class: "hint" }, "Nenhuma alteração encontrada hoje.")); return; }
    lista.replaceChildren(h("table", { class: "hist-t" },
      h("thead", {}, h("tr", {}, ["Quando", "Veículo", "O que mudou", "De", "Para", "Quem"].map((t) => h("th", {}, t)))),
      h("tbody", {}, vis.map((x) => h("tr", {},
        h("td", {}, hm(x.em)), h("td", {}, h("b", {}, x.placa || "—")), h("td", {}, x.campo === "parado_desde" ? "Parado desde" : x.campo),
        h("td", { class: "de" }, (x.campo === "parado_desde" ? dataBR(x.antes) : x.antes) || "—"), h("td", { class: "para" }, (x.campo === "parado_desde" ? dataBR(x.depois) : x.depois) || "—"),
        h("td", {}, h("span", { class: "tag " + (x.origem === "Planilha" ? "pl" : "sis") }, x.origem === "Planilha" ? [ic("planilha"), " Planilha"] : [ic("usuario"), " " + x.quem])))))));
  }
  const sel = h("select", { style: "width:auto", onchange: (e) => { origem = e.target.value; desenhar(); } },
    [["", "Todas as origens"], ["Planilha", "Vindas da planilha"], ["Sistema", "Feitas no sistema"]].map(([v, t]) => h("option", { value: v }, t)));
  const bus = h("input", { type: "search", placeholder: "Buscar placa, campo, valor…", style: "max-width:260px", oninput: (e) => { busca = e.target.value; desenhar(); } });
  corpo.replaceChildren(h("div", { class: "row", style: "margin:10px 0;gap:8px;flex-wrap:wrap" }, sel, bus, h("span", { class: "hint" }, "Dia " + dataBR(S.dia) + " · mais recentes primeiro")), lista);
  desenhar();
}

// Junta grafias do mesmo embarcador: tira nº de OT/BC e diferenças de espaço e hífen
// ("SIMEC - CARIACICA ES OT 094102" e "SIMEC CARIACICA ES  OT 94145" viram "SIMEC CARIACICA ES").
function normEmb(t) {
  return String(t || "").toUpperCase().replace(/\b(OT|BC)\s*\d+/g, " ").replace(/\s+-\s+/g, " ").replace(/\s{2,}/g, " ").trim();
}
async function abrirPainel() {
  const corpo = h("div", { class: "pn" }, h("p", { class: "hint" }, "Carregando…"));
  const m = h("div", { class: "modal painel", onclick: (e) => { if (e.target === m) m.remove(); } },
    h("div", { class: "box" }, h("div", { class: "row" }, h("h2", { style: "flex:1;margin:0" }, "Painel de indicadores"), h("button", { onclick: () => m.remove() }, "Fechar")), corpo));
  document.body.append(m);
  let dias = 7;
  const sel = h("select", { style: "width:auto", onchange: (e) => { dias = Number(e.target.value); desenhar(); } },
    [[1, "Hoje"], [7, "Últimos 7 dias"], [30, "Últimos 30 dias"]].map(([v, t]) => h("option", { value: v, selected: v === 7 }, t)));
  const ini = new Date(S.dia + "T12:00:00"); ini.setDate(ini.getDate() - 29);
  const todos = [];
  for (let de = 0; de < 20000; de += 1000) { // o servidor entrega no máximo 1000 linhas por consulta
    const { data, error } = await sb.from("prog_programacao_v").select("*").gte("dia", ini.toISOString().slice(0, 10)).lte("dia", S.dia)
      .order("dia").order("id").range(de, de + 999);
    if (error) { corpo.replaceChildren(h("p", { class: "err" }, traduzErro(error))); return; }
    todos.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const quando = S.dia === S.hoje ? "hoje" : "em " + dataBR(S.dia);

  function desenhar() {
    const hojeR = S.rows;
    const lim = new Date(S.dia + "T12:00:00"); lim.setDate(lim.getDate() - (dias - 1));
    const noPeriodo = todos.filter((r) => r.dia >= lim.toISOString().slice(0, 10));
    // A mesma viagem aparece em vários dias (o quadro copia o dia anterior). Conta cada viagem uma só vez,
    // usando a linha mais recente dela (a mais completa): veículo + embarcador + chegada na carga (ou data programada).
    const viag = new Map();
    noPeriodo.forEach((r) => {
      if (!r.embarcador) return;
      const k = [r.conjunto_id, normEmb(r.embarcador), r.cheg_carga || r.data_programacao || ""].join("|");
      const ant = viag.get(k);
      if (!ant || r.dia >= ant.dia) viag.set(k, r);
    });
    const periodo = [...viag.values()].map((r) => ({ ...r, emb_n: normEmb(r.embarcador) }));
    const n = (...cods) => hojeR.filter((r) => cods.includes(r.status)).length;
    const total = hojeR.length;
    const fora = n("EM MANUTENÇÃO", "AG. PROGRAMAÇÃO", "ENTREGUE");
    const emViagem = n("EM TRÂNSITO", "PERNOITE", "DSR");
    const ocup = total ? Math.round(((total - fora) / total) * 100) : 0; // sobre a frota inteira: manutenção conta como parado
    const comAlerta = hojeR.filter((r) => alertas(r).length).length;
    const emManut = hojeR.filter((r) => r.status === "EM MANUTENÇÃO");
    const parados = emManut.filter((r) => diasParado(r) != null).sort((a, b) => diasParado(b) - diasParado(a));
    const totalParado = parados.reduce((t, r) => t + custoParado(r), 0);
    const semData = emManut.length - parados.length;
    const kpi = (rot, val, sub) => h("div", { class: "pn-kpi" }, h("div", { class: "hint" }, rot), h("div", { class: "pn-n" }, String(val)), sub ? h("div", { class: "hint" }, sub) : null);

    const esperasC = [], esperasD = [];
    periodo.forEach((r) => {
      const c = minEntre(r.cheg_carga, r.carregou_em), d = minEntre(r.cheg_descarga, r.fim_descarga);
      if (c != null) esperasC.push({ r, v: c }); if (d != null) esperasD.push({ r, v: d });
    });
    const mediaPor = (lista, chave) => {
      const g = new Map();
      lista.forEach(({ r, v }) => { const k = chave(r); if (k) (g.get(k) || g.set(k, []).get(k)).push(v); });
      return [...g].map(([k, v]) => ({ n: k, v: media(v), extra: v.length + " viagem(ns)" })).sort((a, b) => b.v - a.v).slice(0, 8);
    };
    const vivos = hojeR.map((r) => ({ r, v: esperaViva(r) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
    const porStatus = S.status.filter((s) => s.ativo !== false).map((s) => ({ n: s.codigo, v: hojeR.filter((r) => r.status === s.codigo).length })).filter((x) => x.v > 0);

    corpo.replaceChildren(
      h("div", { class: "pn-kpis" },
        kpi("Conjuntos no quadro", total), kpi("Em viagem", emViagem, "trânsito + pernoite + DSR"),
        kpi("Ocupação da frota", ocup + "%", "com serviço ÷ frota total (manutenção conta como parado)"),
        kpi("Em manutenção", n("EM MANUTENÇÃO")),
        kpi("Prejuízo acumulado (parados)", BRL(totalParado), (parados.length ? parados.length + " com data · " : "") + BRL(n("EM MANUTENÇÃO") * S.custoDia) + " a cada dia" + (semData ? " · " + semData + " sem data" : "")),
        kpi("Com alerta", comAlerta)),
      h("div", { class: "pn-grid" },
        barras("Frota " + quando + " por status", porStatus),
        h("section", { class: "pn-card" }, h("h3", {}, S.dia === S.hoje ? "Maiores esperas agora" : "Maiores esperas no fim do dia"),
          vivos.length ? h("ul", { class: "pn-list" }, vivos.map(({ r, v }) =>
            h("li", {}, h("span", {}, r.placa_cavalo + " · " + r.status.replace("AG. ", "")), h("span", { class: "badge " + semaforo(v) }, fmtMin(v))))) : h("p", { class: "hint" }, "Ninguém aguardando agora.")),
        h("section", { class: "pn-card" }, h("h3", {}, "Parados em manutenção"),
          emManut.length ? h("ul", { class: "pn-list" }, emManut.map((r) =>
            h("li", {}, h("span", {}, r.placa_cavalo + (diasParado(r) != null ? " · " + rotDias(diasParado(r)) : " · sem data")),
              h("span", { class: "badge " + (diasParado(r) >= 7 ? "v" : diasParado(r) >= 3 ? "r" : "y") }, diasParado(r) != null ? BRL(custoParado(r)) : "informar data")))) : h("p", { class: "hint" }, "Nenhum veículo em manutenção.")),
        barras("Próximas cargas " + quando + " por região", contar(hojeR.filter((r) => r.proxima_carga || r.proxima_regiao), (r) => r.proxima_regiao || "Sem região")),
        barras("Frota " + quando + " por tipo", contar(hojeR, (r) => r.tipo || "Sem tipo"))),
      h("div", { class: "row", style: "margin:16px 0 6px" }, h("h2", { style: "flex:1;margin:0;font-size:16px" }, "Período"), sel),
      h("div", { class: "pn-kpis" },
        kpi("Espera média no carregamento", esperasC.length ? fmtMin(media(esperasC.map((x) => x.v))) : "—", esperasC.length + " registro(s)"),
        kpi("Espera média na descarga", esperasD.length ? fmtMin(media(esperasD.map((x) => x.v))) : "—", esperasD.length + " registro(s)"),
        kpi("Cargas no período", periodo.length, "viagens distintas (cada uma conta uma vez)")),
      h("div", { class: "pn-grid" },
        barras("Espera média no carregamento por embarcador", mediaPor(esperasC, (r) => r.emb_n), fmtMin, "Só viagens com chegada e saída preenchidas; cada viagem conta uma vez."),
        barras("Espera média na descarga por destino", mediaPor(esperasD, (r) => r.destino), fmtMin),
        barras("Cargas por embarcador", contar(periodo, (r) => r.emb_n).slice(0, 8)),
        barras("Cargas por motorista", contar(periodo, (r) => r.motorista).slice(0, 8))));
  }
  desenhar();
}


// ---------- mapa da frota ----------
let leafletPronto = null;
function carregarLeaflet() {
  if (leafletPronto) return leafletPronto;
  leafletPronto = new Promise((ok, falha) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"; document.head.append(css);
    const js = document.createElement("script"); js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => ok(window.L); js.onerror = () => { leafletPronto = null; falha(new Error("Não foi possível carregar o mapa.")); };
    document.head.append(js);
  });
  return leafletPronto;
}
const haMin = (ts) => Math.max(0, Math.round((Date.now() - new Date(ts)) / 60000));

async function abrirMapa() {
  const mapaEl = h("div", { id: "mapa-frota" });
  const info = h("div", { class: "hint", style: "margin:6px 0" }, "Carregando mapa…");
  const m = h("div", { class: "modal painel", onclick: (e) => { if (e.target === m) fechar(); } },
    h("div", { class: "box" }, h("div", { class: "row" }, h("h2", { style: "flex:1;margin:0" }, "Mapa da frota"), h("button", { onclick: () => fechar() }, "Fechar")), info, mapaEl));
  document.body.append(m);
  let L, mapa, timer;
  const fechar = () => { clearInterval(timer); if (mapa) mapa.remove(); m.remove(); };
  try { L = await carregarLeaflet(); } catch (e) { info.textContent = e.message; return; }
  mapa = L.map(mapaEl).setView([-20.85, -41.1], 8);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(mapa);
  const camada = L.layerGroup().addTo(mapa);
  let primeira = true;
  async function desenhar() {
    const { data, error } = await sb.from("prog_programacao_v").select("*").eq("dia", S.dia).not("ultima_lat", "is", null);
    if (error) { info.textContent = traduzErro(error); return; }
    camada.clearLayers();
    const pts = [];
    (data || []).forEach((r) => {
      const min = haMin(r.ultima_posicao_em), velho = min > 30;
      const cor = velho ? "#94a3b8" : (S.status.find((x) => x.codigo === r.status) || {}).cor || "#2563eb";
      const icone = L.divIcon({ className: "", iconSize: [34, 34], iconAnchor: [17, 17],
        html: '<div style="background:' + cor + ';color:#fff;border:2px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font:700 10px system-ui;box-shadow:0 1px 4px #0006">' + (r.placa_cavalo || "").slice(-4) + "</div>" });
      const pop = document.createElement("div");
      pop.append(h("b", {}, r.placa_cavalo), h("div", {}, [r.motorista, r.status].filter(Boolean).join(" · ")),
        r.destino ? h("div", {}, [ic("seta"), " " + r.destino]) : "", h("div", { class: "hint" }, "Posição de há " + fmtMin(min) + (velho ? " (desatualizada)" : "")),
        h("a", { href: "https://www.google.com/maps?q=" + r.ultima_lat + "," + r.ultima_lng, target: "_blank", rel: "noopener" }, "Abrir no Google Maps"));
      L.marker([r.ultima_lat, r.ultima_lng], { icon: icone, title: r.placa_cavalo }).bindPopup(pop).addTo(camada);
      pts.push([r.ultima_lat, r.ultima_lng]);
    });
    info.textContent = pts.length ? pts.length + " veículo(s) com posição hoje · atualiza a cada 30 s · cinza = sem sinal há mais de 30 min" : "Nenhum veículo enviou posição hoje ainda.";
    if (primeira && pts.length) { mapa.fitBounds(pts, { padding: [40, 40], maxZoom: 14 }); primeira = false; }
  }
  mapa.invalidateSize();
  await desenhar();
  timer = setInterval(desenhar, 30000);
}
