# Programação de Frota — Fatran

Transformar a planilha manual de programação de frota da Fatran em uma solução visual (Kanban), com arrastar e soltar, gaveta de detalhes e alertas automáticos.

## Onde estamos

**Fase 0 — Cérebro + design** (concluída). Nada de regra de negócio real ainda: só o planejamento e um protótipo navegável.

| Arquivo | O que é |
|---|---|
| [`docs/CEREBRO.md`](docs/CEREBRO.md) | Documento mestre: como a planilha funciona, modelo de dados, regras, UX e roadmap |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Sistema multiusuário: perfis e permissões, login, banco, hospedagem e geração automática do dia |
| [`db/migrations/`](db/migrations) | Scripts SQL do banco (esquema, dados iniciais, segurança, dia automático). **Ainda não aplicados** |
| [`supabase/functions/criar-usuario`](supabase/functions/criar-usuario/index.ts) | Função segura para o admin criar usuários |
| [`design/prototipo-kanban.html`](design/prototipo-kanban.html) | Protótipo interativo (HTML/CSS/JS, sem dependências). Abra no navegador |
| [`design/dados-exemplo-26-10-2026.json`](design/dados-exemplo-26-10-2026.json) | Dados reais da aba de 26/10/2026, usados no protótipo |

## O que o protótipo já mostra

- Quadro Kanban com uma coluna por status (os 10 status da planilha).
- **Arrastar e soltar** o cartão entre colunas (e reordenar dentro da coluna), com **desfazer** (botão ou `Ctrl+Z`).
- **Gaveta de detalhes** ao clicar no cartão: abre pela **direita**, pela **esquerda** ou **dos dois lados**. `Esc` fecha e `←` `→` navegam entre veículos.
- Edição dos campos na gaveta, com histórico de mudanças de status.
- Esperas calculadas com semáforo (amarelo ≥ 2h, vermelho ≥ 5h, vinho ≥ 7h).
- Alertas automáticos de inconsistência (placa duplicada, data impossível, previsão × observação, espera crítica, sem próxima carga).
- Busca, filtro por tipo de conjunto, "só com alerta" e modo compacto.

> Os dados ficam só no navegador (`localStorage`). O botão ↺ restaura os dados de 26/10.

## Fase 1 — banco e login (em andamento)

Os scripts do banco estão escritos e foram testados num PostgreSQL local, simulando o Supabase, com cada perfil. Faltam duas decisões para aplicar: onde fica o banco e a matriz final de permissões.

## Próximos passos

Ver o roadmap e as decisões em aberto em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md), seções 8 e 9.
