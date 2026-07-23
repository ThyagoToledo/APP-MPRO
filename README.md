<h1 align="center">M-PRO</h1>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

<p align="center">
  Protótipo navegável do <b>M-PRO</b>, plataforma de acompanhamento agronômico que transforma
  anotações de campo em relatórios padronizados, com histórico por cliente e consultas por IA.
</p>

---

## Estrutura do Projeto

```
APP-MPRO/
├── 📄 index.html                     # Entrada: redireciona para a tela de login
├── 📄 mpro-prototype.js              # Motor de navegação compartilhado por todas as telas
├── 📄 vercel.json                    # Configuração do deploy estático na Vercel
├── 📄 testar-app-mpro.bat            # Servidor local para testar no Windows
├── 📁 login_m_pro_fundo_planta_o/    # Cada pasta é uma tela (code.html)
├── 📁 in_cio_dashboard_refinado/     # Dashboard principal
├── 📁 nova_visita_formul_rio/        # Formulário de visita técnica
├── 📁 ... (demais telas)             # Evidências, transcrição, revisão, IA, etc.
└── 📁 doc/                           # Documentação técnica
```

---

## Hub de Documentação

- **[Fluxo e telas](doc/fluxo-e-telas.md)**: mapa de navegação, lista completa de telas e como o motor de navegação funciona.

---

## Quick Start

### Deploy na Vercel

O projeto é um site estático — não há etapa de build. Basta importar o repositório na Vercel
(ou rodar a CLI); o `index.html` da raiz é servido automaticamente e redireciona para o login.

```bash
npm i -g vercel
vercel
```

### Execução local

No Windows, dê um duplo clique em `testar-app-mpro.bat` (ele valida o Python e sobe um servidor
local). Em qualquer sistema com Python:

```bash
python -m http.server 4173
# abra http://localhost:4173/
```

---

## Sobre o protótipo

Este repositório contém apenas o protótipo de interface (HTML, Tailwind via CDN e um script de
navegação). Ele simula o fluxo de ponta a ponta — login, dashboard, cadastro de visita, registro
fotográfico, evidências, transcrição, revisão em PDF e assistente de IA — sem back-end. A visão de
produto e os requisitos completos são mantidos no vault de documentação do time.

---

Sob licença MIT. Veja [LICENSE](LICENSE) para detalhes.
