// =============================================================
// routes/despensa.js - aba "Painel da Despensa" (ingredientes)
// Prefixo: /api/despensa   (todas as rotas exigem login)
// =============================================================
const express = require("express");
const mongoose = require("mongoose");
const ItemDespensa = require("../models/ItemDespensa");
const autenticar = require("../middleware/auth");
const { asyncHandler, pegarCampos } = require("../utils/helpers");

const router = express.Router();
router.use(autenticar);

const CAMPOS = ["nome", "categoria", "quantidade", "unidade", "validade", "local", "valor"];

// GET /api/despensa -> lista, com os que vencem primeiro no topo
router.get("/", asyncHandler(async (req, res) => {
  res.json(await ItemDespensa.find().sort({ validade: 1 })); // 1 = crescente
}));

// POST /api/despensa -> cadastra um ingrediente
router.post("/", asyncHandler(async (req, res) => {
  const item = await ItemDespensa.create(pegarCampos(req.body, CAMPOS));
  res.status(201).json(item);
}));

// PUT /api/despensa/:id -> altera um ingrediente
router.put("/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ mensagem: "Identificador inválido." });
  }
  const item = await ItemDespensa.findById(req.params.id);
  if (!item) return res.status(404).json({ mensagem: "Ingrediente não encontrado." });

  item.set(pegarCampos(req.body, CAMPOS));
  await item.save();
  res.json(item);
}));

// DELETE /api/despensa/:id -> remove um ingrediente
router.delete("/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ mensagem: "Identificador inválido." });
  }
  const removido = await ItemDespensa.findByIdAndDelete(req.params.id);
  if (!removido) return res.status(404).json({ mensagem: "Ingrediente não encontrado." });
  res.json({ mensagem: "Ingrediente excluído." });
}));

module.exports = router;
