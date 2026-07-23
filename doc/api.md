# API (serverless / Vercel + Neon)

Funções serverless em [`api/`](../api), servidas pela Vercel em `/api/*`. Cada uma usa o driver
`@neondatabase/serverless` e lê a conexão de `process.env.DATABASE_URL`.

## Configuração obrigatória na Vercel

Sem isto a API responde 500. No painel do projeto na Vercel:

**Settings → Environment Variables →** adicione `DATABASE_URL` com a string de conexão do Neon
(a mesma do `Chaves.md`, campo `DATABASE_URL`). Marque os ambientes Production/Preview/Development
e faça um novo deploy.

Localmente, `vercel dev` lê a env var de um arquivo `.env` (ignorado pelo git).

## Endpoints

Padrão REST por entidade. Coleção em `/api/<entidade>`; item por `?id=<uuid>`.

As entidades são atendidas por um único roteador dinâmico `api/[entity].js` (mais `auth` e
`health`) — três funções no total, para caber no limite de 12 Serverless Functions do plano Hobby.
Os caminhos abaixo não mudam.

| Método | Rota | Ação |
| --- | --- | --- |
| GET | `/api/health` | Diagnóstico do banco + contadores. |
| GET | `/api/clientes` | Lista clientes. |
| GET | `/api/clientes?id=` | Um cliente. |
| POST | `/api/clientes` | Cria (body JSON). |
| PATCH | `/api/clientes?id=` | Atualiza. |
| DELETE | `/api/clientes?id=` | Remove. |
| — | `/api/propriedades` `?cliente_id=` | idem (filtro por cliente). |
| — | `/api/unidades` `?propriedade_id=` | idem. |
| — | `/api/culturas` `?unidade_id=` | idem. |
| — | `/api/visitas` `?cliente_id=` `?status=` | idem. |
| — | `/api/medicoes` `?visita_id=` | idem. |
| — | `/api/evidencias` `?visita_id=` `?tipo=` | idem. |
| — | `/api/transcricoes` `?evidencia_id=` | idem. |
| — | `/api/relatorios` `?cliente_id=` `?visita_id=` | idem. |
| — | `/api/equipamentos` `?cliente_id=` `?status=` | idem. |
| — | `/api/consultas` `?cliente_id=` | log do assistente IA. |
| POST | `/api/auth?action=register` | Cria usuário (`nome, email, empresa, senha`). |
| POST | `/api/auth?action=login` | Autentica (`email, senha`). |

Senhas são guardadas com hash scrypt salgado (adequado ao protótipo; para produção usar um
provedor de identidade ou bcrypt/argon2 com política de sessão).

## Cliente no front-end

`mpro-prototype.js` expõe `window.MPRO.api` com `get/post/patch/del`. Exemplo:

```js
const clientes = await MPRO.api.get('clientes');
await MPRO.api.post('clientes', { nome: 'Fazenda X' });
```

O login e o cadastro já usam a API (com fallback para o modo protótipo quando `/api` não está
disponível, por exemplo ao abrir os arquivos localmente sem `vercel dev`).

## Conta demo

`demo@mpro.app` / `demo1234` (criada no seed). Há também alguns clientes e equipamentos de exemplo.
