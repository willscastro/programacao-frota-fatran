// Documentos de motoristas e veículos + botão "Mandar dados" (envio por WhatsApp).
// Depende das funções globais de app.js (h, ic, modal, toast, S, sb, can, traduzErro, dataBR, carregar).
// Os arquivos ficam num bucket PRIVADO do Supabase ("prog-docs"); o que sai para o WhatsApp são links
// assinados com validade de 7 dias, ou os próprios arquivos quando o aparelho permite compartilhar.

const BUCKET_DOCS = "prog-docs";
const TIPOS_DOC = {
  CRLV: "CRLV", CNH: "CNH", MOPP: "MOPP", INDIVISIVEL: "Carga indivisível", NR35: "NR-35",
  RESIDENCIA: "Comprovante de residência", ANTT: "Comprovante ANTT (RNTRC)",
};
const TIPOS_MOTORISTA = ["CNH", "RESIDENCIA", "MOPP", "INDIVISIVEL", "NR35"];
const COLUNAS_DOC = "id,tipo,placa,motorista_id,arquivo,nome_original,mime,validade,obs,criado_em";
const nz = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const hojeISO = () => S.hoje || new Date().toISOString().slice(0, 10);

function situacaoValidade(v) {
  if (!v) return null;
  const dias = Math.round((new Date(v + "T12:00:00") - new Date(hojeISO() + "T12:00:00")) / 86400000);
  if (dias < 0) return { cls: "r", txt: "vencido há " + -dias + " dia(s)" };
  if (dias <= 30) return { cls: "y", txt: "vence em " + dias + " dia(s)" };
  return { cls: "", txt: "válido até " + dataBR(v) };
}
const nomeMotorista = (id) => { const m = (S.motoristas || []).find((x) => x.id === id); return m ? m.nome : "Motorista " + id; };
const extDe = (nome) => (String(nome).split(".").pop() || "").toLowerCase();
const MIME = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
async function recarregarDocs() {
  const { data } = await sb.from("prog_documentos").select(COLUNAS_DOC).order("tipo");
  S.docs = data || [];
}

// ---------- botão "Mandar dados" ----------
function botaoMandar(r) {
  return h("div", { class: "mandar-lin", onclick: (e) => e.stopPropagation() },
    h("button", { type: "button", class: "mandar", title: "Envia motorista, placas e documentos por WhatsApp",
      onclick: (e) => { e.stopPropagation(); abrirEnvio(r); } }, ic("enviar"), " Mandar dados"));
}

