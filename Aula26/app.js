const http = require('http');
 const meuservidor = http.createServer(function (requisicao, resposta){

   resposta.writeHead(200,{'content-type': 'text/plain; charset=utf-8'});

if (requisicao.url === '/') {
    resposta.end('Você está na pagina inicial do servidor!');
    
} else if (requisicao.url === '/contato') {
    resposta.end('Esta é a pagina de contato: Contato@empresa.com');
} else {
    resposta.writeHead(404,{'content-type': 'text/plain; charset=utf-8' }
    resposta.end('Erro 404: Pagina não encontrada!');    
    
}



}) ;
  

console.log(operacoes.soma(10,5));
console.log(operacoes.subtracao(10,5));
console.log(operacoes.multiplicacao(10,5));
console.log(operacoes.divisao(10,5));