// Programação de Frota · Fatran — front-end (HTML/JS puro + Supabase)
// A chave abaixo é a chave PÚBLICA (publishable). A segurança vem das regras do banco (RLS), não dela.
const SUPABASE_URL = "https://rmlbnqnnanrkvoeqntim.supabase.co";
const SUPABASE_KEY = "sb_publishable_AZsrZk-4UDIY_G0b8fJojg_DRXeiA7j";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const S = { perfil: null, perms: new Set(), dia: null, status: [], rows: [], tipos: {}, lado: "right", aberto: null, canal: null, desfazer: [], tela: "quadro", motoristas: [], pref: JSON.parse(JSON.stringify({ piscar: { aguardando_carga: true, aguardando_desc: true, esperas: true }, limiteMin: 120 })), filtro: { tipo: "", resumo: "" } };
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
  S.dia = hoje.data;
  desenharEstrutura();
  await carregar();
  assinarTempoReal();
}

async function carregar() {
  const [st, rows, tp, mo] = await Promise.all([
    sb.from("prog_status").select("*").order("ordem"),
    sb.from("prog_programacao_v").select("*").eq("dia", S.dia).order("ordem").order("placa_cavalo"),
    sb.from("prog_tipos_conjunto").select("codigo,cor"),
    sb.from("prog_motoristas").select("id,nome,ativo").order("nome"),
  ]);
  if (st.error || rows.error) { toast(traduzErro(st.error || rows.error)); return; }
  S.status = st.data; S.rows = rows.data;
  S.motoristas = mo.data || [];
  S.tipos = Object.fromEntries((tp.data || []).map((t) => [t.codigo, t.cor]));
  desenharQuadro();
  if (S.aberto) { const r = S.rows.find((x) => x.id === S.aberto); r ? abrirGaveta(r) : fecharGaveta(); }
}

