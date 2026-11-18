import assert from "node:assert/strict";
import { normalizarNumero, lerEstado, lerQr, filtrarContatos, corpoMidia, corpoTexto, nomeParaEnvio } from "./evo.ts";
assert.equal(normalizarNumero("28 99257-5032"), "5528992575032");
assert.equal(normalizarNumero("+55 (28) 99257-5032"), "5528992575032");
assert.equal(normalizarNumero("5528992575032"), "5528992575032");
assert.equal(normalizarNumero("1234"), null);
assert.equal(normalizarNumero(""), null);
assert.equal(lerEstado({ instance: { instanceName: "x", state: "open" } }), "open");
assert.equal(lerEstado({ state: "CLOSE" }), "close");
assert.equal(lerEstado(null), "desconhecido");
const q1 = lerQr({ instance: {}, hash: "h", qrcode: { code: "2@abc", base64: "data:image/png;base64,AAA" } });
assert.equal(q1.qr, "data:image/png;base64,AAA"); assert.equal(q1.codigo, "2@abc");
const q2 = lerQr({ base64: "AAA", code: "2@x", pairingCode: "ABCD1234", count: 1 });
assert.equal(q2.qr, "data:image/png;base64,AAA"); assert.equal(q2.pairingCode, "ABCD1234");
assert.equal(lerQr({ code: "2@only" }).qr, null);
const lista = [
  { remoteJid: "5528999990001@s.whatsapp.net", pushName: "José Antônio" },
  { remoteJid: "5528999990002@s.whatsapp.net", pushName: "Maria Cliente" },
  { remoteJid: "120363@g.us", pushName: "Grupo" },
  { id: "5528999990001@s.whatsapp.net", pushName: "José duplicado" },
  { remoteJid: "999@lid", pushName: "Sem número" },
];
assert.deepEqual(filtrarContatos(lista, "").map((c) => c.numero), ["5528999990001", "5528999990002"]);
assert.deepEqual(filtrarContatos(lista, "jose").map((c) => c.nome), ["José Antônio"]);
assert.deepEqual(filtrarContatos(lista, "9990002").map((c) => c.nome), ["Maria Cliente"]);
assert.deepEqual(filtrarContatos("x", "a"), []);
const m = corpoMidia("5528992575032", "application/pdf", "https://x/a.pdf", "CNH.pdf", "CNH");
assert.equal(m.mediatype, "document"); assert.equal(corpoMidia("1", "image/jpeg", "u", "a.jpg", "c").mediatype, "image");
assert.equal(corpoTexto("1", "oi").text, "oi");
assert.equal(nomeParaEnvio("CRLV do cavalo TOR2D20", "PDF"), "CRLV do cavalo TOR2D20.pdf");
assert.equal(nomeParaEnvio("CNH (CNH ADÃO/ver)", "jpeg"), "CNH (CNH ADAO ver).jpeg");
console.log("evo: ok");
