// ============================================================
// FRONT-END (roda no navegador)
// Responsabilidades: mostrar dados, reagir a cliques e
// pedir/enviar informações ao back-end usando fetch().
// ============================================================

const form = document.getElementById("form-tarefa");
const campoTexto = document.getElementById("campo-texto");
const lista = document.getElementById("lista");
const mensagemErro = document.getElementById("mensagem-erro");

// 1) Busca as tarefas no back-end e desenha na tela
async function carregarTarefas() {
  const resposta = await fetch("/api/tarefas"); // GET
  const tarefas = await resposta.json();
  desenharLista(tarefas);
}

// 2) Transforma os dados (JSON) em elementos HTML
function desenharLista(tarefas) {
  lista.innerHTML = ""; // limpa a lista antes de redesenhar

  tarefas.forEach((tarefa) => {
    const li = document.createElement("li");
    if (tarefa.concluida) li.classList.add("concluida");

    const texto = document.createElement("span");
    texto.textContent = tarefa.texto; // textContent evita injeção de HTML
    texto.addEventListener("click", () => alternarTarefa(tarefa.id));

    const botaoExcluir = document.createElement("button");
    botaoExcluir.textContent = "✕";
    botaoExcluir.className = "excluir";
    botaoExcluir.addEventListener("click", () => excluirTarefa(tarefa.id));

    li.append(texto, botaoExcluir);
    lista.appendChild(li);
  });
}

// 3) Envia uma nova tarefa ao back-end
form.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // impede o recarregamento da página
  mensagemErro.textContent = "";

  const resposta = await fetch("/api/tarefas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto: campoTexto.value }),
  });

  if (!resposta.ok) {
    const dados = await resposta.json();
    mensagemErro.textContent = dados.erro; // erro vindo do servidor
    return;
  }

  campoTexto.value = "";
  carregarTarefas(); // atualiza a tela com os dados novos
});

// 4) Marca/desmarca como concluída
async function alternarTarefa(id) {
  await fetch(`/api/tarefas/${id}`, { method: "PATCH" });
  carregarTarefas();
}

// 5) Exclui uma tarefa
async function excluirTarefa(id) {
  await fetch(`/api/tarefas/${id}`, { method: "DELETE" });
  carregarTarefas();
}

// Ao abrir a página, carrega as tarefas
carregarTarefas();
