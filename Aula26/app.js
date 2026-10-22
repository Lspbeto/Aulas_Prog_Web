const http = require('http');

const meuservidor = http.createServer(function (requisicao, resposta) {

    if (requisicao.url === '/') {
        resposta.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        resposta.end('Você está na página inicial do servidor!');

    } else if (requisicao.url === '/contato') {
        resposta.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        resposta.end('Esta é a página de contato: Contato@empresa.com');

    } else {
        resposta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        resposta.end('Erro 404: Página não encontrada!');
    }
});

const PORTA = 3000;
meuservidor.listen(PORTA, function () {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
// console.log(operacoes.soma(10,5));
// console.log(operacoes.subtracao(10,5));
// console.log(operacoes.multiplicacao(10,5));
// console.log(operacoes.divisao(10,5));