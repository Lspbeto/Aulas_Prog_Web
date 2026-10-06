const caixatexto = document.querySelector('#campoNome');
const botaodia = document.querySelector('#btnDia');
const botanoite = document.querySelector('#btnNoite');
const areaResultado = document.querySelector('#painelResultado');
const caixa = document.querySelector('#fundo');
const tema = document.querySelector('#tema');
const modo = document.querySelector('#modo');

botaodia.addEventListener('click', function() {
    let nomeUsuario = caixatexto.value;
    areaResultado.innerHTML = `<h1>Bom dia, ${nomeUsuario}!</h1>`;
    caixa.style.backgroundColor = '#eef971';

    botaodia.classList.add('botao-clicado');
    botanoite.classList.remove('botao-clicado');
});

botanoite.addEventListener('click', function() {
    let nomeUsuario = caixatexto.value;
    areaResultado.innerHTML = `<h1>Boa noite, ${nomeUsuario}!</h1>`;
    caixa.style.backgroundColor = '#7197f9'; 

    botanoite.classList.add('botao-clicado');
    botaodia.classList.remove('botao-clicado');
});

tema.addEventListener('click', function(){
    caixa.classList.toggle('escuro');
});
modo.addEventListener('click' ,function () {
    caixa.classList.toggle('escuro');
    
});