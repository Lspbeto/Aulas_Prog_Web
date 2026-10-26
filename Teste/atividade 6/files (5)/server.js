// ============================================================
// BACK-END (roda no servidor, com Node.js + Express)
// Responsabilidades: guardar dados, aplicar regras e expor uma API.
// ============================================================
const express = require("express");
const path = require("path");

const app = express();
const PORTA = 3000;

// Middleware: permite ler o corpo (body) das requisições em JSON
app.use(express.json());

// Serve os arquivos do front-end (HTML, CSS, JS) da pasta "public"
app.use(express.static(path.join(__dirname, "public")));

// "Banco de dados" simples: um array na memória.
// (Se reiniciar o servidor, os dados somem. Em projetos reais usa-se um banco.)
let tarefas = [
  { id: 1, texto: "Aprender HTML", concluida: true },
  { id: 2, texto: "Aprender back-end", concluida: false },
];
let proximoId = 3;

// ---------- ROTAS DA API ----------

// READ: devolve todas as tarefas
app.get("/api/tarefas", (req, res) => {
  res.json(tarefas);
});

// CREATE: cria uma nova tarefa
app.post("/api/tarefas", (req, res) => {
  const texto = (req.body.texto || "").trim();

  // Validação feita no servidor (nunca confie só no front-end!)
  if (!texto) {
    return res.status(400).json({ erro: "O texto da tarefa é obrigatório." });
  }

  const nova = { id: proximoId++, texto, concluida: false };
  tarefas.push(nova);
  res.status(201).json(nova);
});

// UPDATE: marca/desmarca como concluída
app.patch("/api/tarefas/:id", (req, res) => {
  const tarefa = tarefas.find((t) => t.id === Number(req.params.id));
  if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });

  tarefa.concluida = !tarefa.concluida;
  res.json(tarefa);
});

// DELETE: remove uma tarefa
app.delete("/api/tarefas/:id", (req, res) => {
  const id = Number(req.params.id);
  tarefas = tarefas.filter((t) => t.id !== id);
  res.status(204).end();
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
