 function validarLogin() {
            var user = document.getElementById("usuario").value;
            var pass = document.getElementById("senha").value;
            const mensagem = document.getElementById("mensagem")
             if (user === "admin" && pass === "123456") {
                alert("Login realizado com sucesso!");
                window.location.href = "inicio.html";
              
                return false;
            } else {
                alert("Usuário ou senha incorretos!");
                return false;
            }
        }