// ============================================================
// DevFeed - BACK-END (API em Node.js, sem banco de dados)
// Todos os dados ficam na memória: ao reiniciar, tudo é apagado.
// ============================================================

// Módulo nativo do Node para criar o servidor HTTP
const http = require('http');
// Módulo nativo de criptografia: usado para hash de senha e geração de tokens
const crypto = require('crypto');

// ============================================================
// "BANCO DE DADOS" EM MEMÓRIA
// ============================================================

// Lista de usuários cadastrados: { id, username, passwordHash, salt }
const users = [];
// Sessões ativas: associa um token ao usuário dono dele e à data de expiração
const sessions = new Map();
// Lista de posts: { id, userId, content, createdAt, likes: Set<userId>, comments: [] }
// Cada comentário tem o formato: { id, userId, content, createdAt }
const posts = [];

// Contadores para gerar ids únicos e crescentes
let nextUserId = 1;     // próximo id de usuário
let nextPostId = 1;     // próximo id de post
let nextCommentId = 1;  // próximo id de comentário

// Tempo de vida de uma sessão: 7 dias, em milissegundos
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

// Gera o hash de uma senha usando scrypt e o "salt" informado
function hashPassword(password, salt) {
    // scryptSync deriva uma chave de 64 bytes; toString('hex') converte para texto
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Confere se a senha digitada corresponde ao hash salvo
function verifyPassword(password, salt, expectedHash) {
    // Calcula o hash da senha digitada e converte para bytes
    const a = Buffer.from(hashPassword(password, salt), 'hex');
    // Converte o hash salvo para bytes
    const b = Buffer.from(expectedHash, 'hex');
    // Compara em tempo constante (evita ataques de temporização)
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Envia uma resposta JSON com o status HTTP desejado
function send(res, status, body) {
    // Define o status e o tipo do conteúdo
    res.writeHead(status, { 'Content-Type': 'application/json' });
    // Converte o objeto para JSON e finaliza a resposta
    res.end(JSON.stringify(body));
}

// Lê o corpo da requisição e converte de JSON para objeto (com proteções)
function readJson(req) {
    // Retorna uma Promise porque o corpo chega em partes (assíncrono)
    return new Promise((resolve, reject) => {
        // Acumula o texto recebido
        let body = '';
        // A cada pedaço recebido...
        req.on('data', chunk => {
            // ...adiciona ao texto acumulado
            body += chunk;
            // Se passar de 100 KB, rejeita (proteção contra corpos gigantes)
            if (body.length > 1e5) {
                reject(new Error('Corpo muito grande'));
                // Encerra a conexão
                req.destroy();
            }
        });
        // Quando terminou de receber...
        req.on('end', () => {
            try {
                // ...tenta converter para objeto (corpo vazio vira {})
                resolve(body ? JSON.parse(body) : {});
            } catch {
                // JSON malformado: rejeita em vez de derrubar o servidor
                reject(new Error('JSON inválido'));
            }
        });
        // Se ocorrer erro na leitura, rejeita a Promise
        req.on('error', reject);
    });
}

// Descobre quem é o usuário logado a partir do header "Authorization: Bearer <token>"
function getUser(req) {
    // Lê o header (ou texto vazio se não existir)
    const header = req.headers['authorization'] || '';
    // Extrai o token depois de "Bearer " (ou null se o formato estiver errado)
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    // Sem token = não autenticado
    if (!token) return null;

    // Procura a sessão desse token
    const session = sessions.get(token);
    // Token desconhecido = não autenticado
    if (!session) return null;
    // Se a sessão já expirou...
    if (session.expiresAt < Date.now()) {
        // ...remove-a
        sessions.delete(token);
        // ...e considera não autenticado
        return null;
    }
    // Devolve o usuário dono da sessão (ou null se não existir mais)
    return users.find(u => u.id === session.userId) || null;
}

// Cria uma sessão nova para o usuário e devolve o token
function createSession(userId) {
    // Gera 32 bytes aleatórios e converte para texto hexadecimal
    const token = crypto.randomBytes(32).toString('hex');
    // Guarda a sessão com data de expiração
    sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL });
    // Devolve o token para ser enviado ao navegador
    return token;
}

