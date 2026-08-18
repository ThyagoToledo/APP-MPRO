/* Módulo de Gravação de Áudio e Transcrição de Voz (Speech-to-Text) M-PRO */
window.MPRO = window.MPRO || {};

MPRO.audio = (function () {
  var mediaRecorder = null;
  var streamAudio = null;
  var chunksAudio = [];
  var reconhecimentoVoz = null;
  var timerGravacao = null;
  var segundosDecorridos = 0;
  var gravandoAtualmente = false;
  var transcricaoAcumulada = '';

  function formataTempo(segundos) {
    var min = Math.floor(segundos / 60);
    var seg = segundos % 60;
    return String(min).padStart(2, '0') + ':' + String(seg).padStart(2, '0');
  }

  function suportaGravacao() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  function suportaTranscricao() {
    return !!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  /**
   * Inicia a gravação de áudio e a transcrição simultânea em Português
   */
  function iniciarGravacao(cbProgresso, cbErro) {
    if (gravandoAtualmente) return;
    if (!suportaGravacao()) {
      if (cbErro) cbErro(new Error('Gravação de áudio não suportada neste navegador ou aparelho.'));
      return;
    }

    chunksAudio = [];
    segundosDecorridos = 0;
    transcricaoAcumulada = '';

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        streamAudio = stream;
        var mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
          else mimeType = '';
        }

        try {
          mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
        } catch (e) {
          mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) chunksAudio.push(e.data);
        };

        mediaRecorder.start(250); // Coleta a cada 250ms
        gravandoAtualmente = true;

        // Inicia timer
        timerGravacao = setInterval(function () {
          segundosDecorridos++;
          if (cbProgresso) {
            cbProgresso({
              gravando: true,
              segundos: segundosDecorridos,
              tempoFormatado: formataTempo(segundosDecorridos),
              transcricao: transcricaoAcumulada
            });
          }
        }, 1000);

        // Inicia reconhecimento de voz se suportado
        if (suportaTranscricao()) {
          try {
            var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            reconhecimentoVoz = new SpeechRec();
            reconhecimentoVoz.lang = 'pt-BR';
            reconhecimentoVoz.continuous = true;
            reconhecimentoVoz.interimResults = true;

            reconhecimentoVoz.onresult = function (event) {
              var textoInterim = '';
              for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                  transcricaoAcumulada += event.results[i][0].transcript + ' ';
                } else {
                  textoInterim += event.results[i][0].transcript;
                }
              }
              var textoTotal = (transcricaoAcumulada + textoInterim).trim();
              if (cbProgresso) {
                cbProgresso({
                  gravando: true,
                  segundos: segundosDecorridos,
                  tempoFormatado: formataTempo(segundosDecorridos),
                  transcricao: textoTotal
                });
              }
            };

            reconhecimentoVoz.onerror = function (err) {
              console.warn('Aviso no reconhecimento de voz:', err.error);
            };

            reconhecimentoVoz.start();
          } catch (eRec) {
            console.warn('Reconhecimento de fala não iniciado:', eRec.message);
          }
        }
      })
      .catch(function (err) {
        gravandoAtualmente = false;
        if (cbErro) cbErro(err);
      });
  }

  /**
   * Finaliza a gravação e retorna o arquivo de áudio e a transcrição
   */
  function pararGravacao() {
    return new Promise(function (resolve) {
      if (!gravandoAtualmente) {
        resolve(null);
        return;
      }

      clearInterval(timerGravacao);
      gravandoAtualmente = false;

      if (reconhecimentoVoz) {
        try { reconhecimentoVoz.stop(); } catch (e) {}
      }

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = function () {
          var mime = mediaRecorder.mimeType || 'audio/webm';
          var blob = new Blob(chunksAudio, { type: mime });
          var audioUrl = URL.createObjectURL(blob);

          // Encerra faixas do microfone para liberar o hardware
          if (streamAudio) {
            streamAudio.getTracks().forEach(function (t) { t.stop(); });
          }

          var leitor = new FileReader();
          leitor.onload = function () {
            resolve({
              id: MPRO.store ? MPRO.store.newId('audio') : 'aud_' + Date.now(),
              dataUrl: leitor.result,
              url: audioUrl,
              blob: blob,
              duracaoSegundos: segundosDecorridos,
              duracaoFormatada: formataTempo(segundosDecorridos),
              transcricao: transcricaoAcumulada.trim() || 'Nota de áudio gravada em campo.',
              tipo: mime,
              criadoEm: new Date().toISOString()
            });
          };
          leitor.readAsDataURL(blob);
        };
        mediaRecorder.stop();
      } else {
        if (streamAudio) {
          streamAudio.getTracks().forEach(function (t) { t.stop(); });
        }
        resolve(null);
      }
    });
  }

  /**
   * Ditado direto para um campo de texto (botão de microfone inline)
   */
  function ditarParaCampo(elementoInputOuTextarea, cbAtualizado) {
    if (!suportaTranscricao()) {
      MPRO.ui.snack('Ditado por voz não suportado neste navegador. Use o Chrome ou Edge.');
      return null;
    }

    var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = new SpeechRec();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = true;

    var valorInicial = elementoInputOuTextarea.value ? elementoInputOuTextarea.value + ' ' : '';
    MPRO.ui.snack('Ouvindo… Fale a sua observação técnica.');

    rec.onresult = function (event) {
      var transcrito = '';
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        transcrito += event.results[i][0].transcript;
      }
      elementoInputOuTextarea.value = (valorInicial + transcrito).trim();
      if (cbAtualizado) cbAtualizado(elementoInputOuTextarea.value);
    };

    rec.onerror = function (e) {
      console.warn('Erro no ditado:', e.error);
      MPRO.ui.snack('Ditado finalizado ou cancelado.');
    };

    rec.onend = function () {
      MPRO.ui.snack('Texto transcrito com sucesso!');
    };

    rec.start();
    return rec;
  }

  /**
   * Estrutura o texto da transcrição em seções agronômicas técnicas
   */
  function estruturarTextoAgronomico(texto) {
    if (!texto || !texto.trim()) return [];
    var t = texto.toLowerCase();

    var secoes = [];

    // 1. Irrigação
    if (t.includes('pressão') || t.includes('pivô') || t.includes('irrigação') || t.includes('bar') || t.includes('vazão') || t.includes('gotejo')) {
      var statusIrrigacao = (t.includes('abaixo') || t.includes('vazamento') || t.includes('baixo') || t.includes('entup')) ? 'monitorar' : 'adequado';
      secoes.push({
        chave: 'irrigacao',
        titulo: 'Irrigação & Manejo Hídrico',
        texto: 'Pressão e distribuição observadas no setor. ' + (t.includes('bar') ? 'Parâmetros de pressão registrados.' : 'Condições operacionais avaliadas.'),
        status: statusIrrigacao
      });
    }

    // 2. Condição geral e Fitossanidade
    if (t.includes('folha') || t.includes('praga') || t.includes('lagarta') || t.includes('ferrugem') || t.includes('mancha') || t.includes('coloração') || t.includes('stand')) {
      var statusSanidade = (t.includes('ataque') || t.includes('sintoma') || t.includes('severo') || t.includes('dano')) ? 'corrigir' : 'adequado';
      secoes.push({
        chave: 'sanidade',
        titulo: 'Condição Vegetativa e Fitossanidade',
        texto: 'Avaliação foliar e vigor vegetativo. ' + (t.includes('uniforme') ? 'Desenvolvimento homogêneo.' : 'Presença de pontos de atenção identificados.'),
        status: statusSanidade
      });
    }

    // 3. Solo e Nutrição
    if (t.includes('solo') || t.includes('raiz') || t.includes('ph') || t.includes('adubo') || t.includes('adubação') || t.includes('umidade')) {
      var statusSolo = (t.includes('ácido') || t.includes('compactad') || t.includes('deficiên')) ? 'corrigir' : 'adequado';
      secoes.push({
        chave: 'solo_raiz',
        titulo: 'Nutrição & Solo',
        texto: 'Condições de umidade e enraizamento da cultura.',
        status: statusSolo
      });
    }

    // 4. Recomendações
    if (t.includes('recomenda') || t.includes('aplicar') || t.includes('revisar') || t.includes('regular') || t.includes('antes') || t.includes('próxima')) {
      secoes.push({
        chave: 'recomendacao',
        titulo: 'Recomendação Técnica Prioritária',
        texto: texto,
        status: 'corrigir'
      });
    }

    if (!secoes.length) {
      secoes.push({
        chave: 'geral',
        titulo: 'Síntese Técnica da Visita',
        texto: texto,
        status: 'adequado'
      });
    }

    return secoes;
  }

  return {
    suportaGravacao: suportaGravacao,
    suportaTranscricao: suportaTranscricao,
    iniciarGravacao: iniciarGravacao,
    pararGravacao: pararGravacao,
    ditarParaCampo: ditarParaCampo,
    estruturarTextoAgronomico: estruturarTextoAgronomico,
    formataTempo: formataTempo,
    estaGravando: function () { return gravandoAtualmente; }
  };
})();
