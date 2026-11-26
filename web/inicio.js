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
  musica: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  musica_off: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/>',
  casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
};

let inicioSel = null;

// Tema claro/escuro: o sistema SEMPRE abre no claro (não guarda a escolha); o botão alterna só durante o uso.
function temaEscuro() { return false; }
function iconeTema(b) { Object.assign(ICONES, ICONES_INICIO); b.replaceChildren(ic(temaEscuro() ? "sol" : "lua")); const t = temaEscuro() ? "Mudar para o tema claro" : "Mudar para o tema escuro"; b.title = t; b.setAttribute("aria-label", t); }
// O sistema é sempre no tema claro (sem opção de tema escuro).
function botaoTema() { return null; }


// Música de fundo de Natal: melodias tradicionais (domínio público) sintetizadas aqui mesmo, em timbre de caixinha de música, bem baixinha.
// Navegadores só liberam áudio depois de um toque; por isso há um botão, e a escolha fica salva neste aparelho.
const MUSICA = (() => {
  const JB = [[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[76,1],[74,1],[74,1],[76,1],[74,2],[79,2]];
  const WW = [[67,1],[72,1],[72,.5],[74,.5],[72,.5],[71,.5],[69,1],[69,1],[69,1],[74,1],[74,.5],[76,.5],[74,.5],[72,.5],[71,1],[67,1],[67,1],[76,1],[76,.5],[77,.5],[76,.5],[74,.5],[72,1],[69,1],[67,.5],[67,.5],[69,1],[74,1],[71,1],[72,3]];
  const BAIXO = { 72: 48, 71: 43, 69: 45, 67: 43, 74: 43, 76: 48, 77: 41, 79: 48 };
  let ctx = null, mestre = null, ligada = false, timer = null, prox = 0, parte = 0;
  const ler = () => { try { return localStorage.getItem("fatran_musica") === "1"; } catch (e) { return false; } };
  const gravar = (v) => { try { localStorage.setItem("fatran_musica", v ? "1" : "0"); } catch (e) { /* sem armazenamento */ } };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function nota(m, t, dur, vol) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.5, dur * 1.8));
    [[1, 1], [2, 0.18], [3.01, 0.07]].forEach(([mul, a]) => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(m) * mul; const ga = ctx.createGain(); ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(t); o.stop(t + Math.max(0.5, dur * 1.8) + 0.05); });
    g.connect(mestre);
  }
  function agenda() {
    if (!ligada) return;
    const bpm = 112, b = 60 / bpm;
    while (prox < ctx.currentTime + 1.2) {
      const mel = parte % 2 === 0 ? JB : WW;
      let t = prox, beats = 0;
      mel.forEach(([m, d]) => { nota(m, t, d * b, 0.5); if (beats % 2 === 0) nota(BAIXO[m] || 43, t, d * b, 0.22); t += d * b; beats += d; });
      prox = t + 2.5 * b; parte++; // pausa curta entre as músicas
    }
    timer = setTimeout(agenda, 400);
  }
  function ligar() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    if (!ctx) {
      ctx = new AC(); mestre = ctx.createGain(); mestre.gain.value = 0.06; // volume bem baixo
      const eco = ctx.createDelay(); eco.delayTime.value = 0.28; const fb = ctx.createGain(); fb.gain.value = 0.35; mestre.connect(eco); eco.connect(fb); fb.connect(eco);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200; mestre.connect(lp); eco.connect(lp); lp.connect(ctx.destination);
    }
    ctx.resume(); ligada = true; prox = ctx.currentTime + 0.2; agenda(); return true;
  }
  function desligar() { ligada = false; clearTimeout(timer); if (ctx) ctx.suspend(); }
  const icone = (b) => { Object.assign(ICONES, ICONES_INICIO); b.replaceChildren(ic(ligada ? "musica" : "musica_off")); const t = ligada ? "Desligar a música de Natal" : "Ligar a música de Natal"; b.title = t; b.setAttribute("aria-label", t); b.setAttribute("aria-pressed", String(ligada)); };
  return {
    botao() {
      const b = h("button", { type: "button", class: "btn-tema btn-musica" });
      b.onclick = () => { if (ligada) { desligar(); gravar(false); } else { if (ligar()) gravar(true); } icone(b); };
      icone(b);
      if (ler()) { // preferência salva: começa no primeiro toque/tecla na página (exigência do navegador)
        const iniciar = () => { removeEventListener("pointerdown", iniciar, true); removeEventListener("keydown", iniciar, true); if (!ligada && b.isConnected && ler() && ligar()) icone(b); };
        addEventListener("pointerdown", iniciar, true); addEventListener("keydown", iniciar, true);
      }
      return b;
    },
    parar() { if (ligada) { desligar(); } },
  };
})();

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

