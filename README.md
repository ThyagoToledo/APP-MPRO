<p align="center">
  <img src="core/assets/banner.jpg" alt="M-PRO Banner" width="650px" style="border-radius: 14px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);" />
</p>

<p align="center">
  <img src="core/assets/mpro-app-icon.svg" alt="M-PRO Icon" width="96px" height="96px" style="border-radius: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);" />
</p>

<h1 align="center">M-PRO · Manejo de Precisão em Recursos Operacionais</h1>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Neon-PostgreSQL_17-00E599?style=for-the-badge&logo=postgresql&logoColor=white" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/NVIDIA_NIM-Nemotron_550B-76B900?style=for-the-badge&logo=nvidia&logoColor=white" alt="NVIDIA NIM" />
  <img src="https://img.shields.io/badge/Vercel-Blob_Storage_CDN-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Blob" />
  <img src="https://img.shields.io/badge/PWA-Local_First_Offline-143820?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/LGPD-Lei_13.709-006439?style=for-the-badge" alt="LGPD" />
</p>

<p align="center">
  <b>M-PRO</b> é uma plataforma profissional de inteligência e acompanhamento agronômico de precisão que transforma anotações de campo em relatórios técnicos estruturados. O software realiza auditoria de lavouras, calibração de pivôs centrais e equipamentos de irrigação, transcrição de notas de voz em tempo real via IA, processamento e compressão de evidências fotográficas em nuvem CDN, mapeamento geoespacial de propriedades e consultas técnicas assistidas por <b>NVIDIA Nemotron-3 Ultra (550B)</b>, com arquitetura <b>Local-First 100% offline</b> para o trabalho em campo.
</p>

---

## Índice

