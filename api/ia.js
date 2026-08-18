// Backend Serverless para Consulta Assistida com IA (NVIDIA NIM - Nemotron 3 Ultra)
import { sql, send, readJson } from './_db.js';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODELO_IA = 'nvidia/nemotron-3-ultra-550b-a55b';

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido. Use POST.' });

    const body = await readJson(req);
    const pergunta = (body.pergunta || body.prompt || '').trim();
    const clienteId = body.clienteId || null;
    const contextoFront = Array.isArray(body.contexto) ? body.contexto : [];

    if (!pergunta) {
      return send(res, 400, { error: 'A pergunta é obrigatória.' });
    }

    // 1. Coleta contexto do banco de dados caso haja cliente selecionado
    let contextoDb = [];
    let nomeCliente = '';

    if (clienteId) {
      try {
        const clienteRows = await sql`SELECT nome, municipio, uf, area_total_ha FROM mpro.clientes WHERE id = ${clienteId};`;
        if (clienteRows.length) {
          nomeCliente = clienteRows[0].nome;
          contextoDb.push(`Cliente/Produtor: ${clienteRows[0].nome} (${clienteRows[0].municipio || ''}/${clienteRows[0].uf || ''}, Área: ${clienteRows[0].area_total_ha || 'N/I'} ha)`);
        }

        const visitas = await sql`
          SELECT data_visita, cultura, condicao_geral, irrigacao, nutricao, sanidade, solo_raiz, recomendacoes, conclusao, situacao
          FROM mpro.visitas
          WHERE cliente_id = ${clienteId}
          ORDER BY data_visita DESC
          LIMIT 5;
        `;

        visitas.forEach(v => {
          contextoDb.push(
            `Visita em ${v.data_visita} (${v.cultura || 'Cultura geral'} - Situação: ${v.situacao || 'adequado'}):\n` +
            `- Condição geral: ${v.condicao_geral || 'Sem nota'}\n` +
            `- Irrigação: ${v.irrigacao || 'N/A'} | Nutrição: ${v.nutricao || 'N/A'} | Sanidade: ${v.sanidade || 'N/A'}\n` +
            `- Solo e Raiz: ${v.solo_raiz || 'N/A'}\n` +
            `- Recomendações: ${v.recomendacoes || 'N/A'}\n` +
            `- Conclusão: ${v.conclusao || 'N/A'}`
          );
        });

        const equipamentos = await sql`
          SELECT nome, tipo, status, ultima_manutencao, proxima_manutencao
          FROM mpro.equipamentos
          WHERE cliente_id = ${clienteId}
          LIMIT 5;
        `;

        equipamentos.forEach(e => {
          contextoDb.push(`Equipamento: ${e.nome} (${e.tipo || 'Geral'} - Status: ${e.status})`);
        });
      } catch (errDb) {
        console.warn('Aviso: busca no banco falhou, usando contexto do front-end:', errDb.message);
      }
    }

    // 2. Mescla contexto do front-end com o do banco
    const trechosFormatados = [
      ...contextoDb,
      ...contextoFront.map(t => `${t.rotulo || 'Registro'} (${t.data || 'Histórico'}): ${t.texto || ''}`)
    ].filter(Boolean);

    const contextoGeral = trechosFormatados.length > 0
      ? trechosFormatados.join('\n\n---\n\n')
      : 'Nenhum histórico anterior específico encontrado para este produtor no momento.';

    // 3. Monta prompt agronômico do sistema
    const systemPrompt = `Você é o Assistente Agronômico Inteligente da M-PRO (especialista técnico em agricultura de precisão, fisiologia vegetal, manejo de solos, irrigação, nutrição e fitossanidade).

OBJETIVO:
Responder com precisão e clareza às dúvidas técnicas do consultor ou produtor, priorizando os dados reais coletados em campo fornecidos no contexto abaixo.

HISTÓRICO E REGISTROS DE CAMPO DISPONÍVEIS:
${contextoGeral}

DIRETRIZES DE RESPOSTA:
1. Responda em Português do Brasil de forma profissional, direta e técnica.
2. Quando houver registros específicos no histórico de campo (visitas, medições, adubações ou problemas sanados), cite-os para embasar sua resposta.
3. Se a pergunta for geral ou teórica sobre agronomia, responda com as melhores práticas agronômicas consolidadas.
4. Estruture a resposta com tópicos ou parágrafos concisos quando houver recomendações de manejo.`;

    // 4. Chamada à API da NVIDIA (Nemotron)
    const nvidiaRes = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: MODELO_IA,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pergunta }
        ],
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096
      })
    });

    if (!nvidiaRes.ok) {
      const errBody = await nvidiaRes.text();
      console.error('Erro na resposta da NVIDIA:', nvidiaRes.status, errBody);
      throw new Error(`Serviço de IA retornou status ${nvidiaRes.status}: ${errBody}`);
    }

    const nvidiaData = await nvidiaRes.json();
    const textoResposta = nvidiaData.choices?.[0]?.message?.content || 'Não foi possível gerar a resposta no momento.';

    // 5. Gera referências citáveis para a interface
    const referencias = contextoFront.map(t => ({
      titulo: t.origem?.titulo || t.rotulo || 'Registro de campo',
      rota: t.origem?.rota || '#/',
      data: t.data || null
    })).filter((ref, idx, self) => idx === self.findIndex(r => r.titulo === ref.titulo && r.rota === ref.rota));

    // 6. Tenta salvar histórico de consulta no banco
    try {
      await sql`
        INSERT INTO mpro.consultas_ia (pergunta, resposta, modelo)
        VALUES (${pergunta}, ${textoResposta}, ${MODELO_IA});
      `;
    } catch {
      /* ignora erro de log */
    }

    return send(res, 200, {
      texto: textoResposta,
      referencias: referencias,
      modelo: MODELO_IA,
      provedor: 'NVIDIA NIM'
    });
  } catch (e) {
    console.error('Erro no handler da IA:', e);
    return send(res, 500, { error: String(e && e.message || e) });
  }
}
