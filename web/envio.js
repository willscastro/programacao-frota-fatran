// Tela própria de "Envio de documentos": serve para quem só precisa mandar dados e documentos
// de um veículo/motorista, sem abrir o quadro da programação. Reaproveita abrirEnvio() de docs.js.
let envioRows = [];

async function telaEnvioDocs() {
  S.tela = "docs";
  Object.assign(ICONES, { busca: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', ok: '<path d="M20 6 9 17l-5-5"/>' });
  const busca = h("input", { type: "search", placeholder: "Buscar placa ou motorista…", autocomplete: "off", "aria-label": "Buscar placa ou motorista", oninput: desenhar });
  const lista = h("div", { class: "ed-lista" }, h("p", { class: "hint" }, "Carregando…"));
  const contagem = h("span", { class: "ed-cont" });
  const gerenciar = can("programacao.editar")
    ? h("button", { type: "button", title: "Importar, trocar e apagar documentos cadastrados", onclick: async () => { await modalDocumentos(); } }, ic("anexo"), " Gerenciar documentos") : null;
  const atualizar = h("button", { type: "button", title: "Buscar os dados de novo", onclick: () => carregarDados(true) }, ic("atualizar"));
  $app.replaceChildren(h("div", { class: "ed" },
    h("div", { class: "hub-topo" },
      h("div", { class: "ed-esq" }, h("img", { src: "logo-fatran.png", alt: "Fatran" }), h("button", { type: "button", class: "btn-inicio", onclick: voltarInicio }, ic("casa"), " Início")),
      h("div", { class: "hub-quem" }, h("span", {}, S.perfil.nome + " (" + S.perfil.papel + ")"), h("button", { type: "button", onclick: async () => { await sb.auth.signOut(); location.reload(); } }, "Sair"))),
    h("main", { class: "ed-corpo" },
      h("div", { class: "ed-titulo" }, h("span", { class: "ed-sel" }, ic("m_docs")),
        h("div", {}, h("h1", {}, "Envio de documentos"), h("p", {}, "Escolha o veículo e mande os dados do motorista, do caminhão e os documentos por WhatsApp."))),
      h("div", { class: "ed-barra" }, h("label", { class: "ed-busca" }, ic("busca"), busca), contagem, atualizar, gerenciar),
      lista),
    rodapeFatran()));

  function chip(ok, texto) { return h("span", { class: "ed-chip " + (ok ? "ok" : "falta"), title: ok ? "Cadastrado" : "Não cadastrado" }, ic(ok ? "ok" : "alerta"), " " + texto); }
  function cartao(r) {
    const docs = S.docs || [];
    const tem = (tipo, f) => docs.some((d) => d.tipo === tipo && f(d));
    return h("article", { class: "ed-card" },
      h("div", { class: "ed-placa" }, h("b", {}, r.placa_cavalo), r.placa_implemento ? h("span", {}, " / " + r.placa_implemento) : null),
      h("div", { class: "ed-mot" }, r.motorista || "Sem motorista no quadro"),
      h("div", { class: "ed-st" }, [r.tipo, r.status].filter(Boolean).join(" · ")),
      h("div", { class: "ed-chips" },
        r.motorista_id != null ? chip(tem("CNH", (d) => d.motorista_id === r.motorista_id), "CNH") : null,
        chip(tem("CRLV", (d) => d.placa === r.placa_cavalo), "CRLV cavalo"),
        r.placa_implemento ? chip(tem("CRLV", (d) => d.placa === r.placa_implemento), "CRLV carreta") : null),
      h("button", { type: "button", class: "ed-enviar", onclick: () => abrirEnvio(r) }, ic("enviar"), " Enviar dados"));
  }
  function desenhar() {
    const q = nz(busca.value).trim();
    const vis = envioRows.filter((r) => !q || nz([r.placa_cavalo, r.placa_implemento, r.motorista].join(" ")).includes(q));
    contagem.textContent = vis.length + (vis.length === 1 ? " veículo" : " veículos") + " na programação de hoje";
    lista.replaceChildren(...(vis.length ? vis.map(cartao) : [h("p", { class: "hint" }, envioRows.length ? "Nenhum veículo encontrado para essa busca." : "Não há veículos na programação de hoje.")]));
  }
  async function carregarDados(aviso) {
    const [mo, rows] = await Promise.all([
      sb.from("prog_motoristas").select("id,nome,ativo").order("nome"),
      sb.from("prog_programacao_v").select("*").eq("dia", S.hoje).order("ordem").order("placa_cavalo"),
      recarregarDocs(),
    ]);
    if (rows.error) { lista.replaceChildren(h("div", { class: "err" }, traduzErro(rows.error))); return; }
    S.motoristas = mo.data || S.motoristas || [];
    envioRows = rows.data || [];
    desenhar();
    if (aviso) toast("Dados atualizados.");
  }
  await carregarDados(false);
  busca.focus();
}
