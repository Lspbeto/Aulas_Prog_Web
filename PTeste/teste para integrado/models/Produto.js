// =============================================================
// models/Produto.js - coleção "produtos" (aba "Produtos Gerais")
// =============================================================
const mongoose = require("mongoose");
const { aplicarToJSON, normalizarNome } = require("../utils/helpers");

const produtoSchema = new mongoose.Schema(
  {
    nome: { type: String, required: [true, "Informe o nome do produto."], trim: true },
    // Nome sem acento/maiúscula; o índice "unique" bloqueia duplicados (ex.: "Arroz" e "arroz").
    nomeNormalizado: { type: String, unique: true },
    preco: { type: Number, required: [true, "Informe o preço."], min: [0, "O preço não pode ser negativo."] },
    qtd: {
      type: Number,
      required: [true, "Informe a quantidade."],
      min: [0, "A quantidade não pode ser negativa."],
      validate: { validator: Number.isInteger, message: "A quantidade deve ser um número inteiro." }
    }
  },
  { timestamps: true }
);

// Antes de validar/salvar, preenche o nomeNormalizado a partir do nome
produtoSchema.pre("validate", function () {
  if (this.nome) this.nomeNormalizado = normalizarNome(this.nome);
});

aplicarToJSON(produtoSchema);

module.exports = mongoose.model("Produto", produtoSchema);
