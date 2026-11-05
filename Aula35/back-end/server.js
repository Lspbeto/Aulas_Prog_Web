const express = require('express'); //necessario para conectar banco
const cors = require('cors'); //necessario para conectar banco

const path = require('path'); //necessario para conectar banco
const mongoose = require('mongoose'); //necessario para conectar banco

//força caminho do .env: mapeia o caminho absoluto do arquivo para preveni

require('dotenv').config({ path: path.join(__dirname, '.env')}) //necessario para conectar banco

const app = express(); //necessario para conectar banco

app.use(cors());  //necessario para conectar banco
app.use(express.json());  //necessario para conectar banco




const  LINK_DO_BANCO = process.env.MONGO_URI;//INCIA A CONEXÃO COM O BANCO DE DADO OU SERVIDOR //necessario para conectar banco
mongoose.connect(LINK_DO_BANCO) //necessario para conectar banco
      .then(function (){console.log("Conectado com  sucesso ao Mongodb")}) //necessario para conectar banco
      .catch(function (erro){console.error("Erro ao conectar ao Mongo")}); //necessario para conectar banco


//modelo de dados (schema) : molde estrutural para mongo Nosql
const UsuarioSchema = new mongoose.Schema({   //necessario para conectar banco
    nome:{type:String, requered:true},   //necessario para conectar banco
    cargo:{type: String, requered: true}   //necessario para conectar banco
});

//modelo operacianal baseado no molde criado
const Usuario = mongoose.model('Usuario', UsuarioSchema);  //necessario para conectar banco
      // // Nossa lista de usuários na memória
// let usuarios = [
//     { nome: "Ana Costa", cargo: "Desenvolvedora" },
//     { nome: "Carlos Souza", cargo: "Designer" }
// ];

// // [GET] Listar todos
// app.get('/usuarios', function (requisicao, response) {
//     return response.json(usuarios);
// });


// app.get('/usuarios', function (requisicao, response) {
//     Usuario.find()
//     .then(function (listaDeUsuarios)

// .catch(function (erro){
//     return response.status(500).json({ erro: "Erro ao buscar dados "

//     });
// });

app.get('/usuarios', function (requisicao, response) {
    Usuario.find()
    .then(function (listaDeUsuarios) {
        // Aqui você envia a lista de usuários de volta para o cliente
        return response.status(200).json(listaDeUsuarios);
    })
    .catch(function (erro) {
        return response.status(500).json({ 
            erro: "Erro ao buscar dados", 
            detalhes: erro.message 
        });
    });
});





// // [POST] Criar um novo
// app.post('/usuarios', function (requisicao, response) {
//     const dadosRecebidos = requisicao.body;

//     const novoUsuario = {
//         nome: dadosRecebidos.nome,
//         cargo: dadosRecebidos.cargo
//     };

//     usuarios.push(novoUsuario);
//     return response.status(201).json(novoUsuario);
// });


app.post('/usuarios', function (requisicao, response) {
    const dadosRecebidos = requisicao.body;
     Usuario.create({
        nome: dadosRecebidos.nome,
        cargo: dadosRecebidos.cargo
     })
      .then(function(novoUsuario){return response.status(201).json(novoUsuario);
      })
      .catch(function (erro){
        return response.status(400).json({ erro: "Erro ao salvar usuário no banco"
        });
      });
//     const novoUsuario = {
//         nome: dadosRecebidos.nome,
//         cargo: dadosRecebidos.cargo
//     };

//     usuarios.push(novoUsuario);
//     return response.status(201).json(novoUsuario);
 });





// // [PUT] Atualizar pelo Nome
// app.put('/usuarios/:nomeParametro', function (requisicao, response) {
//     // decodeURIComponent limpa os espaços e caracteres da URL
//     const nomeParametro = decodeURIComponent(requisicao.params.nomeParametro);
//     const dadosNovos = requisicao.body;

//     // Procura o usuário na lista ignorando letras maiúsculas e minúsculas 
//     const usuarioEncontrado = usuarios.find(function (u) {
//         return u.nome.toLowerCase() === nomeParametro.toLowerCase(); 
//     });

//     // Se o usuário não for encontrado no array, retorna o erro 404
//     if (!usuarioEncontrado) {
//         return response.status(404).json({ erro: "Usuário não encontrado no sistema" }); 
//     }

//     // Aplica os novos dados recebidos
//     usuarioEncontrado.nome = dadosNovos.nome || usuarioEncontrado.nome;
//     usuarioEncontrado.cargo = dadosNovos.cargo || usuarioEncontrado.cargo;

//     return response.json(usuarioEncontrado);
// });

// // [DELETE] Remover pelo Nome
// app.delete('/usuarios/:nomeParametro', function (requisicao, response) {
//     const nomeParametro = decodeURIComponent(requisicao.params.nomeParametro);

//     // Procura o índice do usuário no array
//     const indiceUsuario = usuarios.findIndex(function (u) {
//         return u.nome.toLowerCase() === nomeParametro.toLowerCase();
//     });

//     // Se não encontrar, retorna 404
//     if (indiceUsuario === -1) {
//         return response.status(404).json({ erro: "Usuário não encontrado para exclusão" });
//     }

//     // Remove o usuário do array
//     const usuarioRemovido = usuarios.splice(indiceUsuario, 1);

//     return response.json({
//         mensagem: "Usuário removido com sucesso",
//         usuario: usuarioRemovido[0]
//     });
// });

const PORTA = 3000;
app.listen(PORTA, function () {
    console.log(`🚀 Backend rodando em http://localhost:${PORTA}`);
});