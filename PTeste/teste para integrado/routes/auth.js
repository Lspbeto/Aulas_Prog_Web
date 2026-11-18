// =============================================================
// routes/auth.js - cadastro, login e verificação de sessão
// Prefixo (definido no server.js): /api/auth
// =============================================================
const express = require("express");
const bcrypt = require("bcryptjs");       // gera/compara hash de senha
const jwt = require("jsonwebtoken");      // cria o token de login
const Usuario = require("../models/Usuario");
const autenticar = require("../middleware/auth");
const { asyncHandler } = require("../utils/helpers");

const router = express.Router();

/** Cria um token JWT válido por 7 dias com o id e o nome do usuário. */
function gerarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, username: usuario.username }, // conteúdo (payload) do token
    process.env.JWT_SECRET,                          // chave secreta da assinatura
    { expiresIn: "7d" }                              // validade
  );
}

// POST /api/auth/register  -> cria conta e já devolve o token (login automático)
router.post("/register", asyncHandler(async (req, res) => {
  // String(...) garante texto (protege contra objetos maliciosos no corpo)
  const username = String(req.body.username || "").trim();
  const senha = String(req.body.senha || "");

  if (!username || !senha) {
    return res.status(400).json({ mensagem: "Preencha todos os campos obrigatórios." });
  }
  if (senha.length < 4) {
    return res.status(400).json({ mensagem: "A senha deve ter pelo menos 4 caracteres." });
  }
  // exists() só pergunta ao banco se há algum documento com esse username
  if (await Usuario.exists({ username })) {
    return res.status(409).json({ mensagem: "Este usuário já existe." });
  }

  const senhaHash = await bcrypt.hash(senha, 10); // 10 = custo do hash
  const usuario = await Usuario.create({ username, senhaHash }); // INSERT no MongoDB

  res.status(201).json({ token: gerarToken(usuario), username: usuario.username });
}));

// POST /api/auth/login  -> confere usuário/senha e devolve o token
router.post("/login", asyncHandler(async (req, res) => {
  const username = String(req.body.username || "").trim();
  const senha = String(req.body.senha || "");

  const usuario = await Usuario.findOne({ username }); // SELECT por username
  // compare() compara a senha digitada com o hash guardado
  const senhaOk = usuario && (await bcrypt.compare(senha, usuario.senhaHash));

  // Mesma mensagem para "usuário não existe" e "senha errada" (não revela qual)
  if (!senhaOk) {
    return res.status(401).json({ mensagem: "Usuário ou senha incorretos." });
  }
  res.json({ token: gerarToken(usuario), username: usuario.username });
}));

// GET /api/auth/me  -> o front usa ao abrir a página para validar o token salvo
router.get("/me", autenticar, asyncHandler(async (req, res) => {
  const usuario = await Usuario.findById(req.usuario.id);
  if (!usuario) {
    // O usuário foi excluído depois que o token foi emitido
    return res.status(401).json({ mensagem: "Usuário não existe mais." });
  }
  res.json({ username: usuario.username });
}));

module.exports = router;
