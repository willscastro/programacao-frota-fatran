# CÉREBRO — Programação de Frota Fatran

> Documento mestre do projeto. Tudo que for desenvolvido parte daqui.
> Origem: planilha manual `Programação Frota - fatran.xlsx` (Google Sheets), analisada em 26/10/2026.
> Objetivo: transformar a planilha manual em uma solução tecnológica visual (Kanban), rápida de operar e sem erros de digitação.
>
> **Atualização (26/10/2026):** usuários com perfis, login, banco de dados, hospedagem e geração automática do dia estão em [ARQUITETURA.md](ARQUITETURA.md). Onde este documento e a arquitetura divergirem, vale a arquitetura.

---

## 1. Objetivo do projeto

Hoje o analista de frota atualiza, todo dia, uma aba nova da planilha com a situação de cada conjunto (cavalo + implemento + motorista): onde está, o que carregou, para onde vai, quanto tempo esperou e qual é a próxima carga.

A solução deve:

1. Mostrar a frota **num quadro Kanban** (uma coluna por status), em vez de 17 linhas e 24 colunas.
2. Permitir **arrastar** o veículo de um status para outro, e registrar isso sozinho (data, hora, quem mudou).
3. Abrir os **detalhes numa gaveta lateral** que expande para a direita, para a esquerda ou para os dois lados.
4. **Calcular sozinha** as esperas, os semáforos e os alertas de inconsistência.
5. **Guardar o histórico** em vez de duplicar a aba todo dia.

---

## 2. Como a planilha funciona hoje

### 2.1 Estrutura geral
- Cada **aba é uma "foto" de um dia**, nomeada com a data (`26102026`, `23102026`...). São ~75 abas desde 25/06/2026.
- No dia seguinte a aba anterior é **copiada** e editada. Por isso as colunas variaram ao longo do tempo (6 variações de cabeçalho; algumas abas têm `#REF!` por colunas apagadas).
- **Uma linha = um conjunto** (cavalo + implemento + motorista). Em 26/10 são 16 conjuntos ativos.
- Posição da frota é informada em horário fixo (em 26/10: 17:00 para todos).
- Abas especiais: `AUX COM` (cadastro da frota e motoristas) e `Valmor` (aba isolada de agosto, mesmo formato).

### 2.2 Colunas, em 4 blocos

| Bloco | Colunas | Significado |
|---|---|---|
| Identificação | Placa, Implemento, Tipo Implem., Motorista | Cavalo (placa), semirreboque, tipo do conjunto e motorista |
| CARREGAMENTO | Data Programação, Data de cheg., Hr de cheg., Data do carregamento, Hr do carregamento, Tempo total de espera | Quando chegou no embarcador, quando carregou e quanto esperou |
| OPERAÇÃO ATUAL | Embarcador, Destino, Data Programação (da entrega) | De onde sai, para onde vai e quando deve entregar |
| DESCARGA | Data de descarga, Hr de Chegand., Data real de entrega, Hr que finalizou descarga, Tempo total de espera | Chegada no cliente, fim da descarga e espera |
| Situação | Status, Horário da Posição, Localização atual, Obs | Estado atual, hora da última posição, onde está e observações livres |
| Planejamento | Próxima Carga, Fim Jornada (abas antigas), Opções de Retorno (abas antigas) | O que vem depois |

### 2.3 Fórmulas existentes
- **Espera no carregamento (coluna K):** `agora − (chegada + hora)` enquanto não carregou; depois que carrega, congela. Mostra `Xd Yh Zmin`.
- **Espera na descarga (coluna S):** mesma lógica, da chegada no cliente até o fim da descarga.
- Ambas usam `NOW() − 3h` para ajustar o fuso. A espera aparece como **texto**, então não dá para somar ou filtrar.

### 2.4 Lista de status (validação da coluna T)
`AG. PROGRAMAÇÃO` · `PROGRAMADO` · `AG. CARREGAMENTO` · `EM TRÂNSITO` · `PERNOITE` · `DSR` · `AG. DESCARGA` · `AG. TROCA DE NOTA` · `ENTREGUE` · `EM MANUTENÇÃO`