// Valida se o valor é um texto não vazio e com no máximo "max" caracteres
function validText(value, max) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

// Converte um id de usuário no nome de usuário correspondente
function usernameOf(userId) {
    // Procura o usuário na lista
    const u = users.find(x => x.id === userId);
    // Devolve o nome (ou um texto padrão se não achar)
    return u ? u.username : 'Desconhecido';
}

// Converte um post interno para o formato enviado ao front-end
function serializePost(post, viewerId) {
    return {
        id: post.id,                                   // id do post
        author: usernameOf(post.userId),               // nome do autor
        content: post.content,                         // texto do post
        created_at: post.createdAt,                    // data de criação (ms)
        likes: post.likes.size,                        // quantidade de curtidas
        likedByMe: post.likes.has(viewerId),           // true se quem pediu já curtiu
        // Lista de comentários já convertida para o formato do front-end
        comments: post.comments.map(c => ({
            id: c.id,                                  // id do comentário
            post_id: post.id,                          // id do post ao qual pertence
            author: usernameOf(c.userId),              // nome do autor do comentário
            content: c.content,                        // texto do comentário
            created_at: c.createdAt                    // data de criação (ms)
        }))
    };
}

// ============================================================
// SERVIDOR HTTP
// ============================================================
const server = http.createServer(async (req, res) => {
    // ----- CORS: permite que o front-end (outra origem) acesse esta API -----
    // Libera qualquer origem (aceitável em desenvolvimento; em produção, restrinja)
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Métodos HTTP permitidos
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    // Headers permitidos (Authorization carrega o token)
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // O navegador envia OPTIONS antes de certas requisições ("preflight")
    if (req.method === 'OPTIONS') {
        // Responde "sem conteúdo" e encerra
        res.writeHead(204);
        res.end();
        return;
    }

    // Extrai só o caminho da URL (ex.: "/posts/3/like"), ignorando parâmetros
    const pathname = new URL(req.url, 'http://localhost').pathname;
    // Guarda o método HTTP (GET, POST, DELETE...)
    const method = req.method;

    try {
        // ----------------------------------------------------
        // POST /register -> cadastrar usuário
        // ----------------------------------------------------
        if (method === 'POST' && pathname === '/register') {
            // Lê o JSON enviado pelo front-end
            const data = await readJson(req);

            // Valida o nome de usuário: 3 a 20 caracteres (letras, números, _ . -)
            if (typeof data.username !== 'string' || !/^[\w.-]{3,20}$/.test(data.username.trim())) {
                return send(res, 400, { message: 'Usuário deve ter 3 a 20 caracteres (letras, números, _ . -)' });
            }
            // Valida a senha: no mínimo 6 caracteres
            if (typeof data.password !== 'string' || data.password.length < 6) {
                return send(res, 400, { message: 'A senha deve ter pelo menos 6 caracteres' });
            }

            // Remove espaços das pontas do nome
            const username = data.username.trim();
            // Impede nomes repetidos
            if (users.some(u => u.username === username)) {
                return send(res, 400, { message: 'Usuário já existe' });
            }

            // Gera um "salt" aleatório exclusivo deste usuário
            const salt = crypto.randomBytes(16).toString('hex');
            // Monta o novo usuário (a senha nunca é guardada em texto puro)
            const newUser = {
                id: nextUserId++,                          // id único
                username,                                  // nome de usuário
                salt,                                      // salt do hash
                passwordHash: hashPassword(data.password, salt) // hash da senha
            };
            // Salva na lista de usuários
            users.push(newUser);

            // Responde 201 (criado) sem expor a senha
            return send(res, 201, { id: newUser.id, username });
        }

        // ----------------------------------------------------
        // POST /login -> entrar na conta
        // ----------------------------------------------------
        if (method === 'POST' && pathname === '/login') {
            // Lê o JSON enviado
            const data = await readJson(req);
            // Procura o usuário pelo nome (só se o nome for texto)
            const user = typeof data.username === 'string'
                ? users.find(u => u.username === data.username.trim())
                : null;

            // Se o usuário existe e a senha confere...
            if (user && typeof data.password === 'string' && verifyPassword(data.password, user.salt, user.passwordHash)) {
                // ...responde com o token de sessão
                return send(res, 200, {
                    message: 'Login bem-sucedido',
                    username: user.username,
                    token: createSession(user.id)
                });
            }
            // Mensagem genérica (não revela se o erro foi no usuário ou na senha)
            return send(res, 401, { message: 'Usuário ou senha inválidos' });
        }

        // ----------------------------------------------------
        // A PARTIR DAQUI, TODAS AS ROTAS EXIGEM LOGIN
        // ----------------------------------------------------
        // Descobre o usuário pelo token enviado
        const user = getUser(req);
        // Sem usuário válido: responde 401 (não autenticado)
        if (!user) return send(res, 401, { message: 'Não autenticado' });

        // ----------------------------------------------------
        // POST /logout -> encerrar a sessão
        // ----------------------------------------------------
        if (method === 'POST' && pathname === '/logout') {
            // Remove o token da lista de sessões ativas
            sessions.delete(req.headers['authorization'].slice(7));
            return send(res, 200, { message: 'Sessão encerrada' });
        }

        // ----------------------------------------------------
        // GET /posts -> listar publicações
        // ----------------------------------------------------
        if (method === 'GET' && pathname === '/posts') {
            // Copia a lista, ordena do mais novo para o mais antigo e converte o formato
            const list = [...posts]
                .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)
                .map(p => serializePost(p, user.id));
            return send(res, 200, list);
        }

        // ----------------------------------------------------
        // POST /posts -> criar publicação
        // ----------------------------------------------------
        if (method === 'POST' && pathname === '/posts') {
            // Lê o JSON enviado
            const data = await readJson(req);
            // Valida o conteúdo (1 a 1000 caracteres)
            if (!validText(data.content, 1000)) {
                return send(res, 400, { message: 'O post deve ter entre 1 e 1000 caracteres' });
            }

            // Monta o post; o autor vem do token, não do corpo da requisição
            const post = {
                id: nextPostId++,              // id único
                userId: user.id,               // dono do post
                content: data.content.trim(),  // texto sem espaços nas pontas
                createdAt: Date.now(),         // data de criação
                likes: new Set(),              // ids dos usuários que curtiram
                comments: []                   // comentários (começa vazio)
            };
            // Salva na lista de posts
            posts.push(post);
            // Responde 201 com o post criado
            return send(res, 201, serializePost(post, user.id));
        }

        // ----------------------------------------------------
        // DELETE /posts/:id -> apagar publicação (só o autor)
        // ----------------------------------------------------
        // Testa se o caminho tem o formato /posts/<número>
        let m = pathname.match(/^\/posts\/(\d+)$/);
        if (method === 'DELETE' && m) {
            // Procura a posição do post na lista
            const index = posts.findIndex(p => p.id === Number(m[1]));
            // Não existe: 404
            if (index === -1) return send(res, 404, { message: 'Post não encontrado' });
            // Não é o autor: 403 (proibido)
            if (posts[index].userId !== user.id) {
                return send(res, 403, { message: 'Você só pode apagar seus próprios posts' });
            }
            // Remove o post (comentários e curtidas vão junto, pois fazem parte dele)
            posts.splice(index, 1);
            return send(res, 200, { message: 'Post apagado' });
        }

        // ----------------------------------------------------
        // POST /posts/:id/like -> curtir ou descurtir
        // ----------------------------------------------------
        // Testa se o caminho tem o formato /posts/<número>/like
        m = pathname.match(/^\/posts\/(\d+)\/like$/);
        if (method === 'POST' && m) {
            // Procura o post
            const post = posts.find(p => p.id === Number(m[1]));
            // Não existe: 404
            if (!post) return send(res, 404, { message: 'Post não encontrado' });

            // Indica se, depois da ação, o usuário curtiu ou não
            let likedByMe;
            if (post.likes.has(user.id)) {
                // Já tinha curtido: remove a curtida
                post.likes.delete(user.id);
                likedByMe = false;
            } else {
                // Ainda não tinha curtido: adiciona a curtida
                post.likes.add(user.id);
                likedByMe = true;
            }

            // Responde com o total atualizado e o estado do usuário
            return send(res, 200, { likes: post.likes.size, likedByMe });
        }

        // ----------------------------------------------------
        // POST /comments -> criar comentário
        // ----------------------------------------------------
        if (method === 'POST' && pathname === '/comments') {
            // Lê o JSON enviado
            const data = await readJson(req);
            // Valida o conteúdo (1 a 500 caracteres)
            if (!validText(data.content, 500)) {
                return send(res, 400, { message: 'O comentário deve ter entre 1 e 500 caracteres' });
            }

            // Procura o post que receberá o comentário
            const post = posts.find(p => p.id === Number(data.postId));
            // Não existe: 404
            if (!post) return send(res, 404, { message: 'Post não encontrado' });

            // Monta o comentário; o autor vem do token
            const comment = {
                id: nextCommentId++,           // id único
                userId: user.id,               // dono do comentário
                content: data.content.trim(),  // texto sem espaços nas pontas
                createdAt: Date.now()          // data de criação
            };
            // Adiciona ao post
            post.comments.push(comment);

            // Responde 201 com o comentário criado
            return send(res, 201, {
                id: comment.id,
                author: user.username,
                content: comment.content,
                created_at: comment.createdAt
            });
        }

        // ----------------------------------------------------
        // DELETE /comments/:id -> apagar comentário (só o autor)
        // ----------------------------------------------------
        // Testa se o caminho tem o formato /comments/<número>
        m = pathname.match(/^\/comments\/(\d+)$/);
        if (method === 'DELETE' && m) {
            // Converte o id da URL para número
            const id = Number(m[1]);
            // Percorre os posts procurando o comentário
            for (const post of posts) {
                // Posição do comentário dentro deste post
                const index = post.comments.findIndex(c => c.id === id);
                // Não está neste post: vai para o próximo
                if (index === -1) continue;

                // Achou, mas não é o autor: 403
                if (post.comments[index].userId !== user.id) {
                    return send(res, 403, { message: 'Você só pode apagar seus próprios comentários' });
                }
                // Remove o comentário
                post.comments.splice(index, 1);
                return send(res, 200, { message: 'Comentário apagado' });
            }
            // Não achou em nenhum post: 404
            return send(res, 404, { message: 'Comentário não encontrado' });
        }

        // Nenhuma rota correspondeu: 404
        return send(res, 404, { message: 'Rota não encontrada' });

    } catch (err) {
        // Erros previstos de leitura do corpo viram 400 (erro do cliente)
        if (err.message === 'JSON inválido' || err.message === 'Corpo muito grande') {
            return send(res, 400, { message: err.message });
        }
        // Qualquer outro erro é inesperado: registra no terminal
        console.error(err);
        // ...e responde 500 sem expor detalhes ao cliente
        return send(res, 500, { message: 'Erro interno do servidor' });
    }
});

// Porta em que o servidor vai escutar
const PORT = 3000;
// Inicia o servidor
server.listen(PORT, () => {
    // Mensagem de confirmação no terminal
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
