# Inventário para a declaração Data Safety

Rascunho técnico, não formulário enviado. O responsável deve revisar a versão final, fornecedores, logs e contratos. Opcionalidade deve refletir o uso real; “compartilhado” depende das definições/exceções do Google para prestadores de serviço.

| Dados | Fluxo implementado | Finalidade / escolha |
| --- | --- | --- |
| Nome, e-mail, identificador e perfil profissional | App → API Vercel → Neon | Conta e funcionamento; necessários para acesso aprovado |
| Senha e token de sessão | Senha enviada por HTTPS, hash scrypt no servidor; token no aparelho | Autenticação; não se envia segredo do banco ao app |
| Coordenadas precisas ou aproximadas | Coletadas após ação/permissão → registro local → conta Neon | Localizar fazendas/visitas; opcional; durante uso |
| Fotografias | Seleção/captura → compressão local → Blob → URL no banco | Evidência de campo; opcional; Blob atualmente público por link |
| Áudio e texto ditado | Gravação local → Blob/registro; ditado pelo serviço Android disponível | Notas de campo; opcional; processamento pelo provedor do aparelho quando aplicável |
| Dados de clientes, fazendas e conteúdo técnico | Armazenamento local → API → Neon | Visitas e laudos; inseridos pelo usuário |
| Perguntas e contexto de IA | App → API → NVIDIA; histórico local | Recurso opcional de consulta; contratos e retenção do provedor devem ser confirmados |
| Relatos de IA | App → API → tabela feedback | Análise de conteúdo inadequado/incorreto; envio voluntário |
| IP e metadados de requisição | Vercel, mapas e serviço de reconhecimento podem processar | Transporte, segurança e operação; conferir logs e retenção de cada fornecedor |

Não foram adicionados SDKs de publicidade, analytics ou cobrança. As fontes do app são empacotadas localmente; mapas continuam usando serviços externos. Refaça este inventário se adicionar push, analytics, pagamentos, outro provedor ou armazenamento privado.

A exclusão automática cobre conta, registros sincronizados, feedback e mídias atribuídas pelo prefixo da versão atual. Inventarie arquivos e tabelas legados e confirme política de backups antes de responder sobre remoção integral. A página pública e o app descrevem as limitações.

Confira as categorias específicas no formulário atual do Google; conteúdo de terceiros inserido pelo usuário pode incluir dados pessoais adicionais. Configure retenção e procedimentos de atendimento antes de publicar.
