// Tela própria de "Indicadores": para quem só quer ver os números, sem abrir o quadro da programação.
// Reaproveita abrirPainel() de app.js, desenhando dentro da página em vez de numa janela.
async function telaIndicadores() {
  S.tela = "indicadores"; S.dia = S.hoje;
  Object.assign(ICONES, { casa: ICONES.casa });
  const host = h("div", { class: "ed-painel" }, h("p", { class: "hint" }, "Carregando…"));
  $app.replaceChildren(h("div", { class: "ed" },
    h("div", { class: "hub-topo" },
      h("div", { class: "ed-esq" }, h("img", { src: "logo-fatran.png", alt: "Fatran" }), h("button", { type: "button", class: "btn-inicio", onclick: voltarInicio }, ic("casa"), " Início")),
      h("div", { class: "hub-quem" }, h("span", {}, S.perfil.nome + " (" + S.perfil.papel + ")"), h("button", { type: "button", onclick: async () => { await sb.auth.signOut(); location.reload(); } }, "Sair"))),
    h("main", { class: "ed-corpo" },
      h("div", { class: "ed-titulo" }, h("span", { class: "ed-sel" }, ic("m_painel")),
        h("div", {}, h("h1", {}, "Indicadores"), h("p", {}, "Situação da frota hoje, esperas, manutenção e cargas por período."))),
      host),
    h("div", { class: "hub-rodape" }, h("span", {}, "Fatran Transportes"), h("span", {}, "fatranlog.com.br"))));
  const [st, rows, cfg] = await Promise.all([
    sb.from("prog_status").select("*").order("ordem"),
    sb.from("prog_programacao_v").select("*").eq("dia", S.dia).order("ordem").order("placa_cavalo"),
    sb.from("prog_config").select("valor").eq("chave", "custo_dia_parado").maybeSingle(),
  ]);
  if (st.error || rows.error) { host.replaceChildren(h("div", { class: "err" }, traduzErro(st.error || rows.error))); return; }
  S.status = st.data || []; S.rows = rows.data || [];
  if (cfg && cfg.data && cfg.data.valor != null) S.custoDia = Number(cfg.data.valor);
  await abrirPainel(host);
}