No histórico aparecem também `CUMPRINDO JORNADA` e `AG. CARREG` (variações que viraram lixo de digitação).
Frequência histórica (linhas × dias): EM TRÂNSITO 422 · AG. CARREGAMENTO 174 · AG. DESCARGA 123 · EM MANUTENÇÃO 120 · DSR 94 · PROGRAMADO 90 · AG. PROGRAMAÇÃO 52 · PERNOITE 48 · ENTREGUE 42.

### 2.5 Semáforos (formatação condicional)
| Faixa de espera | Cor |
|---|---|
| menos de 2h | sem cor |
| 2h a menos de 5h | amarelo |
| 5h a menos de 7h | vermelho |
| 7h ou mais (ou dias) | vinho/magenta |

Outras cores:
- **Tipo do conjunto:** `4º SD` roxo claro · `4º GB` magenta · `VD GB` azul.
- **Próxima carga:** texto começando com `A DEFINIR RJ` (vermelho-terra) · `A DEFINIR SP` (azul) · `A DEFINIR ES` (amarelo). Indica o estado onde o conjunto precisa de carga.

### 2.6 Aba `AUX COM` (cadastro)
- **Semirreboques:** placa, carroceria (`4º EIXO` ou `VANDERLEIA`), tipo do conjunto, capacidade.
- **Cavalos:** placa pareada com o semirreboque, capacidade do cavalo, rastreador (SIM/NÃO), motorista fixo, situação do conjunto (`MANUTENÇÃO EM ANDAMENTO`, `AGUARDANDO PROGRAMAÇÃO`, `LIBERADO PARA VIAGEM`, `EM TRANSITO`, `CARGA/DESCARGA`) e `CARGA IDA` / `CARGA RETORNO`.
- **Capacidades por tipo (kg):** `4º SD` 37.000 · `4º GB` 38.500 · `VD SD` 33.000 · `VD GB` 34.500 · `BITR GB` 18.000.
- **Lista de motoristas** (nome completo).

### 2.7 Glossário
| Termo | Significado |
|---|---|
| DSR | Descanso semanal remunerado do motorista |
| Pernoite | Veículo parado para dormir, em viagem |
| Ag. troca de nota | Aguardando troca/emissão de nota fiscal |
| Embarcador | Quem fornece a carga (origem) |
| Próxima carga | Carga já combinada ou a combinar para depois da entrega atual |
| BC, OT, protocolo | Números de documento/ordem anotados em texto livre (ex.: `BC 1419349`, `OT 094102`) |
| 4º SD / 4º GB / VD SD / VD GB / BITR GB | Tipos de conjunto. O significado exato das siglas SD e GB deve ser **confirmado com o Whitney** |

---

## 3. Problemas da planilha que a solução precisa resolver

Encontrados na aba de 26/10 e no histórico:

1. **Linha duplicada/obsoleta:** `RQP-3E15` aparece duas vezes (uma de 18/09 já entregue, com "espera" de 35 dias).
2. **Placas fora do padrão:** `RQP-3E15` vs `RQP3E15`, espaço no começo (` RQP3E27`).
3. **Datas incoerentes:** `RQP3E27` com programação em 27/10 e descarga em 26/10. `TOR2D20` tem uma hora (13:50) na coluna de data.
4. **Previsão ≠ observação:** descarga prevista para 26/10, mas obs dizendo 27/10 (4 veículos em 26/10).
5. **Status contraditório:** `RBG5J77` "em manutenção" com viagem marcada para 27/10.
6. **Tipo do conjunto com `#REF!`** (56 ocorrências) e variações de digitação (`4º SD`, `4° SD`, `4°GB`, `BITRUCK`/`BITR GB`).
7. **Esperas como texto**, impossíveis de somar/filtrar.
8. **Informação fora de lugar:** protocolos, avisos de horário e "Não contar" soltos nas colunas Y/Z.
9. **Próxima carga em texto livre** (`27/10 IMERYS X POXPUR 29/10`), sem estrutura (data, embarcador, destino).
10. **Sem histórico:** para saber o que mudou é preciso abrir duas abas lado a lado.
11. **Destinos múltiplos em uma célula:** `3 ENTREGAS - CARIACICA, SERRA, VILA VELHA ES`.

