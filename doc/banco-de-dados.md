# Banco de dados

O M-PRO usa **PostgreSQL** (Neon, free tier). O schema fica em
[`db/schema.sql`](../db/schema.sql) e é **idempotente** — pode ser reaplicado sem erro.

## Modelo

Tudo vive no schema `mpro`. Hierarquia de cadastro e fluxo da visita:

```
cliente
 └─ propriedade
     └─ unidade_produtiva  ──(cultura por período)── culturas_unidade
visita ── medicoes
      ├─ evidencias ── transcricoes
      └─ relatorios (versão imutável)
equipamentos · usuarios · consultas_ia
```

| Tabela | Papel |
| --- | --- |
| `usuarios` | Técnicos, gestores e (futuro) clientes. |
| `clientes` | Cliente atendido, isolado dos demais. |
| `propriedades` | Fazendas/áreas de um cliente (com lat/long e área). |
| `unidades_produtivas` | Estufas, talhões ou canteiros de uma propriedade. |
| `culturas_unidade` | Cultura de uma unidade por período (não assume cultura fixa). |
| `visitas` | Visita técnica (condição, irrigação, nutrição, recomendações, status). |
| `medicoes` | Medições da visita (valor + unidade + contexto, ex.: 1,5 bar). |
| `evidencias` | Fotos, vídeos e áudios fixados à visita (título, legenda, ordem). |
| `transcricoes` | Transcrição estruturada de áudios. |
| `relatorios` | PDF gerado, versão imutável por visita. |
| `equipamentos` | Inventário e status de equipamentos/sensores. |
| `consultas_ia` | Log do assistente, com referências às visitas usadas. |

Tipos enumerados: `visita_status`, `situacao_indicador`, `evidencia_tipo`,
`equipamento_status`, `usuario_papel`.

## Como aplicar o schema

As credenciais **não** ficam no repositório (ver `.gitignore`). Guarde a
`DATABASE_URL` do Neon num arquivo local (por exemplo `Chaves.md` ou `.env`) e rode:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## Segurança

Este repositório é apenas o protótipo de interface (HTML estático). **Não** coloque a string de
conexão do Postgres no navegador: credenciais de banco no cliente ficam expostas a qualquer
visitante. O acesso ao banco deve passar por uma camada de back-end/API (a ser criada), que lê a
`DATABASE_URL` de variável de ambiente no servidor.
