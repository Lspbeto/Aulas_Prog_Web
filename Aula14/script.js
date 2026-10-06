const caixatexto =document.querySelector('#campoNome');
const botaodia =document.querySelector('#btnDia');
const areaResultado =document.querySelector('#painelResultado');
const botanoite =document.querySelector('#btnNoite');

botaodia.addEventListener('click', function(){
    let nomeUsuario = caixatexto.value;
    areaResultado.textContent = `Bom dia ${nomeUsuario}!`; 
}

);

botanoite.addEventListener('click', function(){
    let nomeUsuario = caixatexto.value;
    areaResultado.textContent = `Bom noite ${nomeUsuario}`; 
}
);

