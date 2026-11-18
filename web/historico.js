// Importar o HISTÓRICO da planilha (.xlsx baixado do Google Sheets). Só quem gerencia usuários.
// O arquivo é lido AQUI, no navegador; o servidor só acrescenta os dias que o sistema ainda não tem.
// Depende de app.js (h, modal, toast, S, sb, traduzErro, dataBR, desenharEstrutura).

async function chamarHist(corpo) {
  const { data, error } = await sb.functions.invoke("importar-historico", { body: corpo });
  if (error) {
    let msg = error.message || "Falha ao falar com o servidor.";
    try { const j = await error.context.json(); if (j && j.erro) msg = j.erro; } catch (e) { /* sem corpo */ }
    return { erro: msg };
  }
  return data || {};
}

const URL_XLSX = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const semAcento = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Lê todas as abas: acha a coluna "Placa" nas primeiras linhas e pega 23 colunas a partir dela.
function lerAbasXlsx(arquivoBytes) {
  const wb = XLSX.read(arquivoBytes, { type: "array" });
  return wb.SheetNames.map((nome) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: null });
    let hi = -1, pc = -1;
    for (let i = 0; i < Math.min(6, rows.length) && hi < 0; i++) (rows[i] || []).forEach((c, j) => { if (hi < 0 && semAcento(c) === "placa") { hi = i; pc = j; } });
    if (hi < 0) return { nome, linhas: [] };
    const linhas = [];
    for (const r of rows.slice(hi + 1)) {
      const l = (r || []).slice(pc, pc + 23);
      while (l.length < 23) l.push(null);
      if (l[0] != null && String(l[0]).trim()) linhas.push(l);
    }
    return { nome, linhas };
  });
}

async function modalHistorico() {
  const corpo = h("div");
  const mo = modal("Importar histórico da planilha", corpo);
  let abas = null, sim = null;

  const entrada = h("input", { type: "file", accept: ".xlsx,.xlsm", onchange: ler });
  const area = h("div", { style: "margin-top:12px" });
  corpo.append(
    h("p", { class: "hint" }, "No Google Sheets: Arquivo > Fazer download > Microsoft Excel (.xlsx). Escolha o arquivo abaixo. Cada aba com nome de data vira um dia no sistema."),
    h("p", { class: "hint" }, "Só são acrescentados os dias que o sistema ainda não tem. Nenhum dia existente é alterado ou apagado, e a planilha original não é tocada."),
    entrada, area);

  async function ler() {
    const f = entrada.files && entrada.files[0];
    if (!f) return;
    area.replaceChildren(h("p", { class: "hint" }, "Lendo o arquivo…"));
    try {
      await carregarScript(URL_XLSX);
      abas = lerAbasXlsx(new Uint8Array(await f.arrayBuffer()));
    } catch (e) { area.replaceChildren(h("div", { class: "err" }, "Não consegui ler esse arquivo. Use o .xlsx baixado do Google Sheets.")); return; }
    area.replaceChildren(h("p", { class: "hint" }, "Conferindo com o que o sistema já tem…"));
    const r = await chamarHist({ acao: "simular", abas });
    if (r.erro) { area.replaceChildren(h("div", { class: "err" }, r.erro)); return; }
    sim = r; mostrar();
  }

  function mostrar() {
    if (!sim.dias_novos) {
      area.replaceChildren(h("p", {}, "Nada novo para importar: todos os dias dessa planilha já estão no sistema."),
        sim.dias_que_ja_existem ? h("p", { class: "hint" }, sim.dias_que_ja_existem + " dia(s) já existem e não foram mexidos.") : null);
      return;
    }
    const nomes = [...(S.motoristasTodos || [])];
    const linhasMot = sim.motoristas.map((m) => {
      const sel = h("select", { "data-nome": m.nome },
        h("option", { value: "" }, "Cadastrar como novo (" + (m.nome_novo || m.nome) + ")"),
        nomes.map((x) => h("option", { value: x.id }, x.nome)));
      sel.value = m.id != null ? String(m.id) : "";
      return h("tr", { class: m.motivo === "igual" ? "" : "semdono" }, h("td", {}, m.nome), h("td", {}, sel));
    });
    const confere = sim.motoristas.filter((m) => m.motivo !== "igual").length;
    area.replaceChildren(
      h("div", { class: "wa-ok" }, h("b", {}, sim.dias_novos + " dias novos"), " (de " + dataBR(sim.primeiro) + " a " + dataBR(sim.ultimo) + "), " + sim.linhas + " linhas de veículo."),
      sim.dias_que_ja_existem ? h("p", { class: "hint" }, sim.dias_que_ja_existem + " dia(s) dessa planilha já existem no sistema e não serão mexidos.") : null,
      sim.abas_ignoradas.length ? h("p", { class: "hint" }, "Abas ignoradas (o nome não é uma data): " + sim.abas_ignoradas.map((a) => a.nome).join(", ") + ".") : null,
      sim.abas_duplicadas.length ? h("p", { class: "hint" }, "Dia repetido em duas abas (valeu a com mais veículos): " + sim.abas_duplicadas.join("; ") + ".") : null,
      sim.linhas_sem_status ? h("p", { class: "hint" }, sim.linhas_sem_status + " linha(s) sem status foram puladas.") : null,
      sim.veiculos_novos.length ? h("p", { class: "hint" }, "Veículos que não estão no cadastro entram como inativos, só para o histórico: " + sim.veiculos_novos.join(", ") + ".") : null,
      h("h3", { style: "margin:14px 0 4px" }, "Motoristas"),
      h("p", { class: "hint" }, confere ? "Confira os destacados: o nome da planilha foi ligado ao motorista mais parecido. Se for outra pessoa, troque. \"Cadastrar como novo\" cria um motorista inativo, só para o histórico." : "Todos os nomes batem com motoristas já cadastrados."),
      h("div", { class: "doc-rolagem", style: "max-height:260px;overflow:auto" }, h("table", { class: "doc-t" }, h("thead", {}, h("tr", {}, h("th", {}, "Na planilha"), h("th", {}, "Será gravado como"))), h("tbody", {}, linhasMot))),
      h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "pri", onclick: importar }, "Importar " + sim.dias_novos + " dias")));
  }

  async function importar(ev) {
    const btn = ev.currentTarget; btn.disabled = true; btn.textContent = "Importando… não feche esta janela";
    const motoristas = {};
    area.querySelectorAll("select[data-nome]").forEach((s) => { motoristas[s.getAttribute("data-nome")] = s.value ? Number(s.value) : null; });
    const r = await chamarHist({ acao: "importar", abas, motoristas });
    if (r.erro) { btn.disabled = false; btn.textContent = "Tentar de novo"; area.prepend(h("div", { class: "err" }, r.erro + (r.dias ? " (já gravados: " + r.dias + " dias; pode tentar de novo, o que já entrou não duplica)" : ""))); return; }
    const dl = await sb.from("prog_dias").select("dia").order("dia", { ascending: false }).limit(800);
    S.diasLista = (dl.data || []).map((x) => x.dia);
    desenharEstrutura(); await carregar();
    mo.fechar();
    toast("Histórico importado: " + r.dias + " dias, " + r.linhas + " linhas (" + dataBR(r.primeiro) + " a " + dataBR(r.ultimo) + ").");
  }

  // lista de motoristas (inclui inativos) para as escolhas
  const { data } = await sb.from("prog_motoristas").select("id,nome").order("nome");
  S.motoristasTodos = data || [];
}
