// =============================================================
// models/Usuario.js - coleção "usuarios" do MongoDB
// =============================================================
const mongoose = require("mongoose");
const { aplicarToJSON } = require("../utils/helpers");

const usuarioSchema = new mongoose.Schema(
  {
    // Nome de login. "unique" cria um índice que impede dois iguais no banco.
    username: { type: String, required: [true, "Informe o usuário."], unique: true, trim: true },
    // Guardamos apenas o HASH (bcrypt) da senha, nunca a senha em texto puro.
    senhaHash: { type: String, required: true }
  },
  { timestamps: true } // cria createdAt e updatedAt automaticamente
);

aplicarToJSON(usuarioSchema);

// Cria (ou reaproveita) o model "Usuario" -> coleção "usuarios"
module.exports = mongoose.model("Usuario", usuarioSchema);
