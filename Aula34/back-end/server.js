const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Nossa lista de usuários na memória
let usuarios = [
    { nome: "Ana Costa", cargo: "Desenvolvedora" },
    { nome: "Carlos Souza", cargo: "Designer" }
];

// [GET] Listar todos
app.get('/usuarios', function (requisicao, response) {
    return response.json(usuarios);
});

// [POST] Criar um novo
app.post('/usuarios', function (requisicao, response) {
    const dadosRecebidos = requisicao.body;

    const novoUsuario = {
        nome: dadosRecebidos.nome,
        cargo: dadosRecebidos.cargo
    };

    usuarios.push(novoUsuario);
    return response.status(201).json(novoUsuario);
});

// [PUT] Atualizar pelo Nome
app.put('/usuarios/:nomeParametro', function (requisicao, response) {
    // decodeURIComponent limpa os espaços e caracteres da URL
    const nomeParametro = decodeURIComponent(requisicao.params.nomeParametro);
    const dadosNovos = requisicao.body;

    // Procura o usuário na lista ignorando letras maiúsculas e minúsculas 
    const usuarioEncontrado = usuarios.find(function (u) {
        return u.nome.toLowerCase() === nomeParametro.toLowerCase(); 
    });

    // Se o usuário não for encontrado no array, retorna o erro 404
    if (!usuarioEncontrado) {
        return response.status(404).json({ erro: "Usuário não encontrado no sistema" }); 
    }

    // Aplica os novos dados recebidos
    usuarioEncontrado.nome = dadosNovos.nome || usuarioEncontrado.nome;
    usuarioEncontrado.cargo = dadosNovos.cargo || usuarioEncontrado.cargo;

    return response.json(usuarioEncontrado);
});

// [DELETE] Remover pelo Nome
app.delete('/usuarios/:nomeParametro', function (requisicao, response) {
    const nomeParametro = decodeURIComponent(requisicao.params.nomeParametro);

    // Procura o índice do usuário no array
    const indiceUsuario = usuarios.findIndex(function (u) {
        return u.nome.toLowerCase() === nomeParametro.toLowerCase();
    });

    // Se não encontrar, retorna 404
    if (indiceUsuario === -1) {
        return response.status(404).json({ erro: "Usuário não encontrado para exclusão" });
    }

    // Remove o usuário do array
    const usuarioRemovido = usuarios.splice(indiceUsuario, 1);

    return response.json({
        mensagem: "Usuário removido com sucesso",
        usuario: usuarioRemovido[0]
    });
});

const PORTA = 3000;
app.listen(PORTA, function () {
    console.log(`🚀 Backend rodando em http://localhost:${PORTA}`);
});