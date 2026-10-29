const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const moduleSelect = document.getElementById('module-select');
const fileNameInput = document.getElementById('file-name-input');
const codeEditor = document.getElementById('code-editor');
const saveCodeBtn = document.getElementById('save-code-btn');
const newFileBtn = document.getElementById('new-file-btn');

// Função para adicionar mensagens no chat
function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Carregar lista de módulos salvos
async function loadModules() {
    try {
        const res = await fetch('/api/modules');
        const data = await res.json();
        moduleSelect.innerHTML = '<option value="">Selecione um módulo...</option>';
        data.files.forEach(file => {
            const opt = document.createElement('option');
            opt.value = file;
            opt.textContent = file;
            moduleSelect.appendChild(opt);
        });
    } catch (e) {
        console.error('Erro ao carregar módulos', e);
    }
}

// Interação básica de chat (Simulando comportamento adaptativo da IA)
sendBtn.addEventListener('click', async () => {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    userInput.value = '';

    // Resposta simulada inteligente / comando de expansão
    setTimeout(() => {
        if (text.toLowerCase().startsWith('criar funcao')) {
            appendMessage('ai', 'Entendido. Criei uma estrutura base no editor à direita para você evoluir o código.');
            fileNameInput.value = 'nova_funcao.js';
            codeEditor.value = `// Módulo gerado automaticamente\nfunction minhaNovaHabilidade() {\n    console.log("Executando nova inteligência!");\n}\n`;
        } else {
            appendMessage('ai', `Processado com sucesso. Use o editor ao lado para salvar alterações permanentes no código.`);
        }
    }, 500);
});

// Carregar código ao selecionar um arquivo
moduleSelect.addEventListener('change', async () => {
    const filename = moduleSelect.value;
    if (!filename) return;

    try {
        const res = await fetch(`/api/modules/${filename}`);
        const data = await res.json();
        fileNameInput.value = data.filename;
        codeEditor.value = data.content;
    } catch (e) {
        console.error('Erro ao carregar arquivo', e);
    }
});

// Novo arquivo
newFileBtn.addEventListener('click', () => {
    fileNameInput.value = 'modulo_personalizado.js';
    codeEditor.value = `// Novo código modular\n`;
    moduleSelect.value = '';
});

// Salvar alterações no próprio código/sistema via API do Node.js
saveCodeBtn.addEventListener('click', async () => {
    const filename = fileNameInput.value.trim();
    const codeContent = codeEditor.value;

    if (!filename) {
        alert('Defina um nome para o arquivo!');
        return;
    }

    try {
        const res = await fetch('/api/evolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, codeContent })
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            loadModules();
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (e) {
        alert('Falha na comunicação com o servidor Node.js.');
    }
});

// Inicialização
loadModules();
appendMessage('ai', 'Olá! Estou online, pronto para receber comandos e evoluir meu próprio código.');