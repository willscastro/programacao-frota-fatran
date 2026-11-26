// Tela inicial do ecossistema Fatran: a logo no centro; ao clicar, os módulos se abrem em volta.
// Usa h(), ic(), can(), S e as telas já existentes em app.js / docs.js.
const MODULOS = [
  { id: "prog", nome: "Planilha de Programação", icone: "m_kanban", perm: "quadro.ver", desc: "O quadro do dia: status, motoristas, cargas, esperas e alertas em tempo real." },
  { id: "docs", nome: "Envio de documentos", icone: "m_docs", perm: "quadro.ver", desc: "CNH, CRLV, MOPP e demais documentos, com link temporário e envio por WhatsApp." },
  { id: "painel", nome: "Indicadores", icone: "m_painel", perm: "dashboard.ver", desc: "Esperas, ocupação da frota e cargas por região, num só lugar." },
  { id: "mapa", nome: "Mapa e rastreamento", icone: "m_mapa", breve: true, desc: "Onde cada conjunto está agora, com a posição vinda do rastreador." },
  { id: "manut", nome: "Manutenção", icone: "m_manut", breve: true, desc: "Agenda de oficina, custos e histórico de paradas por veículo." },
  { id: "adm", nome: "Administração", icone: "m_admin", perm: "usuarios.gerenciar", desc: "Usuários, perfis e permissões de cada módulo." },
];
const ICONES_INICIO = {
  m_kanban: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
  m_docs: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  m_painel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  m_mapa: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  m_manut: '<path d="M14.5 6.5a4 4 0 0 1 5.2-3.5l-2.5 2.5 1.8 1.8 2.5-2.5a4 4 0 0 1-5 5.2L8 18.5a2.1 2.1 0 0 1-3-3z"/>',
  m_admin: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  lua: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
};

let inicioSel = null;

// Tema claro/escuro: o sistema SEMPRE abre no claro (não guarda a escolha); o botão alterna só durante o uso.
function temaEscuro() { return document.documentElement.dataset.tema === "dark"; }
function iconeTema(b) { Object.assign(ICONES, ICONES_INICIO); b.replaceChildren(ic(temaEscuro() ? "sol" : "lua")); const t = temaEscuro() ? "Mudar para o tema claro" : "Mudar para o tema escuro"; b.title = t; b.setAttribute("aria-label", t); }
function botaoTema() {
  const b = h("button", { type: "button", class: "btn-tema" });
  b.onclick = () => {
    document.documentElement.dataset.tema = temaEscuro() ? "light" : "dark";
    document.querySelectorAll(".btn-tema").forEach(iconeTema);
  };
  iconeTema(b);
  return b;
}

// Rodapé das telas de módulos: empresa, site e crédito de desenvolvimento
function rodapeFatran() {
  const fatran = (t) => h("a", { href: "https://fatranlog.com.br/", target: "_blank", rel: "noopener noreferrer" }, t);
  return h("div", { class: "hub-rodape" }, h("span", {}, fatran("Fatran Transportes")), h("span", {}, fatran("fatranlog.com.br")),
    h("span", { class: "hub-credito" }, "Desenvolvido por ", h("a", { href: "https://janustec.com.br/", target: "_blank", rel: "noopener noreferrer" }, "Whitney S Castro - Janus LTDA"), " em parceria com ", fatran("Fatran Transportes")));
}


