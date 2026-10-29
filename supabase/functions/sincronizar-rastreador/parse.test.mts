import { parseVeiculos, parseMensagens, parseErro, ultimaPorVeiculo, maiorMid, tipoResposta } from "./parse.ts";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const veic = `<?xml version="1.0" encoding="UTF-8"?><ResponseVeiculo>
 <Veiculo><veiID>9305</veiID><placa>DES0001</placa><vs>1.00</vs><tCmd>0</tCmd><tMacro>true</tMacro><eCmd>true</eCmd><tp>5</tp><ta>5</ta><eqp>10</eqp><loc>0</loc><ident>CAMINHAO BAU</ident><vManut>0</vManut><valEspelhamento>16/04/2016</valEspelhamento><propCancelamento>0</propCancelamento></Veiculo>
 <Veiculo><veiID>9306</veiID><placa>des-0002</placa><vs>4.00</vs><eqp>8</eqp><dIE>true</dIE><loc>1</loc><ident>TESTE &amp; CIA</ident><vManut>1</vManut></Veiculo></ResponseVeiculo>`;
const v = parseVeiculos(veic);
assert.equal(v.length, 2); assert.equal(v[0].placa, "DES0001"); assert.equal(v[1].placa, "DES0002");
assert.equal(v[0].em_manutencao, false); assert.equal(v[1].em_manutencao, true); assert.equal(v[1].ident, "TESTE & CIA"); assert.equal(v[0].eqp, 10);

const msg = `<?xml version="1.0" encoding="UTF-8"?><ResponseMensagemCB>
<MensagemCB><mId>2103713531</mId><veiID>26318</veiID><dt>2009-07-22T11:25:04-03:00</dt><lat>-23,5425</lat><lon>-49,2500</lon><mun>TAQUARITUBA</mun><uf>SP</uf><rod>SP-255</rod><vel>0</vel><evt4>1</evt4><ori>2</ori><tpMsg>1</tpMsg><dtinc>2009-07-22T13:19:26-03:00</dtinc><odm>0</odm></MensagemCB>
<MensagemCB><mId>2103713540</mId><veiID>26318</veiID><dt>2009-07-22T11:40:00-03:00</dt><lat>-23,5500</lat><lon>-49,2600</lon><mun>ITAPEVA</mun><uf>SP</uf><vel>72</vel><evt4>1</evt4><tpMsg>2</tpMsg><evtG>13</evtG></MensagemCB>
<MensagemCB><mId>2103713545</mId><veiID>9305</veiID><dt>2026-10-29T10:35:00-03:00</dt><lat>-20,8500</lat><lon>-41,1000</lon><mun>CACHOEIRO DE ITAPEMIRIM</mun><uf>ES</uf><vel>-1</vel><tpMsg>1</tpMsg><motID>77</motID><mot>JOAO &amp; SILVA</mot></MensagemCB>
<MensagemCB><mId>2103713550</mId><veiID>9305</veiID><dt>2026-10-29T10:30:00-03:00</dt><lat>-20,9</lat><lon>-41,2</lon><mun>OUTRA</mun><uf>ES</uf><vel>40</vel><evt4>-1</evt4><tpMsg>1</tpMsg></MensagemCB>
</ResponseMensagemCB>`;
const m = parseMensagens(msg);
assert.equal(m.length, 4);
assert.equal(m[0].lat, -23.5425); assert.equal(m[0].lon, -49.25); assert.equal(m[0].rodovia, "SP-255"); assert.equal(m[0].ignicao, 1); assert.equal(m[0].velocidade, 0);
assert.equal(m[1].ignicao, null, "log de posição (tpMsg 2) não informa ignição"); assert.equal(m[1].evento_gerador, 13); assert.equal(m[1].velocidade, 72);
assert.equal(m[2].ignicao, 0, "evt4 ausente em tabela de estado = desligada"); assert.equal(m[2].velocidade, null, "vel -1 = não informada"); assert.equal(m[2].motorista, "JOAO & SILVA"); assert.equal(m[2].motorista_id, 77);
assert.equal(m[3].ignicao, null, "evt4 = -1 = desconhecida");
const u = ultimaPorVeiculo(m);
assert.equal(u.length, 2);
assert.equal(u.find((x) => x.vei_id === 26318)!.mid, 2103713540, "pega a mais recente por data");
assert.equal(u.find((x) => x.vei_id === 9305)!.municipio, "CACHOEIRO DE ITAPEMIRIM", "mId maior mas data mais antiga não vence");
assert.equal(maiorMid(m), 2103713550);

const err = parseErro(`<?xml version="1.0"?><ErrorRequest><codigo>7</codigo><erro>Não atingiu o tempo mínimo para reenvio da requisição</erro><request>RequestMensagemCB</request></ErrorRequest>`);
assert.equal(err!.codigo, 7); assert.match(err!.mensagem, /tempo mínimo/);
assert.equal(parseErro(`<ErrorRequest><Erro>Tag xml invalida.</Erro></ErrorRequest>`)!.mensagem, "Tag xml invalida.");
assert.equal(parseErro(veic), null);
assert.equal(parseMensagens("<ResponseMensagemCB></ResponseMensagemCB>").length, 0);

assert.equal(tipoResposta(gzipSync(Buffer.from("x"))), "gzip");
assert.equal(tipoResposta(new Uint8Array([0x50, 0x4b, 3, 4, 0])), "zip");
assert.equal(tipoResposta(new TextEncoder().encode("<Response/>")), "texto");
console.log("OK: todos os testes passaram");
