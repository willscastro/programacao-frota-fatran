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
  est.innerHTML = '<div class="he-chao"></div>' + `<div class="he-radar"><svg viewBox="-4 0 124 130" aria-hidden="true">
<g class="he-ondas" fill="none" stroke="#1D9AD5" stroke-width="3" stroke-linecap="round"><path d="M84 28a14 14 0 0 1 0 20"/><path d="M92 20a26 26 0 0 1 0 36"/><path d="M100 12a38 38 0 0 1 0 52"/></g>
<rect x="22" y="121" width="36" height="7" rx="3.5" fill="var(--rd-linha)"/>
<rect x="34" y="62" width="12" height="60" fill="#9aa8b4" stroke="var(--rd-linha)" stroke-width="2.5"/><rect x="34" y="62" width="4.5" height="60" fill="#1D9AD5"/><rect x="31" y="96" width="18" height="12" rx="2" fill="#fff" stroke="var(--rd-linha)" stroke-width="2"/>
<rect x="6" y="6" width="68" height="60" rx="9" fill="#9aa8b4" stroke="var(--rd-linha)" stroke-width="3"/>
<path d="M15 6h13v60H15a9 9 0 0 1-9-9V15a9 9 0 0 1 9-9z" fill="#1D9AD5"/>
<rect x="38" y="16" width="26" height="6" rx="1" fill="var(--rd-linha)"/><circle cx="48" cy="38" r="11" fill="var(--rd-linha)"/><circle cx="48" cy="38" r="4.5" fill="#1D9AD5"/><rect x="54" y="55" width="14" height="4" rx="1" fill="#fff"/>
<polygon class="he-flash" points="54.0,8.6 55.3,27.2 73.0,21.4 60.8,35.5 77.4,44.0 58.8,45.3 64.6,63.0 50.5,50.8 42.0,67.4 40.7,48.8 23.0,54.6 35.2,40.5 18.6,32.0 37.2,30.7 31.4,13.0 45.5,25.2" fill="#fff" stroke="#1D9AD5" stroke-width="3" stroke-linejoin="round"/>
</svg></div>
<div class="he-cam"><svg viewBox="0 0 60 50" aria-hidden="true"><path d="M44 8l-5 9h5l-8 12 2-9h-5z" fill="#1D9AD5"/><rect x="4" y="18" width="38" height="28" rx="4" fill="var(--rd-linha)"/><rect x="12" y="13" width="12" height="7" rx="2" fill="var(--rd-linha)"/><circle cx="23" cy="32" r="9" fill="#fff"/><circle cx="23" cy="32" r="5.5" fill="#1D9AD5"/></svg></div>
<div class="he-placar"><b class="he-vel">0000</b><i>KM/H</i><span class="he-fant">0000</span><span class="he-fant f2">0000</span></div>` + '<div class="he-truck">' + `<svg viewBox="0 25 520 175" aria-label="Carreta sider da Fatran"><g class="cam-corpo"><rect x="8" y="32" width="376" height="112" rx="5" fill="var(--sider)" stroke="var(--sider-linha)" stroke-width="2"/><path d="M34 36v104M60 36v104M86 36v104M112 36v104M138 36v104M164 36v104M190 36v104M216 36v104M242 36v104M268 36v104M294 36v104M320 36v104M346 36v104M372 36v104" stroke="var(--sider-linha)" stroke-width="1.4" opacity=".75"/><rect x="8" y="124" width="376" height="14" fill="#1D9AD5"/><rect x="8" y="138" width="376" height="9" rx="2" fill="#12263A"/><rect x="271.4" y="170.2" width="189.0" height="12" fill="#12263A"/><rect x="367.2" y="159.5" width="32.4" height="18.9" fill="#9aa8b4"/><g class="roda"><circle cx="292.9" cy="170" r="20" fill="#0f1a25"/><circle cx="292.9" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="292.9" cy="170" r="6.0" fill="#1b2a38"/><circle cx="301.3" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="298.8" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="292.9" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="287.0" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="284.5" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="287.0" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="292.9" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="298.8" cy="164.1" r="1.6" fill="#1b2a38"/></g><g class="roda"><circle cx="334.8" cy="170" r="20" fill="#0f1a25"/><circle cx="334.8" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="334.8" cy="170" r="6.0" fill="#1b2a38"/><circle cx="343.2" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="340.7" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="334.8" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="328.9" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="326.4" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="328.9" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="334.8" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="340.7" cy="164.1" r="1.6" fill="#1b2a38"/></g><g class="roda"><circle cx="423.9" cy="170" r="20" fill="#0f1a25"/><circle cx="423.9" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="423.9" cy="170" r="6.0" fill="#1b2a38"/><circle cx="432.3" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="429.8" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="423.9" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="418.0" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="415.5" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="418.0" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="423.9" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="429.8" cy="164.1" r="1.6" fill="#1b2a38"/></g><g class="roda"><circle cx="62" cy="170" r="20" fill="#0f1a25"/><circle cx="62" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="62" cy="170" r="6.0" fill="#1b2a38"/><circle cx="70.4" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="67.9" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="62.0" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="56.1" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="53.6" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="56.1" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="62.0" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="67.9" cy="164.1" r="1.6" fill="#1b2a38"/></g><g class="roda"><circle cx="102" cy="170" r="20" fill="#0f1a25"/><circle cx="102" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="102" cy="170" r="6.0" fill="#1b2a38"/><circle cx="110.4" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="107.9" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="102.0" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="96.1" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="93.6" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="96.1" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="102.0" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="107.9" cy="164.1" r="1.6" fill="#1b2a38"/></g><g class="roda"><circle cx="142" cy="170" r="20" fill="#0f1a25"/><circle cx="142" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="142" cy="170" r="6.0" fill="#1b2a38"/><circle cx="150.4" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="147.9" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="142.0" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="136.1" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="133.6" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="136.1" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="142.0" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="147.9" cy="164.1" r="1.6" fill="#1b2a38"/></g><path d="M268.9 170a24 24 0 0 1 48 0z" fill="#0f1a25"/><path d="M310.8 170a24 24 0 0 1 48 0z" fill="#0f1a25"/><path d="M399.9 170a24 24 0 0 1 48 0z" fill="#0f1a25"/><g class="roda"><circle cx="292.9" cy="170" r="20" fill="#0f1a25"/><circle cx="292.9" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="292.9" cy="170" r="6.0" fill="#1b2a38"/><circle cx="301.3" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="298.8" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="292.9" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="287.0" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="284.5" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="287.0" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="292.9" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="298.8" cy="164.1" r="1.6" fill="#1b2a38"/></g><g class="roda"><circle cx="334.8" cy="170" r="20" fill="#0f1a25"/><circle cx="334.8" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="334.8" cy="170" r="6.0" fill="#1b2a38"/><circle cx="343.2" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="340.7" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="334.8" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="328.9" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="326.4" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="328.9" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="334.8" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="340.7" cy="164.1" r="1.6" fill="#1b2a38"/></g><g class="roda"><circle cx="423.9" cy="170" r="20" fill="#0f1a25"/><circle cx="423.9" cy="170" r="11.0" fill="#9aa8b4"/><circle cx="423.9" cy="170" r="6.0" fill="#1b2a38"/><circle cx="432.3" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="429.8" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="423.9" cy="178.4" r="1.6" fill="#1b2a38"/><circle cx="418.0" cy="175.9" r="1.6" fill="#1b2a38"/><circle cx="415.5" cy="170.0" r="1.6" fill="#1b2a38"/><circle cx="418.0" cy="164.1" r="1.6" fill="#1b2a38"/><circle cx="423.9" cy="161.6" r="1.6" fill="#1b2a38"/><circle cx="429.8" cy="164.1" r="1.6" fill="#1b2a38"/></g><polygon points="388.3,52.8 434.7,56.9 402.3,155.4 383.9,151.4" fill="#0F6DB5"/><path d="M401.8 155.4 L401.8 62.2 Q402.8 58.2 413.1 57.1 L472.5 56.9 Q489.2 58.2 494.6 77.1 L502.7 117.6 L504.4 150.0 L461.7 155.4 Z" fill="#ffffff" stroke="#dbe5ec" stroke-width="1"/><polygon points="409.1,84.7 424.4,84.7 424.4,106.8 409.1,106.8" fill="#dfe9f1"/><line x1="424.4" y1="83.9" x2="424.4" y2="150.0" stroke="#c4d2dd" stroke-width="1.5"/><polygon points="428.8,87.4 459.0,87.4 460.1,112.7 429.3,112.7" fill="#9fd3f2" stroke="#12263A" stroke-width="2.4"/><rect x="449.6" y="90.6" width="7.6" height="20.2" rx="3" fill="#12263A"/><polygon points="463.3,87.4 495.7,87.4 501.7,116.5 469.3,113.8" fill="#9fd3f2" stroke="#12263A" stroke-width="2.4"/><polygon points="457.6,79.3 497.3,79.3 498.4,87.4 459.0,83.9" fill="#12263A"/><polygon points="399.6,144.6 463.1,146.2 461.7,177.0 399.6,166.2" fill="#9aa8b4" opacity=".0"/><polygon points="463.1,144.6 504.9,147.3 505.4,178.4 461.7,177.0" fill="#b4bfc9"/><rect x="480.1" y="133.3" width="21.6" height="3.0" rx="1" fill="#2b3744"/><rect x="480.1" y="139.2" width="21.6" height="3.0" rx="1" fill="#2b3744"/><rect x="480.1" y="145.1" width="21.6" height="3.0" rx="1" fill="#2b3744"/><rect x="480.1" y="151.1" width="21.6" height="3.0" rx="1" fill="#2b3744"/><rect x="480.1" y="157.0" width="21.6" height="3.0" rx="1" fill="#2b3744"/><rect x="471.4" y="158.1" width="8.1" height="7.6" rx="3" fill="#fff"/><rect x="462.8" y="158.1" width="3.8" height="3.2" fill="#f28c28"/></g><image class="cam-logo" data-x="70" data-w="190" href="logo-fatran.png" x="70" y="52" width="190" height="39"/><image class="cam-logo" data-x="406.9" data-w="54.0" href="logo-fatran.png" x="406.9" y="119.2" width="54.0" height="11.1"/></svg>` + '<div class="he-sombra"></div></div>';
  const tr = est.querySelector(".he-truck"), corpo = est.querySelector(".cam-corpo"), logos = [...est.querySelectorAll(".cam-logo")], rodas = [...est.querySelectorAll(".roda")];
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let x = 0, dir = 1, pausa = 0, ang = 0, t0 = performance.now(), ultimoFlash = 0, frenteAnt = null;
  const radar = est.querySelector(".he-radar"), cam = est.querySelector(".he-cam"), placar = est.querySelector(".he-placar"), vel = est.querySelector(".he-vel"), fants = [...est.querySelectorAll(".he-fant")];
  const reinicia = (el, c) => { el.classList.remove(c); void el.getBoundingClientRect(); el.classList.add(c); };
  function flagrante() { // o radar fotografa: flash, câmera e velocidade absurda (brincadeira)
    const alvo = 1800 + Math.floor(Math.random() * 1200); let i = 0;
    fants.forEach((f) => { f.textContent = String(alvo); });
    reinicia(radar, "flash"); reinicia(cam, "foto"); reinicia(placar, "ver");
    const cont = setInterval(() => { i++; vel.textContent = String(Math.round(alvo * Math.min(1, i / 10))).padStart(4, "0"); if (i >= 10) clearInterval(cont); }, 45);
  }
  const virar = () => { // virado para a esquerda: o corpo espelha, as logos mudam de lugar mas continuam legíveis
    if (dir > 0) corpo.removeAttribute("transform"); else corpo.setAttribute("transform", "translate(520 0) scale(-1 1)");
    logos.forEach((l) => { const x = +l.dataset.x, w = +l.dataset.w; l.setAttribute("x", dir > 0 ? x : 520 - x - w); });
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
        const v = 100 * freio * arranque; x += dir * v * dt; ang += dir * v * dt / 20 * 57.3;
        if (dir > 0 && x >= max - 0.5) { x = max; pausa = 1.4; dir = -1; virar(); }
        else if (dir < 0 && x <= 0.5) { x = 0; pausa = 1.4; dir = 1; virar(); }
      }
    }
    const bob = !reduz && pausa <= 0 ? Math.sin(t / 90) * 0.7 : 0;
    const rx = est.clientWidth * 0.58 + 36, frente = x + w * (dir > 0 ? 0.97 : 0.03); // posição do radar e da frente do caminhão
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
