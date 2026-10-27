// ============================================================
// DevFeed - FRONT-END (lógica da página)
// ============================================================

// Endereço da API (o back-end precisa estar rodando nesta porta)
const API_URL = 'http://localhost:3000';
// Indica se a tela de autenticação está em modo "Cadastro" (true) ou "Login" (false)
let isRegistering = false;
// Nome do usuário logado, recuperado do navegador (ou null se não houver)
let currentUser = localStorage.getItem('devfeed_user') || null;
// Token de sessão recebido do servidor no login (ou null)
let token = localStorage.getItem('devfeed_token') || null;

// ============================================================
// INICIALIZAÇÃO
// ============================================================

// Executa quando o HTML termina de carregar
document.addEventListener('DOMContentLoaded', () => {
    // Se já existe usuário e token salvos, mostra o app direto
    if (currentUser && token) {
        showApp();
    }

    // Para os campos de usuário e senha...
    ['authUsername', 'authPassword'].forEach(id => {
        // ...escuta teclas pressionadas
        document.getElementById(id).addEventListener('keydown', e => {
            // Enter envia o login/cadastro
            if (e.key === 'Enter') handleAuth();
        });
    });

    // No campo de novo post...
    document.getElementById('postContent').addEventListener('keydown', e => {
        // Ctrl+Enter (ou Cmd+Enter no Mac) publica o post
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) createPost();
    });
});

// ============================================================
// COMUNICAÇÃO COM A API
// ============================================================

