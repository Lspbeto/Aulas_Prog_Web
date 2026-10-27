let usuarioLogado = '';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const errorMsg = document.getElementById('errorMsg');

    // Alternar entre Login e Cadastro
    if (showRegister && showLogin) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            errorMsg.textContent = '';
        });

        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            errorMsg.textContent = '';
        });
    }

    // Cadastro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (data.success) {
                alert(data.message);
                registerForm.reset();
                showLogin.click();
            } else {
                errorMsg.textContent = data.message;
            }
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (data.success) {
                window.location.href = 'feed.html';
            } else {
                errorMsg.textContent = data.message;
            }
        });
    }

    // Feed
    const postsList = document.getElementById('postsList');
    if (postsList) {
        fetch('/check-auth')
            .then(res => res.json())
            .then(data => {
                if (!data.autenticado) {
                    window.location.href = 'index.html';
                } else {
                    usuarioLogado = data.usuario;
                    document.getElementById('userDisplay').textContent = usuarioLogado;
                    carregarPosts();
                    carregarUsuariosOnline();
                    
                    // Atualiza a lista de usuários a cada 5 segundos
                    setInterval(carregarUsuariosOnline, 5000);
                }
            });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST' });
            window.location.href = 'index.html';
        });

        document.getElementById('postForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const conteudoInput = document.getElementById('postContent');
            const conteudo = conteudoInput.value;

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conteudo })
            });

            const data = await res.json();
            if (data.success) {
                conteudoInput.value = '';
                carregarPosts();
            }
        });
    }
});

// Buscar e Renderizar Posts
async function carregarPosts() {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    const postsList = document.getElementById('postsList');
    postsList.innerHTML = '';

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'card';

        const comentariosHtml = post.comentarios.map(c => {
            const jaCurtiu = c.curtidas.includes(usuarioLogado);
            return `
                <div class="comment">
                    <div>
                        <span class="comment-author">${escapeHtml(c.autor)}:</span>
                        <span>${escapeHtml(c.conteudo)}</span>
                    </div>
                    <button 
                        class="btn-like ${jaCurtiu ? 'liked' : ''}" 
                        onclick="curtirComentario(${post.id}, ${c.id})">
                        👍 ${c.curtidas.length}
                    </button>
                </div>
            `;
        }).join('');

        postElement.innerHTML = `
            <div class="post-header">
                <span class="post-author">${escapeHtml(post.autor)}</span>
                <span>${post.data}</span>
            </div>
            <div class="post-content">${escapeHtml(post.conteudo)}</div>
            
            <div class="comments-section">
                <div>${comentariosHtml}</div>
                <form class="comment-form" onsubmit="enviarComentario(event, ${post.id})">
                    <input type="text" placeholder="Escreva um comentário..." required>
                    <button type="submit" class="btn-secondary">Comentar</button>
                </form>
            </div>
        `;

        postsList.appendChild(postElement);
    });
}

// Buscar lista de usuários e status (Online/Offline)
async function carregarUsuariosOnline() {
    const res = await fetch('/api/users/online');
    const usuarios = await res.json();
    const usersList = document.getElementById('usersList');
    
    if (!usersList) return;

    usersList.innerHTML = usuarios.map(u => `
        <li>
            <span class="status-dot ${u.online ? 'status-online' : 'status-offline'}"></span>
            ${escapeHtml(u.username)}
        </li>
    `).join('');
}

// Enviar Comentário
async function enviarComentario(event, postId) {
    event.preventDefault();
    const input = event.target.querySelector('input');
    const conteudo = input.value;

    const res = await fetch(`/api/posts/${postId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo })
    });

    const data = await res.json();
    if (data.success) {
        input.value = '';
        carregarPosts();
    }
}

// Curtir/Descurtir Comentário
async function curtirComentario(postId, commentId) {
    const res = await fetch(`/api/posts/${postId}/comentarios/${commentId}/like`, {
        method: 'POST'
    });

    const data = await res.json();
    if (data.success) {
        carregarPosts();
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}