// ---------- caminhão na estrada (acima do rodapé azul) ----------
// Tema de Natal: de 20/11 a 06/01 (ou forçado com ?natal=1 / ?natal=0 na URL)
function temaNatal() {
  const q = /[?&]natal=([01])/.exec(location.search); if (q) return q[1] === "1";
  const d = new Date(), m = d.getMonth(), dia = d.getDate();
  return (m === 10 && dia >= 20) || m === 11 || (m === 0 && dia <= 6);
}
function estradaCaminhao() {
  const natal = temaNatal();
  const est = h("div", { class: "hub-estrada" + (natal ? " natal" : ""), "aria-hidden": "true" });
  est.innerHTML = '<div class="he-chao"></div>' + `` + (natal ? `<div class="he-radar"><div class="he-sway"><div class="he-r1"></div><i class="lz" style="left:54.9%;top:77.5%;animation-delay:0.00s"></i><i class="lz" style="left:46.9%;top:82.8%;animation-delay:0.37s"></i><i class="lz" style="left:36.3%;top:81.4%;animation-delay:0.74s"></i><i class="lz" style="left:31.2%;top:74.3%;animation-delay:1.11s"></i><i class="lz" style="left:35.4%;top:66.9%;animation-delay:1.48s"></i><i class="lz" style="left:45.7%;top:64.7%;animation-delay:0.25s"></i><i class="lz" style="left:54.4%;top:69.4%;animation-delay:0.62s"></i><img class="he-r2" src="natal-radar-flash.png" alt=""></div></div><div class="he-placar"><div class="pl-bg"></div><div class="pl-bg pl-b"></div><div class="pl-bg pl-c"></div><span class="he-n">80</span><i class="he-u">KM/H</i><span class="he-g g1">80</span><span class="he-g g2">80</span></div>` : `<div class="he-radar"><img class="he-r1" src="radar-1.png" alt=""><img class="he-r2" src="radar-2.png" alt=""></div><div class="he-placar"><img src="placar-vazio-verde.png" alt=""><span class="he-n">80</span><i class="he-u">KM/H</i><span class="he-g g1">80</span><span class="he-g g2">80</span></div>`) + `` + '<div class="he-truck">' + `<svg viewBox="0 0 1240 420" aria-label="Carreta sider da Fatran"><image class="cam-img" href="carreta-dir.png" x="0" y="0" width="1240" height="420"/><g class="rodaw" data-x="205" transform="translate(205 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="319" transform="translate(319 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="434" transform="translate(434 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="741" transform="translate(741 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="868" transform="translate(868 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="1080" transform="translate(1080 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g></svg>` + (natal ? '<div class="he-touca"></div>' : '') + '<div class="he-sombra"></div></div>';
  const tr = est.querySelector(".he-truck"), img = est.querySelector(".cam-img"), rodasw = [...est.querySelectorAll(".rodaw")], rodas = [...est.querySelectorAll(".roda")];
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let x = 0, dir = 1, pausa = 0, ang = 0, t0 = performance.now(), ultimoFlash = 0, frenteAnt = null;
  const radar = est.querySelector(".he-radar"), placar = est.querySelector(".he-placar");
  const SEQ = [80, 100, 80, 200]; let k = 0; // alterna: 80 (verde, tudo certo), 100 (vermelho), 80, 200 (vermelho)
  const reinicia = (el, c) => { el.classList.remove(c); void el.getBoundingClientRect(); el.classList.add(c); };
  const pImg = placar.querySelector("img"), pN = placar.querySelector(".he-n"), pG = [...placar.querySelectorAll(".he-g")];
  let contagem = null;
  function flagrante() {
    placar.classList.toggle("esq", dir < 0); // o placar fica do lado de onde o caminhão já saiu
    const alvo = SEQ[k % SEQ.length], verde = alvo <= 80; k++;
    if (pImg) pImg.src = verde ? "placar-vazio-verde.png" : "placar-vazio-vermelho.png";
    placar.classList.toggle("verde", verde); placar.classList.toggle("vermelho", !verde);
    if (!verde) reinicia(radar, "flash"); // só o vermelho dispara o flash e a câmera
    reinicia(placar, "ver");
    clearInterval(contagem); let i = 0, passos = 22; // o número sobe de 10 até o valor do placar
    const mostra = (v) => { pN.textContent = v; pG.forEach((g) => { g.textContent = v; }); };
    mostra(10);
    contagem = setInterval(() => { i++; const t = 1 - Math.pow(1 - i / passos, 2); mostra(Math.round(10 + (alvo - 10) * t)); if (i >= passos) clearInterval(contagem); }, 40);
  }
  const virar = () => {
    tr.classList.toggle("esq", dir < 0); // virado para a esquerda: usa a imagem espelhada (logos já corrigidas) e reposiciona as rodas
    img.setAttribute("href", dir > 0 ? "carreta-dir.png" : "carreta-esq.png");
    rodasw.forEach((g) => { const x = +g.dataset.x; g.setAttribute("transform", "translate(" + (dir > 0 ? x : 1240 - x) + " 364)"); });
  };
  function quadro(t) {
    if (!est.isConnected || S.tela !== "inicio") return; // a tela mudou: encerra o laço
    const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
    const w = Math.max(200, Math.min(340, est.clientWidth * 0.3)); tr.style.width = w + "px";
    const max = Math.max(0, est.clientWidth - w);
    if (!reduz) {
      if (pausa > 0) pausa -= dt;
      else {
        const freio = Math.max(0.18, Math.min(1, (dir > 0 ? max - x : x) / 140)), arranque = Math.min(1, (dir > 0 ? x : max - x) / 60 + 0.25);
        const v = 100 * freio * arranque; x += dir * v * dt; ang += dir * v * dt / (51 * w / 1240) * 57.3;
        if (dir > 0 && x >= max - 0.5) { x = max; pausa = 1.4; dir = -1; virar(); }
        else if (dir < 0 && x <= 0.5) { x = 0; pausa = 1.4; dir = 1; virar(); }
      }
    }
    const bob = !reduz && pausa <= 0 ? Math.sin(t / 90) * 0.7 : 0;
    const rx = est.clientWidth * 0.58 + 36, frente = x + w * (dir > 0 ? 0.98 : 0.02); // posição do radar e da frente do caminhão
    if (!reduz && frenteAnt !== null && (frenteAnt - rx) * (frente - rx) <= 0 && frenteAnt !== frente && t - ultimoFlash > 3000) { ultimoFlash = t; flagrante(); }
    frenteAnt = frente;
    tr.style.transform = "translate(" + x.toFixed(1) + "px," + bob.toFixed(2) + "px)";
    rodas.forEach((r) => { r.style.transform = "rotate(" + ang.toFixed(1) + "deg)"; });
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  return est;
}

function mostrarInicio() {
  Object.assign(ICONES, ICONES_INICIO);
  S.tela = "inicio"; inicioSel = null;
  const mods = MODULOS.filter((m) => !m.perm || can(m.perm));
  const pag = h("div", { class: "hub" });
  const dica = h("p", { class: "hub-dica" }, "Toque na logo para abrir os módulos");
  const palco = h("div", { class: "hub-palco" });
  const legenda = h("div", { class: "hub-legenda" });
  const centro = h("button", { class: "hub-centro", type: "button", "aria-expanded": "false", "aria-label": "Abrir ou fechar os módulos da Fatran",
    onclick: () => { const a = pag.classList.toggle("aberto"); centro.setAttribute("aria-expanded", String(a)); inicioSel = null; marcar(); } },
    temaNatal() ? h("span", { class: "hub-touca", "aria-hidden": "true" }) : null, h("img", { src: "logo-fatran.png", alt: "Fatran" }), h("span", { class: "hub-cliq" }, "Toque para abrir"));
  const orbita = h("span", { class: "hub-orbita" });
  const fios = mods.map((_, i) => h("span", { class: "hub-fio", style: "--i:" + i }));
  const nos = mods.map((m, i) => {
    const ico = ic(m.icone);
    const b = h("button", { class: "hub-no" + (m.breve ? " breve" : ""), type: "button", style: "--i:" + i, "aria-label": m.nome,
      onclick: () => { inicioSel = m.id; marcar(); } },
      h("span", { class: "hub-ic" }, ico),
      h("span", { class: "hub-txt" }, h("span", { class: "hub-rot" }, m.nome), m.breve ? h("span", { class: "hub-tag" }, "Em breve") : null));
    b.dataset.id = m.id;
    return b;
  });
  const grade = h("div", { class: "hub-grade" }, ...nos);
  const palco_ = h("div", { class: "hub-stage" }, h("span", { class: "hub-anel" }), orbita, ...fios, centro, grade);
  palco.append(palco_);

  function marcar() {
    nos.forEach((b) => b.classList.toggle("sel", b.dataset.id === inicioSel));
    const m = mods.find((x) => x.id === inicioSel);
    if (!m || !pag.classList.contains("aberto")) { legenda.replaceChildren(); return; }
    legenda.replaceChildren(h("div", { class: "hub-cartao" },
      h("h2", {}, m.nome), h("p", {}, m.desc),
      h("button", { class: "hub-abrir", type: "button", disabled: !!m.breve, onclick: () => abrirModulo(m.id) }, m.breve ? "Disponível em breve" : "Abrir módulo")));
    legenda.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function layout() {
    if (S.tela !== "inicio") return;
    // Palco de tamanho fixo (960x640) reduzido/ampliado para caber na tela, seja notebook, monitor ou TV
    const rx = 400, ry = 240;
    const k = Math.min(palco.clientWidth / 960, palco.clientHeight / 640, 2);
    palco_.style.setProperty("--k", Math.max(k, 0.3).toFixed(3));
    orbita.style.width = Math.round(rx * 2) + "px"; orbita.style.height = Math.round(ry * 2) + "px";
    const n = mods.length;
    mods.forEach((_, i) => {
      const a = (-90 + (360 / n) * i) * Math.PI / 180;
      const x = rx * Math.cos(a), y = ry * Math.sin(a);
      nos[i].classList.toggle("rot-cima", Math.abs(x) < 5 && y < 0); // módulo de cima: o nome fica acima, longe da linha
      nos[i].style.setProperty("--x", x.toFixed(1) + "px"); nos[i].style.setProperty("--y", y.toFixed(1) + "px");
      fios[i].style.setProperty("--len", Math.max(0, Math.hypot(x, y) - 88 - 46).toFixed(1) + "px"); // da borda da logo até perto do módulo
      fios[i].style.setProperty("--ang", (Math.atan2(y, x) * 180 / Math.PI).toFixed(2) + "deg");
    });
  }

  pag.append(
    h("div", { class: "hub-topo" }, h("img", { src: "logo-fatran.png", alt: "Fatran" }),
      h("div", { class: "hub-quem" }, botaoTema(), h("span", {}, S.perfil.nome + " (" + S.perfil.papel + ")"),
        h("button", { type: "button", onclick: async () => { await sb.auth.signOut(); location.reload(); } }, "Sair"))),
    dica, palco, legenda,
    estradaCaminhao(),
    rodapeFatran());
  $app.replaceChildren(pag);
  layout();
  requestAnimationFrame(() => requestAnimationFrame(() => pag.classList.add("pronto"))); // só anima depois da 1ª posição calculada
  if (!window.__hubResize) { window.__hubResize = true; window.addEventListener("resize", () => { if (S.tela === "inicio") { const p = document.querySelector(".hub-palco"); if (p) mostrarInicioLayout(); } }); }
  window.__hubLayout = layout;
}
function mostrarInicioLayout() { if (window.__hubLayout) window.__hubLayout(); }

// Abre o módulo escolhido. Os módulos usam o quadro como base (dados e permissões já carregados).
async function abrirModulo(id) {
  if (id === "mapa" || id === "manut") return;
  if (id === "docs") return telaEnvioDocs(); // tela própria: não abre o quadro
  if (id === "painel") return telaIndicadores(); // tela própria: não abre o quadro
  const primeira = !S.quadroIniciado;
  S.tela = "quadro";
  desenharEstrutura();
  await carregar();
  if (primeira) { S.quadroIniciado = true; assinarTempoReal(); }
  if (id === "adm") modalUsuarios();
}
function voltarInicio() { if (S.tela === "quadro") fecharGaveta(); document.querySelectorAll(".modal").forEach((m) => m.remove()); mostrarInicio(); }