// Função única para chamar a API: envia o token e trata sessão expirada
async function api(path, options = {}) {
    // Cabeçalhos padrão: corpo em JSON
    const headers = { 'Content-Type': 'application/json' };
    // Se há token, envia no header Authorization
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Faz a requisição juntando as opções recebidas com os cabeçalhos
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    // Converte a resposta em objeto (se falhar, usa objeto vazio)
    const data = await res.json().catch(() => ({}));

    // Se o servidor disse "não autenticado" e havia token, a sessão expirou
    if (res.status === 401 && token) {
        // Limpa a sessão local e volta para o login
        clearSession();
        alert('Sua sessão expirou. Faça login novamente.');
    }
    // Devolve a resposta e os dados para quem chamou
    return { res, data };
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

// Limpa os dados de sessão e volta para a tela de login
function clearSession() {
    // Remove usuário e token do navegador
    localStorage.removeItem('devfeed_user');
    localStorage.removeItem('devfeed_token');
    // Zera as variáveis em memória
    currentUser = null;
    token = null;
    // Mostra a tela de login e esconde o feed
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('app-screen').style.display = 'none';
}

// Alterna a tela entre "Entrar" e "Cadastrar"
function toggleAuthMode() {
    // Inverte o modo atual
    isRegistering = !isRegistering;
    // Atualiza o título
    document.getElementById('auth-title').innerText = isRegistering ? 'Criar Nova Conta' : 'Entrar na Conta';
    // Atualiza o texto do botão
    document.getElementById('auth-btn').innerText = isRegistering ? 'Cadastrar' : 'Entrar';
    // Atualiza a pergunta embaixo do botão
    document.getElementById('auth-switch-text').innerText = isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?';
    // Atualiza o texto do link
    document.getElementById('auth-switch-link').innerText = isRegistering ? 'Faça login' : 'Cadastre-se';
}

// Executa o login ou o cadastro, conforme o modo atual
async function handleAuth() {
    // Lê o usuário digitado (sem espaços nas pontas)
    const usernameInput = document.getElementById('authUsername').value.trim();
    // Lê a senha digitada
    const passwordInput = document.getElementById('authPassword').value.trim();

    // Impede enviar com campos vazios
    if (!usernameInput || !passwordInput) return alert('Preencha todos os campos!');

    // Escolhe a rota da API conforme o modo
    const endpoint = isRegistering ? '/register' : '/login';

    try {
        // Envia usuário e senha para a API
        const { res, data } = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        // Se a API aceitou...
        if (res.ok) {
            if (isRegistering) {
                // Cadastro feito: avisa e volta para o modo login
                alert('Conta criada com sucesso! Faça login.');
                toggleAuthMode();
            } else {
                // Login feito: guarda usuário e token
                currentUser = data.username;
                token = data.token;
                // Salva no navegador para manter o login ao recarregar
                localStorage.setItem('devfeed_user', currentUser);
                localStorage.setItem('devfeed_token', token);
                // Apaga a senha do campo por segurança
                document.getElementById('authPassword').value = '';
                // Mostra o feed
                showApp();
            }
        } else {
            // A API recusou: mostra a mensagem de erro dela
            alert(data.message || 'Erro na autenticação');
        }
    } catch (err) {
        // Falha de rede (ex.: servidor desligado)
        console.error('Erro:', err);
        alert('Erro ao conectar com o servidor.');
    }
}

// Sai da conta
async function logout() {
    // Avisa o servidor para encerrar a sessão
    try { await api('/logout', { method: 'POST' }); } catch (err) { /* sem conexão: limpa localmente mesmo assim */ }
    // Limpa os dados locais e volta ao login
    clearSession();
}

// Mostra o feed e esconde o login
function showApp() {
    // Esconde a tela de login
    document.getElementById('auth-screen').style.display = 'none';
    // Mostra a tela principal
    document.getElementById('app-screen').style.display = 'block';
    // Mostra o nome do usuário logado
    document.getElementById('loggedUser').innerText = currentUser;
    // Carrega as publicações
    fetchPosts();
}

// ============================================================
// POSTS
// ============================================================

// Busca as publicações na API e desenha o feed
async function fetchPosts() {
    try {
        // Pede a lista de posts
        const { res, data } = await api('/posts');
        // Se deu certo, desenha na tela
        if (res.ok) renderFeed(data);
    } catch (err) {
        console.error('Erro ao buscar posts:', err);
    }
}

// Cria uma nova publicação (o autor é definido pelo servidor, via token)
async function createPost() {
    // Pega o campo de texto do post
    const contentInput = document.getElementById('postContent');
    // Não deixa publicar vazio
    if (!contentInput.value.trim()) return alert('Digite algum conteúdo!');

    try {
        // Envia só o conteúdo para a API
        const { res, data } = await api('/posts', {
            method: 'POST',
            body: JSON.stringify({ content: contentInput.value.trim() })
        });

        if (res.ok) {
            // Limpa o campo
            contentInput.value = '';
            // Recarrega o feed para mostrar o novo post
            fetchPosts();
        } else {
            // Mostra o erro retornado pelo servidor
            alert(data.message || 'Erro ao publicar');
        }
    } catch (err) {
        console.error('Erro ao criar post:', err);
    }
}

// Apaga uma publicação (o botão só aparece para o autor)
async function deletePost(postId) {
    // Pede confirmação antes de apagar
    if (!confirm('Apagar esta publicação e todos os comentários dela?')) return;
    try {
        // Chama a API com o método DELETE
        const { res, data } = await api(`/posts/${postId}`, { method: 'DELETE' });
        // Sucesso: recarrega o feed; erro: mostra a mensagem
        if (res.ok) fetchPosts();
        else alert(data.message || 'Erro ao apagar');
    } catch (err) {
        console.error('Erro ao apagar post:', err);
    }
}

// Curtir ou descurtir uma publicação
async function toggleLike(postId) {
    try {
        // Chama a API; ela alterna entre curtir e descurtir
        const { res } = await api(`/posts/${postId}/like`, { method: 'POST' });
        // Recarrega o feed para atualizar o contador
        if (res.ok) fetchPosts();
    } catch (err) {
        console.error('Erro ao curtir:', err);
    }
}

// ============================================================
// COMENTÁRIOS
// ============================================================

// Cria um comentário em um post (o autor vem do token)
async function createComment(postId) {
    // Pega o campo de comentário daquele post
    const contentInput = document.getElementById(`comment-content-${postId}`);
    // Ignora se estiver vazio
    if (!contentInput.value.trim()) return;

    try {
        // Envia o id do post e o texto
        const { res, data } = await api('/comments', {
            method: 'POST',
            body: JSON.stringify({ postId: postId, content: contentInput.value.trim() })
        });

        if (res.ok) {
            // Limpa o campo (o comentário enviado não deve ser restaurado como rascunho)
            contentInput.value = '';
            // Recarrega o feed
            fetchPosts();
        } else {
            // Mostra o erro retornado pelo servidor
            alert(data.message || 'Erro ao comentar');
        }
    } catch (err) {
        console.error('Erro ao comentar:', err);
    }
}

// Apaga um comentário (o botão só aparece para o autor)
async function deleteComment(commentId) {
    // Pede confirmação
    if (!confirm('Apagar este comentário?')) return;
    try {
        // Chama a API com o método DELETE
        const { res, data } = await api(`/comments/${commentId}`, { method: 'DELETE' });
        // Sucesso: recarrega o feed; erro: mostra a mensagem
        if (res.ok) fetchPosts();
        else alert(data.message || 'Erro ao apagar');
    } catch (err) {
        console.error('Erro ao apagar comentário:', err);
    }
}

// ============================================================
// DESENHO DO FEED
// ============================================================

// Desenha todos os posts na tela
function renderFeed(posts) {
    // Container onde os posts aparecem
    const feed = document.getElementById('feed');

    // Guarda o que já foi digitado nos campos de comentário,
    // para não perder o texto ao redesenhar o feed
    const drafts = {};
    feed.querySelectorAll('input[id^="comment-content-"]').forEach(input => {
        // Só guarda campos que têm texto
        if (input.value) drafts[input.id] = input.value;
    });

    // Limpa o feed antes de redesenhar
    feed.innerHTML = '';

    // Se não há posts, mostra uma mensagem e para por aqui
    if (posts.length === 0) {
        feed.innerHTML = '<p class="empty">Ainda não há publicações. Seja o primeiro a publicar.</p>';
        return;
    }

    // Para cada post recebido...
    posts.forEach(post => {
        // Cria o cartão do post
        const postElement = document.createElement('div');
        // Aplica a classe de estilo
        postElement.className = 'card';

        // Monta o HTML dos comentários do post
        const commentsHtml = post.comments.map(c => `
            <div class="comment">
                <span class="comment-author">${escapeHtml(c.author)}:</span>
                <span>${escapeHtml(c.content)}</span>
                ${c.author === currentUser
                    ? `<button class="icon-btn" title="Apagar comentário" onclick="deleteComment(${c.id})">&times;</button>`
                    : ''}
            </div>
        `).join('');

        // Monta o HTML completo do post
        postElement.innerHTML = `
            <div class="post-header">
                <div>
                    <div class="post-author">${escapeHtml(post.author)}</div>
                    <div class="post-date">${formatDate(post.created_at)}</div>
                </div>
                ${post.author === currentUser
                    ? `<button class="delete-btn" onclick="deletePost(${post.id})">Apagar</button>`
                    : ''}
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>

            <div class="post-actions">
                <button class="like-btn ${post.likedByMe ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    ${post.likedByMe ? '♥' : '♡'} ${post.likes} ${post.likes === 1 ? 'curtida' : 'curtidas'}
                </button>
            </div>

            <div class="comments-section">
                <div id="comments-list-${post.id}">
                    ${commentsHtml}
                </div>

                <div class="comment-form" style="margin-top: 10px;">
                    <input type="text" id="comment-content-${post.id}" maxlength="500" placeholder="Escreva um comentário..."
                           onkeydown="if (event.key === 'Enter') createComment(${post.id})">
                    <button onclick="createComment(${post.id})">Enviar</button>
                </div>
            </div>
        `;

        // Adiciona o cartão ao feed
        feed.appendChild(postElement);
    });

    // Restaura os rascunhos guardados nos campos de comentário
    Object.entries(drafts).forEach(([id, value]) => {
        // Procura o campo pelo id
        const input = document.getElementById(id);
        // Se o campo ainda existe, devolve o texto
        if (input) input.value = value;
    });
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

// Converte milissegundos em data/hora no formato brasileiro
function formatDate(ms) {
    return new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Escapa caracteres especiais do HTML (evita injeção de código, ou XSS)
function escapeHtml(text) {
    // Converte para texto (null/undefined viram '') antes de escapar
    return String(text ?? '').replace(/[&<>"']/g, match => {
        // Tabela de substituição de cada caractere perigoso
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        // Devolve o equivalente seguro
        return map[match];
    });
}
