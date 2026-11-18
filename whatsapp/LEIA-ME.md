# Servidor do WhatsApp: envio automático do sistema

O botão **Enviar agora (automático)** do "Mandar dados" usa um número de WhatsApp conectado por QR a um servidor
próprio (Evolution API). O sistema fala com esse servidor por uma função do Supabase (`whatsapp`); a chave do
servidor nunca vai para o navegador.

## Antes de começar: o que você precisa saber
- **É uma conexão não oficial** (como o WhatsApp Web). O WhatsApp pode bloquear números que enviem muito ou para
  quem não conhece o número. Use um **chip exclusivo da empresa**, nunca o seu pessoal, e envie só dados de
  trabalho, em volume baixo e para quem espera receber.
- O servidor precisa ficar **ligado 24 horas**. Não roda na Vercel.
- Opção estável e oficial (API da Meta, com cobrança e modelos aprovados) fica como alternativa futura.

## 1. Servidor
Qualquer máquina Linux sempre ligada com Docker serve: uma VPS pequena (1 GB de memória basta para começar) ou um
PC/servidor da empresa. Você precisa de um **domínio ou subdomínio** apontando para o IP dela (registro A), por
exemplo `zap.suaempresa.com.br`, e as portas 80 e 443 liberadas (o Caddy emite o certificado HTTPS sozinho).

## 2. Subir
```bash
git clone https://github.com/willscastro/programacao-frota-fatran.git
cd programacao-frota-fatran/whatsapp
cp .env.example .env
nano .env          # preencha DOMINIO, EVOLUTION_APIKEY (openssl rand -hex 32) e POSTGRES_SENHA
docker compose up -d
docker compose logs -f evolution-api     # espere o servidor iniciar
```
Teste: abrir `https://SEU-DOMINIO` no navegador deve mostrar uma resposta da API (mensagem de boas-vindas).

## 3. Ligar ao sistema (feito por você, no Supabase)
No painel do Supabase: Edge Functions > **whatsapp** > Secrets (ou `supabase secrets set`), cadastre:

| Segredo | Valor |
|---|---|
| `EVOLUTION_URL` | `https://SEU-DOMINIO` (sem barra no fim) |
| `EVOLUTION_APIKEY` | a mesma chave do `.env` |
| `EVOLUTION_INSTANCE` | opcional; padrão `fatran` |

## 4. Conectar o número
No sistema, com um usuário que tenha a permissão "usuarios.gerenciar", abra **WhatsApp** (cabeçalho). Leia o QR com o
celular do chip da empresa: WhatsApp > Aparelhos conectados > Conectar um aparelho. Também dá para conectar por
código de pareamento, digitando o número na tela.

## 5. Usar
Em qualquer bloco, **Mandar dados > Escolher contato > Enviar agora**. A mensagem e os documentos marcados saem
anexados, com pausa de 1,5 a 3 s entre eles. Cada envio fica registrado em `prog_envios` (quem, quando, para quem,
o que foi e se deu certo).

## Manutenção
- **Se desconectar** (celular sem internet por dias, número banido, QR desfeito): o botão automático some, aparece o
  aviso e o administrador lê o QR de novo.
- **Atualizar:** `docker compose pull && docker compose up -d`. Depois de validar uma versão, fixe-a em
  `EVOLUTION_IMAGE` no `.env`.
- **Backup:** guarde o volume `evolution_instances` e o banco (`docker compose exec postgres pg_dump -U evolution evolution`).
- **Limites do sistema:** 6 envios por minuto por usuário, até 8 documentos por envio, só documentos do próprio
  conjunto e o comprovante ANTT da empresa.

## Problemas comuns
| Sintoma | O que fazer |
|---|---|
| "servidor do WhatsApp ainda não foi configurado" | Faltam os segredos `EVOLUTION_URL` e `EVOLUTION_APIKEY` na função. |
| "o servidor do WhatsApp não respondeu" | Servidor desligado, domínio errado ou porta 443 fechada. Teste a URL no navegador. |
| QR não aparece | `docker compose logs evolution-api`. Gere de novo pela tela; se persistir, atualize a imagem. |
| Envia o texto mas um documento falha | Confira o tamanho (até 20 MB) e se o arquivo ainda existe em **Documentos**. |
| Lista de contatos vazia | O servidor só conhece contatos já sincronizados com o aparelho; digite o número. |
