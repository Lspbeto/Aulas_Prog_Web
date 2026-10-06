function validarLogin(){
         let user =document.getElementById("usuario").value;
         let pass = document.getElementById("senha").value;
         let areaResultado = document.querySelector('#resultado');     
         /* const mensagem = document.getElementById("mensagem");*/

        if (user === "admin" && pass ==="123456"){
            areaResultado.innerHTML =`<h1>Login realizado com sucesso, ${usuario}!</h1>`;
            window.location.href = "seg2.html";
            alert("Login realizado com sucesso")
            return false;
        }else{
            alert("Usuario ou senha incorreto!!")
            return false;
        }

        }