// Neve do tema de Natal: flocos caindo em profundidades diferentes, rajadas de vento e montinhos na beira da estrada
function nevar(pag) {
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cam = h("div", { class: "hub-neve", "aria-hidden": "true" });
  const rnd = (a, b) => a + Math.random() * (b - a);
  const flocos = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9"], bolas = ["b7", "b8", "b9"];
  const n = Math.round(Math.max(22, Math.min(70, window.innerWidth / 26)));
  for (let i = 0; i < n; i++) {
    const prof = Math.random(); // 0 = longe (pequeno, lento, apagado) ... 1 = perto (grande, rápido)
    const bola = Math.random() < 0.14;
    const src = "neve-" + (bola ? bolas[i % bolas.length] : flocos[Math.floor(Math.random() * flocos.length)]) + ".png";
    const tam = bola ? rnd(8, 22) : 12 + prof * 38;
    const dur = rnd(13, 22) - prof * 7;
    const fio = h("span", { class: "nv-fio", style: "left:" + rnd(-3, 100).toFixed(1) + "%;animation-duration:" + dur.toFixed(1) + "s;animation-delay:-" + rnd(0, dur).toFixed(1) + "s" },
      h("img", { src, alt: "", draggable: "false", style: "width:" + tam.toFixed(0) + "px;opacity:" + (0.4 + prof * 0.42).toFixed(2) + ";--sw:" + rnd(14, 46).toFixed(0) + "px;--r0:" + rnd(-40, 40).toFixed(0) + "deg;--r1:" + rnd(-200, 200).toFixed(0) + "deg;animation-duration:" + rnd(3.5, 7).toFixed(1) + "s;animation-delay:-" + rnd(0, 6).toFixed(1) + "s" }));
    cam.append(fio);
  }
  pag.append(cam);
  // rajadas de vento que cruzam a tela de vez em quando
  if (!reduz) {
    let id = 0;
    const vento = () => {
      if (!cam.isConnected || S.tela !== "inicio") return;
      const alt = cam.clientHeight || window.innerHeight, v = h("img", { class: "nv-vento", alt: "", draggable: "false", src: "neve-w" + (1 + (id++ % 6)) + ".png",
        style: "top:" + rnd(8, 62).toFixed(0) + "%;width:" + rnd(200, 340).toFixed(0) + "px;animation-duration:" + rnd(5, 8).toFixed(1) + "s" });
      cam.append(v); setTimeout(() => v.remove(), 9000);
      setTimeout(vento, rnd(9000, 17000));
    };
    setTimeout(vento, 2500);
  }
}
// montinhos de neve sobre a beira da estrada (ficam atrás do caminhão e do radar)
function neveEstrada(est) {
  const mons = h("div", { class: "he-montes" });
  const N = Math.max(5, Math.round(est.clientWidth / 240)), ids = [1, 2, 3, 4, 5, 7];
  for (let i = 0; i < N; i++) {
    const w = 70 + Math.random() * 110;
    mons.append(h("img", { src: "neve-m" + ids[Math.floor(Math.random() * ids.length)] + ".png", alt: "", draggable: "false", style: "left:" + ((i + Math.random() * 0.7) / N * 100).toFixed(1) + "%;width:" + w.toFixed(0) + "px" }));
  }
  est.insertBefore(mons, est.firstChild.nextSibling); // logo depois do chão
}

