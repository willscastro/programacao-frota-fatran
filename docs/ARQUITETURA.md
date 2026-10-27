# Arquitetura — sistema multiusuário

> Evolução do [CÉREBRO](CEREBRO.md). Aqui fica o que muda quando o protótipo vira sistema de verdade:
> vários usuários com perfis, login e senha, banco de dados, hospedagem e geração automática do dia.

## 1. O que o Whitney pediu, e como ficou

| Pedido | Como será |
|---|---|
| Vários usuários (comercial, programador, gestor de frota, diretoria) | 5 perfis: **admin**, **gestor de frota**, **programador**, **comercial**, **diretoria** |
| Cada um com usuário e senha | Login por e-mail e senha. **Não existe cadastro aberto**: só o admin cria usuários |
| Um administrador (o Whitney) | Perfil `admin`: gerencia usuários, perfis, permissões e vê a auditoria |
| Hospedar | Site estático com HTTPS + banco e login na nuvem (seção 6) |
| Banco de dados | PostgreSQL (Supabase), com regras de acesso dentro do próprio banco |
| A cada dia já adicionar o novo dia | O sistema gera o dia seguinte sozinho, todo dia às 00:10 (horário de Brasília) |

### O que acrescentei ao pedido
1. **Permissões por ação, não só por perfil.** Cada perfil recebe uma lista de permissões (mover status, editar viagem, ver painel...). O admin ajusta a lista pela tela, sem mexer em código.
2. **Segurança no banco.** As regras valem mesmo que alguém tente burlar a tela. O comercial, por exemplo, não consegue mudar status nem pela API.
3. **Histórico e auditoria.** Todo arraste e toda edição ficam registrados (quem, quando, valor antigo e novo).
4. **Fechamento de dias.** O dia anterior fecha ao gerar o novo. Só quem tem permissão corrige dia fechado.
5. **Tempo real.** Se o programador mexe num cartão, o gestor vê a mudança na hora, sem recarregar.
6. **Controle de edição simultânea.** Se duas pessoas editam o mesmo cartão, a segunda recebe aviso em vez de sobrescrever.
7. **Troca de senha obrigatória** no primeiro acesso, e **verificação em duas etapas** para admin e gestor.
8. **Desativar em vez de apagar** usuários, para manter o histórico de quem fez o quê.

## 2. Perfis e permissões

> **Estado atual (decisão do administrador):** todos os perfis começam com **todas** as permissões. O administrador restringe depois pela tela de administração, ou rodando `db/ajustes/matriz_sugerida.sql`, que aplica a matriz sugerida abaixo.
> **Atenção:** enquanto a matriz não for restringida, qualquer usuário pode criar usuários e mudar permissões. Restrinja **antes** de criar contas para outras pessoas.

Matriz **sugerida** para uso definitivo:

✅ = pode · — = não pode. Tudo isto fica em tabela e o admin pode mudar depois.

| Permissão | Admin | Gestor de frota | Programador | Comercial | Diretoria |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver o quadro Kanban | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mover status (arrastar) | ✅ | ✅ | ✅ | — | — |
| Editar dados da viagem (carga, descarga, datas, obs) | ✅ | ✅ | ✅ | — | — |
| Editar próxima carga | ✅ | ✅ | ✅ | ✅ | — |
| Cadastro de frota e motoristas | ✅ | ✅ | — | — | — |
| Ver painel de indicadores | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exportar dados | ✅ | ✅ | — | ✅ | ✅ |
| Gerar o dia manualmente | ✅ | ✅ | — | — | — |
| Corrigir dia já fechado | ✅ | ✅ | — | — | — |
| Excluir registros | ✅ | — | — | — | — |
| Gerenciar usuários e permissões | ✅ | — | — | — | — |
| Ver auditoria | ✅ | ✅ | — | — | — |

Dúvidas desta matriz estão na seção 9.

## 3. Login e senhas

- **Supabase Auth**, e-mail e senha. As senhas nunca ficam no nosso código nem em texto aberto.
- **Sem cadastro público.** O admin cria o usuário (função segura no servidor) e entrega uma senha temporária. No primeiro acesso a troca é obrigatória.
- **Senha forte** (mínimo 10 caracteres) e **bloqueio automático** após várias tentativas erradas.
- **Verificação em duas etapas (app autenticador)** obrigatória para admin e gestor, opcional para os outros.
- **Sessão** expira por inatividade. Usuário desativado perde o acesso na hora.
- A chave que fica no navegador só permite o que as regras do banco permitem. A chave de administração nunca sai do servidor.

## 4. Como o dia automático funciona

Hoje: no fim do dia alguém copia a aba e edita. No sistema:

