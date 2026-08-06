/* Listas controladas do domínio agronômico. Não é dado de usuário nem de demonstração:
   são os valores que os formulários oferecem e que o relatório precisa reconhecer. */
window.MPRO = window.MPRO || {};

MPRO.catalogo = (function () {
  var culturas = ['Soja', 'Milho', 'Café', 'Algodão', 'Cana', 'Tomate', 'Hortaliças', 'Pastagem'];

  var blocosAvaliacao = [
    { chave: 'geral', rotulo: 'Condição geral' },
    { chave: 'irrigacao', rotulo: 'Irrigação' },
    { chave: 'nutricao', rotulo: 'Nutrição' },
    { chave: 'sanidade', rotulo: 'Sanidade' },
    { chave: 'solo', rotulo: 'Solo e raiz' }
  ];

  var tiposEquipamento = ['Irrigação', 'Medição', 'Aplicação', 'Preparo', 'Outro'];

  return {
    culturas: culturas,
    blocosAvaliacao: blocosAvaliacao,
    tiposEquipamento: tiposEquipamento,
    blocoPorChave: function (chave) {
      return blocosAvaliacao.filter(function (bloco) { return bloco.chave === chave; })[0] || null;
    }
  };
})();