function numeroWhats(txt) {
  let d = String(txt || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 15 ? d : null;
}
function recentesWhats() { try { return JSON.parse(localStorage.getItem("prog_wa_recentes") || "[]"); } catch (e) { return []; } }
function lembrarWhats(n) { try { localStorage.setItem("prog_wa_recentes", JSON.stringify([n, ...recentesWhats().filter((x) => x !== n)].slice(0, 8))); } catch (e) {} }
const fmtWhats = (n) => (n.startsWith("55") && n.length >= 12 ? "+55 " + n.slice(2, 4) + " " + n.slice(4) : "+" + n);

async function abrirEnvio(r) {
  const docs = S.docs || [];
  const mot = r.motorista_id != null ? r.motorista_id : null;
  const itens = [], faltando = [];
  const pegar = (grupo, tipo, filtro, rotulo, padrao) => {
    const lista = docs.filter((d) => d.tipo === tipo && filtro(d)).sort((a, b) => (extDe(b.arquivo) === "pdf") - (extDe(a.arquivo) === "pdf") || a.id - b.id);
    if (!lista.length) { faltando.push({ grupo, rotulo }); return; }
    // vários arquivos do mesmo tipo (ex.: CNH em PDF, frente e verso): só o primeiro, de preferência o PDF, vem marcado
    lista.forEach((d, i) => itens.push({ id: d.id, grupo, doc: d, padrao: padrao && i === 0,
      rotulo: rotulo + (lista.length > 1 ? " (" + String(d.nome_original || "arquivo " + (i + 1)).replace(/\.[^.]+$/, "").slice(0, 30) + ")" : "") }));
  };
  if (mot != null) TIPOS_MOTORISTA.forEach((t) => pegar("Motorista", t, (d) => d.motorista_id === mot, TIPOS_DOC[t], t === "CNH"));
  pegar("Caminhão", "CRLV", (d) => d.placa === r.placa_cavalo, "CRLV do cavalo " + r.placa_cavalo, true);
  if (r.placa_implemento) pegar("Caminhão", "CRLV", (d) => d.placa === r.placa_implemento, "CRLV da carreta " + r.placa_implemento, true);
  pegar("Empresa", "ANTT", () => true, TIPOS_DOC.ANTT, false);

  const corpo = h("div", {}, h("p", { class: "hint" }, "Preparando os links dos documentos…"));
  const mo = modal("Mandar dados", corpo);
  const sel = new Set(itens.filter((i) => i.padrao).map((i) => i.id));
  const urls = new Map();
  if (itens.length) {
    const caminhos = [...new Set(itens.map((i) => i.doc.arquivo))];
    const { data, error } = await sb.storage.from(BUCKET_DOCS).createSignedUrls(caminhos, 7 * 86400);
    if (error) { corpo.replaceChildren(h("div", { class: "err" }, traduzErro(error))); return; }
    (data || []).forEach((x) => { if (x.signedUrl) urls.set(x.path, x.signedUrl); });
  }
  const arquivosCache = new Map();
  const inpNum = h("input", { type: "tel", placeholder: "DDD + número, ex.: 28 99999-0000", list: "wa-recentes", autocomplete: "off" });
  const inpObs = h("input", { type: "text", placeholder: "Observação (opcional)", maxlength: 300 });
  const lista = h("datalist", { id: "wa-recentes" }, recentesWhats().map((n) => h("option", { value: n }, fmtWhats(n))));
  const previa = h("pre", { class: "wa-previa" });
  const marcados = () => itens.filter((i) => sel.has(i.id));

  function montarTexto(comLinks) {
    const L = ["*Fatran Transportes*"];
    if (r.motorista) L.push("Motorista: " + r.motorista);
    L.push("Cavalo: " + r.placa_cavalo);
    if (r.placa_implemento) L.push("Carreta: " + r.placa_implemento);
    if (inpObs.value.trim()) L.push("", inpObs.value.trim());
    const m = marcados();
    if (m.length) {
      L.push("", comLinks ? "Documentos (links válidos por 7 dias):" : "Documentos em anexo:");
      m.forEach((i) => {
        if (comLinks) L.push("", i.rotulo + ":", urls.get(i.doc.arquivo) || "(link indisponível)");
        else L.push("- " + i.rotulo);
      });
    }
    return L.join("\n").replace(/\n{3,}/g, "\n\n");
  }
  const atualizar = () => { previa.textContent = montarTexto(true).replace(/https?:\/\/\S+/g, "[link do documento]"); };
  async function registrar(destino, canal) {
    const { error } = await sb.from("prog_envios").insert({ conjunto_id: r.conjunto_id, motorista_id: mot, destino, canal, itens: marcados().map((i) => i.rotulo) });
    if (error) toast("O envio foi aberto, mas não consegui registrar no histórico: " + traduzErro(error));
  }
  const destinoValido = () => {
    const n = numeroWhats(inpNum.value);
    if (!n) toast("Informe o número com DDD (10 ou 11 dígitos).");
    return n;
  };
  const abrirWhats = async () => {
    const n = destinoValido(); if (!n) return;
    lembrarWhats(n);
    window.open("https://wa.me/" + n + "?text=" + encodeURIComponent(montarTexto(true)), "_blank");
    await registrar(n, "whatsapp-link");
    toast("WhatsApp aberto. Confirme o envio por lá.");
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(montarTexto(true)); toast("Mensagem copiada."); }
    catch (e) { toast("Não consegui copiar neste navegador."); }
  };
  const compartilhar = async () => {
    const m = marcados();
    try {
      const files = [];
      for (const i of m) {
        let f = arquivosCache.get(i.id);
        if (!f) {
          const resp = await fetch(urls.get(i.doc.arquivo));
          if (!resp.ok) throw new Error("download");
          const b = await resp.blob();
          const ext = extDe(i.doc.arquivo);
          f = new File([b], nz(i.rotulo).replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "") + "." + ext, { type: i.doc.mime || MIME[ext] || b.type });
          arquivosCache.set(i.id, f);
        }
        files.push(f);
      }
      if (files.length && navigator.canShare && !navigator.canShare({ files })) { toast("Este aparelho não compartilha esses arquivos. Use \"Abrir no WhatsApp\"."); return; }
      await navigator.share({ text: montarTexto(false), ...(files.length ? { files } : {}) });
      await registrar("(escolhido no aparelho)", "compartilhar-arquivos");
    } catch (e) {
      if (e && e.name === "AbortError") return;
      if (e && e.name === "NotAllowedError") { toast("Arquivos prontos. Toque em Compartilhar de novo."); return; }
      toast("Não foi possível compartilhar: " + (e && e.message ? e.message : e));
    }
  };

  const grupoUI = (grupo) => {
    const mine = itens.filter((i) => i.grupo === grupo), falta = faltando.filter((f) => f.grupo === grupo);
    if (!mine.length && !falta.length) return null;
    return h("div", { class: "wa-grupo" }, h("div", { class: "wa-tit" }, grupo === "Motorista" ? "Motorista: " + (r.motorista || "não definido") : grupo === "Caminhão" ? "Caminhão" : "Empresa"),
      mine.map((i) => {
        const sv = situacaoValidade(i.doc.validade);
        const cx = h("input", { type: "checkbox", checked: sel.has(i.id), onchange: (e) => { e.target.checked ? sel.add(i.id) : sel.delete(i.id); atualizar(); } });
        return h("label", { class: "wa-item" }, cx, h("span", {}, i.rotulo), sv && sv.cls ? h("span", { class: "badge " + sv.cls }, sv.txt) : null);
      }),
      falta.map((f) => h("div", { class: "wa-item falta" }, ic("alerta"), " " + f.rotulo + " — não cadastrado")));
  };
  const semMotorista = mot == null ? h("div", { class: "parado-box" }, ic("alerta"), " Este veículo não tem motorista definido no quadro; só os dados do caminhão serão enviados.") : null;

  inpObs.addEventListener("input", atualizar);
  atualizar();
  corpo.replaceChildren(...[
    h("p", { class: "hint", style: "margin:8px 0" }, r.placa_cavalo + (r.placa_implemento ? " / " + r.placa_implemento : "") + " · dados do quadro neste momento"),
    semMotorista, grupoUI("Motorista"), grupoUI("Caminhão"), grupoUI("Empresa"),
    h("label", {}, "Número do WhatsApp de quem vai receber"), inpNum, lista,
    h("label", {}, "Observação"), inpObs,
    h("label", {}, "Mensagem"), previa,
    h("div", { class: "row", style: "margin-top:12px;gap:8px;flex-wrap:wrap" },
      h("button", { class: "pri", onclick: abrirWhats }, ic("enviar"), " Abrir no WhatsApp"),
      navigator.share ? h("button", { onclick: compartilhar, title: "Compartilha os arquivos de verdade (melhor no celular)" }, ic("anexo"), " Compartilhar com anexos") : null,
      h("button", { onclick: copiar }, ic("copiar"), " Copiar mensagem")),
    h("p", { class: "hint", style: "margin-top:8px" }, "O WhatsApp abre com a mensagem pronta; quem envia é você, pelo seu aparelho. Os links dos documentos expiram em 7 dias.")].filter(Boolean));
}

