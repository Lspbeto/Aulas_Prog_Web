

const jresposta = document.querySelector("#resposta");

function atv() {
const incprod = document.querySelector("#prod");
const jprod = incprod.value.trim();

if (!jprod){
    jresposta.textContent = "Por favor digite o produto.";
    return;
}

const frutas = ['maçã','Banana','Melancia'];


frutas.push (jproj);

console.log("Produto inserido:", variavel);
console.log("Lista completa:", frutas);

jresposta.textContent ="Produto: " + frutas.join(", ");
incprod.value = "";

// console.log(frutas[1]);

// alert(frutas());

}

// function atv () {      
//    let item = document.querySelector("#resposta");

// } 