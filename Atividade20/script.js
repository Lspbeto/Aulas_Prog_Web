function tempo(){
    const temp = document.getElementById("numero").value;
    const areaResultado = document.querySelector('#resultado');
    
    if(temp >35){
        areaResultado.innerHTML = `<h1>esta pegando fogo!!!!, ${temp}</h1>`;
        return falso;

    } else if(temp <= 35 ){
        areaResultado.innerHTML = `<h1>DA para aguentar!!!!, ${temp}</h1>`;
        return falso;

    } 

}