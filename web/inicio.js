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
function estradaCaminhao() {
  const est = h("div", { class: "hub-estrada", "aria-hidden": "true" });
  est.innerHTML = '<div class="he-chao"></div><div class="he-truck">' + `<svg viewBox="0 0 440 150" aria-label="Carreta sider da Fatran">
        <!-- semirreboque sider: cortina lateral com ripas -->
        <g class="cam-corpo">
          <rect x="8" y="10" width="300" height="96" rx="5" fill="var(--sider)" stroke="var(--sider-linha)" stroke-width="2"/>
          <g stroke="var(--sider-linha)" stroke-width="1.4">
            <path d="M32 14v88M56 14v88M80 14v88M104 14v88M128 14v88M152 14v88M176 14v88M200 14v88M224 14v88M248 14v88M272 14v88M296 14v88" opacity=".75"/>
          </g>
          <rect x="8" y="92" width="300" height="14" fill="#1D9AD5"/>
          <rect x="8" y="106" width="300" height="9" rx="2" fill="#12263A"/>
          <!-- engate e quinta roda -->
          <rect x="300" y="108" width="40" height="8" rx="2" fill="#12263A"/>
          <!-- cavalo mecânico -->
          <path d="M318 40h46c10 0 17 5 22 14l16 26c3 5 4 9 4 15v21h-88z" fill="#1D9AD5"/>
          <path d="M338 48h26c6 0 10 3 13 8l11 19h-50z" fill="#cfeaf7" stroke="#0A74AA" stroke-width="1.5"/>
          <rect x="318" y="30" width="26" height="12" rx="3" fill="#0A74AA"/>
          <rect x="318" y="96" width="102" height="20" rx="3" fill="#12263A"/>
          <rect x="414" y="100" width="12" height="8" rx="2" fill="#ffd166"/>
          <rect x="300" y="70" width="14" height="42" rx="2" fill="#0A74AA"/>
          <!-- escapamento -->
          <rect x="322" y="6" width="5" height="42" rx="2" fill="#5d7385"/>
          <!-- rodas -->
          <g class="roda"><circle cx="64" cy="124" r="19" fill="#14202c"/><circle cx="64" cy="124" r="9" fill="#9fb3c2"/><path d="M64 115v18M55 124h18" stroke="#14202c" stroke-width="2.4"/></g>
          <g class="roda"><circle cx="112" cy="124" r="19" fill="#14202c"/><circle cx="112" cy="124" r="9" fill="#9fb3c2"/><path d="M112 115v18M103 124h18" stroke="#14202c" stroke-width="2.4"/></g>
          <g class="roda"><circle cx="160" cy="124" r="19" fill="#14202c"/><circle cx="160" cy="124" r="9" fill="#9fb3c2"/><path d="M160 115v18M151 124h18" stroke="#14202c" stroke-width="2.4"/></g>
          <g class="roda"><circle cx="354" cy="124" r="19" fill="#14202c"/><circle cx="354" cy="124" r="9" fill="#9fb3c2"/><path d="M354 115v18M345 124h18" stroke="#14202c" stroke-width="2.4"/></g>
          <g class="roda"><circle cx="398" cy="124" r="19" fill="#14202c"/><circle cx="398" cy="124" r="9" fill="#9fb3c2"/><path d="M398 115v18M389 124h18" stroke="#14202c" stroke-width="2.4"/></g>
        </g>
        <image class="cam-logo" href="logo-fatran.png" x="58" y="26" width="200" height="41"/>
      </svg>` + '<div class="he-sombra"></div></div>';
  const tr = est.querySelector(".he-truck"), corpo = est.querySelector(".cam-corpo"), logo = est.querySelector(".cam-logo"), rodas = [...est.querySelectorAll(".roda")];
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let x = 0, dir = 1, pausa = 0, ang = 0, t0 = performance.now();
  const virar = () => { if (dir > 0) { corpo.removeAttribute("transform"); logo.setAttribute("x", "58"); } else { corpo.setAttribute("transform", "translate(440 0) scale(-1 1)"); logo.setAttribute("x", "182"); } };
  function quadro(t) {
    if (!est.isConnected || S.tela !== "inicio") return; // a tela mudou: encerra o laço
    const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
    const w = Math.max(170, Math.min(230, est.clientWidth * 0.22)); tr.style.width = w + "px";
    const max = Math.max(0, est.clientWidth - w);
    if (!reduz) {
      if (pausa > 0) pausa -= dt;
      else {
        const freio = Math.max(0.18, Math.min(1, (dir > 0 ? max - x : x) / 140)), arranque = Math.min(1, (dir > 0 ? x : max - x) / 60 + 0.25);
        const v = 100 * freio * arranque; x += dir * v * dt; ang += dir * v * dt / 19 * 57.3;
        if (dir > 0 && x >= max - 0.5) { x = max; pausa = 1.4; dir = -1; virar(); }
        else if (dir < 0 && x <= 0.5) { x = 0; pausa = 1.4; dir = 1; virar(); }
      }
    }
    const bob = !reduz && pausa <= 0 ? Math.sin(t / 90) * 0.7 : 0;
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
    h("img", { src: "logo-fatran.png", alt: "Fatran" }), h("span", { class: "hub-cliq" }, "Toque para abrir"));
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
