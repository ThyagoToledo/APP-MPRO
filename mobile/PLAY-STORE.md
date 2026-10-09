# M-PRO Campo — preparação Android e Play Store

Preparação em 09/10/2026. A pasta mobile é aproveitável; o app usa Capacitor 8, telas e design do core existente, armazenamento local por conta e as APIs do mesmo site. O projeto Android está em `android/`. Nenhuma mudança foi publicada na Vercel ou na Play Console.

## Estado verificado

- Assets Android gerados e sincronizados com Capacitor usando configuração de teste claramente identificada. O comando de release rejeita esse pacote de teste.
- Testes automatizados de endpoints, isolamento entre contas, sincronização, mídia offline, autenticação e exclusão de conta.
- Dependências auditadas sem vulnerabilidades reportadas na preparação.
- Entrada e página de privacidade renderizadas no navegador local.
- Chave de upload gerada em `private/mpro-upload.jks`; configuração privada em `android/keystore.properties`. Faça backup criptografado dos dois arquivos. Não compartilhe suas senhas nem os envie à Vercel.
- APK/AAB ainda não compilados. A máquina possui JDK 25, mas não foi encontrado Android SDK. Use JDK 21 e Android Studio 2025.2.1 ou superior com SDK 36 para a compilação.
- Backend real ainda não verificado: o conector encontrou `app-mpro` (`prj_Jd0ftaDZ1cfVqXkLVXSCAO1dlsXi`), mas a consulta ao escopo `thyagos-projects-2a538c0c` retornou HTTP 403. Não há CLI Vercel autenticada disponível nesta preparação.

## Configuração que depende do responsável

1. Copie `mobile/config.example.json` para `mobile/config.local.json`. Informe a origem HTTPS real do site, e-mail público de suporte/privacidade e nome do responsável. Não inclua segredos. Defina versão; aumente `versionCode` a cada nova submissão.
2. Confirme o identificador `br.com.mpro.campo` antes do primeiro envio. Se já existe um app na Play Console, use exatamente o identificador registrado, atualizando também namespace, applicationId e pacote Java. Não publique um segundo app para substituir uma atualização.
3. Confirme `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET` com no mínimo 32 caracteres aleatórios e `NVIDIA_API_KEY` no servidor Vercel. Credenciais nunca entram no APK. O modelo NVIDIA atual precisa ser confirmado na conta do provedor; a ausência da IA ativa a busca local com indicação na interface.
4. Rode `npm run db:init` com `.env.local` seguro apontando para o banco correto. O comando cria apenas tabelas ausentes e colunas de aprovação; não cria administrador ou dados de demonstração. Confira o schema existente antes de aplicar. O primeiro administrador precisa existir e ser aprovado no banco; não há senha padrão no app.
5. Contas antigas com senha em texto puro precisam de redefinição para hash scrypt. As credenciais de administrador que antes estavam no JavaScript devem ser trocadas se eram usadas fora do ambiente de exemplo. A alteração de AUTH_SECRET invalida sessões anteriores.
6. Execute `npm run mobile:sync`. Isso prepara o pacote real e escreve os dados públicos de contato usados pela PWA e política do site. Depois publique o backend e as páginas no mesmo projeto Vercel. A conexão real só pode ser considerada concluída após testar com uma conta aprovada.

## Compilar

```powershell
npm ci
npm test
npm run mobile:sync
npm run mobile:open
```

No Android Studio, configure SDK 36, JDK 21 e teste em aparelho/emulador. Para o AAB assinado:

```powershell
npm run mobile:release
```

Saída esperada: `android/app/build/outputs/bundle/release/app-release.aab`. O comando exige configuração real e assinatura. Ative Play App Signing e use esta chave como chave de upload; preserve cópias privadas. O wrapper Gradle pode baixar dependências na primeira compilação.

## Privacidade, exclusão e segurança

