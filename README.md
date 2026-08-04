<p align="center">
  <img src="app/assets/mpro-app-icon.svg" width="112" alt="Símbolo da marca M-PRO">
</p>

<h1 align="center">M-PRO</h1>

<p align="center">
  Plataforma de acompanhamento agronômico que transforma anotações de campo em relatórios
  padronizados, preserva o histórico técnico de cada cliente e permite consultas assistidas
  por IA com rastreabilidade até a visita de origem.
</p>

---

## Estado deste repositório

| Pasta | O que é |
| --- | --- |
| `doc/` | Especificação do produto — a fonte de verdade. |
| `app/` | Front-end de campo, em HTML/CSS/JS sem build. |
| `app/vendor/` | Leaflet 1.9.4 local (mapa) — única dependência, sem CDN em runtime. |
| `design/` | Canvas "M-PRO Campo" importado do Claude Design, com o runtime que ele usa. |
| `output/pdf/` | Prancha de interfaces e evidências da auditoria visual. |

O `app/` implementa a interface navegável completa em HTML/CSS/JS: Login, Registro, Dashboard,
Clientes e detalhe, Mapa, Visitas e detalhe, Nova visita em 4 etapas, Registro fotográfico,
Evidências, Transcrição, Revisão/PDF, Equipamentos, Assistente IA, Perfil, Editar perfil e
Configurações. A marca fornecida foi vetorizada em `app/assets/` e aplicada ao favicon, cabeçalhos,
rail e telas de sessão.

Busca, filtros, cadastros em sheet, rascunhos, observações, medições, recomendações, fotos,
finalização de visita, manutenção de equipamentos, conversa com referências, perfil e preferências
funcionam localmente, com edição e exclusão de clientes, visitas (incluindo duplicar como rascunho)
e equipamentos. O mapa é um Leaflet real com OpenStreetMap e camada de satélite Esri (sem chave):
marcadores por status sincronizados com o cadastro, busca e filtro no próprio mapa, "Minha
localização" com tratamento de permissão negada, rota externa via app de mapas e card de cliente
com ações. Há tema claro/escuro, shell responsivo e estados de carregamento, vazio, erro e offline.
Os dados ficam no `localStorage`, escopados por conta de demonstração ou conta nova — não há
back-end, autenticação real, upload remoto nem IA remota; os blocos do mapa dependem de rede.

O passe de acabamento de 03/08/2026 consolidou foco visível, hierarquia de superfícies, estados de
interação, busca com contagem sincronizada, filtros mais claros, confirmação destrutiva destacada,
contenção de foco em sheets/drawer e instruções explícitas nos fluxos demonstrativos. A camada de
acabamento está isolada em `app/css/polish.css`, sobre os tokens e componentes existentes.

### Rodar

```bash
python -m http.server 4173 --directory app
```

Depois abra `http://localhost:4173`. Não há dependências nem passo de build.

### Verificação local

```bash
Get-ChildItem app/js -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Em 03/08/2026, as 18 superfícies de rota foram abertas nos breakpoints mobile e desktop; os fluxos
de conta nova, cadastro, mapa, visita completa, equipamentos, assistente e tema foram exercitados
sem erro de console ou overflow horizontal. O roteiro e as limitações estão em
[Roadmap e estado](doc/07-roadmap-e-estado.md).

Uma prancha de 12 páginas com dez telas representativas e o resumo da auditoria está disponível em
[Interfaces de exemplo — 03/08/2026](output/pdf/mpro-interfaces-2026-08-03.pdf).

O protótipo anterior (15 telas HTML, API serverless e schema PostgreSQL) foi removido em
27/07/2026 e está preservado no commit `beffe4d`, também publicado em `ThyagoToledo/APP-MPRO`:

```bash
git show beffe4d --stat
git checkout beffe4d -- <caminho>
```

O que aquele código provou na prática está registrado em
[Roadmap e estado](doc/07-roadmap-e-estado.md) — leia antes de reimplementar.

---

## Hub de documentação

| Documento | Para quê |
| --- | --- |
| [1. Visão do produto](doc/01-visao-produto.md) | O que o M-PRO é, para quem, o que está dentro e fora do escopo. |
| [2. Requisitos](doc/02-requisitos.md) | Requisitos funcionais e não funcionais, regras de negócio, critérios de aceite. |
| [3. Sistema de telas](doc/03-sistema-de-telas.md) | Mapa de navegação, contrato de navegação e o detalhamento de cada tela. |
| [4. Modelo de dados](doc/04-modelo-de-dados.md) | Entidades, relações e enums que sustentam o produto. |
| [5. Contrato da API](doc/05-contrato-api.md) | Endpoints, filtros e regras de autorização esperados do back-end. |
| [6. Design system](doc/06-design-system.md) | Tokens de cor, tipografia, espaçamento e ergonomia de campo. |
| [7. Roadmap e estado](doc/07-roadmap-e-estado.md) | Fases, backlog priorizado e o que já foi validado no protótipo. |

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
- `03_context/` — auditorias de relatório real, bugs e visitas de referência.

Esta documentação é a **projeção técnica** daquele material: o vault define o que o produto
precisa ser; o `doc/` deste repositório define como isso vira telas, dados e API.

---

Sob licença MIT. Veja [LICENSE](LICENSE) para detalhes.