// ---------- classificação dos arquivos de uma pasta ----------
const RE_PLACA = /(?<![A-Z0-9])([A-Z]{3}\d[A-Z0-9]\d{2})(?![A-Z0-9])/;
const PALAVRAS_NOME = new Set(["DE", "DA", "DO", "DOS", "DAS", "E"]);
const fichaNome = (s) => new Set(nz(s).split(/[^A-Z]+/).filter((t) => t && !PALAVRAS_NOME.has(t)));
function acharMotorista(nomePasta) {
  const a = fichaNome(nomePasta);
  if (!a.size) return null;
  const subconj = (x, y) => [...x].every((t) => y.has(t));
  const ativos = (S.motoristas || []);
  const exatos = ativos.filter((m) => { const b = fichaNome(m.nome); return b.size === a.size && subconj(a, b); });
  if (exatos.length === 1) return exatos[0].id;
  const cand = ativos.filter((m) => { const b = fichaNome(m.nome); return b.size && (subconj(b, a) || subconj(a, b)); });
  if (cand.length === 1) return cand[0].id;
  // vários candidatos (ex.: "ADÃO JOSÉ BRAATZ" contém "JOSE"): vale quem começa com o mesmo primeiro nome da pasta
  const primeiro = nz(nomePasta).split(/[^A-Z]+/).find((t) => t && !PALAVRAS_NOME.has(t));
  const iniciais = cand.filter((m) => nz(m.nome).split(/[^A-Z]+/).find((t) => t && !PALAVRAS_NOME.has(t)) === primeiro);
  return iniciais.length === 1 ? iniciais[0].id : null;
}
function dataValidadeNoNome(N, tipos) {
  const re = /(\d{2})[.\/-](\d{2})[.\/-](20\d{2})/g;
  const datas = [...N.matchAll(re)].map((m) => ({ iso: m[3] + "-" + m[2] + "-" + m[1], idx: m.index }));
  const val = N.match(/VAL\D{0,6}(\d{2})[.\/-](\d{2})[.\/-](20\d{2})/);
  if (val) return val[3] + "-" + val[2] + "-" + val[1];
  if (datas.length === 1 && datas[0].iso > hojeISO() && tipos.some((t) => t !== "RESIDENCIA")) return datas[0].iso;
  return null;
}
// Devolve uma lista de { tipo, placa | motoristaNome, validade, obs, ignorado }
function classificarArquivo(file) {
  const caminho = file.webkitRelativePath || file.name;
  const partes = caminho.split("/");
  const nome = partes[partes.length - 1], pastas = partes.slice(0, -1);
  const N = nz(nome);
  if (/^~\$/.test(nome) || /^THUMBS\.DB$/.test(N)) return null; // lixo do Windows/Office: nem aparece
  const ext = extDe(nome);
  if (!MIME[ext]) return [{ ignorado: "formato não aceito (" + ext + ")" }];
  const placa = (N.match(RE_PLACA) || [])[1];
  if (N.includes("CRLV") && placa) {
    if (N.includes("VENDIDO")) return [{ ignorado: "veículo vendido" }];
    const ex = (N.match(/_(20\d{2})/) || [])[1];
    return [{ tipo: "CRLV", placa, obs: ex ? "Exercício " + ex : null }];
  }
  const rePasta = /^\s*\d+\s*-\s*(.+?)\s*$/;
  const pai = pastas[pastas.length - 1];
  const m = pai && pai.match(rePasta);
  if (!m) {
    if (pastas.some((p) => rePasta.test(p))) return [{ ignorado: "está numa subpasta da pasta do motorista (pode ser documento de outra pessoa)" }];
    return [{ ignorado: "não reconhecido" }];
  }
  if (N.includes("+")) return [{ ignorado: "foto do motorista com o caminhão ou com o documento" }];
  const tipos = [];
  if (/MOPP/.test(N)) tipos.push("MOPP");
  if (/INDIVIS/.test(N)) tipos.push("INDIVISIVEL");
  if (/NR-?\s?35/.test(N)) tipos.push("NR35");
  if (!tipos.length && /CNH/.test(N)) tipos.push("CNH");
  if (!tipos.length && /(COMPROV|RESID|FATURA)/.test(N)) tipos.push("RESIDENCIA");
  if (!tipos.length) return [{ motoristaNome: m[1], ignorado: "tipo não pedido (CNH, residência, MOPP, indivisível, NR-35)" }];
  const validade = dataValidadeNoNome(N, tipos);
  return tipos.map((tipo) => ({ tipo, motoristaNome: m[1], validade: tipo === "RESIDENCIA" ? null : validade }));
}

