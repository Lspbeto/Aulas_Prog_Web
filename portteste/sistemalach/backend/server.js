// ============================================================
// backend/server.js — ponto de entrada do BACK-END
// ALTERAÇÃO: o projeto foi dividido em duas pastas paralelas:
//   sistemalach/
//   ├── backend/   (este servidor: API + dados)
//   └── frontend/  (HTML, CSS e JS do site)
// Este arquivo só configura o Express e conecta as partes:
//   - dados -> backend/data/portfolio.js
//   - rotas -> backend/routes/api.js
//   - front -> ../frontend (pasta irmã)
// ============================================================
const express = require('express');
const path = require('path');

// Importa as rotas da API (separadas em routes/api.js)
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares para parsing de JSON e dados de formulários
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ALTERAÇÃO: antes os arquivos estáticos ficavam em "public" (dentro do mesmo projeto).
// Agora o front é uma pasta paralela ao backend, então subimos um nível com '..'
// e apontamos para "frontend". __dirname = backend/, logo ../frontend = sistemalach/frontend.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Todas as rotas da API ficam sob o prefixo /api (/api/dados e /api/contato).
// As URLs não mudaram, por isso o script.js do front continua funcionando igual.
app.use('/api', apiRoutes);

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