```
00:10 (Brasília) ──► gerar_dia(hoje)
   1. Já existe o dia?  sim → não faz nada (pode rodar de novo sem duplicar)
   2. Pega o dia anterior mais recente
   3. Para cada conjunto ativo, copia a linha:
        • status, local, motorista, implemento e próxima carga seguem iguais
        • quem estava ENTREGUE volta para "AG. PROGRAMAÇÃO" com a viagem em branco
        • a hora da posição zera (é uma nova posição do dia)
   4. Fecha o dia anterior (só gestor/admin corrigem depois)
   5. Registra a origem: automático, manual, sob demanda ou importação
```

Garantias contra falha:
- **Reserva 1:** quando alguém abre o sistema e o dia de hoje não existe, ele é gerado na hora.
- **Reserva 2:** botão "Gerar dia" para admin e gestor.
- Esperas continuam calculadas a partir de datas e horas reais (em minutos), nunca mais texto.

Modelo: uma linha por **conjunto por dia** (`prog_programacao`). É o mesmo desenho da planilha, o que facilita o treinamento e a importação das ~75 abas históricas.

## 5. Banco de dados

Scripts em [`db/migrations`](../db/migrations), numerados na ordem de aplicação:

| Arquivo | Conteúdo |
|---|---|
| `0001_base.sql` | Tabelas: perfis, papéis, permissões, cadastro (conjuntos, motoristas, tipos, status), dias, programação, eventos e auditoria |
| `0002_seed.sql` | Dados iniciais: os 5 papéis, as permissões, a matriz da seção 2, os 10 status e os 5 tipos de conjunto com capacidade |
| `0003_regras_e_rls.sql` | Funções de permissão, triggers de validação/auditoria e políticas de segurança por linha (RLS) |
| `0004_dia_automatico.sql` | Funções que geram o dia (interna, manual e sob demanda) |
| `0005_agenda_e_tempo_real.sql` | Agenda diária às 00:10 e publicação em tempo real |
| `0006_primeiro_admin.sql` | Modelo para promover o primeiro usuário a admin |

Todas as tabelas têm o prefixo `prog_`, para conviver com outros sistemas no mesmo projeto sem colisão.

Função para criar usuários: [`supabase/functions/criar-usuario`](../supabase/functions/criar-usuario/index.ts).

## 6. Hospedagem

| Parte | Onde | Por quê |
|---|---|---|
| Site (HTML/CSS/JS) | Vercel ou Cloudflare Pages, ligado ao GitHub | Publica sozinho a cada commit, HTTPS automático, plano gratuito atende |
| Banco, login, tempo real, agenda | Supabase (PostgreSQL) | Já inclui autenticação, segurança por linha, tarefas agendadas e tempo real |
| Endereço | Subdomínio da Fatran (ex.: `frota.suaempresa.com.br`) ou o endereço gratuito do provedor | A definir |

Backup: o Supabase faz cópia diária (conforme o plano) e vamos acrescentar uma exportação semanal para a Fatran guardar.

## 7. Segurança e LGPD

- Regras de acesso dentro do banco (RLS): a tela só mostra, quem decide é o banco.
- Auditoria de tudo que muda dados. Ninguém, nem o admin, apaga o histórico pela tela.
- Dados pessoais limitados ao necessário (nome do motorista). Sem CPF, telefone ou endereço nesta fase.
- Tudo trafega em HTTPS. Segredos só em variáveis de ambiente do servidor, nunca no repositório.
- Acesso por perfil mínimo: cada pessoa vê e faz só o que o trabalho exige.

## 8. Roadmap revisado

| Fase | Entrega |
|---|---|
| 1 | **Banco e login:** aplicar os scripts, criar o admin, tela de login, troca de senha, criação de usuários |
| 2 | **Quadro ligado ao banco:** Kanban lendo e gravando de verdade, tempo real, permissões na tela, histórico por cartão |
| 3 | **Dia automático em produção** + importação das abas antigas da planilha |
| 4 | **Painel de indicadores** (esperas, ocupação, cargas por região) e exportação |
| 5 | **Celular** (arrastar com toque) e instalação como app |
| 6 | Integrações (TMS, rastreamento) |

## 9. Decisões em aberto

1. ~~Onde fica o banco~~ **Decidido:** no projeto Supabase `fatran-frota`, com tabelas de prefixo `prog_` para conviver com o outro sistema.
2. ~~Matriz~~ **Decidido por ora:** todos com todas as permissões; o admin ajusta depois. Perguntas para o ajuste: Principalmente: o comercial pode editar a próxima carga? A diretoria pode exportar? O programador pode mexer no cadastro?
3. **Quem são os primeiros usuários** (nome, e-mail e perfil), para eu preparar as contas.
4. **Endereço do sistema:** domínio próprio da Fatran ou endereço gratuito do provedor?
5. **Verificação em duas etapas** para admin e gestor: obrigatória mesmo?
6. Significado de **SD e GB** nos tipos de conjunto (pendente do documento anterior).