// ---------- tela Documentos ----------
async function modalDocumentos() {
  const corpo = h("div");
  modal("Documentos de motoristas e veículos", corpo);
  let previaImport = null, arquivosPrevia = [];

  async function visualizar(d) {
    const w = window.open("", "_blank");
    const { data, error } = await sb.storage.from(BUCKET_DOCS).createSignedUrl(d.arquivo, 300);
    if (error || !data) { if (w) w.close(); toast(traduzErro(error || { message: "falha" })); return; }
    if (w) w.location.href = data.signedUrl; else window.open(data.signedUrl, "_blank");
  }
  async function excluir(d) {
    if (!confirm("Excluir " + (TIPOS_DOC[d.tipo] || d.tipo) + " (" + (d.nome_original || d.arquivo) + ")?")) return;
    const { error } = await sb.from("prog_documentos").delete().eq("id", d.id);
    if (error) { toast(traduzErro(error)); return; }
    const outras = (S.docs || []).filter((x) => x.id !== d.id && x.arquivo === d.arquivo);
    if (!outras.length) await sb.storage.from(BUCKET_DOCS).remove([d.arquivo]);
    await recarregarDocs(); desenhar();
  }
  async function salvarValidade(d, valor) {
    const { error } = await sb.from("prog_documentos").update({ validade: valor || null }).eq("id", d.id);
    if (error) { toast(traduzErro(error)); return; }
    d.validade = valor || null; toast("Validade salva.");
  }

  async function prepararImportacao(arquivos) {
    const { data: conj } = await sb.from("prog_conjuntos").select("placa_cavalo,placa_implemento");
    const placasSistema = new Set((conj || []).flatMap((c) => [c.placa_cavalo, c.placa_implemento]).filter(Boolean));
    const docs = S.docs || [];
    const linhas = [];
    // Duas pastas que cairiam no mesmo motorista (ex.: dois "CARLOS") ficam sem dono para você escolher
    const idPorPasta = new Map(); const usos = new Map();
    for (const file of arquivos) {
      for (const c of classificarArquivo(file) || []) {
        if (!c.motoristaNome || idPorPasta.has(c.motoristaNome)) continue;
        const id = acharMotorista(c.motoristaNome); idPorPasta.set(c.motoristaNome, id);
        if (id != null) usos.set(id, (usos.get(id) || 0) + 1);
      }
    }
    for (const [nome, id] of idPorPasta) if (id != null && usos.get(id) > 1) idPorPasta.set(nome, null);
    for (const file of arquivos) {
      const cls = classificarArquivo(file);
      if (!cls) continue;
      for (const c of cls) {
        const l = { file, nome: file.name, tipo: c.tipo || "", placa: c.placa || "", motoristaNome: c.motoristaNome || "",
          motoristaId: c.motoristaNome ? idPorPasta.get(c.motoristaNome) ?? null : null, validade: c.validade || "", obs: c.obs || null, incluir: !!c.tipo, nota: c.ignorado || "" };
        if (l.tipo === "CRLV" && !placasSistema.has(l.placa)) { l.incluir = false; l.nota = "placa fora da programação"; }
        if (l.tipo && l.tipo !== "CRLV" && l.tipo !== "ANTT" && l.motoristaId == null) { l.incluir = false; l.nota = "escolha o motorista"; }
        const dup = docs.some((d) => d.tipo === l.tipo && d.nome_original === l.nome && (l.tipo === "CRLV" ? d.placa === l.placa : d.motorista_id === l.motoristaId));
        if (dup) { l.incluir = false; l.nota = "já importado"; }
        linhas.push(l);
      }
    }
    previaImport = linhas; arquivosPrevia = arquivos; desenhar();
  }

  async function importar(linhas, barra) {
    let marcadas = linhas.filter((l) => l.incluir && l.tipo);
    const semDono = marcadas.filter((l) => precisaDono(l) && l.motoristaId == null);
    if (semDono.length) {
      if (!confirm(semDono.length + " arquivo(s) marcados estão sem motorista e NÃO serão importados (ficam destacados em vermelho na lista). Importar os demais?")) return;
      marcadas = marcadas.filter((l) => !semDono.includes(l));
    }
    if (!marcadas.length) { toast("Nada para importar."); return; }
    // motoristas marcados como "+ cadastrar": cria uma vez por nome de pasta
    const novos = new Map();
    for (const l of marcadas) {
      if (l.motoristaId !== "novo") continue;
      const chave = nz(l.motoristaNome);
      if (!novos.has(chave)) {
        const ja = (S.motoristas || []).find((m) => nz(m.nome) === chave);
        if (ja) { novos.set(chave, ja.id); continue; }
        const { data, error } = await sb.from("prog_motoristas").insert({ nome: chave }).select("id").single();
        if (error || !data) { toast("Não consegui cadastrar " + chave + ": " + traduzErro(error || { message: "falha" })); return; }
        novos.set(chave, data.id);
      }
    }
    marcadas.forEach((l) => { if (l.motoristaId === "novo") l.motoristaId = novos.get(nz(l.motoristaNome)); });
    if (novos.size) { const mt = await sb.from("prog_motoristas").select("id,nome,ativo").order("nome"); if (mt.data) S.motoristas = mt.data; }
    const caminhoPorArquivo = new Map(); const registros = []; let feito = 0, erros = 0;
    barra.textContent = "Enviando 0/" + marcadas.length + "…";
    for (const l of marcadas) {
      let caminho = caminhoPorArquivo.get(l.file);
      if (!caminho) {
        const ext = extDe(l.file.name);
        const dono = l.tipo === "CRLV" ? "veiculos/" + l.placa : l.tipo === "ANTT" ? "empresa" : "motoristas/" + l.motoristaId;
        caminho = dono + "/" + l.tipo + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + "." + ext;
        const { error } = await sb.storage.from(BUCKET_DOCS).upload(caminho, l.file, { contentType: MIME[ext], upsert: false });
        if (error) { erros++; toast("Falha ao enviar " + l.nome + ": " + traduzErro(error)); continue; }
        caminhoPorArquivo.set(l.file, caminho);
      }
      registros.push({ tipo: l.tipo, placa: l.tipo === "CRLV" ? l.placa : null, motorista_id: l.tipo === "CRLV" || l.tipo === "ANTT" ? null : l.motoristaId,
        arquivo: caminho, nome_original: l.nome, mime: MIME[extDe(l.nome)], validade: l.validade || null, obs: l.obs });
      feito++; barra.textContent = "Enviando " + feito + "/" + marcadas.length + "…";
    }
    if (registros.length) {
      const { error } = await sb.from("prog_documentos").insert(registros);
      if (error) { toast(traduzErro(error)); return; }
    }
    toast(feito + " documento(s) importado(s)" + (erros ? " · " + erros + " com erro" : "") + ".");
    previaImport = null; await recarregarDocs(); desenhar();
  }

  const selecionarArquivos = (pasta) => {
    const inp = h("input", { type: "file", multiple: true, accept: ".pdf,.jpg,.jpeg,.png,.webp", style: "display:none" });
    if (pasta) { inp.setAttribute("webkitdirectory", ""); inp.removeAttribute("accept"); }
    inp.addEventListener("change", () => { if (inp.files && inp.files.length) prepararImportacao([...inp.files]); });
    document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  };

  async function trocarAntt(file) {
    const ext = extDe(file.name);
    if (!MIME[ext]) { toast("Use PDF ou imagem."); return; }
    const antigos = (S.docs || []).filter((d) => d.tipo === "ANTT");
    if (antigos.length && !confirm("Substituir o comprovante ANTT atual por este?")) return;
    const caminho = "empresa/ANTT-" + Date.now().toString(36) + "." + ext;
    const up = await sb.storage.from(BUCKET_DOCS).upload(caminho, file, { contentType: MIME[ext], upsert: false });
    if (up.error) { toast(traduzErro(up.error)); return; }
    const ins = await sb.from("prog_documentos").insert({ tipo: "ANTT", arquivo: caminho, nome_original: file.name, mime: MIME[ext] });
    if (ins.error) { toast(traduzErro(ins.error)); return; }
    for (const d of antigos) { await sb.from("prog_documentos").delete().eq("id", d.id); await sb.storage.from(BUCKET_DOCS).remove([d.arquivo]); }
    toast("Comprovante ANTT atualizado."); await recarregarDocs(); desenhar();
  }

  function redesenhar() {
    const a = corpo.querySelector(".doc-rolagem"), y = a ? a.scrollTop : 0;
    desenhar();
    const b = corpo.querySelector(".doc-rolagem"); if (b) b.scrollTop = y;
  }
  const precisaDono = (l) => l.tipo && l.tipo !== "CRLV" && l.tipo !== "ANTT";

  function desenharPrevia() {
    const linhas = previaImport;
    const barra = h("span", { class: "hint" });
    const tabela = h("table", { class: "doc-t" },
      h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Arquivo"), h("th", {}, "Tipo"), h("th", {}, "Dono"), h("th", {}, "Validade"), h("th", {}, "Situação"))),
      h("tbody", {}, linhas.map((l) => {
        const cx = h("input", { type: "checkbox", checked: l.incluir, onchange: (e) => { l.incluir = e.target.checked; redesenhar(); } });
        const selTipo = h("select", { onchange: (e) => { l.tipo = e.target.value; l.incluir = !!l.tipo; redesenhar(); } },
          h("option", { value: "" }, "ignorar"), Object.entries(TIPOS_DOC).map(([k, v]) => h("option", { value: k }, v)));
        selTipo.value = l.tipo;
        let dono;
        if (l.tipo === "CRLV") dono = h("input", { type: "text", value: l.placa, maxlength: 8, style: "width:90px;text-transform:uppercase", oninput: (e) => { l.placa = nz(e.target.value); } });
        else if (l.tipo && l.tipo !== "ANTT") {
          dono = h("select", { onchange: (e) => { const v = e.target.value; l.motoristaId = !v ? null : v === "novo" ? "novo" : Number(v); if (l.motoristaId != null && l.nota === "escolha o motorista") l.nota = ""; if (l.motoristaId != null) l.incluir = true; redesenhar(); } },
            h("option", { value: "" }, "— escolher —"),
            l.motoristaNome && can("cadastro.editar") ? h("option", { value: "novo" }, "+ cadastrar " + nz(l.motoristaNome)) : null,
            (S.motoristas || []).map((m) => h("option", { value: String(m.id) }, m.nome)));
          dono.value = l.motoristaId != null ? String(l.motoristaId) : "";
        } else dono = h("span", { class: "hint" }, l.tipo === "ANTT" ? "empresa" : "");
        const val = l.tipo ? h("input", { type: "date", value: l.validade || "", onchange: (e) => { l.validade = e.target.value; } }) : null;
        return h("tr", { class: !l.incluir ? "off" : precisaDono(l) && l.motoristaId == null ? "semdono" : "" }, h("td", {}, l.tipo ? cx : null), h("td", { title: l.file.webkitRelativePath || l.nome, style: "max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, l.nome),
          h("td", {}, selTipo), h("td", {}, dono), h("td", {}, val), h("td", { class: "hint" }, l.nota));
      })));
    const inclui = linhas.filter((l) => l.incluir && l.tipo && !(precisaDono(l) && l.motoristaId == null)).length;
    const pend = linhas.filter((l) => l.incluir && precisaDono(l) && l.motoristaId == null).length;
    return h("div", {},
      h("p", { class: "hint" }, linhas.length + " arquivo(s) lidos. Confira o tipo e o dono; só os marcados serão enviados."),
      pend ? h("div", { class: "parado-box" }, ic("alerta"), " " + pend + " marcado(s) sem motorista (linhas em vermelho): escolha o motorista, ou eles ficam de fora.") : null,
      h("div", { class: "doc-rolagem" }, tabela),
      h("div", { class: "row", style: "margin-top:10px;gap:8px;flex-wrap:wrap" },
        h("button", { class: "pri", onclick: (e) => { e.target.disabled = true; importar(linhas, barra).finally(() => { e.target.disabled = false; }); } }, ic("upload"), " Importar " + inclui + " marcado(s)"),
        h("button", { title: "Volta à sugestão automática, desfazendo mudanças de tipo, dono e marcação", onclick: () => prepararImportacao(arquivosPrevia) }, "Restaurar sugestão"),
        h("button", { onclick: () => { previaImport = null; desenhar(); } }, "Cancelar"), barra));
  }

  function desenharLista() {
    const docs = S.docs || [];
    const mkLinha = (d) => {
      const sv = situacaoValidade(d.validade);
      const dt = h("input", { type: "date", value: d.validade || "", onchange: (e) => salvarValidade(d, e.target.value) });
      return h("tr", {}, h("td", {}, TIPOS_DOC[d.tipo] || d.tipo), h("td", { class: "hint", style: "max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap", title: d.nome_original }, d.nome_original || ""),
        h("td", {}, dt, sv && sv.cls ? h("span", { class: "badge " + sv.cls, style: "margin-left:6px" }, sv.txt) : null),
        h("td", { style: "white-space:nowrap" }, h("button", { title: "Ver", onclick: () => visualizar(d) }, ic("olho")), " ", h("button", { class: "danger", title: "Excluir", onclick: () => excluir(d) }, ic("lixo"))));
    };
    const porMot = new Map(), porPlaca = new Map();
    docs.forEach((d) => { if (d.motorista_id != null) (porMot.get(d.motorista_id) || porMot.set(d.motorista_id, []).get(d.motorista_id)).push(d); else if (d.placa) (porPlaca.get(d.placa) || porPlaca.set(d.placa, []).get(d.placa)).push(d); });
    const bloco = (titulo, lista) => h("details", {}, h("summary", {}, h("b", {}, titulo), " ", h("span", { class: "hint" }, lista.length + " doc(s)")),
      h("table", { class: "doc-t" }, h("tbody", {}, lista.map(mkLinha))));
    const motores = [...porMot.entries()].sort((a, b) => nomeMotorista(a[0]).localeCompare(nomeMotorista(b[0]), "pt-BR"));
    const placas = [...porPlaca.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return h("div", {},
      h("h3", { style: "margin:16px 0 6px" }, "Motoristas (" + motores.length + ")"), motores.length ? motores.map(([id, l]) => bloco(nomeMotorista(id), l)) : h("p", { class: "hint" }, "Nenhum documento de motorista ainda."),
      h("h3", { style: "margin:16px 0 6px" }, "Veículos (" + placas.length + ")"), placas.length ? placas.map(([p, l]) => bloco(p, l)) : h("p", { class: "hint" }, "Nenhum documento de veículo ainda."));
  }

  function desenhar() {
    if (previaImport) { corpo.replaceChildren(desenharPrevia()); return; }
    const antt = (S.docs || []).find((d) => d.tipo === "ANTT");
    const inpAntt = h("input", { type: "file", accept: ".pdf,.jpg,.jpeg,.png,.webp", style: "display:none", onchange: (e) => { if (e.target.files[0]) trocarAntt(e.target.files[0]); } });
    corpo.replaceChildren(
      h("p", { class: "hint", style: "margin:8px 0" }, "Aceita CNH, comprovante de residência, MOPP, carga indivisível e NR-35 dos motoristas, e o CRLV de cavalos e carretas. Escolha a pasta extraída: o sistema reconhece o motorista pelo nome da pasta e o veículo pela placa no nome do arquivo."),
      h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" },
        h("button", { class: "pri", onclick: () => selecionarArquivos(true) }, ic("pasta"), " Importar pasta"),
        h("button", { onclick: () => selecionarArquivos(false) }, ic("upload"), " Importar arquivos")),
      h("div", { class: "pn-card", style: "margin-top:14px" }, h("h3", {}, "Comprovante ANTT (RNTRC)"),
        antt ? h("p", { class: "hint" }, antt.nome_original + (antt.criado_em ? " · enviado em " + dataBR(String(antt.criado_em).slice(0, 10)) : "") + " · confira se a consulta ainda é recente") : h("p", { class: "hint" }, "Ainda não cadastrado."),
        h("div", { class: "row", style: "gap:8px" }, inpAntt,
          h("button", { onclick: () => inpAntt.click() }, ic("upload"), antt ? " Substituir" : " Enviar"),
          antt ? h("button", { onclick: () => visualizar(antt) }, ic("olho"), " Ver") : null)),
      desenharLista());
  }
  await recarregarDocs(); desenhar();
}
