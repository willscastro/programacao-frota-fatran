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
<div class="he-placar"><b class="he-vel">100</b><i>KM/H</i><span class="he-fant">200</span><span class="he-fant f2">200</span></div>` + '<div class="he-truck">' + `<svg viewBox="0 0 615 207" aria-label="Carreta sider da Fatran"><g class="cam-corpo"><polygon points="335.0,152.5 470.0,152.5 470.0,182.5 335.0,182.5" fill="#12263A"/><polygon points="72.5,143.5 315.0,143.5 315.0,162.5 72.5,162.5" fill="#12263A"/><rect x="250.0" y="155.0" width="60.0" height="22.5" fill="#a3b0bb"/><rect x="250.0" y="175.0" width="60.0" height="5.0" fill="#c6d0d8"/><path d="M310.0 162.5v25.0" stroke="#12263A" stroke-width="3"/><polygon points="2.5,142.5 21.0,142.5 15.0,181.5 2.0,181.5" fill="#12263A"/><rect x="27.5" y="158.5" width="39.0" height="16.0" rx="3" fill="#12263A"/><rect x="2.0" y="145.5" width="4.5" height="10.0" fill="#f28c28"/><rect x="1.0" y="0.5" width="465.0" height="8.0" fill="#a3b0bb"/><g fill="#7d8b97"><circle cx="20.0" cy="4.5" r="1.1"/><circle cx="49.0" cy="4.5" r="1.1"/><circle cx="78.0" cy="4.5" r="1.1"/><circle cx="107.0" cy="4.5" r="1.1"/><circle cx="136.0" cy="4.5" r="1.1"/><circle cx="165.0" cy="4.5" r="1.1"/><circle cx="194.0" cy="4.5" r="1.1"/><circle cx="223.0" cy="4.5" r="1.1"/><circle cx="252.0" cy="4.5" r="1.1"/><circle cx="281.0" cy="4.5" r="1.1"/><circle cx="310.0" cy="4.5" r="1.1"/><circle cx="339.0" cy="4.5" r="1.1"/><circle cx="368.0" cy="4.5" r="1.1"/><circle cx="397.0" cy="4.5" r="1.1"/><circle cx="426.0" cy="4.5" r="1.1"/><circle cx="455.0" cy="4.5" r="1.1"/></g><rect x="11.0" y="7.5" width="453.0" height="135.0" rx="4" fill="var(--sider)"/><rect x="11.0" y="7.5" width="5.0" height="135.0" fill="#0F6DB5"/><rect x="452.5" y="7.5" width="11.5" height="135.0" fill="#0F6DB5"/><path d="M22.5 29.5v-11.0h11.0" fill="none" stroke="#a3b0bb" stroke-width="1.6"/><path d="M441.0 29.5v-11.0h-11.0" fill="none" stroke="#a3b0bb" stroke-width="1.6"/><rect x="27.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="56.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="86.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="116.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="137.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="166.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="196.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="226.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="259.0" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="288.0" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="317.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="347.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="377.0" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="406.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="436.5" y="117.5" width="2.6" height="17.0" fill="#12263A"/><rect x="11.0" y="132.5" width="446.5" height="9.0" fill="#0F6DB5"/><g fill="#e4572e"><rect x="40.0" y="136.0" width="10.0" height="3.0"/><rect x="70.0" y="136.0" width="10.0" height="3.0"/><rect x="100.0" y="136.0" width="10.0" height="3.0"/><rect x="130.0" y="136.0" width="10.0" height="3.0"/><rect x="160.0" y="136.0" width="10.0" height="3.0"/><rect x="190.0" y="136.0" width="10.0" height="3.0"/><rect x="220.0" y="136.0" width="10.0" height="3.0"/><rect x="250.0" y="136.0" width="10.0" height="3.0"/><rect x="280.0" y="136.0" width="10.0" height="3.0"/><rect x="310.0" y="136.0" width="10.0" height="3.0"/><rect x="340.0" y="136.0" width="10.0" height="3.0"/><rect x="370.0" y="136.0" width="10.0" height="3.0"/><rect x="400.0" y="136.0" width="10.0" height="3.0"/><rect x="430.0" y="136.0" width="10.0" height="3.0"/></g><rect x="11.0" y="141.5" width="446.5" height="5.0" fill="#12263A"/><g class="roda"><circle cx="100.0" cy="181.5" r="25.0" fill="#0b141d"/><circle cx="100.0" cy="181.5" r="15.5" fill="#a3b0bb"/><circle cx="100.0" cy="181.5" r="10.5" fill="#1b2a38"/><circle cx="100.0" cy="181.5" r="5.0" fill="#a3b0bb"/><circle cx="112.5" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="108.8" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="100.0" cy="194.0" r="1.7" fill="#1b2a38"/><circle cx="91.2" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="87.5" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="91.2" cy="172.7" r="1.7" fill="#1b2a38"/><circle cx="100.0" cy="169.0" r="1.7" fill="#1b2a38"/><circle cx="108.8" cy="172.7" r="1.7" fill="#1b2a38"/></g><g class="roda"><circle cx="157.5" cy="181.5" r="25.0" fill="#0b141d"/><circle cx="157.5" cy="181.5" r="15.5" fill="#a3b0bb"/><circle cx="157.5" cy="181.5" r="10.5" fill="#1b2a38"/><circle cx="157.5" cy="181.5" r="5.0" fill="#a3b0bb"/><circle cx="170.0" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="166.3" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="157.5" cy="194.0" r="1.7" fill="#1b2a38"/><circle cx="148.7" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="145.0" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="148.7" cy="172.7" r="1.7" fill="#1b2a38"/><circle cx="157.5" cy="169.0" r="1.7" fill="#1b2a38"/><circle cx="166.3" cy="172.7" r="1.7" fill="#1b2a38"/></g><g class="roda"><circle cx="215.0" cy="181.5" r="25.0" fill="#0b141d"/><circle cx="215.0" cy="181.5" r="15.5" fill="#a3b0bb"/><circle cx="215.0" cy="181.5" r="10.5" fill="#1b2a38"/><circle cx="215.0" cy="181.5" r="5.0" fill="#a3b0bb"/><circle cx="227.5" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="223.8" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="215.0" cy="194.0" r="1.7" fill="#1b2a38"/><circle cx="206.2" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="202.5" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="206.2" cy="172.7" r="1.7" fill="#1b2a38"/><circle cx="215.0" cy="169.0" r="1.7" fill="#1b2a38"/><circle cx="223.8" cy="172.7" r="1.7" fill="#1b2a38"/></g><path d="M67.5 176.5 Q72.5 152.5 115.0 150.5 L205.0 150.5 Q245.0 153.5 249.0 162.5" fill="none" stroke="#a3b0bb" stroke-width="4" stroke-linecap="round"/><g class="roda"><circle cx="369.0" cy="181.5" r="25.0" fill="#0b141d"/><circle cx="369.0" cy="181.5" r="15.5" fill="#a3b0bb"/><circle cx="369.0" cy="181.5" r="10.5" fill="#1b2a38"/><circle cx="369.0" cy="181.5" r="5.0" fill="#a3b0bb"/><circle cx="381.5" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="377.8" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="369.0" cy="194.0" r="1.7" fill="#1b2a38"/><circle cx="360.2" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="356.5" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="360.2" cy="172.7" r="1.7" fill="#1b2a38"/><circle cx="369.0" cy="169.0" r="1.7" fill="#1b2a38"/><circle cx="377.8" cy="172.7" r="1.7" fill="#1b2a38"/></g><g class="roda"><circle cx="432.5" cy="181.5" r="25.0" fill="#0b141d"/><circle cx="432.5" cy="181.5" r="15.5" fill="#a3b0bb"/><circle cx="432.5" cy="181.5" r="10.5" fill="#1b2a38"/><circle cx="432.5" cy="181.5" r="5.0" fill="#a3b0bb"/><circle cx="445.0" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="441.3" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="432.5" cy="194.0" r="1.7" fill="#1b2a38"/><circle cx="423.7" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="420.0" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="423.7" cy="172.7" r="1.7" fill="#1b2a38"/><circle cx="432.5" cy="169.0" r="1.7" fill="#1b2a38"/><circle cx="441.3" cy="172.7" r="1.7" fill="#1b2a38"/></g><g class="roda"><circle cx="537.5" cy="181.5" r="25.0" fill="#0b141d"/><circle cx="537.5" cy="181.5" r="15.5" fill="#a3b0bb"/><circle cx="537.5" cy="181.5" r="10.5" fill="#1b2a38"/><circle cx="537.5" cy="181.5" r="5.0" fill="#a3b0bb"/><circle cx="550.0" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="546.3" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="537.5" cy="194.0" r="1.7" fill="#1b2a38"/><circle cx="528.7" cy="190.3" r="1.7" fill="#1b2a38"/><circle cx="525.0" cy="181.5" r="1.7" fill="#1b2a38"/><circle cx="528.7" cy="172.7" r="1.7" fill="#1b2a38"/><circle cx="537.5" cy="169.0" r="1.7" fill="#1b2a38"/><circle cx="546.3" cy="172.7" r="1.7" fill="#1b2a38"/></g><path d="M340.0 181.5 a29.0 29.0 0 0 1 58.0 0" fill="none" stroke="#12263A" stroke-width="4.5" stroke-linecap="round"/><path d="M403.5 181.5 a29.0 29.0 0 0 1 58.0 0" fill="none" stroke="#12263A" stroke-width="4.5" stroke-linecap="round"/><path d="M508.5 181.5 a29.0 29.0 0 0 1 58.0 0" fill="none" stroke="#12263A" stroke-width="4.5" stroke-linecap="round"/><rect x="467.5" y="162.5" width="35.0" height="25.0" fill="#a3b0bb"/><path d="M482.5 7.5 Q484.0 4.0 495.0 4.0 L520.0 7.5 L505.0 155.0 L483.0 152.5 Z" fill="#0F6DB5"/><path d="M504.0 152.5 L505.0 21.5 Q506.0 12.5 522.5 11.5 L560.0 11.0 Q590.0 13.5 599.0 42.5 L614.0 102.5 L615.0 145.0 L596.0 152.5 Z" fill="#ffffff" stroke="#dbe5ec" stroke-width="1"/><path d="M596.0 145.0h20.0v45.0h-20.0z" fill="#a3b0bb"/><rect x="606.0" y="158.5" width="5.0" height="11.0" fill="#fff"/><polygon points="500.0,142.5 596.0,142.5 596.0,177.5 500.0,177.5" fill="#a3b0bb" opacity=".95"/><polygon points="515.0,52.5 535.0,52.5 535.0,90.0 515.0,90.0" fill="#dfe9f1"/><line x1="537.5" y1="47.5" x2="537.5" y2="140.0" stroke="#c4d2dd" stroke-width="1.3"/><polygon points="544.0,54.5 590.0,54.5 591.0,93.5 545.0,93.5" fill="#9fd3f2" stroke="#12263A" stroke-width="2"/><rect x="575.0" y="60.0" width="11.0" height="33.0" rx="3" fill="#12263A"/><polygon points="594.0,55.0 605.0,55.0 612.0,98.5 599.0,95.0" fill="#9fd3f2" stroke="#12263A" stroke-width="2"/><rect x="586.5" y="43.5" width="20.0" height="12.0" rx="3" fill="#12263A"/><rect x="540.0" y="120.5" width="13.0" height="5.0" rx="2" fill="#12263A"/></g><image class="cam-logo" data-x="83.5" data-w="300.5" href="logo-fatran.png" x="83.5" y="35.5" width="300.5" height="62.0"/><image class="cam-logo" data-x="512.5" data-w="81.0" href="logo-fatran.png" x="512.5" y="101.5" width="81.0" height="16.5"/></svg>` + '<div class="he-sombra"></div></div>';
  const tr = est.querySelector(".he-truck"), corpo = est.querySelector(".cam-corpo"), logos = [...est.querySelectorAll(".cam-logo")], rodas = [...est.querySelectorAll(".roda")];
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let x = 0, dir = 1, pausa = 0, ang = 0, t0 = performance.now(), ultimoFlash = 0, frenteAnt = null;
  const radar = est.querySelector(".he-radar"), cam = est.querySelector(".he-cam"), placar = est.querySelector(".he-placar"), vel = est.querySelector(".he-vel"), fants = [...est.querySelectorAll(".he-fant")];
  const reinicia = (el, c) => { el.classList.remove(c); void el.getBoundingClientRect(); el.classList.add(c); };
  function flagrante() { // o radar fotografa: flash, câmera e velocidade absurda (brincadeira)
    const alvo = 200; let i = 0; // começa em 100 e sobe até 200 km/h
    vel.textContent = "100";
    fants.forEach((f) => { f.textContent = String(alvo); });
    reinicia(radar, "flash"); reinicia(cam, "foto"); reinicia(placar, "ver");
    const cont = setInterval(() => { i++; vel.textContent = String(Math.round(100 + (alvo - 100) * Math.min(1, i / 14))); if (i >= 14) clearInterval(cont); }, 45);
  }
  const virar = () => { // virado para a esquerda: o corpo espelha, as logos mudam de lugar mas continuam legíveis
    if (dir > 0) corpo.removeAttribute("transform"); else corpo.setAttribute("transform", "translate(615 0) scale(-1 1)");
    logos.forEach((l) => { const x = +l.dataset.x, w = +l.dataset.w; l.setAttribute("x", dir > 0 ? x : 615 - x - w); });
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
        const v = 100 * freio * arranque; x += dir * v * dt; ang += dir * v * dt / 25 * 57.3;
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
