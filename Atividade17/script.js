function nota(){
    let resultado = document.getElementById("resultado");
    let not1 = parseFloat(document.getElementById("not1").value);
    let not2 = parseFloat(document.getElementById("not2").value);
    let not3 = parseFloat(document.getElementById("not3").value);
    let not4 = parseFloat(document.getElementById("not4").value);
    let media = (not1+not2+not3+not4)/4
    
    if(media > 6){
        console.log(media)
        resultado.innerText = "Você foi aprovado";
       
    }
    else{
    resultado.innerText = "Você foi reprovado...";
         }
}