function assinarTempoReal() {
  if (S.canal) sb.removeChannel(S.canal);
  let t;
  const recarregar = () => { clearTimeout(t); t = setTimeout(carregar, 400); };
  S.canal = sb.channel("prog-quadro")
    .on("postgres_changes", { event: "*", schema: "public", table: "prog_programacao" }, recarregar)
    .on("postgres_changes", { event: "*", schema: "public", table: "prog_status" }, recarregar)
    .subscribe();
  // Rede de segurança: se o tempo real falhar, atualiza ao voltar para a aba e a cada 30 s
  if (!S.poll) {
    const seguro = () => { if (document.visibilityState === "visible" && !document.querySelector(".modal") && !document.querySelector(".drawer input:focus, .drawer textarea:focus")) carregar(); };
    document.addEventListener("visibilitychange", seguro);
    window.addEventListener("focus", seguro);
    S.poll = setInterval(seguro, 30000);
  }
}

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
const PREF_PADRAO = { piscar: { aguardando_carga: true, aguardando_desc: true, esperas: true }, limiteMin: 120 };
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
    pill(n("EM MANUTENÇÃO"), "em manutenção", n("EM MANUTENÇÃO") ? "crit" : "", "manutencao", "status:EM MANUTENÇÃO"),
    pill(esp, "esperas ≥ 5h", esp ? "crit" : "", "esperas", "esperas"),
    h("button", { class: "pill " + (com ? "warn" : "") + (piscaSe("alertas", com > 0) ? " piscar" : "") + (S.filtro.resumo === "alertas" ? " on" : ""), onclick: alternarAlerta }, h("b", {}, com), " com alerta ⚠"),
    h("span", { class: "hint grow" }, "Arraste os cartões para mudar o status · clique para abrir os detalhes"));
}
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
  if (S.aberto) { const r = S.rows.find((x) => x.id === S.aberto); if (r) abrirGaveta(r); }
}
function desenharEstrutura() {
  $busca = h("input", { type: "search", placeholder: "Buscar placa, motorista, destino…", style: "max-width:240px", oninput: desenharQuadro });
  const tipo = h("select", { style: "width:auto", onchange: (e) => { S.filtro.tipo = e.target.value; desenharQuadro(); } },
    h("option", { value: "" }, "Todos os tipos"), Object.keys(S.tipos).map((t) => h("option", { value: t }, t)));
  $btnAlerta = h("button", { onclick: alternarAlerta }, "⚠ Só com alerta");
  const compacto = h("button", { onclick: (e) => { document.body.classList.toggle("compact"); e.currentTarget.classList.toggle("on"); } }, "Compacto");
  const reset = h("button", { title: "Atualizar", onclick: carregar }, "↺");
  const legendas = h("button", { onclick: modalLegendas }, "🔔 Legendas");
  $btnDesfazer = h("button", { onclick: desfazerUltimo, disabled: true }, "↶ Desfazer");
  const painel = can("dashboard.ver") ? h("button", { onclick: abrirPainel }, "📊 Painel") : null;
  $lados = { left: h("button", { onclick: () => setLado("left") }, "◀ Esquerda"), both: h("button", { onclick: () => setLado("both") }, "◀▶ Ambos"), right: h("button", { class: "on", onclick: () => setLado("right") }, "Direita ▶") };
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
      h("div", {}, h("b", {}, DIAS[d.getDay()] + ", " + dataBR(S.dia))),
      $busca, tipo, $btnAlerta,
      h("span", { class: "who" }, "Gaveta abre:"), h("span", { class: "seg" }, $lados.left, $lados.both, $lados.right),
      compacto, legendas, $btnDesfazer, painel, reset, ...botoes),
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
      al.length ? h("span", { class: "al " + pior(al), title: al.map((x) => x.t).join("\n") }, "⚠ " + al.length) : null),
    h("div", { class: "sub" }, [r.tipo, r.motorista].filter(Boolean).join(" · ")),
    r.destino ? h("div", { class: "sub dest" }, "→ " + r.destino) : null,
    r.localizacao ? h("div", { class: "sub dest" }, "📍 " + r.localizacao) : null,
    r.ultima_lat != null ? h("a", { class: "sub dest", href: "https://www.google.com/maps?q=" + r.ultima_lat + "," + r.ultima_lng, target: "_blank", rel: "noopener",
      title: "Abrir no mapa", onclick: (e) => e.stopPropagation() }, "🛰️ GPS há " + fmtMin(Math.max(0, Math.round((Date.now() - new Date(r.ultima_posicao_em)) / 60000))) ) : null,
    min != null && min > 0 ? h("span", { class: "badge dest " + semaforo(min) }, "espera " + fmtMin(min)) : null);
}

