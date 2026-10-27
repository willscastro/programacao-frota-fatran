# Sincronizador planilha → sistema

O script `sincronizador.gs` roda DENTRO da planilha e só tem permissão de LEITURA (`spreadsheets.readonly`).
Ele envia a aba do dia (nome `DDMMAAAA`) para a função `receber-planilha`, que aplica no quadro de hoje
somente os campos que mudaram na planilha desde a última leitura.

Instalação: Extensões → Apps Script → colar `sincronizador.gs`; em Configurações do projeto marcar
"Mostrar o arquivo de manifesto appsscript.json" e colar o conteúdo de `appsscript.json`;
salvar, recarregar a planilha e usar o menu **Sistema de Frota → Ligar sincronização automática**.

E-mails autorizados a sincronizar: tabela `prog_sync_emails`.