* [Visão Geral](#visao-geral)
* [Componentes Principais](#componentes-principais)
* [Controle de Acesso & Governança por Cargo](#controle-de-acesso--governanca-por-cargo)
* [Arquitetura & Engenharia Local-First](#arquitetura--engenharia-local-first)
* [Inteligência Artificial & Voz em Campo](#inteligencia-artificial--voz-em-campo)
* [Cibersegurança & Conformidade LGPD](#ciberseguranca--conformidade-lgpd)
* [Tecnologias Utilizadas](#tecnologias-utilizadas)
* [Execução Local & Deploy](#execucao-local--deploy)
* [Autor](#autor)
* [Licença](#licenca)

---

<a name="visao-geral"></a>
## <img src="core/assets/icon-visao.svg" width="24" height="24" align="absmiddle" alt="Visão Geral" /> Visão Geral

O **M-PRO** foi desenvolvido para solucionar a fragmentação das vistorias agronômicas em fazendas. A plataforma unifica todo o ciclo operacional em um fluxo coeso e seguro: desde a coleta de parâmetros de solo, água e sanidade na lavoura até a emissão de laudos técnicos completos em PDF.

Construído sob a filosofia **Local-First**, todo dado gerado em campo é armazenado instantaneamente no banco local do dispositivo (IndexedDB). Assim que a conectividade é restabelecida, uma fila de sincronização (*Outbox idempotente*) atualiza o banco de dados em nuvem (**Neon Serverless PostgreSQL**) e despacha as fotos e áudios para a CDN global do **Vercel Blob Storage**.

---

<a name="componentes-principais"></a>
## Componentes Principais

### <img src="core/assets/icon-visita.svg" width="22" height="22" align="absmiddle" alt="Ícone Visitas" /> Gestão de Visitas Agronômicas em 4 Etapas
* **Etapa 1 · Identificação & Dados de Entrada:** Seleção de produtor, fazenda/unidade, cultura, responsável técnico e captura automática de coordenadas GPS.
* **Etapa 2 · Avaliação Técnica & Medições:** Classificação visual com status semânticos (*Adequado*, *Monitorar*, *Corrigir*) para Irrigação, Solo, Sanidade e Nutrição, além de medições numéricas com unidade (bar, PSI, mm, m³/h).
* **Etapa 3 · Registro Fotográfico & Evidências:** Captura de fotos georreferenciadas com compressão automática em Canvas para formato WebP (~150KB), reordenação de imagens e envio em nuvem CDN.
* **Etapa 4 · Revisão & Emissão do Laudo:** Checklist automatizado de publicação, compilação de síntese técnica e geração de PDF formatado para impressão ou compartilhamento direto.

### <img src="core/assets/icon-audio.svg" width="22" height="22" align="absmiddle" alt="Ícone Áudio" /> Gravação de Áudio de Campo & Transcrição por Voz
* **Captura de Áudio em Tempo Real:** Gravação contínua no campo (`MediaRecorder API`) com reprodução interativa, visualizador de ondas sonoras (*waveform*) e medição de duração.
* **Transcrição de Voz (Speech-to-Text em pt-BR):** Ditado inteligente por voz para observações e recomendações técnicas.
* **Estruturação Agronômica:** Separação automática do relato falado em blocos técnicos (*Irrigação*, *Sanidade*, *Solo*, *Recomendações*) com aplicação direta ao laudo com 1 toque.

### <img src="core/assets/icon-mapa.svg" width="22" height="22" align="absmiddle" alt="Ícone Mapa" /> Mapeamento Geoespacial de Fazendas & Talhões
* **Mapa Interativo Leaflet:** Renderização de marcadores sincronizados por status de vistoria, integração com OpenStreetMap e camada de Satélite de alta resolução (Esri).
* **Roteamento de Campo:** Disparo de rotas geográficas para o app de navegação padrão do smartphone (Google Maps / Waze).

### <img src="core/assets/icon-equipamento.svg" width="22" height="22" align="absmiddle" alt="Ícone Equipamentos" /> Metrologia & Parque de Equipamentos
* **Inventário de Infraestrutura:** Cadastro e histórico operacional de pivôs centrais, manômetros, bombas centrífugas, aspersores e bicos de pulverização.
* **Aferição & Calibração de Pressão:** Acompanhamento de manometria e desvios de pressão operacional em campo.

---

<a name="controle-de-acesso--governanca-por-cargo"></a>
## <img src="core/assets/icon-rbac.svg" width="24" height="24" align="absmiddle" alt="Controle de Acesso" /> Controle de Acesso & Governança por Cargo

A plataforma M-PRO implementa controle de acesso baseado em funções (*Role-Based Access Control - RBAC*), segregando permissões técnicas e administrativas para garantir integridade agronômica e conformidade:

<p align="center">
  <img src="core/assets/mpro-cargos.jpg" alt="Controle de Acesso por Cargo M-PRO" width="700px" style="border-radius: 12px; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);" />
</p>

| Perfil / Cargo | Escopo de Acesso | Principais Responsabilidades |
|---|---|---|
| **Técnico de Campo** | Operação Mobile / Local-First | Coleta de dados de campo, medições de manômetros, registro fotográfico comprimido, notas de voz e emissão de minutas de vistoria. |
| **Gestor Agronômico** | Visão Global & Inteligência | Homologação de laudos técnicos, acompanhamento multi-fazenda da equipe, análise de safras e diagnósticos assistidos por IA Nemotron 550B. |
| **Administrador** | Governança & Segurança | Controle total do sistema, aprovação/rejeição de novos cadastros, gestão de perfis de acesso, revogação e auditoria de segurança. |

---

<a name="arquitetura--engenharia-local-first"></a>
## <img src="core/assets/icon-architecture.svg" width="24" height="24" align="absmiddle" alt="Arquitetura" /> Arquitetura & Engenharia Local-First

O ecossistema é modularizado em três camadas limpas, garantindo zero duplicação de código:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CORE COMPILADO (core/)                          │
│  Telas · Roteador · DB IndexedDB/LocalStorage · Sync Outbox · Design System │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│     MOBILE (mobile/)  │                             │       WEB (web/)      │
│  PWA Android Offline  │                             │  Site Institucional & │
│  Sem Login Obrigatório│                             │  Sistema Restrito Gated│
└───────────────────────┘                             └───────────────────────┘
```

* **Escopo por Usuário:** No navegador, o banco local é isolado por chave de workspace (`u-<id>`), impedindo vazamento de dados em computadores compartilhados.
* **Lápides de Exclusão (*Tombstones*):** A exclusão física só ocorre após a confirmação de recebimento pela nuvem, evitando que registros deletados offline ressuscitem após a sincronização.

---

<a name="inteligencia-artificial--voz-em-campo"></a>
## <img src="core/assets/icon-ai.svg" width="24" height="24" align="absmiddle" alt="Inteligência Artificial" /> Inteligência Artificial & Voz em Campo

* **Motor IA:** Modelo de ponta **NVIDIA Nemotron-3 Super (550B Instruct)** hospedado via NVIDIA NIM.
* **RAG Contextual Multi-Fazenda:** A IA responde dúvidas agronômicas processando exclusivamente os laudos e medições históricas das propriedades autorizadas pelo usuário, citando a data e a visita de origem.
* **Histórico Leve:** Armazenamento local de até 30 sessões de conversa com restauração instantânea e limpeza a qualquer momento.

---

<a name="ciberseguranca--conformidade-lgpd"></a>
## <img src="core/assets/icon-security.svg" width="24" height="24" align="absmiddle" alt="Cibersegurança" /> Cibersegurança & Conformidade LGPD

O projeto adota padrões estritos de **Defesa em Profundidade** validados pela skill `cybersecurity-hardening`:

* **Validação de Assinatura Binária (Magic Bytes):** O backend inspeciona o cabeçalho binário real dos arquivos recebidos (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `52 49 46 46...WEBP`, WebM: `1A 45 DF A3`), bloqueando o upload de Web Shells ou arquivos maliciosos camuflados.
* **Proteção contra SQL Injection (SQLi):** 100% das consultas ao Neon PostgreSQL utilizam *Tagged Template Queries* parametrizadas.
* **Prevenção de Timing Attacks:** Autenticação por tokens assinados com HMAC-SHA256 e validação com `crypto.timingSafeEqual`.
* **Rate Limiting em Janela Deslizante:** Proteção contra força bruta em logins (10/min), cadastros (5/5min), consultas de IA (15/min) e uploads (30/min).
* **Permissions-Policy Estrita:** `camera=(self), microphone=(self), geolocation=(self)` restringe o uso de sensores exclusivamente à origem confiável do app.
* **Conformidade com a LGPD (Lei nº 13.709/2018):**
  * Pop-up de consentimento interativo no primeiro login com aceite obrigatório registrado com timestamp.
  * Formalização das bases legais de Execução de Contrato (Art. 7º, V) e Legítimo Interesse (Art. 7º, IX).
  * Garantia de sigilo: dados e imagens não são comercializados nem usados em retreinamento público de terceiros.

---

<a name="tecnologias-utilizadas"></a>
## <img src="core/assets/icon-tech.svg" width="24" height="24" align="absmiddle" alt="Tecnologias" /> Tecnologias Utilizadas

| Camada | Tecnologias |
|---|---|
| **Frontend** | Vanilla JavaScript (ES6+), HTML5 Semântico, CSS3 Custom Properties (Design Tokens) |
| **Computação de Voz & Mídia** | Web Speech API (`pt-BR`), MediaRecorder API, HTML5 Canvas WebP Compressor |
| **Banco Local & Cache** | IndexedDB, LocalStorage, Service Workers, Cache Storage API |
| **Backend Serverless** | Node.js 20.x, Vercel Serverless Functions (`api/`) |
| **Banco de Dados em Nuvem** | Neon Serverless PostgreSQL 17 (`@neondatabase/serverless`) |
| **Armazenamento de Arquivos** | Vercel Blob Storage CDN (`@vercel/blob`) |
| **Inteligência Artificial** | NVIDIA NIM API (`nvidia/nemotron-3-super-550b-instruct`) |
| **Mapeamento & Geoespacial** | Leaflet 1.9.4, OpenStreetMap, Esri World Imagery |
| **Design & Ícones** | Material Symbols Outlined / Sharp, Marca Vetorial Oficial M-PRO SVG |

---

<a name="execucao-local--deploy"></a>
## <img src="core/assets/icon-terminal.svg" width="24" height="24" align="absmiddle" alt="Execução Local" /> Execução Local & Deploy

### 1. Execução Local (Sem necessidade de build)

Como o core do sistema é construído em JavaScript nativo moderno, não há necessidade de etapas de compilação pesadas:

```bash
# Clone o repositório
git clone https://github.com/ThyagoToledo/APP-MPRO.git
cd APP-MPRO

# Suba um servidor HTTP estático na raiz do projeto
python -m http.server 4173
# ou: npx serve . -p 4173
```

Acesse no navegador:
* **Landing Page:** `http://localhost:4173/web/`
* **Sistema Restrito Web:** `http://localhost:4173/web/sistema.html`
* **Aplicativo Mobile PWA:** `http://localhost:4173/mobile/`

---

### 2. Variáveis de Ambiente (`.env` local ou Vercel)

Para habilitar a integração completa com o banco Neon, Vercel Blob e IA NVIDIA em desenvolvimento:

```env
DATABASE_URL="postgresql://usuario:senha@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token_..."
NVIDIA_API_KEY="nvapi-..."
AUTH_SECRET="segredo_para_assinatura_hmac_sha256"
```

---

### 3. Deploy na Vercel

O projeto possui configuração nativa em `vercel.json` para roteamento estático e execução serverless automática:

```bash
# Deploy direto via Vercel CLI
vercel --prod
```

---

<a name="autor"></a>
## Autor

<div align="center">
  <table style="border: none; border-collapse: collapse; margin: auto;">
    <tr>
      <td align="center" style="padding: 16px;">
        <a href="https://github.com/ThyagoToledo">
          <img src="https://github.com/ThyagoToledo.png" width="110px" alt="Thyago Toledo" style="border-radius: 50%; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" />
        </a>
        <br />
        <b>Thyago Toledo</b>
        <br />
        <sub>Engenharia de Software & Arquitetura de Sistemas</sub>
        <br />
        <br />
        <a href="https://github.com/ThyagoToledo">
          <img src="https://img.shields.io/badge/GitHub-ThyagoToledo-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
        </a>
      </td>
    </tr>
  </table>
</div>

---

<a name="licenca"></a>
## Licença

Projeto desenvolvido com arquitetura proprietária e independente para a plataforma **M-PRO**. Todos os direitos reservados.
