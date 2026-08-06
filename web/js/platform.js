/* Configuração do módulo web (site com domínio próprio).

   Decisões desta fase:
   - acesso restrito: só entra quem já tem registro aprovado no banco do servidor;
   - sem autocadastro — o site não cria conta em hipótese alguma;
   - `auth.endpoint` vazio significa que nenhum acesso é liberado nesta instalação;
   - o mesmo banco local do aplicativo é usado como cache de trabalho, escopado por usuário.

   Ao publicar no host definitivo, preencha `auth.endpoint` e `nuvem.baseUrl` com a URL
   pública da API. Segredos ficam no servidor; aqui só entram URLs. */
MPRO.configurarPlataforma({
  alvo: 'web',
  nome: 'M-PRO',
  auth: { modo: 'gated', endpoint: null, contatoAcesso: 'contato@mpro.agr.br' },
  db: { driver: 'auto', nome: 'mpro-web' },
  nuvem: { baseUrl: null, intervaloMs: 60000 },
  ia: { modo: 'local', endpoint: null },
  recursos: { onboarding: false, instalavel: false, landing: true }
});
