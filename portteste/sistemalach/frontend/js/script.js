// ============================================================
// frontend/js/script.js
//
// ALTERAÇÃO: o index.html agora pode ser aberto com duplo clique (file://).
// Nesse modo, o caminho relativo '/api/dados' NÃO funciona, porque não existe
// servidor na origem file://. Por isso criamos API_URL:
//   - aberto via file://            -> usa http://localhost:3000/api
//   - aberto via http://localhost   -> usa '/api' (mesma origem, como antes)
// IMPORTANTE: o backend precisa estar rodando (npm start na pasta backend)
// e com CORS habilitado (já ajustado no server.js).
// ============================================================
// CORREÇÃO: a versão anterior só tratava file://. Se a página fosse aberta por
// outro servidor (ex.: Live Server do VS Code, porta 5500), '/api/dados' batia
// nesse servidor, que devolvia uma página 404 em HTML -> erro "Unexpected token '<'".
// Agora: só usa '/api' (caminho relativo) quando a página já vem da porta 3000;
// em qualquer outro caso aponta direto para o backend.
const API_URL = 'http://localhost:3000/api';
 
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosPortfolio();
    initThemeToggle();
    initScrollReveal();
    initFormContato();
});
 
let dadosGlobais = {};
 
async function carregarDadosPortfolio() {
    try {
        // ALTERAÇÃO: '/api/dados' virou `${API_URL}/dados`
        const response = await fetch(`${API_URL}/dados`);
        console.log(`Resposta servidor ${response}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        dadosGlobais = await response.json();
 
        initTypewriter([dadosGlobais.perfil.cargo, "Especialista em Suporte & TI", "Desenvolvedor Full Stack JS"]);
        document.getElementById('sobre-texto').textContent = dadosGlobais.perfil.resumo;
 
        renderizarExperiencias(dadosGlobais.experiencias);
        renderizarProjetos(dadosGlobais.projetos);
        configurarFiltros();
        renderizarCertificados(dadosGlobais.certificados);
 
    } catch (error) {
        console.error("Erro ao carregar dados do portfólio:", error);
        // ALTERAÇÃO: mensagem visível na página quando o servidor está desligado,
        // em vez de ficar eternamente em "Carregando perfil...".
        document.getElementById('sobre-texto').textContent =
            'Não foi possível carregar os dados. Verifique se o servidor está rodando em http://localhost:3000.';
        initTypewriter(["Suporte & TI", "Desenvolvedor Full Stack JS"]);
    }
}
 
// 1. Efeito Digitação
function initTypewriter(textos) {
    const target = document.getElementById('typewriter');
    let indexTexto = 0;
    let indexChar = 0;
    let deletando = false;
 
    function digitar() {
        const atual = textos[indexTexto];
        if (deletando) {
            target.textContent = atual.substring(0, indexChar - 1);
            indexChar--;
        } else {
            target.textContent = atual.substring(0, indexChar + 1);
            indexChar++;
        }
 
        let velocidade = deletando ? 40 : 80;
 
        if (!deletando && indexChar === atual.length) {
            velocidade = 2000;
            deletando = true;
        } else if (deletando && indexChar === 0) {
            deletando = false;
            indexTexto = (indexTexto + 1) % textos.length;
            velocidade = 400;
        }
        setTimeout(digitar, velocidade);
    }
    digitar();
}
 
// 2. Alternar Tema (Dark/Light)
function initThemeToggle() {
    const btnTheme = document.getElementById('toggle-theme');
    const html = document.documentElement;
 
    btnTheme.addEventListener('click', () => {
        const temaAtual = html.getAttribute('data-theme');
        const novoTema = temaAtual === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', novoTema);
        btnTheme.textContent = novoTema === 'dark' ? '🌙' : '☀️';
    });
}
 
// 3. Renderizar Experiências
function renderizarExperiencias(expList) {
    const container = document.getElementById('container-experiencia');
    container.innerHTML = expList.map(exp => `
        <div class="timeline-item">
            <h3>${exp.cargo}</h3>
            <span class="empresa">${exp.empresa}</span>
            <span class="periodo">${exp.periodo}</span>
            <p>${exp.descricao}</p>
        </div>
    `).join('');
}
 
// 4. Renderizar Projetos e Atuações
function renderizarProjetos(lista) {
    const container = document.getElementById('container-projetos');
    container.innerHTML = lista.map(proj => `
        <div class="card">
            <h3>${proj.titulo}</h3>
            <p>${proj.descricao}</p>
            <div class="tags" style="margin-top: 1rem;">
                ${proj.tags.map(tag => `<span>${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}
 
function configurarFiltros() {
    const botoes = document.querySelectorAll('.btn-filtro');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            botoes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
 
            const categoria = btn.getAttribute('data-categoria');
            if (categoria === 'todos') {
                renderizarProjetos(dadosGlobais.projetos);
            } else {
                const filtrados = dadosGlobais.projetos.filter(p => p.categoria === categoria);
                renderizarProjetos(filtrados);
            }
        });
    });
}
 
// 5. Renderizar Certificados
function renderizarCertificados(certs) {
    const lista = document.getElementById('lista-certificados');
    lista.innerHTML = certs.map(c => `<li>${c}</li>`).join('');
}
 
// 6. Animação Scroll
function initScrollReveal() {
    const elementos = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });
 
    elementos.forEach(el => observer.observe(el));
}
 
// 7. Envio do Formulário de Contato via Fetch API
function initFormContato() {
    const form = document.getElementById('form-contato');
    const respostaEl = document.getElementById('resposta-form');
 
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const mensagem = document.getElementById('mensagem').value;
 
        respostaEl.textContent = 'Enviando...';
        respostaEl.style.color = 'var(--accent)';
 
        try {
            // ALTERAÇÃO: '/api/contato' virou `${API_URL}/contato`
            const response = await fetch(`${API_URL}/contato`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, mensagem })
            });
            const data = await response.json();
            if (response.ok) {
                respostaEl.textContent = data.mensagem;
                respostaEl.style.color = '#22c55e';
                form.reset();
            } else {
                respostaEl.textContent = data.mensagem;
                respostaEl.style.color = '#ef4444';
            }
        } catch (err) {
            respostaEl.textContent = 'Erro ao conectar ao servidor.';
            respostaEl.style.color = '#ef4444';
        }
    });
}
 