// =============================================================
// models/ItemDespensa.js - coleção "itemdespensas" (Painel da Despensa)
// =============================================================
const mongoose = require("mongoose");
const { aplicarToJSON, normalizarNome } = require("../utils/helpers");

// Listas iguais às do <select> do index.html
const CATEGORIAS = ["Massas", "Grãos", "Trigo", "Carnes", "Verduras", "Frutas", "Laticínios", "Temperos", "Legumes", "Outros"];
const UNIDADES = ["kg", "g", "L", "unidade", "cx"];

const itemDespensaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: [true, "Informe o nome do ingrediente."], trim: true },
    nomeNormalizado: { type: String, unique: true }, // evita ingrediente duplicado
    categoria: {
      type: String,
      required: [true, "Selecione a categoria."],
      enum: { values: CATEGORIAS, message: "Categoria inválida." }
    },
    quantidade: { type: Number, required: [true, "Informe a quantidade."], min: [0.01, "A quantidade deve ser maior que zero."] },
    unidade: { type: String, enum: { values: UNIDADES, message: "Unidade inválida." }, default: "kg" },
    // Validade fica como texto "AAAA-MM-DD" (o mesmo formato do <input type="date">),
    // assim não existe problema de fuso horário.
    validade: {
      type: String,
      required: [true, "Informe a data de validade."],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Data de validade inválida."]
    },
    // Se vier vazio, grava "-" (igual ao comportamento do front-end)
    local: { type: String, default: "-", trim: true, set: (v) => (v && String(v).trim()) || "-" },
    valor: { type: Number, default: 0, min: [0, "O preço não pode ser negativo."] }
  },
  { timestamps: true }
);

itemDespensaSchema.pre("validate", function () {
  if (this.nome) this.nomeNormalizado = normalizarNome(this.nome);
});

aplicarToJSON(itemDespensaSchema);

module.exports = mongoose.model("ItemDespensa", itemDespensaSchema);
