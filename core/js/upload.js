/* Módulo de Compressão e Upload de Imagens / Evidências para CDN (Vercel Blob) */
window.MPRO = window.MPRO || {};

MPRO.upload = (function () {
  /**
   * Redimensiona e comprime imagens no navegador antes de trafegar na rede.
   * Reduz fotos de câmeras de ~5MB para ~150KB mantendo resolução agronômica nítida.
   */
  function comprimirImagem(origem, maxDimensao, qualidade) {
    maxDimensao = maxDimensao || 1600;
    qualidade = qualidade !== undefined ? qualidade : 0.82;

    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var largura = img.width;
        var altura = img.height;

        if (largura > maxDimensao || altura > maxDimensao) {
          if (largura > altura) {
            altura = Math.round((altura * maxDimensao) / largura);
            largura = maxDimensao;
          } else {
            largura = Math.round((largura * maxDimensao) / altura);
            altura = maxDimensao;
          }
        }

        var canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, largura, altura);

        // Tenta WebP primeiro, com fallback para JPEG
        var formato = 'image/webp';
        var dataUrl = canvas.toDataURL(formato, qualidade);
        if (!dataUrl.startsWith('data:image/webp')) {
          formato = 'image/jpeg';
          dataUrl = canvas.toDataURL(formato, qualidade);
        }

        resolve({
          dataUrl: dataUrl,
          formato: formato,
          largura: largura,
          altura: altura
        });
      };
      img.onerror = function (erro) {
        reject(new Error('Falha ao processar arquivo de imagem.'));
      };

      if (typeof origem === 'string') {
        img.src = origem;
      } else if (origem instanceof Blob || origem instanceof File) {
        var leitor = new FileReader();
        leitor.onload = function (e) { img.src = e.target.result; };
        leitor.onerror = reject;
        leitor.readAsDataURL(origem);
      } else {
        reject(new Error('Formato de entrada inválido para compressão.'));
      }
    });
  }

  /**
   * Envia uma imagem para o backend serverless e retorna a URL permanente na CDN do Vercel Blob.
   * Se o usuário estiver offline no campo, retorna a imagem comprimida localmente.
   */
  function enviar(origem, opts) {
    opts = opts || {};
    var pasta = opts.pasta || 'visitas';
    var nome = opts.nome || (typeof origem === 'object' && origem.name ? origem.name : 'foto.webp');

    return comprimirImagem(origem, opts.maxDimensao, opts.qualidade)
      .then(function (comprimida) {
        // Se estiver offline ou sem conectividade, usa o base64 comprimido no banco local
        if (!navigator.onLine) {
          return {
            url: comprimida.dataUrl,
            nome: nome,
            tamanho: Math.round((comprimida.dataUrl.length * 3) / 4),
            tipo: comprimida.formato,
            offline: true
          };
        }

        var endpoint = '/api/upload';
        return fetch(endpoint, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, MPRO.session.cabecalhos()),
          body: JSON.stringify({
            imagem: comprimida.dataUrl,
            pasta: pasta,
            nome: nome
          })
        }).then(function (res) {
          if (!res.ok) {
            // Em caso de erro do servidor, usa o fallback local para não travar o laudo
            console.warn('Aviso: falha no upload para nuvem (HTTP ' + res.status + '). Usando armazenamento local.');
            return {
              url: comprimida.dataUrl,
              nome: nome,
              tipo: comprimida.formato,
              offline: false
            };
          }
          return res.json();
        }).then(function (dados) {
          return {
            url: dados.url || comprimida.dataUrl,
            pathname: dados.pathname,
            nome: nome,
            tamanho: dados.tamanho,
            tipo: dados.tipo || comprimida.formato,
            provedor: dados.provedor
          };
        }).catch(function (err) {
          console.warn('Upload falhou, fallback para imagem local comprimida:', err.message);
          return {
            url: comprimida.dataUrl,
            nome: nome,
            tipo: comprimida.formato,
            offline: true
          };
        });
      });
  }

  return {
    comprimirImagem: comprimirImagem,
    enviar: enviar
  };
})();
