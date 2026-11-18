// =============================================================
// routes/usuarios.js - aba "Gestão de Usuários"
// Prefixo: /api/usuarios   (todas as rotas exigem login)
// =============================================================
const express = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");
const autenticar = require("../middleware/auth");
const { asyncHandler } = require("../utils/helpers");

const router = express.Router();
router.use(autenticar); // aplica o filtro de login em TODAS as rotas abaixo

// GET /api/usuarios  -> lista todos (sem a senha)
router.get("/", asyncHandler(async (req, res) => {
  const lista = await Usuario.find().select("-senhaHash").sort({ username: 1 }); // A-Z
  res.json(lista);
}));

// POST /api/usuarios  -> cadastra um novo usuário
router.post("/", asyncHandler(async (req, res) => {
  const username = String(req.body.username || "").trim();
  const senha = String(req.body.senha || "");

  if (!username || !senha) {
    return res.status(400).json({ mensagem: "Preencha o usuário e a senha." });
  }
  if (senha.length < 4) {
    return res.status(400).json({ mensagem: "A senha deve ter pelo menos 4 caracteres." });
  }
  if (await Usuario.exists({ username })) {
    return res.status(409).json({ mensagem: "Usuário já existe." });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await Usuario.create({ username, senhaHash });
  res.status(201).json(usuario);
}));

// DELETE /api/usuarios/:username  -> exclui um usuário
router.delete("/:username", asyncHandler(async (req, res) => {
  // Proteção: ninguém exclui a si mesmo (mesma regra do front-end)
  if (req.params.username === req.usuario.username) {
    return res.status(400).json({ mensagem: "Você não pode excluir o próprio usuário." });
  }
  const resultado = await Usuario.deleteOne({ username: req.params.username });
  if (resultado.deletedCount === 0) {
    return res.status(404).json({ mensagem: "Usuário não encontrado." });
  }
  res.json({ mensagem: "Usuário excluído." });
}));

module.exports = router;