function estradaCaminhao() {
  const natal = temaNatal();
  const est = h("div", { class: "hub-estrada" + (natal ? " natal" : ""), "aria-hidden": "true" });
  est.innerHTML = '<div class="he-chao"></div>' + `` + (natal ? `<div class="he-radar"><div class="he-sway"><div class="he-r1"></div><i class="lz" style="left:54.9%;top:77.5%;animation-delay:0.00s"></i><i class="lz" style="left:46.9%;top:82.8%;animation-delay:0.37s"></i><i class="lz" style="left:36.3%;top:81.4%;animation-delay:0.74s"></i><i class="lz" style="left:31.2%;top:74.3%;animation-delay:1.11s"></i><i class="lz" style="left:35.4%;top:66.9%;animation-delay:1.48s"></i><i class="lz" style="left:45.7%;top:64.7%;animation-delay:0.25s"></i><i class="lz" style="left:54.4%;top:69.4%;animation-delay:0.62s"></i><img class="he-r2" src="natal-radar-flash.png" alt=""></div></div><div class="he-placar"><div class="pl-bg"></div><div class="pl-bg pl-b"></div><div class="pl-bg pl-c"></div><span class="he-n">80</span><i class="he-u">KM/H</i><span class="he-g g1">80</span><span class="he-g g2">80</span></div>` : `<div class="he-radar"><img class="he-r1" src="radar-1.png" alt=""><img class="he-r2" src="radar-2.png" alt=""></div><div class="he-placar"><img src="placar-vazio-verde.png" alt=""><span class="he-n">80</span><i class="he-u">KM/H</i><span class="he-g g1">80</span><span class="he-g g2">80</span></div>`) + `` + '<div class="he-truck">' + `<svg viewBox="0 0 1240 420" aria-label="Carreta sider da Fatran"><image class="cam-img" href="carreta-dir.png" x="0" y="0" width="1240" height="420"/><g class="rodaw" data-x="205" transform="translate(205 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="319" transform="translate(319 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="434" transform="translate(434 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="741" transform="translate(741 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="868" transform="translate(868 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g><g class="rodaw" data-x="1080" transform="translate(1080 364)"><g class="roda"><circle r="28.5" fill="#a9b4bb"/><circle r="26" fill="#9ea9b1"/><circle r="24" fill="#a9b4bb"/><circle cx="21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="0.0" cy="21.5" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="15.2" r="3.4" fill="#1c2b38"/><circle cx="-21.5" cy="0.0" r="3.4" fill="#1c2b38"/><circle cx="-15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle cx="-0.0" cy="-21.5" r="3.4" fill="#1c2b38"/><circle cx="15.2" cy="-15.2" r="3.4" fill="#1c2b38"/><circle r="14" fill="#1a2a39"/></g></g></svg>` + (natal ? '<div class="he-touca"></div>' : '') + '<div class="he-sombra"></div></div>';
  if (natal) neveEstrada(est);
  const tr = est.querySelector(".he-truck"), img = est.querySelector(".cam-img"), rodasw = [...est.querySelectorAll(".rodaw")], rodas = [...est.querySelectorAll(".roda")];
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let x = -400, escAnt = 0, dir = 1, pausa = 0, ang = 0, t0 = performance.now(), ultimoFlash = 0, frenteAnt = null;
  const radar = est.querySelector(".he-radar"), placar = est.querySelector(".he-placar");
  const SEQ = [80, 100, 80, 200]; let k = 0; // alterna: 80 (verde, tudo certo), 100 (vermelho), 80, 200 (vermelho)
  const reinicia = (el, c) => { el.classList.remove(c); void el.getBoundingClientRect(); el.classList.add(c); };
  const pImg = placar.querySelector("img"), pN = placar.querySelector(".he-n"), pG = [...placar.querySelectorAll(".he-g")];
  let contagem = null;
  function flagrante() {
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
    const cw = est.clientWidth, esc = Math.max(0.85, Math.min(2.4, cw / 1100)); // a cena escala com a largura (zoom do navegador / TV grande)
    if (esc !== escAnt) { escAnt = esc; est.style.setProperty("--s", esc.toFixed(3)); }
    const w = Math.round(270 * esc); tr.style.width = w + "px";
    if (!reduz) {
      if (pausa > 0) pausa -= dt;
      else {
        const v = Math.max(110, cw / 9) * (x < 0 ? 1 : Math.min(1, x / 60 + 0.35)); // mesma duração de travessia em qualquer tela
        x += v * dt; ang += v * dt / (51 * w / 1240) * 57.3;
        if (x >= cw + 20) { x = -w - 20; pausa = 1.2; frenteAnt = null; } // sai da tela pela direita e volta pela esquerda, sempre de frente
      }
    } else x = Math.max(0, (cw - w) / 2);
    const bob = !reduz && pausa <= 0 ? Math.sin(t / 90) * 0.7 * esc : 0;
    const rx = cw * 0.58 + 36 * esc, frente = x + w * 0.98; // posição do radar e da frente do caminhão
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
      h("div", { class: "hub-quem" }, temaNatal() ? MUSICA.botao() : null, botaoTema(), h("span", {}, S.perfil.nome + " (" + S.perfil.papel + ")"),
        h("button", { type: "button", onclick: async () => { await sb.auth.signOut(); location.reload(); } }, "Sair"))),
    dica, palco, legenda,
    estradaCaminhao(),
    rodapeFatran());
  if (temaNatal()) nevar(pag);
  $app.replaceChildren(pag);
  layout();
  requestAnimationFrame(() => requestAnimationFrame(() => pag.classList.add("pronto"))); // só anima depois da 1ª posição calculada
  if (!window.__hubResize) { window.__hubResize = true; window.addEventListener("resize", () => { if (S.tela === "inicio") { const p = document.querySelector(".hub-palco"); if (p) mostrarInicioLayout(); } }); }
  window.__hubLayout = layout;
}
function mostrarInicioLayout() { if (window.__hubLayout) window.__hubLayout(); }

// Abre o módulo escolhido. Os módulos usam o quadro como base (dados e permissões já carregados).
async function abrirModulo(id) {
  MUSICA.parar();
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
