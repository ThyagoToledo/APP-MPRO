<p align="center">
  <img src="core/assets/mpro-app-icon.svg" width="112" alt="Símbolo da marca M-PRO">
</p>

<h1 align="center">M-PRO</h1>

<p align="center">
  Plataforma de acompanhamento agronômico que transforma anotações de campo em relatórios
  padronizados, preserva o histórico técnico de cada cliente e permite consultas assistidas
  com rastreabilidade até a visita de origem.
</p>

---

## Os módulos

| Pasta | O que é | Onde vai parar |
| --- | --- | --- |
| `core/` | Todo o comportamento do produto: telas, roteador, banco local, fila de envio, consulta assistida e design system. Não tem página própria. | — |
| `mobile/` | Aplicativo de campo Android. Sem login, banco no aparelho, funciona offline. | Google Play |
| `web/` | Site público (`index.html`) e sistema restrito (`sistema.html`). | Host com domínio próprio |
| `doc/` | Especificação do produto — a fonte de verdade. | — |
| `design/` | Canvas "M-PRO Campo" importado do Claude Design. | — |
| `tools/` | Utilitários de build sem dependências (geração de ícones). | — |
| `output/pdf/` | Pranchas de auditoria e a apresentação comercial. Foram geradas antes da remoção do seed e ainda mostram a carteira de exemplo. | — |

`mobile/` e `web/` não duplicam código: cada um carrega o `core/` por caminho relativo e o
configura antes do boot, num único arquivo de plataforma. A separação inteira, o contrato de
plataforma e o funcionamento da fila estão em
[Módulos, banco local e sincronização](doc/08-modulos-e-sincronizacao.md).

## O que já funciona

Dashboard, Clientes, Mapa, Visitas, Nova visita em 4 etapas, Registro fotográfico, Evidências,
Transcrição, Revisão, Equipamentos, Consulta assistida, Perfil e Configurações — com busca,
filtros, rascunhos, medições, recomendações, fotos, finalização de visita e ciclo completo de
criar/editar/excluir em clientes, visitas e equipamentos.

O mapa é um Leaflet real com OpenStreetMap e satélite Esri (sem chave), marcadores por status
sincronizados com o cadastro, geolocalização com tratamento de permissão negada e rota externa pelo
app de navegação do aparelho.

**Os dados são gravados primeiro no aparelho**, em IndexedDB, escopados por espaço de trabalho.
Cada escrita entra numa fila de sincronização idempotente. Enquanto não houver servidor
configurado, o app diz textualmente que está em modo somente-local — nada é perdido e nada é
simulado. Não há dados de demonstração: o aplicativo abre vazio e o primeiro registro é real.

A consulta assistida recupera trechos do banco local, filtrando por cliente **antes** da busca, e
cita a visita de origem. No modo local ela declara que não há modelo de linguagem envolvido; o
caminho remoto está pronto e só espera a URL do servidor intermediário. Nenhuma chave, token ou
segredo existe no front-end.

## Rodar

```bash
python -m http.server 4173
```

- Site: `http://localhost:4173/web/`
- Sistema web: `http://localhost:4173/web/sistema.html`
- Aplicativo: `http://localhost:4173/mobile/`

O servidor precisa subir na **raiz do repositório**, porque `mobile/` e `web/` referenciam `core/`.
Não há dependências nem passo de build.

## Acesso

O aplicativo Android não tem tela de login nesta fase: o primeiro acesso pede como o técnico assina
os relatórios e libera o uso, com tudo gravado localmente. Quando o vínculo com a nuvem for ligado,
o espaço de trabalho já existente é preservado.

O sistema web só entra com cadastro **já criado e aprovado** no banco da M-PRO. Não existe
autocadastro. Sem servidor de autenticação configurado, nenhum acesso é liberado — e a tela diz
isso em vez de fingir uma sessão.

## Publicar

### Vercel (hoje)

O `vercel.json` serve a raiz do repositório: `/` redireciona para o site, `/mobile/` é o aplicativo
instalável e `/core/` é servido como estático. O `.vercelignore` mantém documentação e design fora
do deploy. Não há framework nem build.

### Play Store

```bash
node tools/gerar-icones.js
```

Depois publique `mobile/` em HTTPS e gere o pacote com Bubblewrap ou PWABuilder apontando para
`https://<domínio>/mobile/manifest.webmanifest`. O roteiro completo está em
[Módulos, banco local e sincronização](doc/08-modulos-e-sincronizacao.md), seção 8.5.

## Verificação local

```bash
node --check core/js/app.js
```

Em 05/08/2026 foram validados: `node --check` em todos os arquivos JavaScript; primeiro acesso do
aplicativo; cadastro persistindo em IndexedDB entre recargas e entrando na fila; mapa com marcador
real; consulta assistida citando a visita de origem; recusa de login no sistema web por falta de
cadastro aprovado; 14 rotas em 375×812 sem overflow horizontal; e service worker com o shell em
cache. O roteiro e as limitações estão em [Roadmap e estado](doc/07-roadmap-e-estado.md).

---

## Hub de documentação

| Documento | Para quê |
| --- | --- |
| [1. Visão do produto](doc/01-visao-produto.md) | O que o M-PRO é, para quem, o que está dentro e fora do escopo. |
| [2. Requisitos](doc/02-requisitos.md) | Requisitos funcionais e não funcionais, regras de negócio, critérios de aceite. |
| [3. Sistema de telas](doc/03-sistema-de-telas.md) | Mapa de navegação, contrato de navegação e o detalhamento de cada tela. |
| [4. Modelo de dados](doc/04-modelo-de-dados.md) | Entidades, relações e enums que sustentam o produto. |
| [5. Contrato da API](doc/05-contrato-api.md) | Endpoints, filtros, autorização e as rotas de login, sincronização e consulta. |
| [6. Design system](doc/06-design-system.md) | Tokens de cor, tipografia, espaçamento e ergonomia de campo. |
| [7. Roadmap e estado](doc/07-roadmap-e-estado.md) | Fases, backlog priorizado e o que já foi validado. |
| [8. Módulos e sincronização](doc/08-modulos-e-sincronizacao.md) | Separação em módulos, banco local, fila híbrida, molde de IA e publicação. |

Comece por [Visão do produto](doc/01-visao-produto.md) e depois
[Sistema de telas](doc/03-sistema-de-telas.md) — juntos eles descrevem o produto inteiro.

---

## Relação com o vault

A fonte de verdade de produto vive no vault do time, em
`Brain/doc/10_projects/Colaborador1/mpro-app`:

- `00_spec/mpro-app-visao-requisitos.md` — visão e requisitos originais;
- `01_plan/mpro-app-planejamento-mvp.md` — fases, backlog e riscos;
- `02_design/mpro-app-experiencia-relatorio-fotografico.md` — experiência de visita e PDF;
- `02_design/mpro-prompt-claude-design-v2.md` — sistema visual e contrato de navegação;
- `03_context/` — auditorias de relatório real, bugs e decisões de arquitetura.

Esta documentação é a **projeção técnica** daquele material: o vault define o que o produto
precisa ser; o `doc/` deste repositório define como isso vira telas, dados e API.

---

Sob licença MIT. Veja [LICENSE](LICENSE) para detalhes.
