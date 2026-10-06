function verificarIdade() {
    let idade =document.getElementById("campoIdade").value;
    let textoResultado = document.getElementById("resultado")
    
    
    if(idade < 18){
        textoResultado.innerHTML = "Você é menor de idade.";
    }
    else{
        textoResultado.innerHTML ="Acesso liberado! Voce é maior de idade.";
    }   
}