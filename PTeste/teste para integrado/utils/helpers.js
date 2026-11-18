// =============================================================
// utils/helpers.js - funções pequenas reaproveitadas em vários arquivos
// =============================================================

/**
 * Normaliza um nome para comparação: ignora maiúsculas/minúsculas,
 * acentos e espaços repetidos. Ex.: "  Açúcar " e "acucar" viram "acucar".
 * É a mesma lógica da função normalizarNome() do front-end (script.js).
 */
function normalizarNome(texto) {
  return String(texto)
    .trim()                          // remove espaços das pontas
    .toLowerCase()                   // tudo minúsculo
    .normalize("NFD")                // separa letra + acento ("á" -> "a" + "´")
    .replace(/[\u0300-\u036f]/g, "") // apaga os acentos soltos
    .replace(/\s+/g, " ");           // vários espaços viram um só
}

/**
 * Express 4 não captura erros de funções async sozinho.
 * Este "embrulho" envia qualquer erro para o tratador central (server.js),
 * assim não precisamos escrever try/catch em todas as rotas.
 */
function asyncHandler(funcao) {
  return (req, res, next) => Promise.resolve(funcao(req, res, next)).catch(next);
}

/**
 * Copia só os campos permitidos de um objeto (lista branca).
 * Impede que o cliente grave campos que não deveria (ex.: _id, senhaHash).
 */
function pegarCampos(origem, camposPermitidos) {
  const resultado = {};
  for (const campo of camposPermitidos) {
    if (origem[campo] !== undefined) resultado[campo] = origem[campo];
  }
  return resultado;
}

/**
 * Configura como o documento do Mongo vira JSON na resposta da API:
 *  - "_id" vira "id" (texto), como o front-end espera;
 *  - remove campos internos (__v, nomeNormalizado) e a senha (senhaHash).
 */
function aplicarToJSON(schema) {
  schema.set("toJSON", {
    versionKey: false, // remove o campo __v
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.nomeNormalizado;
      delete ret.senhaHash;
      return ret;
    }
  });
}

module.exports = { normalizarNome, asyncHandler, pegarCampos, aplicarToJSON };
