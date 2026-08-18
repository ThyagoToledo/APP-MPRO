---
name: brain-knowledge-vault
description: >-
  Skill canônica para interagir, consultar e manter o cérebro/knowledge vault URSoftware Brain
  localizado em c:/Users/test/Desktop/Projeto/Brain. Use sempre que for iniciar tarefas em qualquer projeto,
  planejar novas funcionalidades, registrar decisões de arquitetura, consultar requisitos ou documentar novos sistemas.
---

# URSoftware Brain — Knowledge Vault Skill

O **Brain** (`c:/Users/test/Desktop/Projeto/Brain`) é o cérebro central de conhecimento, arquitetura, regras de engenharia e especificações canônicas de todos os projetos da organização.

---

## 1. Diretrizes Obrigatórias de Consulta e Documentação

Sempre que atuar em projetos da organização (como `APP-MPRO`, `Site`, `TensuraGame`, etc.):

1. **Consultar o Vault Primeiro:**
   - Antes de iniciar refatorações, decisões arquiteturais ou criação de novas telas, consulte a documentação canônica correspondente em `Brain/doc/10_projects/<projeto>/`.
   - Consulte as regras gerais de engenharia e Clean Code em `Brain/doc/00_rules/` e `Brain/.agents/AGENTS.md`.

2. **Manter o Vault Atualizado:**
   - Ao concluir uma decisão arquitetural, adicionar uma nova integração de IA, criar novas tabelas ou implementar um módulo de segurança, **crie ou atualize o documento canônico** no diretório `Brain/doc/10_projects/<projeto>/`.
   - Mantenha a sintaxe de **Wikilinks** do Obsidian (`[[nome-do-arquivo]]`) e atualize o `MOC-<projeto>.md` e o `00_MOC.md`.

3. **Seguir as Regras do Agente e do Vault:**
   - **Engenharia orientada por contratos e testes:** Decompor módulos grandes, criar interfaces limpas e testáveis.
   - **Clean Code:** Funções pequenas com responsabilidade única, nomes expressivos, cláusulas de guarda (*fail-fast*) e sem números mágicos.
   - **Segurança e Zero Credenciais:** Nunca versionar tokens, chaves ou senhas em nenhum repositório.

---

## 2. Estrutura Canônica do Vault

- **`doc/00_MOC.md`**: Índice geral do cérebro.
- **`doc/00_rules/`**: Regras operacionais, desenvolvimento limpo e padrões de segurança.
- **`doc/10_projects/`**: Especificações, planos mestres, contratos de API e modelos de dados por projeto.
  - `mpro/`: Documentação oficial e canônica do ecossistema M-PRO (Web, Mobile PWA, Neon PostgreSQL, IA Nemotron).
- **`doc/20_workflows/`**: Processos, pipelines e automações.
- **`doc/30_libraries/`**: Referências conceituais e padrões de mercado.
