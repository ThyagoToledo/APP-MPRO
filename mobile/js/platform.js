/* Configuração do módulo Android (Play Store).

   Decisões desta fase:
   - sem tela de login: a identidade é o perfil escolhido no primeiro acesso;
   - banco local obrigatório, com IndexedDB;
   - nuvem desligada: tudo é gravado no aparelho e a fila fica pronta para subir
     assim que `nuvem.baseUrl` apontar para o servidor M-PRO;
   - consulta assistida em modo local, sobre os registros do próprio aparelho.

   Ligar a nuvem depois é só preencher `nuvem.baseUrl` e `auth`. Nenhuma chave entra aqui. */
MPRO.configurarPlataforma({
  alvo: 'mobile',
  nome: 'M-PRO Campo',
  auth: { modo: 'local' },
  db: { driver: 'auto', nome: 'mpro-campo' },
  nuvem: { baseUrl: null, intervaloMs: 60000 },
  ia: { modo: 'local', endpoint: null },
  recursos: { onboarding: true, instalavel: true, landing: false }
});
