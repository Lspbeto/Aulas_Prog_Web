// ============================================================
// backend/routes/api.js — rotas da API
// ALTERAÇÃO: arquivo novo, agora dentro de backend/. Estas rotas estavam
// no server.js. Usamos express.Router() para agrupá-las e montá-las em /api.
// ============================================================
const express = require('express');

// ALTERAÇÃO: os dados agora vêm de um módulo separado (data/portfolio.js),
// em vez de ficarem declarados dentro do server.js.
const portfolioData = require('../data/portfolio');

const router = express.Router();

// Rota GET: Fornece os dados do portfólio em formato JSON para o front-end consumir
// (URL final: GET /api/dados — o prefixo /api é adicionado no server.js)
router.get('/dados', (req, res) => {
    res.json(portfolioData);
});

// Rota POST: Recebe e valida os dados enviados pelo formulário de contato
// (URL final: POST /api/contato)
router.post('/contato', (req, res) => {
    const { nome, email, mensagem } = req.body;
    if (!nome || !email || !mensagem) {
        return res.status(400).json({ status: 'erro', mensagem: 'Por favor, preencha todos os campos!' });
    }
    console.log(`[Nova Mensagem de Contato] De: ${nome} (${email}) - ${mensagem}`);
    res.json({ status: 'sucesso', mensagem: 'Mensagem enviada com sucesso! Entrarei em contato em breve.' });
});

// ALTERAÇÃO: exporta o router para o server.js usar com app.use('/api', ...)
module.exports = router;
