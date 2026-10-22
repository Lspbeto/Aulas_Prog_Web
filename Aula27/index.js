const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("teste");
  });

app.get()

app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
  });



















// const ex = require('express')
// const app = ex();

// app.get('/', (req, res) => {
//     res.send("Olá, meu primeiro servidor!")
// })

// app.get('/sobre', (req, res) => {
//     res.send("Sobre a academia.")
// })

// app.get('/horario', (req, res) => {
//     res.json([
//         { dia: "Segunda", horario: "18h"},
//         { dia: "Terça", horario: "18h"}
//     ])
// })

// app.listen(3000, () => {
//     console.log("Servidor rodando em http://localhost:3000")
// })