---

## 4. Modelo de dados proposto

```
Conjunto            (cadastro: cavalo + semirreboque)
  id, placa_cavalo, placa_implemento, tipo (4º SD|4º GB|VD SD|VD GB|BITR GB),
  carroceria, capacidade_kg, rastreador, ativo

Motorista
  id, nome, conjunto_fixo_id (opcional)

Viagem              (uma programação de carga)
  id, conjunto_id, motorista_id,
  embarcador, origem_cidade_uf, destino_texto,
  prog_chegada_carga, cheg_carga_em, carregou_em,
  prog_entrega, cheg_descarga_em, descarga_fim_em,
  observacao, protocolos[]

Entrega             (para viagens com várias entregas)
  id, viagem_id, ordem, cidade_uf, previsao, realizada_em

StatusEvento        (histórico — substitui as abas diárias)
  id, conjunto_id, viagem_id, status, localizacao, em, por_usuario, origem (arrastar|edicao|importacao)

ProximaCarga
  id, conjunto_id, data, embarcador, destino, regiao_alvo (ES|SP|RJ|SC...), confirmada (bool)

Alerta              (calculado)
  tipo, severidade, mensagem, conjunto_id
```

Regras de ouro:
- **Uma placa tem exatamente um registro ativo.** Placa normalizada: maiúscula, sem hífen e sem espaço.
- **A aba do dia vira uma consulta ao histórico** (`foto do dia 26/10`), não um arquivo novo.

---

## 5. Regras de negócio

### 5.1 Fluxo de status (colunas do Kanban, da esquerda para a direita)

```
AG. PROGRAMAÇÃO → PROGRAMADO → AG. CARREGAMENTO → EM TRÂNSITO → PERNOITE → DSR → AG. DESCARGA → AG. TROCA DE NOTA → ENTREGUE
                                                      EM MANUTENÇÃO (coluna à parte, pode ocorrer em qualquer ponto)
```
- `PERNOITE` e `DSR` ocorrem durante a viagem. O veículo pode voltar para `EM TRÂNSITO`.
- Ao arrastar para `ENTREGUE`, o sistema pede a hora do fim da descarga.
- Ao arrastar para `AG. CARREGAMENTO` ou `AG. DESCARGA`, o sistema pede (ou assume "agora") a hora de chegada.
- Todo arraste grava um `StatusEvento`, com opção de **desfazer**.

### 5.2 Esperas
- Espera de carregamento = `carregou_em − cheg_carga_em` (ou `agora − cheg_carga_em` enquanto não carregou).
- Espera de descarga = `descarga_fim_em − cheg_descarga_em` (ou `agora − ...`).
- Guardadas em minutos; exibidas como `Xd Yh Zmin`. Semáforo conforme a seção 2.5.

### 5.3 Alertas automáticos (validações que hoje não existem)
| Alerta | Condição |
|---|---|
| Placa duplicada | Duas viagens ativas para a mesma placa |
| Data impossível | Descarga anterior à chegada/carregamento |
| Previsão atrasada | Previsão de entrega < agora e status ainda não é `AG. DESCARGA`/`ENTREGUE` |
| Previsão × observação | Texto da obs cita data diferente da previsão |
| Espera crítica | Espera ≥ 5h (vermelho) ou ≥ 7h (vinho) |
| Sem próxima carga | Veículo `EM TRÂNSITO`/`AG. DESCARGA` sem próxima carga definida |
| Status contraditório | Ex.: `EM MANUTENÇÃO` com viagem programada nas próximas 48h |
| Posição velha | Última posição com mais de X horas |

---

## 6. UX do Kanban (o que o Whitney pediu)

### 6.1 Quadro
- **Uma coluna por status**, com contador e (opcional) soma da capacidade dos veículos.
- **Cartão do veículo** mostra: placa, motorista, chip do tipo (cor do tipo), embarcador → destino, localização, selo de espera (semáforo), chip da próxima carga (cor por região) e ícone de alerta.
- **Arrastar e soltar** o cartão entre colunas muda o status. Também reordena dentro da coluna.
- Filtros: busca por placa/motorista/destino, tipo de conjunto, região, "só com alerta".
- Visão compacta (só placa + motorista) e visão detalhada.