function desenharQuadro() {
  if (!$board) return;
  const q = ($busca.value || "").trim().toLowerCase();
  const ativos = S.status.filter((s) => s.ativo !== false);
  const passa = (r) => porResumo(r) && (!S.filtro.tipo || r.tipo === S.filtro.tipo) &&
    (!q || [r.placa_cavalo, r.placa_implemento, r.motorista, r.destino, r.embarcador, r.obs].some((v) => (v || "").toLowerCase().includes(q)));
  const cols = ativos.map((s) => {
    const itens = S.rows.filter((r) => r.status === s.codigo && passa(r));
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
  $board.replaceChildren(...cols);
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
function fecharGaveta() { S.aberto = null; document.getElementById("gavetas").replaceChildren(); }
function abrirGaveta(r) {
  S.aberto = r.id;
  const els = CAMPOS.map(([k, rot, tipo, perm]) => {
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
    corpo.replaceChildren(
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
        h("button", { disabled: i === 0, onclick: () => trocar(s, data[i - 1]) }, "↑"), " ",
        h("button", { disabled: i === data.length - 1, onclick: () => trocar(s, data[i + 1]) }, "↓"), " ",
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

async function abrirPainel() {
  const corpo = h("div", { class: "pn" }, h("p", { class: "hint" }, "Carregando…"));
  const m = h("div", { class: "modal painel", onclick: (e) => { if (e.target === m) m.remove(); } },
    h("div", { class: "box" }, h("div", { class: "row" }, h("h2", { style: "flex:1;margin:0" }, "Painel de indicadores"), h("button", { onclick: () => m.remove() }, "Fechar")), corpo));
  document.body.append(m);
  let dias = 7;
  const sel = h("select", { style: "width:auto", onchange: (e) => { dias = Number(e.target.value); desenhar(); } },
    [[1, "Hoje"], [7, "Últimos 7 dias"], [30, "Últimos 30 dias"]].map(([v, t]) => h("option", { value: v, selected: v === 7 }, t)));
  const ini = new Date(S.dia + "T12:00:00"); ini.setDate(ini.getDate() - 29);
  const { data, error } = await sb.from("prog_programacao_v").select("*").gte("dia", ini.toISOString().slice(0, 10)).lte("dia", S.dia).limit(5000);
  if (error) { corpo.replaceChildren(h("p", { class: "err" }, traduzErro(error))); return; }
  const todos = data || [];

  function desenhar() {
    const hojeR = S.rows;
    const lim = new Date(S.dia + "T12:00:00"); lim.setDate(lim.getDate() - (dias - 1));
    const periodo = todos.filter((r) => r.dia >= lim.toISOString().slice(0, 10));
    const n = (...cods) => hojeR.filter((r) => cods.includes(r.status)).length;
    const total = hojeR.length;
    const fora = n("EM MANUTENÇÃO", "AG. PROGRAMAÇÃO", "ENTREGUE");
    const operando = total - n("EM MANUTENÇÃO");
    const emViagem = n("EM TRÂNSITO", "PERNOITE", "DSR");
    const ocup = operando ? Math.round(((total - fora) / operando) * 100) : 0;
    const comAlerta = hojeR.filter((r) => alertas(r).length).length;
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
        kpi("Ocupação da frota", ocup + "%", "ativos ÷ disponíveis (sem manutenção)"),
        kpi("Em manutenção", n("EM MANUTENÇÃO")), kpi("Com alerta", comAlerta)),
      h("div", { class: "pn-grid" },
        barras("Frota hoje por status", porStatus),
        h("section", { class: "pn-card" }, h("h3", {}, "Maiores esperas agora"),
          vivos.length ? h("ul", { class: "pn-list" }, vivos.map(({ r, v }) =>
            h("li", {}, h("span", {}, r.placa_cavalo + " · " + r.status.replace("AG. ", "")), h("span", { class: "badge " + semaforo(v) }, fmtMin(v))))) : h("p", { class: "hint" }, "Ninguém aguardando agora.")),
        barras("Próximas cargas hoje por região", contar(hojeR.filter((r) => r.proxima_carga || r.proxima_regiao), (r) => r.proxima_regiao || "Sem região")),
        barras("Frota hoje por tipo", contar(hojeR, (r) => r.tipo))),
      h("div", { class: "row", style: "margin:16px 0 6px" }, h("h2", { style: "flex:1;margin:0;font-size:16px" }, "Período"), sel),
      h("div", { class: "pn-kpis" },
        kpi("Espera média no carregamento", esperasC.length ? fmtMin(media(esperasC.map((x) => x.v))) : "—", esperasC.length + " registro(s)"),
        kpi("Espera média na descarga", esperasD.length ? fmtMin(media(esperasD.map((x) => x.v))) : "—", esperasD.length + " registro(s)"),
        kpi("Cargas no período", periodo.filter((r) => r.embarcador).length, "linhas com embarcador")),
      h("div", { class: "pn-grid" },
        barras("Espera média no carregamento por embarcador", mediaPor(esperasC, (r) => r.embarcador), fmtMin, "Só viagens com chegada e saída preenchidas."),
        barras("Espera média na descarga por destino", mediaPor(esperasD, (r) => r.destino), fmtMin),
        barras("Cargas por embarcador", contar(periodo, (r) => r.embarcador).slice(0, 8)),
        barras("Cargas por motorista", contar(periodo, (r) => r.motorista).slice(0, 8))));
  }
  desenhar();
}
