function temperatura() {
    const tempo = document.getElementById("temp").value;
    const jresposta = document.querySelector("#resposta");
    const jimagem = document.getElementById("imagem");
    const jcorpo = document.getElementById("corpo");

    if (tempo > 35) {
        jresposta.innerHTML = `<h1>To pegando fogo!!!!!!!<p> ${tempo}ºC </p></h1> `;
        jimagem.src = "img/catver.jfif"
        // jcorpo.style.backgroundColor = "#8a5164";
        jcorpo.style.backgroundImage = "url('./img/fogo.webp')";

    } else if (tempo >= 20 && tempo < 35) {
        jresposta.innerHTML = `<h1>Tempo de praia!!!!!!!<p> ${tempo}ºC</p></h1>`;
        jimagem.src = "img/imgcat.jfif"
        // jcorpo.style.backgroundColor = "#363f3e";
        jcorpo.style.backgroundImage = "url('./img/OIP.webp')";
    }

    else if (tempo < 20) {
        jresposta.innerHTML = `<h1>Kd o SOl!!!!!!! <p>${tempo}ºC</p></h1>`;
        jimagem.src = "img/Getinverno.jpg"
        // jcorpo.style.backgroundColor = "#dbdf00";
        jcorpo.style.backgroundImage = "url('./img/cubos.webp')";
    }
}