const jresposta1 = document.querySelector("#resposta1");
const jresposta2 = document.querySelector("#resposta2");
const jresposta3 = document.querySelector("#resposta3");
const jresposta4 = document.querySelector("#resposta4");

function soma(){
    let num1 = Number(document.getElementById("num1").value);
    let num2 = Number(document.getElementById("num2").value);
    let num3 = (num1+num2)
    jresposta1.innerHTML = `<h1>Soma<p> ${num3} </p></h1> `;
}
function divisao(){
    let num1 = Number(document.getElementById("num1").value);
    let num2 = Number(document.getElementById("num2").value);
    let num3 = (num1/num2)
    jresposta2.innerHTML = `<h1>Divisão<p> ${num3} </p></h1> `;
}
function multiplicador(){
    let num1 = Number(document.getElementById("num1").value);
    let num2 = Number(document.getElementById("num2").value);
    let num3 = (num1*num2)
    jresposta3.innerHTML = `<h1>Multiplicação<p> ${num3} </p></h1> `;
}
function diminuendo(){
    let num1 = Number(document.getElementById("num1").value);
    let num2 = Number(document.getElementById("num2").value);
    let num3 = (num1-num2)
    jresposta4.innerHTML = `<h1>Diminuição<p> ${num3} </p></h1> `;
}
