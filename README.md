<h1 align="center">M-PRO</h1>

<p align="center">
  Plataforma de acompanhamento agronômico que transforma anotações de campo em relatórios
  padronizados, preserva o histórico técnico de cada cliente e permite consultas assistidas
  por IA com rastreabilidade até a visita de origem.
</p>

---

## Estado deste repositório

**Este repositório contém apenas documentação.** O protótipo navegável (15 telas HTML, motor de
navegação, API serverless e schema PostgreSQL) foi removido em 27/07/2026 para que a construção
recomece a partir de uma especificação organizada, e não de um protótipo acumulado.

Nada foi perdido: todo o código está no histórico do git, no commit `beffe4d`
(também publicado em `ThyagoToledo/APP-MPRO`). Para consultar ou recuperar:

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
