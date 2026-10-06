// Captura o elemento do parágrafo de resposta
const jresposta = document.querySelector("#resposta");

function atv() {
  // Captura o elemento input e seu valor
  const inputProd = document.querySelector("#prod");
  const jprod = inputProd.value.trim();

  // Validação simples para evitar inserir itens em branco
  if (!jprod) {
    jresposta.textContent = "Por favor, digite o nome de um produto.";
    return;
  }

  // Lista base de produtos
  const frutas = ['Maçã', 'Banana', 'Melancia'];

  // Adiciona o produto digitado no array
  frutas.push(jprod);

  // Exibe no console para conferência
  console.log("Produto inserido:", jprod);
  console.log("Lista completa:", frutas);

  // Atualiza o parágrafo HTML com a lista formatada
  jresposta.textContent = "Produtos: " + frutas.join(", ");

  // Limpa o campo de entrada após enviar
  inputProd.value = "";
}