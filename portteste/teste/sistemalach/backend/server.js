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
// ALTERAÇÃO (esta etapa): o index.html é o ponto de entrada do site —
// ao iniciar o servidor, http://localhost:PORT/ abre o index.html.
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

// ALTERAÇÃO (etapa anterior): antes os arquivos estáticos ficavam em "public".
// Agora o front é uma pasta paralela ao backend, então subimos um nível com '..'
// e apontamos para "frontend". __dirname = backend/, logo ../frontend = sistemalach/frontend.
// ALTERAÇÃO: guardamos o caminho da pasta do front em uma constante para reutilizar abaixo.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// ALTERAÇÃO: a opção { index: 'index.html' } deixa explícito que, ao acessar a pasta
// raiz do site, o arquivo entregue é o index.html (é o "ponto de entrada" do front).
app.use(express.static(FRONTEND_DIR, { index: 'index.html' }));

// Todas as rotas da API ficam sob o prefixo /api (/api/dados e /api/contato).
// As URLs não mudaram, por isso o script.js do front continua funcionando igual.
app.use('/api', apiRoutes);

// ALTERAÇÃO: rota explícita para a página inicial.
// Ao rodar o servidor e abrir http://localhost:3000/ , o navegador recebe o index.html.
app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ALTERAÇÃO: fallback — qualquer outra página (GET) que não seja da API e não seja
// um arquivo (sem extensão, ex.: /qualquer-coisa) também devolve o index.html,
// então o site sempre abre pelo index.html. Arquivos inexistentes (ex.: /foto.png)
// e rotas /api desconhecidas continuam dando 404 normalmente.
// Obs.: no Express 5 não se usa '*' puro em rotas, por isso usamos um middleware.
app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || path.extname(req.path)) {
        return next();
    }
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
