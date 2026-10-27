/**
 * Sincronizador Planilha -> Sistema de Programação de Frota (Fatran)
 *
 * SOMENTE LÊ a planilha (escopo spreadsheets.readonly: o script não tem permissão para alterá-la).
 * Envia a aba do dia (nome DDMMAAAA, ex.: 27102026) para o sistema.
 */
var URL_SISTEMA = "https://rmlbnqnnanrkvoeqntim.supabase.co/functions/v1/receber-planilha";
var FUSO = "America/Sao_Paulo";
var PRIMEIRA_LINHA = 3; // as linhas 1 e 2 são cabeçalho

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Sistema de Frota")
    .addItem("Sincronizar agora", "sincronizarAgora")
    .addItem("Ligar sincronização automática (5 min)", "ligarAutomatico")
    .addItem("Desligar sincronização automática", "desligarAutomatico")
    .addToUi();
}

function d_(v) { return (v instanceof Date) ? Utilities.formatDate(v, FUSO, "yyyy-MM-dd") : ""; }

function montar_() {
  var hoje = Utilities.formatDate(new Date(), FUSO, "yyyy-MM-dd");
  var aba = Utilities.formatDate(new Date(), FUSO, "ddMMyyyy");
  var planilha = SpreadsheetApp.getActive();
  var ws = planilha.getSheetByName(aba);
  if (!ws) return { hoje: hoje, aba: aba, linhas: null };
  var n = ws.getLastRow() - PRIMEIRA_LINHA + 1;
  if (n < 1) return { hoje: hoje, aba: aba, linhas: [] };
  var v = ws.getRange(PRIMEIRA_LINHA, 1, n, 24).getValues();         // valores (datas como Date)
  var t = ws.getRange(PRIMEIRA_LINHA, 1, n, 24).getDisplayValues();  // texto exibido (horas como "07:00")
  var linhas = [];
  for (var i = 0; i < n; i++) {
    var r = v[i], x = t[i];
    if (!String(r[1]).trim()) continue;
    linhas.push({
      placa: r[1], impl: r[2], tipo: r[3], mot: r[4],
      data_programacao: d_(r[5]),
      cheg_carga_d: d_(r[6]), cheg_carga_h: x[7],
      carregou_d: d_(r[8]), carregou_h: x[9],
      embarcador: r[11], destino: r[12], prog_entrega: d_(r[13]),
      cheg_desc_d: d_(r[14]), cheg_desc_h: x[15],
      fim_desc_d: d_(r[16]), fim_desc_h: x[17],
      status: r[19], posicao_h: x[20], localizacao: r[21], obs: r[22], proxima: r[23]
    });
  }
  return { hoje: hoje, aba: aba, linhas: linhas };
}

function enviar_() {
  var m = montar_();
  if (m.linhas === null) return { ok: false, msg: "Aba " + m.aba + " não encontrada." };
  var resp = UrlFetchApp.fetch(URL_SISTEMA, {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ dia: m.hoje, linhas: m.linhas })
  });
  var corpo = {};
  try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}
  if (resp.getResponseCode() !== 200) return { ok: false, msg: corpo.erro || ("Erro " + resp.getResponseCode()) };
  return { ok: true, r: corpo };
}

function sincronizarAgora() {
  var res = enviar_();
  var ui = SpreadsheetApp.getUi();
  if (!res.ok) { ui.alert("Não sincronizou: " + res.msg); return; }
  var r = res.r;
  ui.alert("Sincronizado!\nAtualizados: " + r.atualizadas + "\nSem mudança: " + r.sem_mudanca + "\nNovos: " + r.criadas + "\nPrimeira leitura: " + r.primeira_leitura);
}

// Roda sozinho pelo gatilho (não abre janelas)
function sincronizarAutomatico() {
  var res = enviar_();
  if (!res.ok) console.error(res.msg); else console.log(JSON.stringify(res.r));
}

function ligarAutomatico() {
  desligarAutomatico();
  ScriptApp.newTrigger("sincronizarAutomatico").timeBased().everyMinutes(5).create();
  SpreadsheetApp.getUi().alert("Sincronização automática ligada (a cada 5 minutos).");
}
function desligarAutomatico() {
  ScriptApp.getProjectTriggers().forEach(function (g) {
    if (g.getHandlerFunction() === "sincronizarAutomatico") ScriptApp.deleteTrigger(g);
  });
}
