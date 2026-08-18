---
name: cybersecurity-hardening
description: >-
  Auditoria e implementação de segurança cibernética para aplicações web e serverless.
  Cobre mitigação do OWASP Top 10, autenticação com tokens HMAC-SHA256, proteção contra força bruta
  e DoS com rate limiting, mitigação de SQLi com tagged template queries, defesa contra DOM XSS,
  prevenção de timing attacks com timingSafeEqual e configuração de Security Headers (HSTS, CSP, nosniff, SAMEORIGIN).
---

# Cybersecurity Hardening & Security Audit Skill

Esta skill estabelece os padrões e o checklist de verificação para auditorias e implementações de segurança em aplicações web, APIs e funções serverless.

---

## 1. Checklist de Auditoria de Segurança

### A. Autenticação e Autorização (OWASP A01 & A07)
- [ ] **Tokens com Assinatura Criptográfica:** Use HMAC-SHA256 para assinar tokens com um segredo forte.
- [ ] **Verificação de Revogação em Tempo Real:** Sempre valide no banco de dados se o usuário está com `status = 'aprovado'` antes de conceder acesso a rotas administrativas ou de escrita.
- [ ] **Proteção de Rotas:** Endpoints de administração devem checar rigorosamente a permissão de administrador (`papel === 'admin'`).
- [ ] **Criptografia de Senhas:** Use algoritmos modernos de derivação de chave como `scrypt` com salt aleatório criptográfico (mínimo 16 bytes).
- [ ] **Prevenção de Timing Attacks:** Compare hashes e assinaturas usando `crypto.timingSafeEqual`.

### B. Proteção contra Força Bruta e DoS (OWASP A04)
- [ ] **Rate Limiting em Rotas Críticas:**
  - Login: máximo 10 requisições/minuto por IP.
  - Cadastro/Solicitação: máximo 5 requisições a cada 5 minutos por IP.
  - Consultas pesadas / IA: limite de chamadas por minuto para evitar exaustão de cotas.
- [ ] **Respostas Padrão com Código 429:** Inclua o cabeçalho `Retry-After`.

### C. Injeção de Código e SQLi (OWASP A03)
- [ ] **Queries Parametrizadas:** Nunca faça concatenação de strings em SQL (`sql + userInput`). Utilize tagged templates (`sql`SELECT ... WHERE id = ${id}``).
- [ ] **Defesa contra DOM XSS:** Evite `innerHTML` com variáveis externas; utilize `textContent` ou criação de nós DOM nativos (`document.createElement` / `h()`).
- [ ] **Limitação de Tamanho de Entrada:** Defina tamanhos máximos para inputs textuais e perguntas de IA para evitar exaustão de memória/contexto.

### D. Cabeçalhos HTTP de Segurança (OWASP A05)
Sempre declare os seguintes headers nas respostas e no arquivo de hospedagem (`vercel.json`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`

### E. Gestão de Segredos
- [ ] Nunca inclua senhas, tokens ou chaves em arquivos versionados pelo Git.
- [ ] Utilize arquivos `.env` ignorados no `.gitignore` localmente e variáveis seguras (*Sensitive*) na plataforma de nuvem (Vercel).
