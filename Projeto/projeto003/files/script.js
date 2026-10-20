/* =====================================================
   1. ELEMENTOS DA PÁGINA
   getElementById procura no HTML o elemento com aquele id.
   ===================================================== */
const form = document.getElementById("form-tarefa");
const campo = document.getElementById("campo-tarefa");
const lista = document.getElementById("lista");
const vazio = document.getElementById("vazio");
const contador = document.getElementById("contador");
const botoesFiltro = document.querySelectorAll("#filtros button"); // todos os botões de filtro
const botaoLimpar = document.getElementById("limpar");

/* =====================================================
   2. ESTADO DA APLICAÇÃO
   "Estado" são os dados que a tela representa. Sempre alteramos o estado
   primeiro e depois redesenhamos a tela a partir dele.
   ===================================================== */
const CHAVE = "tarefas-v1"; // nome sob o qual os dados ficam salvos no navegador

// Cada tarefa é um objeto: { id: número, texto: "...", concluida: true/false }
let tarefas = carregar();     // array com todas as tarefas
let filtroAtual = "todas";    // "todas", "pendentes" ou "concluidas"

/* =====================================================
   3. SALVAR E CARREGAR (localStorage)
   O localStorage guarda texto no navegador e mantém os dados ao recarregar a página.
   ===================================================== */
function salvar() {
  // JSON.stringify transforma o array em texto, pois o localStorage só guarda texto.
  localStorage.setItem(CHAVE, JSON.stringify(tarefas));
}

function carregar() {
  try {
    // getItem devolve o texto salvo (ou null se não existir).
    // "|| '[]'" usa um array vazio como valor padrão. JSON.parse converte o texto de volta em array.
    return JSON.parse(localStorage.getItem(CHAVE) || "[]");
  } catch (erro) {
    // Se o texto estiver corrompido, o JSON.parse falha; então começamos com lista vazia.
    return [];
  }
}

/* =====================================================
   4. AÇÕES (alteram o estado e redesenham a tela)
   ===================================================== */
function adicionar(texto) {
  tarefas.push({
    id: Date.now(),     // número único baseado na hora atual (milissegundos)
    texto: texto,
    concluida: false
  });
  atualizar();
}

function alternar(id) {
  // find: devolve o primeiro item do array que satisfaz a condição.
  const tarefa = tarefas.find(t => t.id === id);
  tarefa.concluida = !tarefa.concluida; // "!" inverte true/false
  atualizar();
}

function excluir(id) {
  // filter: cria um novo array mantendo apenas as tarefas com id DIFERENTE do excluído.
  tarefas = tarefas.filter(t => t.id !== id);
  atualizar();
}

function editarTexto(id, novoTexto) {
  const tarefa = tarefas.find(t => t.id === id);
  tarefa.texto = novoTexto;
  atualizar();
}

function limparConcluidas() {
  tarefas = tarefas.filter(t => !t.concluida); // mantém só as pendentes
  atualizar();
}

/* Salva os dados e redesenha a tela. Chamada depois de toda alteração. */
function atualizar() {
  salvar();
  desenhar();
}

/* =====================================================
   5. DESENHAR A LISTA NA TELA
   ===================================================== */
function desenhar() {
  lista.innerHTML = ""; // esvazia a lista (aqui é seguro: é um texto vazio nosso)

  // Escolhe quais tarefas mostrar conforme o filtro ativo.
  let visiveis = tarefas;
  if (filtroAtual === "pendentes")  visiveis = tarefas.filter(t => !t.concluida);
  if (filtroAtual === "concluidas") visiveis = tarefas.filter(t => t.concluida);

  // Para cada tarefa visível, cria o <li> e o coloca na lista.
  visiveis.forEach(t => lista.appendChild(criarItem(t)));

  // hidden = true esconde a mensagem; só a mostramos quando não há nada a exibir.
  vazio.hidden = visiveis.length > 0;

  // Contador: quantas tarefas ainda estão pendentes.
  const pendentes = tarefas.filter(t => !t.concluida).length;
  contador.textContent = pendentes === 1 ? "1 tarefa restante" : pendentes + " tarefas restantes";

  // Desabilita "Limpar concluídas" se não houver nenhuma concluída.
  botaoLimpar.disabled = !tarefas.some(t => t.concluida); // some: true se ALGUM item satisfaz
}

