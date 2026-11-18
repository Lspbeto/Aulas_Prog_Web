// =============================================================
// server.js - ponto de entrada: sobe a API e também serve o site (pasta public)
// =============================================================

// Lê o arquivo .env e coloca os valores em process.env.
// Só vale no computador local; no Render as variáveis ficam no painel do serviço.
require("dotenv").config({ quiet: true });

const path = require("path");                 // monta caminhos de pasta de forma portável
const express = require("express");           // framework web
const mongoose = require("mongoose");         // conexão e modelos do MongoDB
const cors = require("cors");                 // libera acesso de outras origens (útil em testes locais)
const rateLimit = require("express-rate-limit"); // limita tentativas de login (anti força bruta)

// ---------- Variáveis de ambiente ----------
// MONGO_URI: endereço do banco (no Render/Atlas vem do painel; localmente cai no mongod da máquina)
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/despensa";
// PORT: o Render define sozinho; localmente usamos 3000
const PORT = process.env.PORT || 3000;

// Sem JWT_SECRET não dá para assinar tokens com segurança: aborta logo na partida
if (!process.env.JWT_SECRET) {
  console.error("ERRO: defina a variável de ambiente JWT_SECRET.");
  process.exit(1);
}

const app = express();

// O Render coloca um proxy na frente do app; sem isso o limitador veria o IP errado
app.set("trust proxy", 1);

// ---------- Middlewares globais (rodam em toda requisição) ----------
app.use(cors());                              // permite requisições de outras origens
app.use(express.json({ limit: "100kb" }));    // lê o corpo JSON e limita o tamanho
app.use(express.static(path.join(__dirname, "public"))); // serve index.html, CSS/ e JS/

// ---------- Rota de saúde (o Render usa para saber se o app está de pé) ----------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    // readyState 1 = conectado ao MongoDB
    banco: mongoose.connection.readyState === 1 ? "conectado" : "desconectado"
  });
});

// ---------- Rotas da API ----------
// No máximo 30 tentativas de login/cadastro a cada 15 minutos por IP
const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Aguarde alguns minutos." }
});

app.use("/api/auth", limitadorAuth, require("./routes/auth"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/produtos", require("./routes/produtos"));
app.use("/api/despensa", require("./routes/despensa"));

// Qualquer /api/... que não existe responde 404 em JSON
app.use("/api", (req, res) => {
  res.status(404).json({ mensagem: "Rota não encontrada." });
});

// ---------- Tratador central de erros ----------
// Recebe os erros enviados por next(err) / asyncHandler e devolve respostas em JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // JSON inválido no corpo da requisição
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ mensagem: "JSON inválido." });
  }
  // Falhou numa regra do model (campo obrigatório, mínimo, enum...)
  if (err.name === "ValidationError") {
    const mensagem = Object.values(err.errors).map((e) => e.message).join(" ");
    return res.status(400).json({ mensagem });
  }
  // Valor com tipo errado (ex.: texto onde devia ser número)
  if (err.name === "CastError") {
    return res.status(400).json({ mensagem: "Dados inválidos." });
  }
  // Código 11000 = violou índice "unique" (nome duplicado)
  if (err.code === 11000) {
    return res.status(409).json({ mensagem: "Já existe um registro com esse nome." });
  }
  console.error(err); // erro inesperado: registra no log do Render
  res.status(500).json({ mensagem: "Erro interno do servidor." });
});

// ---------- Conexão com o MongoDB e inicialização ----------
// Só começa a escutar requisições depois que o banco conectar
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 }) // desiste após 10 s sem achar o banco
  .then(() => {
    console.log("Conectado ao MongoDB com sucesso!");
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch((erro) => {
    console.error("Erro ao conectar ao MongoDB:", erro.message);
    process.exit(1); // encerra: o Render tenta reiniciar o serviço
  });
