function validarNumero() {

    const numero = document.getElementById("numero").value;
    const areaResultado = document.querySelector('#resultado');

    if (numero > 0) {
        areaResultado.innerHTML = `<h1>Número é positivo, ${numero}!</h1>`;

        return false;
    } else if (numero < 0) {
        areaResultado.innerHTML = `<h1>Número é negativo, ${numero}!</h1>`;

        return false;
    } else if (numero === 0) {
        areaResultado.innerHTML = `<h1>Número é neutro, ${numero}!</h1>`;
    }

}