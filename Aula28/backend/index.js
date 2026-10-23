const express = require("express");
const cors = require('cors'); // permite conexao externa segura
const app = express();

//configuraçôes de intermediarios 

app.use(cors());   //Liberamos o servidor para receber requisições de outros locais (como html)
app.use(express.json()); // Ensinamos o express a ler dados enviados em formato JSON
//Banco de dados "ficticios armazenado na memoria ram"
const usuarios = [
    {
       nome: "Ana Costa", cargo: "Desenvolvedor"
    },
     { 
       nome: "carlos Souza", cargo: "Designer"
    },

]; 
//Rota get envia a lista atual de usuário para solicitar 
app.get("/usuarios", function (requisicao, resposta) {
    return resposta.json(usuarios);});
//Rota get recebe novos dados do front insere na na lista 
app.post("/usuarios", function (requisicao, resposta) {
    const dadosRecebidos = requisicao.body; //pega o que usuario preencheu

    //Monta o novo objeto de usuário com id
    const novoUsuario ={
        id: usuarios.length + 1,
        nome: dadosRecebidos.nome,
        cargo: dadosRecebidos.cargo
    };
    usuarios.push(novoUsuario);// adicionad na nossa lista/banco
    //Devolve o startus 201
    return resposta.startus(201).json(novoUsuario);
});


//     res.send("Olá, meu primeiro servidor");
// });

// app.get("/horarios", (req, res) => {
//     res.json([
//         { dia: "Segunda", horario: "18h" },
//         { dia: "Quarta", horario: "19h" }
//     ]);
// });
const PORTA =300;

app.listen(PORTA, function () {
    console.log(`Backend rodando em http://localhost:${PORTA}`);
});













