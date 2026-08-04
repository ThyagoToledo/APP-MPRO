/* Fallback honesto para hashes fora do inventário de rotas. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.placeholder = function () {
  var ui = MPRO.ui;
  var h = ui.h;

  return {
    grupo: 'B',
    chave: null,
    titulo: 'Página não encontrada',
    render: function () {
      return ui.emptyState({
        icone: 'explore_off',
        titulo: 'Este endereço não existe',
        texto: 'Use a navegação do M-PRO para voltar a uma tela disponível.',
        acao: {
          rotulo: 'Voltar ao Início',
          icone: 'home',
          onClick: function () { location.hash = '#/'; }
        }
      });
    }
  };
};