### 6.2 Gaveta de detalhes (o ponto principal)
Ao **clicar em um cartão**, abre uma gaveta que **expande** sobre o quadro. O usuário escolhe o lado:
- **◀ Esquerda:** a gaveta abre pela esquerda.
- **▶ Direita:** a gaveta abre pela direita (padrão).
- **◀▶ Ambos:** o conteúdo se divide em dois painéis. Esquerda = *Carregamento* (e conjunto/motorista). Direita = *Descarga, próxima carga e histórico*.
- O quadro desliza/encolhe para que o cartão selecionado continue visível.
- Fechar com `Esc` ou clicando fora. `←` `→` navegam entre veículos sem fechar a gaveta.
- Todos os campos são editáveis na própria gaveta (com salvamento imediato).
- Na gaveta: linha do tempo de status (histórico), alertas do veículo, botão de copiar resumo para WhatsApp.

### 6.3 Outros recursos pensados
- **Seletor de dia** (foto do histórico) e botão "comparar com ontem".
- **Resumo no topo:** quantos veículos por status, esperas críticas, veículos sem carga.
- **Mapa por região** (ES/SP/RJ) mostrando onde estão e onde faltam cargas.
- Modo **celular** (o analista confere a frota fora do computador).
- Atalhos de teclado e modo escuro.

---

## 7. Arquitetura proposta

| Camada | Proposta | Observação |
|---|---|---|
| Protótipo (fase 0) | HTML + CSS + JavaScript puro, dados de 26/10 embutidos | Já neste repositório: `design/prototipo-kanban.html` |
| Front-end (fase 1) | HTML/CSS/JS modular (ou React + Vite) | Decidir após aprovar o design |
| Dados (fase 2) | Supabase (Postgres + tempo real) | Vários usuários vendo a mesma tela ao vivo; histórico de eventos |
| Importador | Script que lê a planilha atual (`.xlsx`) e popula o banco | Aproveita ~75 dias de histórico |
| Hospedagem | GitHub Pages (protótipo) → Vercel/Cloudflare (app) | A confirmar |
| Integrações futuras | TMS (ServiceLogic) e rastreamento | A confirmar com o Whitney |

---

## 8. Roadmap

| Fase | Entrega | Status |
|---|---|---|
| 0 | Cérebro + design (protótipo HTML/JS) | **feito nesta sessão** |
| 1 | Front-end funcional com dados locais (`localStorage`), arrastar e gaveta completos | próximo |
| 2 | Banco de dados, login, histórico de status, tempo real | |
| 3 | Importador da planilha + validações/alertas automáticos | |
| 4 | Dashboard de esperas e indicadores, versão celular | |
| 5 | Integrações (TMS, rastreamento) | |

---

## 9. Decisões em aberto (perguntar ao Whitney)

1. O que significam exatamente **SD** e **GB** nos tipos de conjunto?
2. Quem usa a planilha além do Whitney? (define login e permissões)
3. A posição das 17:00 é preenchida na mão ou vem de rastreador?
4. Quais status devem pedir hora ao arrastar (chegada, fim de descarga)?
5. O Kanban deve ter uma coluna só para `PERNOITE`/`DSR` ou juntar as duas?
6. O que significa "Não contar" na coluna Y e as abas `AUX COM`/`Valmor`: continuam no sistema?
7. Existe acesso ao TMS (ServiceLogic) para importar viagens automaticamente?
8. Onde o sistema vai rodar: só interno (rede da Fatran) ou acessível pela internet?

---

## 10. Estrutura do repositório

```
programacao-frota-fatran/
├─ README.md
├─ docs/
│  ├─ CEREBRO.md                  ← este documento
│  └─ ARQUITETURA.md              ← usuários, perfis, banco, hospedagem, dia automático
├─ design/
│  ├─ prototipo-kanban.html       ← design interativo (abrir no navegador)
│  └─ dados-exemplo-26-10-2026.json
├─ db/migrations/                 ← scripts SQL numerados (0001 a 0006)
└─ supabase/functions/
   └─ criar-usuario/index.ts      ← função segura para o admin criar usuários
```