/* Cria o elemento <li> de uma tarefa. */
function criarItem(t) {
  // createElement cria um elemento HTML novo, ainda fora da página.
  const li = document.createElement("li");
  li.className = "tarefa" + (t.concluida ? " concluida" : ""); // define as classes CSS

  // Checkbox para marcar como concluída
  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = t.concluida;
  check.setAttribute("aria-label", "Concluir: " + t.texto);
  check.addEventListener("change", () => alternar(t.id)); // "change" dispara ao marcar/desmarcar

  // Texto da tarefa. textContent insere como TEXTO PURO, o que evita injeção de HTML (segurança).
  const texto = document.createElement("span");
  texto.className = "texto";
  texto.textContent = t.texto;
  texto.addEventListener("dblclick", () => iniciarEdicao(li, texto, t)); // duplo clique também edita

  // Botão de editar
  const btnEditar = document.createElement("button");
  btnEditar.type = "button";
  btnEditar.className = "acao";
  btnEditar.textContent = "Editar";
  btnEditar.addEventListener("click", () => iniciarEdicao(li, texto, t));

  // Botão de excluir
  const btnExcluir = document.createElement("button");
  btnExcluir.type = "button";
  btnExcluir.className = "acao excluir";
  btnExcluir.textContent = "Excluir";
  btnExcluir.setAttribute("aria-label", "Excluir: " + t.texto);
  btnExcluir.addEventListener("click", () => excluir(t.id));

  // append: coloca todos os elementos dentro do <li>, na ordem.
  li.append(check, texto, btnEditar, btnExcluir);
  return li;
}

/* Troca o texto por um campo de edição.
   Enter salva, Esc cancela e sair do campo (blur) também salva. */
function iniciarEdicao(li, texto, t) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "editar-campo";
  input.value = t.texto;
  input.maxLength = 100;

  li.replaceChild(input, texto); // substitui o <span> pelo <input>
  input.focus();                 // coloca o cursor no campo
  input.select();                // seleciona o texto para facilitar a digitação

  let finalizado = false; // evita salvar duas vezes (Enter e blur disparam juntos)

  function salvarEdicao() {
    if (finalizado) return;
    finalizado = true;
    const novo = input.value.trim();
    // Se o campo ficou vazio, mantém o texto antigo.
    if (novo) editarTexto(t.id, novo); else desenhar();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") salvarEdicao();
    if (e.key === "Escape") { finalizado = true; desenhar(); } // cancela sem salvar
  });
  input.addEventListener("blur", salvarEdicao);
}

/* =====================================================
   6. EVENTOS
   ===================================================== */

// Envio do formulário (clique em Adicionar ou tecla Enter)
form.addEventListener("submit", (evento) => {
  evento.preventDefault();          // impede o recarregamento da página
  const texto = campo.value.trim(); // trim remove espaços das pontas
  if (texto === "") return;         // não adiciona tarefa vazia
  adicionar(texto);
  campo.value = "";                 // limpa o campo
  campo.focus();                    // devolve o cursor ao campo para a próxima tarefa
});

// Filtros: ao clicar, guarda o filtro escolhido e atualiza o botão ativo.
botoesFiltro.forEach(botao => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.filtro; // lê o atributo data-filtro do HTML
    botoesFiltro.forEach(b => b.setAttribute("aria-pressed", b === botao));
    desenhar();
  });
});

botaoLimpar.addEventListener("click", limparConcluidas);

/* =====================================================
   7. INÍCIO
   Desenha a lista assim que a página carrega.
   ===================================================== */
desenhar();
