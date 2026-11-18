// =============================================================
// middleware/auth.js - exige login (token JWT) nas rotas protegidas
// =============================================================
const jwt = require("jsonwebtoken");

/**
 * O front envia o cabeçalho:  Authorization: Bearer <token>
 * Se o token for válido, guarda o usuário em req.usuario e libera a rota (next).
 * Se não, responde 401 (não autorizado) e a rota nem chega a executar.
 */
module.exports = function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";   // ex.: "Bearer eyJhbGci..."
  const [tipo, token] = cabecalho.split(" ");          // separa "Bearer" do token

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ mensagem: "Não autenticado. Faça login." });
  }

  try {
    // verify() confere a assinatura (com JWT_SECRET) e a validade (expiração)
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: dados.sub, username: dados.username };
    next(); // segue para a rota
  } catch (erro) {
    return res.status(401).json({ mensagem: "Sessão inválida ou expirada. Faça login novamente." });
  }
};