- URLs públicas após deploy: `/web/privacidade.html` e `/web/excluir-conta.html`. Elas precisam funcionar em HTTPS, sem login ou proteção Vercel, e ter contato real do responsável.
- Configurações → Privacidade e conta permite solicitar exclusão com e-mail, senha e confirmação, inclusive para cadastro pendente. A API exclui conta, registros, relatos de IA e arquivos com prefixo atribuído pelo servidor.
- Antes de publicar a política, confirme bases legais, retenção, backups e obrigações aplicáveis à sua operação. O texto inclui pontos pendentes de validação; não é uma certificação de conformidade jurídica.
- Arquivos antigos em Blob sem prefixo de conta e tabelas legadas `mpro.clientes`, `mpro.visitas` e `mpro.consultas_ia` exigem inventário e associação ao proprietário ou procedimento de atendimento. Não é seguro apagar arquivos globais apenas por URL enviada pelo cliente. Não declare exclusão integral de dados legados sem resolver essa migração.
- O Blob atual é público por link; não declare que fotos são acessíveis exclusivamente com login. Avalie armazenamento privado autenticado se houver evidências sensíveis. O app informa essa característica na política.
- Fotos, áudios e coordenadas são opcionais; localização apenas durante o uso. Não há permissão de localização em segundo plano, acesso amplo ao armazenamento, READ_MEDIA_IMAGES/VIDEO, publicidade ou analytics nesta versão.
- Ditado usa o serviço Android disponível, com aviso antes do envio. Gravação não garante transcrição simultânea na WebView; o usuário pode ditar separadamente ou digitar. Mapas precisam de internet; os registros locais continuam acessíveis.
- Relatos de resposta de IA são registrados em `mpro.feedback`. Administradores podem consultar `GET /api/report` com autenticação. Defina uma rotina real de análise desses relatos antes de publicação.
- O limitador existente funciona por instância serverless. Para proteção global contra abuso, configure regras adequadas no serviço de hospedagem antes de abrir o acesso ao público.

## Play Console

| Item | Preparação / ação necessária |
| --- | --- |
| Target Android | SDK 36 (Android 16), conforme requisito atual para apps novos |
| Pacote | AAB assinado, Play App Signing, versão única crescente |
| Identidade | Verificar conta de desenvolvedor, contato e titularidade do app |
| Privacidade | Política pública com responsável, contato, dados, provedores e retenção reais |
| Exclusão | URL pública e opção dentro do app; validar dados legados e backups |
| Data Safety | Preencher a declaração a partir da implementação e dos contratos dos provedores |
| Conteúdo | Classificação IARC, público-alvo profissional, declaração de anúncios e recursos de IA |
| Acesso para revisão | Fornecer conta de teste aprovada, funcional e instruções de login sem bloqueios adicionais |
| Testes | Teste interno e relatório de pré-lançamento; teste fechado quando exigido para a conta |
| Compatibilidade | Validar Android 7+, Android 16, tablets, rotação, teclado, permissões negadas e memória de 16 KB no artefato final |
| Ficha da loja | Ícone 512×512 existente em mobile/icons, screenshots reais do Android, arte de destaque 1024×500 e descrições revisadas |

Contas pessoais criadas após 13/11/2023 precisam de teste fechado com pelo menos 12 participantes inscritos continuamente por 14 dias e solicitação de acesso à produção. A aprovação depende da análise do Google.

### Rascunho da ficha

**Nome:** M-PRO Campo

**Descrição curta:** Clientes, visitas e registros agronômicos no campo, mesmo sem internet.

**Descrição:** Organize clientes, fazendas, equipamentos e visitas agronômicas. Registre avaliações, medições, fotos e notas de campo; revise laudos e gere PDF pelo sistema Android. Os registros ficam disponíveis no aparelho e sincronizam com sua conta M-PRO quando há conexão. O acesso depende de cadastro aprovado pela administração. Mapas e consultas ao assistente exigem conexão; respostas de IA devem ser revisadas pelo responsável técnico. Recursos de câmera, microfone e localização são opcionais.

Não anuncie transcrição simultânea garantida, mapas offline, notificações push ou funcionamento de IA sem configuração do provedor. A preferência de notificações atual não corresponde a um serviço de push nativo.

## Roteiro obrigatório antes de enviar

1. Cadastro pendente, aprovação, login no app e site, acesso bloqueado e sessão expirada.
2. Cliente criado no app aparece no site da mesma conta e não aparece em outra conta.
3. Criar visita offline com foto e áudio; fechar e reabrir; reconectar e conferir upload Blob, banco e laudo.
4. Editar durante envio, excluir em outro aparelho e alternar contas durante requisições pendentes.
5. Recusar cada permissão, aceitar localização aproximada, testar câmera/picker, ditado indisponível e gravação interrompida.
6. PDF com conteúdo real, links externos, mapas, botão Voltar, áreas seguras e uso em tela pequena/tablet.
7. Relatar uma resposta de IA e confirmar que o administrador consegue analisá-la.
8. Excluir conta de teste no app e pela página pública; conferir remoção no banco/Blob, invalidação de tokens e limpeza local.
9. Testar dispositivo com pouco armazenamento, reinstalação, atualização sem perda de dados e pacotes com páginas de memória de 16 KB. Conferir permissões e SDKs do AAB final.

## Fontes oficiais consultadas

- [Requisito de API alvo](https://developer.android.com/google/play/requirements/target-sdk)
- [Teste de novas contas pessoais](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Políticas Google Play](https://support.google.com/googleplay/android-developer/answer/18258653?hl=en)
- [Compatibilidade com páginas de 16 KB](https://developer.android.com/guide/practices/page-sizes)
- [Ambiente Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)
