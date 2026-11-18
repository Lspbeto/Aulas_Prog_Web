// =============================================================
// routes/produtos.js - aba "Produtos Gerais"
// Prefixo: /api/produtos   (todas as rotas exigem login)
// =============================================================
const express = require("express");
const mongoose = require("mongoose");
const Produto = require("../models/Produto");
const autenticar = require("../middleware/auth");
const { asyncHandler, pegarCampos } = require("../utils/helpers");

const router = express.Router();
router.use(autenticar);

// Campos que o cliente tem permissão de enviar
const CAMPOS = ["nome", "preco", "qtd"];

// GET /api/produtos -> lista todos, em ordem alfabética
router.get("/", asyncHandler(async (req, res) => {
  res.json(await Produto.find().sort({ nomeNormalizado: 1 }));
}));

// POST /api/produtos -> cria um produto (INSERT)
router.post("/", asyncHandler(async (req, res) => {
  // As regras (obrigatório, mínimo, inteiro, duplicado) estão no model;
  // se falharem, o erro vai para o tratador central e vira 400 ou 409.
  const produto = await Produto.create(pegarCampos(req.body, CAMPOS));
  res.status(201).json(produto);
}));

// PUT /api/produtos/:id -> altera um produto (UPDATE)
router.put("/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ mensagem: "Identificador inválido." });
  }
  const produto = await Produto.findById(req.params.id);
  if (!produto) return res.status(404).json({ mensagem: "Produto não encontrado." });

  produto.set(pegarCampos(req.body, CAMPOS)); // troca só os campos enviados
  await produto.save();                        // roda as validações de novo
  res.json(produto);
}));

// DELETE /api/produtos/:id -> remove um produto
router.delete("/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ mensagem: "Identificador inválido." });
  }
  const removido = await Produto.findByIdAndDelete(req.params.id);
  if (!removido) return res.status(404).json({ mensagem: "Produto não encontrado." });
  res.json({ mensagem: "Produto excluído." });
}));

module.exports = router;
