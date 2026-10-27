const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(session({
    secret: 'chave_secreta_rede_social',
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Banco de dados em memória
const usuarios = [
    { username: 'admin', password: '123456', lastSeen: Date.now() }
];

let posts = []; 
// Estrutura do post:
// { id, autor, conteudo, data, comentarios: [{ id, autor, conteudo, data, curtidas: ['user1', 'user2'] }] }

// Middleware para atualizar "visto por último" (Status Online)
app.use((req, res, next) => {
    if (req.session && req.session.usuario) {
        const user = usuarios.find(u => u.username === req.session.usuario);
        if (user) user.lastSeen = Date.now();
    }
    next();
});

// Middleware de autenticação
function autenticadoOnly(req, res, next) {
    if (req.session && req.session.autenticado) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Não autorizado.' });
}

// --- ROTAS DE AUTENTICAÇÃO E USUÁRIOS ---

// Cadastro de novo usuário
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });
    }

    const usuarioExiste = usuarios.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (usuarioExiste) {
        return res.status(400).json({ success: false, message: 'Nome de usuário já está em uso.' });
    }

    usuarios.push({
        username: username.trim(),
        password: password,
        lastSeen: Date.now()
    });

    res.json({ success: true, message: 'Cadastro realizado com sucesso!' });
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = usuarios.find(u => u.username === username && u.password === password);

    if (user) {
        user.lastSeen = Date.now();
        req.session.autenticado = true;
        req.session.usuario = user.username;
        return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
});

app.get('/check-auth', (req, res) => {
    if (req.session && req.session.autenticado) {
        res.json({ autenticado: true, usuario: req.session.usuario });
    } else {
        res.json({ autenticado: false });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Retorna o status online dos usuários (online se esteve ativo nos últimos 2 minutos)
app.get('/api/users/online', autenticadoOnly, (req, res) => {
    const agora = Date.now();
    const limiteOnline = 2 * 60 * 1000; // 2 minutos

    const statusUsuarios = usuarios.map(u => ({
        username: u.username,
        online: (agora - u.lastSeen) < limiteOnline
    }));

    res.json(statusUsuarios);
});

// --- ROTAS DE POSTS E COMENTÁRIOS ---

app.get('/api/posts', autenticadoOnly, (req, res) => {
    res.json(posts);
});

app.post('/api/posts', autenticadoOnly, (req, res) => {
    const { conteudo } = req.body;
    if (!conteudo || conteudo.trim() === '') {
        return res.status(400).json({ success: false, message: 'O conteúdo não pode ser vazio.' });
    }

    const novoPost = {
        id: Date.now(),
        autor: req.session.usuario,
        conteudo: conteudo.trim(),
        data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        comentarios: []
    };

    posts.unshift(novoPost);
    res.json({ success: true, post: novoPost });
});

// Adicionar comentário
app.post('/api/posts/:id/comentarios', autenticadoOnly, (req, res) => {
    const postId = Number(req.params.id);
    const { conteudo } = req.body;

    if (!conteudo || conteudo.trim() === '') {
        return res.status(400).json({ success: false, message: 'O comentário não pode ser vazio.' });
    }

    const post = posts.find(p => p.id === postId);
    if (!post) {
        return res.status(404).json({ success: false, message: 'Post não encontrado.' });
    }

    const novoComentario = {
        id: Date.now(),
        autor: req.session.usuario,
        conteudo: conteudo.trim(),
        data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        curtidas: [] // Lista de usernames que curtiram
    };

    post.comentarios.push(novoComentario);
    res.json({ success: true, comentario: novoComentario });
});

// Curtir / Descurtir comentário
app.post('/api/posts/:postId/comentarios/:commentId/like', autenticadoOnly, (req, res) => {
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    const usuarioAtual = req.session.usuario;

    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post não encontrado.' });

    const comentario = post.comentarios.find(c => c.id === commentId);
    if (!comentario) return res.status(404).json({ success: false, message: 'Comentário não encontrado.' });

    const index = comentario.curtidas.indexOf(usuarioAtual);
    if (index === -1) {
        comentario.curtidas.push(usuarioAtual); // Curtir
    } else {
        comentario.curtidas.splice(index, 1); // Descurtir
    }

    res.json({ success: true, curtidas: comentario.curtidas });
});

app.listen(PORT, () => {
    console.log(`Rede Social rodando em http://localhost:${PORT}`);
});