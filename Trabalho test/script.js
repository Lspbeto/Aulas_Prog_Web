document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENTOS DOM DE AUTENTICAÇÃO ---
  const telaAuth = document.getElementById("telaAuth");
  const authTitulo = document.getElementById("authTitulo");
  const authSub = document.getElementById("authSub");
  const aUser = document.getElementById("aUser");
  const aPass = document.getElementById("aPass");
  const boxConfirma = document.getElementById("boxConfirma");
  const aPass2 = document.getElementById("aPass2");
  const authMsg = document.getElementById("authMsg");
  const btnAuth = document.getElementById("btnAuth");
  const btnTroca = document.getElementById("btnTroca");

  // --- ELEMENTOS DOM DO APP ---
  const telaApp = document.getElementById("telaApp");
  const nomeLogado = document.getElementById("nomeLogado");
  const btnSair = document.getElementById("btnSair");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // --- ELEMENTOS DA DESPENSA ---
  const dataHojeEl = document.getElementById("dataHoje");
  const qtdVerdeEl = document.getElementById("qtdVerde");
  const qtdAmareloEl = document.getElementById("qtdAmarelo");
  const qtdVermelhoEl = document.getElementById("qtdVermelho");
  const formProdutoDespensa = document.getElementById("formProduto");
  const corpoTabelaDespensa = document.getElementById("corpoTabela");
  const alertasDiv = document.getElementById("alertas");

  // --- ELEMENTOS DOS PRODUTOS SIMPLES ---
  const pNome = document.getElementById("pNome");
  const pPreco = document.getElementById("pPreco");
  const pQtd = document.getElementById("pQtd");
  const btnProduto = document.getElementById("btnProduto");
  const prodMsg = document.getElementById("prodMsg");
  const listaProdutos = document.getElementById("listaProdutos");
  const vazioProd = document.getElementById("vazioProd");

  // --- ELEMENTOS DE USUÁRIOS ---
  const uNome = document.getElementById("uNome");
  const uSenha = document.getElementById("uSenha");
  const btnUsuario = document.getElementById("btnUsuario");
  const userMsg = document.getElementById("userMsg");
  const listaUsuarios = document.getElementById("listaUsuarios");

  // --- ESTADO GLOBAL ---
  let modoLogin = true;
  let usuarios = JSON.parse(localStorage.getItem("sis_usuarios")) || [];
  let produtosSimples = JSON.parse(localStorage.getItem("sis_produtos")) || [];
  let itensDespensa = JSON.parse(localStorage.getItem("sis_despensa")) || [];
  let usuarioLogado = localStorage.getItem("sis_usuarioLogado") || null;

  // Data de referência
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataHojeEl.textContent = formatarDataBR(hoje);

  // --- INICIALIZAÇÃO ---
  init();

  function init() {
    if (usuarioLogado) {
      exibirApp();
    } else {
      exibirAuth();
    }
  }

  // --- NAVEGAÇÃO DE TELAS E ABAS ---
  function exibirAuth() {
    telaAuth.classList.remove("hidden");
    telaApp.classList.add("hidden");
    limparFormAuth();
  }

  function exibirApp() {
    telaAuth.classList.add("hidden");
    telaApp.classList.remove("hidden");
    nomeLogado.textContent = usuarioLogado;
    
    atualizarDespensa();
    renderizarProdutosSimples();
    renderizarUsuarios();
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabTarget = btn.getAttribute("data-tab");

      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.add("hidden"));

      btn.classList.add("active");
      document.getElementById(tabTarget).classList.remove("hidden");
    });
  });

  // --- MENSAGENS DE FEEDBACK ---
  function exibirMsg(elemento, texto, isSucesso = false) {
    elemento.textContent = texto;
    elemento.style.color = isSucesso ? "#2e7d32" : "#d32f2f";
    if (texto) {
      setTimeout(() => { elemento.textContent = ""; }, 4000);
    }
  }

  // --- AUTENTICAÇÃO ---
  btnTroca.addEventListener("click", () => {
    modoLogin = !modoLogin;
    limparFormAuth();

    if (modoLogin) {
      authTitulo.textContent = "Entrar";
      authSub.textContent = "Use seu usuário e senha.";
      btnAuth.textContent = "Entrar";
      btnTroca.textContent = "Criar uma conta";
      boxConfirma.classList.add("hidden");
    } else {
      authTitulo.textContent = "Criar conta";
      authSub.textContent = "Preencha os dados abaixo para se cadastrar.";
      btnAuth.textContent = "Cadastrar";
      btnTroca.textContent = "Já tenho uma conta";
      boxConfirma.classList.remove("hidden");
    }
  });

  btnAuth.addEventListener("click", () => {
    const user = aUser.value.trim();
    const pass = aPass.value.trim();

    if (!user || !pass) {
      exibirMsg(authMsg, "Preencha todos os campos obrigatórios.");
      return;
    }

    if (modoLogin) {
      const usuarioEncontrado = usuarios.find(u => u.username === user && u.senha === pass);
      if (usuarioEncontrado) {
        usuarioLogado = usuarioEncontrado.username;
        localStorage.setItem("sis_usuarioLogado", usuarioLogado);
        exibirApp();
      } else {
        exibirMsg(authMsg, "Usuário ou senha incorretos.");
      }
    } else {
      const pass2 = aPass2.value.trim();
      if (pass !== pass2) {
        exibirMsg(authMsg, "As senhas não coincidem.");
        return;
      }
      if (usuarios.some(u => u.username === user)) {
        exibirMsg(authMsg, "Este usuário já existe.");
        return;
      }

      usuarios.push({ username: user, senha: pass });
      localStorage.setItem("sis_usuarios", JSON.stringify(usuarios));
      usuarioLogado = user;
      localStorage.setItem("sis_usuarioLogado", usuarioLogado);
      exibirApp();
    }
  });

  btnSair.addEventListener("click", () => {
    usuarioLogado = null;
    localStorage.removeItem("sis_usuarioLogado");
    exibirAuth();
  });

  function limparFormAuth() {
    aUser.value = "";
    aPass.value = "";
    aPass2.value = "";
    authMsg.textContent = "";
  }

  // --- MÓDULO 1: PAINEL DA DESPENSA ---
  formProdutoDespensa.addEventListener("submit", (e) => {
    e.preventDefault();

    const novoItem = {
      id: Date.now(),
      nome: document.getElementById("produto").value.trim(),
      categoria: document.getElementById("categoria").value,
      quantidade: parseFloat(document.getElementById("quantidade").value),
      unidade: document.getElementById("unidade").value,
      validade: document.getElementById("validade").value,
      local: document.getElementById("local").value.trim() || "-",
      valor: parseFloat(document.getElementById("valor").value) || 0
    };

    itensDespensa.push(novoItem);
    localStorage.setItem("sis_despensa", JSON.stringify(itensDespensa));
    atualizarDespensa();
    formProdutoDespensa.reset();
  });

  function atualizarDespensa() {
    let contadores = { verde: 0, amarelo: 0, vermelho: 0 };
    let listaAlertas = [];

    corpoTabelaDespensa.innerHTML = "";

    if (itensDespensa.length === 0) {
      corpoTabelaDespensa.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #666;">Nenhum ingrediente na despensa.</td></tr>`;
    }

    itensDespensa.sort((a, b) => new Date(a.validade) - new Date(b.validade));

    itensDespensa.forEach((item) => {
      const [ano, mes, dia] = item.validade.split("-");
      const dataValidade = new Date(ano, mes - 1, dia);
      dataValidade.setHours(0, 0, 0, 0);

      const diffTempo = dataValidade.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

      const statusObj = calcularStatus(diffDias);
      contadores[statusObj.chave]++;

      if (statusObj.chave === "amarelo") {
        listaAlertas.push(`🟡 <strong>${escapeHtml(item.nome)}</strong> vence em ${diffDias} dia(s) (${formatarDataBR(dataValidade)}).`);
      } else if (statusObj.chave === "vermelho") {
        const textoPrazo = diffDias === 0 ? "vence HOJE" : `venceu há ${Math.abs(diffDias)} dia(s)`;
        listaAlertas.push(`🔴 <strong>${escapeHtml(item.nome)}</strong> ${textoPrazo} (${formatarDataBR(dataValidade)}).`);
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(item.nome)}</strong></td>
        <td>${escapeHtml(item.categoria)}</td>
        <td>${item.quantidade} ${item.unidade}</td>
        <td>${formatarDataBR(dataValidade)}</td>
        <td>${statusObj.textoPrazo}</td>
        <td>${statusObj.badge}</td>
        <td>${escapeHtml(item.local)}</td>
        <td>
          <button type="button" class="sec" style="padding: 2px 8px;" onclick="removerItemDespensa(${item.id})">Excluir</button>
        </td>
      `;
      corpoTabelaDespensa.appendChild(tr);
    });

    qtdVerdeEl.textContent = contadores.verde;
    qtdAmareloEl.textContent = contadores.amarelo;
    qtdVermelhoEl.textContent = contadores.vermelho;

    renderizarAlertas(listaAlertas);
  }

  function calcularStatus(dias) {
    if (dias > 7) {
      return { chave: "verde", badge: "🟢 OK", textoPrazo: `Restam ${dias} dias` };
    } else if (dias >= 1 && dias <= 7) {
      return { chave: "amarelo", badge: "🟡 Próximo", textoPrazo: `Restam ${dias} dia(s)` };
    } else {
      const texto = dias === 0 ? "Vence hoje!" : `Vencido há ${Math.abs(dias)} dia(s)`;
      return { chave: "vermelho", badge: "🔴 Vencido", textoPrazo: texto };
    }
  }

  function renderizarAlertas(alertas) {
    alertasDiv.innerHTML = "";
    if (alertas.length === 0) {
      alertasDiv.innerHTML = "<p>✅ Todos os produtos estão com a validade em dia!</p>";
      return;
    }
    const ul = document.createElement("ul");
    alertas.forEach(alerta => {
      const li = document.createElement("li");
      li.innerHTML = alerta;
      ul.appendChild(li);
    });
    alertasDiv.appendChild(ul);
  }

  window.removerItemDespensa = function (id) {
    itensDespensa = itensDespensa.filter(p => p.id !== id);
    localStorage.setItem("sis_despensa", JSON.stringify(itensDespensa));
    atualizarDespensa();
  };

  // --- MÓDULO 2: PRODUTOS SIMPLES ---
  btnProduto.addEventListener("click", () => {
    const nome = pNome.value.trim();
    const preco = parseFloat(pPreco.value);
    const qtd = parseInt(pQtd.value, 10);

    if (!nome || isNaN(preco) || isNaN(qtd)) {
      exibirMsg(prodMsg, "Preencha todos os campos corretamente.");
      return;
    }

    produtosSimples.push({ id: Date.now(), nome, preco, qtd });
    localStorage.setItem("sis_produtos", JSON.stringify(produtosSimples));

    pNome.value = "";
    pPreco.value = "";
    pQtd.value = "";

    exibirMsg(prodMsg, "Produto cadastrado!", true);
    renderizarProdutosSimples();
  });

  function renderizarProdutosSimples() {
    listaProdutos.innerHTML = "";
    if (produtosSimples.length === 0) {
      vazioProd.classList.remove("hidden");
      return;
    }
    vazioProd.classList.add("hidden");

    produtosSimples.forEach((prod) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(prod.nome)}</td>
        <td class="n">R$ ${prod.preco.toFixed(2)}</td>
        <td class="n">${prod.qtd}</td>
        <td style="text-align: right;">
          <button class="sec" style="padding: 2px 8px;" onclick="removerProdutoSimples(${prod.id})">Excluir</button>
        </td>
      `;
      listaProdutos.appendChild(tr);
    });
  }

  window.removerProdutoSimples = function (id) {
    produtosSimples = produtosSimples.filter(p => p.id !== id);
    localStorage.setItem("sis_produtos", JSON.stringify(produtosSimples));
    renderizarProdutosSimples();
  };

  // --- MÓDULO 3: USUÁRIOS ---
  btnUsuario.addEventListener("click", () => {
    const username = uNome.value.trim();
    const senha = uSenha.value.trim();

    if (!username || !senha) {
      exibirMsg(userMsg, "Preencha o usuário e a senha.");
      return;
    }

    if (usuarios.some(u => u.username === username)) {
      exibirMsg(userMsg, "Usuário já existe.");
      return;
    }

    usuarios.push({ username, senha });
    localStorage.setItem("sis_usuarios", JSON.stringify(usuarios));

    uNome.value = "";
    uSenha.value = "";

    exibirMsg(userMsg, "Usuário cadastrado com sucesso!", true);
    renderizarUsuarios();
  });

  function renderizarUsuarios() {
    listaUsuarios.innerHTML = "";
    usuarios.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(user.username)}</td>
        <td style="text-align: right;">
          ${
            user.username !== usuarioLogado
              ? `<button class="sec" style="padding: 2px 8px;" onclick="removerUsuario('${escapeHtml(user.username)}')">Excluir</button>`
              : '<small style="color: #666;">(Você)</small>'
          }
        </td>
      `;
      listaUsuarios.appendChild(tr);
    });
  }

  window.removerUsuario = function (username) {
    usuarios = usuarios.filter(u => u.username !== username);
    localStorage.setItem("sis_usuarios", JSON.stringify(usuarios));
    renderizarUsuarios();
  };

  // --- UTILITÁRIOS ---
  function formatarDataBR(data) {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});