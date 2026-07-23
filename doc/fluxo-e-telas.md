# Fluxo e telas do protótipo M-PRO

Protótipo navegável (HTML estático) do M-PRO, plataforma de acompanhamento agronômico que
transforma anotações de campo em relatórios padronizados, preserva o histórico técnico de cada
cliente e permite consultas assistidas por IA com rastreabilidade até a visita de origem.

## Fluxo principal

```
Login ──▶ Dashboard ──▶ Clientes/Mapa ──▶ Nova Visita
                                              │
        Registro Fotográfico ◀───────────────┘
                    │
              Evidências ──▶ Transcrição ──▶ Revisão e PDF
```

Navegação lateral (menu) e navegação inferior dão acesso direto a Dashboard, Clientes, Nova
Visita, Evidências, Assistente IA, Equipamentos, Perfil e Configurações a partir de qualquer tela.

## Telas

| Pasta | Tela |
| --- | --- |
| `login_m_pro_fundo_planta_o` | Entrada e autenticação (ponto de partida). |
| `registro_m_pro_fundo_floresta` | Cadastro de nova conta. |
| `in_cio_dashboard_refinado` | Dashboard principal (início pós-login). |
| `in_cio_dashboard` | Versão inicial do dashboard, preservada como referência de design. |
| `mapa_de_clientes_e_planta_es` | Clientes, propriedades e plantações no mapa. |
| `nova_visita_formul_rio` | Formulário guiado de visita técnica. |
| `registro_fotogr_fico` | Captura e ordenação do registro fotográfico. |
| `evid_ncias_multim_dia` | Fotos, vídeos e áudios da visita. |
| `transcri_o_e_estrutura_o` | Transcrição de áudio e estruturação do conteúdo. |
| `revis_o_e_finaliza_o` | Revisão final e geração do relatório em PDF. |
| `assistente_ia_agron_mico` | Consultas em linguagem natural sobre os relatórios. |
| `gest_o_de_equipamentos` | Inventário e status de equipamentos e sensores. |
| `perfil_do_usu_rio` | Perfil do técnico. |
| `editar_perfil` | Edição dos dados do perfil. |
| `configura_es_do_sistema` | Preferências do sistema. |

## Motor de navegação

Toda a interatividade do protótipo vive em [`mpro-prototype.js`](../mpro-prototype.js), um único
script compartilhado por todas as telas. Ele resolve os cliques por rótulo/ícone, injeta o menu
lateral em qualquer tela que tenha o botão de menu, trata os botões de voltar/cancelar pelo
histórico e simula os retornos de formulário (login, cadastro, salvar visita, gerar PDF).

O script detecta automaticamente se está sendo servido a partir da raiz (Vercel, `index.html`) ou
de dentro de uma pasta, então os mesmos arquivos funcionam no deploy e no teste local.
