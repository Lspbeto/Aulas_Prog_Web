// Seleciona os elementos do HTML que precisamos manipular via código
const formulario = document.getElementById('formularioUsuario');
const listaVisual = document.getElementById('listaVisual');

// Variável de controle essencial para o sistema saber se estamos criando ou editando alguém.
// Se for null, estamos criando (POST). Se tiver um nome, estamos editando (PUT).
let nomeUsuarioSendoEditado = null;

// FUNÇÃO: BUSCAR E DESENHAR OS USUÁRIOS (GET)
function carregarUsuarios() {
    // Faz uma requisição GET para o backend pedindo a lista de usuários atualizada
    fetch('http://localhost:3000/usuarios')
        .then(function (resposta) {
            // Transforma a resposta de texto JSON vinda do servidor em um array JavaScript utilizável
            return resposta.json();
        })
        .then(function (listaDeUsuarios) {
            // Limpa o conteúdo visual antigo da lista para evitar que os dados acumulem na tela
            listaVisual.innerHTML = '';
            // Varre o array de usuários recebido do servidor
            listaDeUsuarios.forEach(function (user) {
                // Cria um elemento de lista (li) na memória do navegador
                const itemLista = document.createElement('li');
                // Preenche o HTML interno do li com os dados do usuário atual (user)
                // Nota: Corrigido de 'usuario' para 'user' para bater com o parâmetro do forEach
                itemLista.innerHTML = `
                <span><strong>${user.nome}</strong> - ${user.cargo}</span>
                <div class="lista-user">
                    <!-- Botão de editar que envia os dados atuais desta linha para a função de preparação -->
                    <button class="btn-editar" onclick="prepararEdicao('${user.nome}', '${user.cargo}')">Editar</button>
                    <!-- Botão de excluir que passa o nome do usuário a ser removido -->
                    <button class="btn-deletar" onclick="deletarUsuario('${user.nome}')">Excluir</button>
                </div>`
                formulario.querySelector('button').innerText = 'Salva usuário';
            ;
                // Insere o elemento li criado dentro da nossa lista ul principal da página
                listaVisual.appendChild(itemLista);
            });
        })
        .catch(function (erro) {
            // Captura e exibe no console do navegador caso o servidor esteja desligado ou dê erro de rede
            console.error('Erro ao buscar usuários:', erro);
        });
}

// EVENTO: Envia o formulário para o backend (Pode salvar ou atualizar dependendo do contexto)
formulario.addEventListener('submit', function (evento) {
    // Impede que o HTML recarregue a página inteira, que é o comportamento padrão de formulários
    evento.preventDefault();

    // Captura os valores atuais digitados pelo usuário nos campos de texto
    const dadosUsuario = {
        nome: document.getElementById('campoNome').value,
        cargo: document.getElementById('campoCargo').value
    };

    // Estrutura de decisão: Verifica se o sistema está em modo de edição ou de criação
    if (nomeUsuarioSendoEditado !== null) {
        // MODO EDIÇÃO (PUT): O usuário clicou previamente em editar
        // encodeURIComponent garante que nomes com espaços ou caracteres especiais não quebrem o endereço da URL
        fetch(`http://localhost:3000/usuarios/${encodeURIComponent(nomeUsuarioSendoEditado)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosUsuario) // Converte os novos dados para texto JSON
        })
            .then(function (resposta) {
                // Converte a resposta do servidor para JSON
                return resposta.json();
            })
            .then(function (usuarioAtualizado) {
                // Limpa os campos do formulário após a alteração bem-sucedida
                formulario.reset();
                
                // Reseta a variável de controle para null, voltando o formulário para o modo de criação (POST)
                nomeUsuarioSendoEditado = null;
                
                // Recarrega a listagem visual na tela para refletir as alterações feitas
                carregarUsuarios();
            })
            .catch(function (erro) {
                console.error('Erro ao atualizar usuário:', erro);
                alert('Erro ao atualizar usuário.');
            });

    } else {
        // MODO CRIAÇÃO (POST): Fluxo normal de cadastro de um novo registro
        fetch('http://localhost:3000/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosUsuario)
        })
            .then(function (resposta) {
                return resposta.json();
            })
            .then(function (usuarioSalvo) {
                formulario.reset(); // Limpa os campos após o sucesso
                carregarUsuarios(); // Atualiza a lista na tela imediatamente
            })
            .catch(function (erro) {
                console.error('Erro ao salvar usuário:', erro);
                alert('Erro ao salvar usuário.');
            });
    }
});


// FUNÇÃO: Prepara a interface gráfica para o modo de edição
function prepararEdicao(nome, cargo) {
    // 1. Atribui o nome atual à variável de controle global para sabermos quem estamos editando
   

    // 2. Preenche automaticamente os inputs do formulário com os dados da pessoa selecionada
    document.getElementById('campoNome').value = nome;
    document.getElementById('campoCargo').value = cargo;

    formulario.querySelector('button').innerText = 'Atualizar usuário';

    // 3. Joga o foco do cursor do mouse diretamente no campo do nome para facilitar a edição
    document.getElementById('campoNome').focus();

    nomeUsuarioSendoEditado = nome;

    

    }


// FUNÇÃO: Deleta um usuário enviando uma requisição DELETE com o nome informado
function deletarUsuario(nome) {
    // Exibe uma caixa de confirmação nativa do navegador para evitar exclusões acidentais
    if (confirm(`Deseja realmente excluir o usuário ${nome}?`)) {
        
        // Dispara a requisição HTTP do tipo DELETE para a rota específica do backend passando o nome codificado
        fetch(`http://localhost:3000/usuarios/${encodeURIComponent(nome)}`, {
            method: 'DELETE'
        })
            .then(function (resposta) {
                // Converte a resposta para JSON
                return resposta.json();
            })
            .then(function (resultado) {
                // Atualiza a listagem visual na tela removendo o elemento excluído
                carregarUsuarios();
            })
            .catch(function (erro) {
                console.error('Erro ao deletar usuário:', erro);
                alert('Erro ao deletar usuário.');
            });
    }
}

// EVENTO: Dispara automaticamente a busca e renderização dos usuários assim que a página HTML terminar de carregar
window.addEventListener('DOMContentLoaded', carregarUsuarios);