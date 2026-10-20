/* =====================================================
   A) MENU HAMBÚRGUER (celular)
   ===================================================== */

// const: cria uma variável que não será reatribuída.
// document.getElementById("..."): procura no HTML o elemento com esse id e guarda aqui.
const btnMenu = document.getElementById("btn-menu"); // o botão ☰
const menu = document.getElementById("menu");        // a lista de links

// addEventListener("click", função): "quando clicarem neste elemento, execute esta função".
// () => { ... } é uma arrow function: uma função escrita de forma curta.
btnMenu.addEventListener("click", () => {
  // classList.toggle("aberto"): se o elemento TEM a classe "aberto", remove; se NÃO tem, adiciona.
  // Retorna true quando a classe foi adicionada. O CSS usa .menu.aberto para mostrar o menu.
  const aberto = menu.classList.toggle("aberto");

  // setAttribute(nome, valor): muda um atributo do HTML.
  // Atualiza o aria-expanded para os leitores de tela saberem se o menu está aberto.
  btnMenu.setAttribute("aria-expanded", aberto);
});

// querySelectorAll("a"): devolve TODOS os links <a> dentro do menu.
// forEach(link => ...): repete o código para cada link encontrado.
menu.querySelectorAll("a").forEach(link =>
  link.addEventListener("click", () => {
    // Ao clicar em um link, fecha o menu (senão ele ficaria aberto cobrindo a página).
    menu.classList.remove("aberto");        // remove a classe → o CSS esconde o menu
    btnMenu.setAttribute("aria-expanded", "false"); // avisa que está fechado
  })
);

/* =====================================================
   B) SELETOR DE TORRA
   ===================================================== */

// Objeto: guarda dados em pares "chave: valor".
// Cada torra é outro objeto com nome, cor e texto. Para acessar: torras.clara.nome
const torras = {
  clara:  { nome: "Torra clara",  cor: "#c98a4b", texto: "Acidez viva e notas de frutas e flores. Ótima no coador." },
  media:  { nome: "Torra média",  cor: "#8a5a35", texto: "Equilibrada, com notas de chocolate e caramelo. Serve para todo dia." },
  escura: { nome: "Torra escura", cor: "#3b2417", texto: "Corpo intenso e sabor marcante. Combina com café com leite." }
};

// querySelectorAll com seletor CSS: pega os 3 botões dentro do elemento #opcoes-torra.
const botoes = document.querySelectorAll("#opcoes-torra button");

// function: declara uma função reutilizável. "chave" é o parâmetro ("clara", "media" ou "escura").
function mostrarTorra(chave) {
  const t = torras[chave]; // busca o objeto da torra escolhida. Colchetes permitem usar uma variável como chave.

  // textContent: define o texto de um elemento (seguro, não interpreta HTML).
  document.getElementById("torra-nome").textContent = t.nome;
  document.getElementById("torra-texto").textContent = t.texto;

  // style.background: muda a cor de fundo direto pelo JavaScript.
  document.getElementById("grao").style.background = t.cor;

  // Percorre os botões: o que tem data-torra igual à chave escolhida fica "pressionado" (true).
  // b.dataset.torra lê o atributo data-torra do HTML. === compara valor e tipo.
  botoes.forEach(b => b.setAttribute("aria-pressed", b.dataset.torra === chave));
}

// Para cada botão, liga um clique que chama mostrarTorra com a torra daquele botão.
botoes.forEach(b => b.addEventListener("click", () => mostrarTorra(b.dataset.torra)));

// Chama a função uma vez ao carregar, para a página já começar com a torra clara exibida.
mostrarTorra("clara");

/* =====================================================
   C) VALIDAÇÃO DO FORMULÁRIO
   ===================================================== */

const form = document.getElementById("form"); // o <form> inteiro

// Função auxiliar: mostra (ou limpa) a mensagem de erro de um campo.
// campo = "nome", "email" ou "mensagem". mensagem = texto do erro ("" significa sem erro).
function erro(campo, mensagem) {
  // "erro-" + campo junta textos: vira "erro-nome", "erro-email"... (o id do <span> de erro)
  document.getElementById("erro-" + campo).textContent = mensagem;

  // classList.toggle(classe, condição): com 2º argumento, adiciona a classe se for true e remove se for false.
  // Aqui: o campo fica vermelho ("invalido") apenas quando existe mensagem de erro.
  document.getElementById(campo).classList.toggle("invalido", mensagem !== "");

  // Retorna true se o campo está válido (sem mensagem). !== significa "diferente de".
  return mensagem === "";
}

// "submit" é o evento disparado quando o formulário é enviado. "evento" traz informações sobre ele.
form.addEventListener("submit", (evento) => {
  // preventDefault(): cancela o comportamento padrão (recarregar a página ao enviar).
  evento.preventDefault();

  // form.nome acessa o campo pelo atributo name="nome". .value é o que o usuário digitou.
  // trim() remove espaços no começo e no fim (evita aceitar só "   ").
  const nome = form.nome.value.trim();
  const email = form.email.value.trim();
  const mensagem = form.mensagem.value.trim();

  // Expressão regular (regex): um "padrão" de texto. Este exige: algo + @ + algo + . + algo.
  // .test(email) devolve true se o e-mail combina com o padrão.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Operador ternário: condição ? valorSeVerdadeiro : valorSeFalso.
  // length é a quantidade de caracteres do texto.
  const v1 = erro("nome", nome.length < 2 ? "Digite seu nome." : "");
  const v2 = erro("email", emailOk ? "" : "Digite um e-mail válido, como nome@email.com.");
  const v3 = erro("mensagem", mensagem.length < 10 ? "Escreva pelo menos 10 caracteres." : "");
  // v1, v2 e v3 guardam true/false: cada campo passou na validação?

  // && significa "E": só entra no if se os três campos forem válidos.
  if (v1 && v2 && v3) {
    form.reset(); // limpa todos os campos
    document.getElementById("sucesso").style.display = "block"; // mostra a mensagem de sucesso
    // Num projeto real, aqui você enviaria os dados com fetch() para um serviço como o Formspree.
  } else {
    // Se algum campo falhou, garante que a mensagem de sucesso fique escondida.
    document.getElementById("sucesso").style.display = "none";
  }
});
