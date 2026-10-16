/* ==========================================================================
   SISTEMA DE GESTÃO E DESPENSA - script.js (versão corrigida e comentada)
   --------------------------------------------------------------------------
   Correções em relação à versão original:
   1. Removido o trecho "git fetch origin main" que quebrava o código.
   2. Leitura segura do localStorage (não quebra se o JSON estiver corrompido).
   3. Botões "Excluir" agora usam delegação de eventos (addEventListener)
      em vez de onclick="..." no HTML e funções penduradas no window.
   4. A data de "hoje" é recalculada sempre que a tela é atualizada.
   5. Proteção extra: o usuário logado não pode ser excluído nem via código.
   ========================================================================== */

// Só executa o código depois que todo o HTML foi carregado
document.addEventListener("DOMContentLoaded", () => {

  /* ======================================================================
     1. REFERÊNCIAS AOS ELEMENTOS DO HTML (DOM)
     Guardamos em variáveis para não precisar buscar o elemento toda hora.
     ====================================================================== */

  // --- Tela de login / cadastro ---
  const telaAuth = document.getElementById("telaAuth");     // seção inteira do login
  const authTitulo = document.getElementById("authTitulo"); // título ("Entrar" / "Criar conta")
  const authSub = document.getElementById("authSub");       // subtítulo
  const aUser = document.getElementById("aUser");           // campo usuário
  const aPass = document.getElementById("aPass");           // campo senha
  const boxConfirma = document.getElementById("boxConfirma"); // caixa "confirmar senha"
  const aPass2 = document.getElementById("aPass2");         // campo confirmar senha
  const authMsg = document.getElementById("authMsg");       // mensagem de erro do login
  const btnAuth = document.getElementById("btnAuth");       // botão Entrar/Cadastrar
  const btnTroca = document.getElementById("btnTroca");     // alterna login <-> cadastro

  // --- Tela principal (após login) ---
  const telaApp = document.getElementById("telaApp");
  const nomeLogado = document.getElementById("nomeLogado");
  const btnSair = document.getElementById("btnSair");
  const tabBtns = document.querySelectorAll(".tab-btn");        // botões das abas
  const tabContents = document.querySelectorAll(".tab-content"); // conteúdo das abas

  // --- Aba Despensa ---
  const dataHojeEl = document.getElementById("dataHoje");
  const qtdVerdeEl = document.getElementById("qtdVerde");
  const qtdAmareloEl = document.getElementById("qtdAmarelo");
  const qtdVermelhoEl = document.getElementById("qtdVermelho");
  const formProdutoDespensa = document.getElementById("formProduto");
  const corpoTabelaDespensa = document.getElementById("corpoTabela");
  const alertasDiv = document.getElementById("alertas");

  // --- Aba Produtos Gerais ---
  const pNome = document.getElementById("pNome");
  const pPreco = document.getElementById("pPreco");
  const pQtd = document.getElementById("pQtd");
  const btnProduto = document.getElementById("btnProduto");
  const prodMsg = document.getElementById("prodMsg");
  const listaProdutos = document.getElementById("listaProdutos");
  const vazioProd = document.getElementById("vazioProd");

  // --- Aba Usuários ---
  const uNome = document.getElementById("uNome");
  const uSenha = document.getElementById("uSenha");
  const btnUsuario = document.getElementById("btnUsuario");
  const userMsg = document.getElementById("userMsg");
  const listaUsuarios = document.getElementById("listaUsuarios");

  /* ======================================================================
     2. ESTADO GLOBAL (os dados do sistema)
     ====================================================================== */

  // true = tela em modo "Entrar"; false = modo "Criar conta"
  let modoLogin = true;

  // Lê do localStorage. Se não existir (ou estiver corrompido), usa o padrão.
  let usuarios = lerStorage("sis_usuarios", []);
  let produtosSimples = lerStorage("sis_produtos", []);
  let itensDespensa = lerStorage("sis_despensa", []);

  // CORREÇÃO: aqui estava o "git fetch origin main" no código original
  let usuarioLogado = localStorage.getItem("sis_usuarioLogado") || null;

  /**
   * Lê e converte (JSON.parse) um valor do localStorage com segurança.
   * @param {string} chave  - nome da chave no localStorage
   * @param {*} padrao      - valor usado se não existir ou der erro
   */
  function lerStorage(chave, padrao) {
    try {
      const bruto = localStorage.getItem(chave);
      return bruto ? JSON.parse(bruto) : padrao;
    } catch (erro) {
      // JSON inválido: não deixa o sistema inteiro quebrar
      console.error(`Erro ao ler "${chave}" do localStorage:`, erro);
      return padrao;
    }
  }

  /**
   * Salva qualquer valor no localStorage convertendo para texto JSON.
   */
  function salvarStorage(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
  }

  /**
   * Retorna a data de hoje com hora zerada (00:00:00).
   * Zerar a hora é essencial para comparar apenas DIAS.
   * Chamada a cada atualização, então o status acompanha a virada do dia.
   */
  function obterHoje() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /* ======================================================================
     3. INICIALIZAÇÃO
     ====================================================================== */
  init();

  /** Decide qual tela mostrar ao abrir a página. */
  function init() {
    if (usuarioLogado) {
      exibirApp();
    } else {
      exibirAuth();
    }
  }

  /* ======================================================================
     4. NAVEGAÇÃO ENTRE TELAS E ABAS
     ====================================================================== */

  /** Mostra a tela de login e esconde o sistema. */
  function exibirAuth() {
    telaAuth.classList.remove("hidden"); // "hidden" = display:none no CSS
    telaApp.classList.add("hidden");
    limparFormAuth();
  }

  /** Mostra o sistema e preenche todas as telas com os dados salvos. */
  function exibirApp() {
    telaAuth.classList.add("hidden");
    telaApp.classList.remove("hidden");
    nomeLogado.textContent = usuarioLogado;

    atualizarDespensa();
    renderizarProdutosSimples();
    renderizarUsuarios();
  }

  // Troca de abas: ao clicar num botão, mostra só o conteúdo dele
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // data-tab="tabDespensa" -> id do conteúdo que deve aparecer
      const tabAlvo = btn.getAttribute("data-tab");

      tabBtns.forEach((b) => b.classList.remove("active")); // desmarca todos
      tabContents.forEach((c) => c.classList.add("hidden")); // esconde todas

      btn.classList.add("active");                                  // marca o clicado
      document.getElementById(tabAlvo).classList.remove("hidden");  // mostra a aba
    });
  });

  /**
   * Mostra uma mensagem temporária (some após 4 segundos).
   * @param {HTMLElement} elemento - onde escrever a mensagem
   * @param {string} texto         - o texto
   * @param {boolean} isSucesso    - true = verde, false = vermelho
   */
  function exibirMsg(elemento, texto, isSucesso = false) {
    elemento.textContent = texto;
    elemento.style.color = isSucesso ? "#2e7d32" : "#d32f2f";
    if (texto) {
      setTimeout(() => { elemento.textContent = ""; }, 4000);
    }
  }

  /* ======================================================================
     5. AUTENTICAÇÃO (login, cadastro e saída)
     ====================================================================== */

  // Alterna entre "Entrar" e "Criar conta"
  btnTroca.addEventListener("click", () => {
    modoLogin = !modoLogin; // inverte true/false
    limparFormAuth();

    if (modoLogin) {
      authTitulo.textContent = "Entrar";
      authSub.textContent = "Use seu usuário e senha.";
      btnAuth.textContent = "Entrar";
      btnTroca.textContent = "Criar uma conta";
      boxConfirma.classList.add("hidden");     // esconde "confirmar senha"
    } else {
      authTitulo.textContent = "Criar conta";
      authSub.textContent = "Preencha os dados abaixo para se cadastrar.";
      btnAuth.textContent = "Cadastrar";
      btnTroca.textContent = "Já tenho uma conta";
      boxConfirma.classList.remove("hidden");  // mostra "confirmar senha"
    }
  });

  // Botão principal: faz login OU cadastro, dependendo de modoLogin
  btnAuth.addEventListener("click", () => {
    const user = aUser.value.trim(); // trim() remove espaços das pontas
    const pass = aPass.value;

    if (!user || !pass) {
      exibirMsg(authMsg, "Preencha todos os campos obrigatórios.");
      return; // interrompe a função
    }

    if (modoLogin) {
      // ----- LOGIN -----
      // find() retorna o primeiro usuário que bate com usuário E senha
      const encontrado = usuarios.find(
        (u) => u.username === user && u.senha === pass
      );

      if (encontrado) {
        usuarioLogado = encontrado.username;
        localStorage.setItem("sis_usuarioLogado", usuarioLogado);
        exibirApp();
      } else {
        exibirMsg(authMsg, "Usuário ou senha incorretos.");
      }
    } else {
      // ----- CADASTRO -----
      const pass2 = aPass2.value;

      if (pass !== pass2) {
        exibirMsg(authMsg, "As senhas não coincidem.");
        return;
      }
      // some() retorna true se ALGUM usuário já tem esse nome
      if (usuarios.some((u) => u.username === user)) {
        exibirMsg(authMsg, "Este usuário já existe.");
        return;
      }

      usuarios.push({ username: user, senha: pass });
      salvarStorage("sis_usuarios", usuarios);

      // Já loga automaticamente após cadastrar
      usuarioLogado = user;
      localStorage.setItem("sis_usuarioLogado", usuarioLogado);
      exibirApp();
    }
  });

  // Permite apertar ENTER nos campos de login (melhoria de usabilidade)
  [aUser, aPass, aPass2].forEach((campo) => {
    campo.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btnAuth.click();
    });
  });

  // Sair: limpa o usuário logado e volta ao login
  btnSair.addEventListener("click", () => {
    usuarioLogado = null;
    localStorage.removeItem("sis_usuarioLogado");
    exibirAuth();
  });

  /** Esvazia os campos e a mensagem da tela de login. */
  function limparFormAuth() {
    aUser.value = "";
    aPass.value = "";
    aPass2.value = "";
    authMsg.textContent = "";
  }

  /* ======================================================================
     6. MÓDULO 1 - PAINEL DA DESPENSA
     ====================================================================== */

  // Ao enviar o formulário: cria um novo item na despensa
  formProdutoDespensa.addEventListener("submit", (e) => {
    e.preventDefault(); // impede a página de recarregar

    const novoItem = {
      id: Date.now(), // número único baseado na hora (identificador)
      nome: document.getElementById("produto").value.trim(),
      categoria: document.getElementById("categoria").value,
      quantidade: parseFloat(document.getElementById("quantidade").value),
      unidade: document.getElementById("unidade").value,
      validade: document.getElementById("validade").value, // formato "AAAA-MM-DD"
      local: document.getElementById("local").value.trim() || "-", // vazio vira "-"
      valor: parseFloat(document.getElementById("valor").value) || 0 // vazio vira 0
    };

    itensDespensa.push(novoItem);
    salvarStorage("sis_despensa", itensDespensa);
    atualizarDespensa();
    formProdutoDespensa.reset(); // limpa o formulário
  });

  /**
   * Função principal da despensa. Redesenha a tabela, os contadores
   * do resumo e a lista de alertas.
   */
  function atualizarDespensa() {
    const hoje = obterHoje(); // recalculado a cada atualização
    dataHojeEl.textContent = formatarDataBR(hoje);

    const contadores = { verde: 0, amarelo: 0, vermelho: 0 };
    const listaAlertas = [];

    corpoTabelaDespensa.innerHTML = ""; // limpa a tabela

    if (itensDespensa.length === 0) {
      corpoTabelaDespensa.innerHTML =
        `<tr><td colspan="9" style="text-align:center;color:#666;">Nenhum ingrediente na despensa.</td></tr>`;
    }

    // Ordena: os que vencem primeiro aparecem no topo
    itensDespensa.sort((a, b) => new Date(a.validade) - new Date(b.validade));

    itensDespensa.forEach((item) => {
      // "2026-10-20" -> [ "2026", "10", "20" ]
      const [ano, mes, dia] = item.validade.split("-");
      // mes - 1 porque os meses em JavaScript começam em 0 (janeiro = 0).
      // Criar a data assim evita o bug de fuso horário de new Date("2026-10-20").
      const dataValidade = new Date(ano, mes - 1, dia);
      dataValidade.setHours(0, 0, 0, 0);

      // Diferença em dias: milissegundos / (1000 * 60 * 60 * 24)
      const diffTempo = dataValidade.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

      const statusObj = calcularStatus(diffDias);
      contadores[statusObj.chave]++; // soma no contador certo

      // Monta os alertas (só para amarelo e vermelho)
      if (statusObj.chave === "amarelo") {
        listaAlertas.push(
          `🟡 <strong>${escapeHtml(item.nome)}</strong> vence em ${diffDias} dia(s) (${formatarDataBR(dataValidade)}).`
        );
      } else if (statusObj.chave === "vermelho") {
        const textoPrazo = diffDias === 0
          ? "vence HOJE"
          : `venceu há ${Math.abs(diffDias)} dia(s)`;
        listaAlertas.push(
          `🔴 <strong>${escapeHtml(item.nome)}</strong> ${textoPrazo} (${formatarDataBR(dataValidade)}).`
        );
      }

      // Cria a linha da tabela. O botão usa data-acao e data-id;
      // o clique é tratado mais abaixo (delegação de eventos).
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(item.nome)}</strong></td>
        <td>${escapeHtml(item.categoria)}</td>
        <td>${item.quantidade} ${escapeHtml(item.unidade)}</td>
        <td>${formatarDataBR(dataValidade)}</td>
        <td>${statusObj.textoPrazo}</td>
        <td>${statusObj.badge}</td>
        <td>${escapeHtml(item.local)}</td>
        <td>R$ ${Number(item.valor || 0).toFixed(2).replace(".", ",")}</td>
        
        <td>
          <button type="button" class="sec" style="padding:2px 8px;"
                  data-acao="excluir-despensa" data-id="${item.id}">Excluir</button>
        </td>
      `;
      corpoTabelaDespensa.appendChild(tr);
    });

    // Atualiza os números do resumo
    qtdVerdeEl.textContent = contadores.verde;
    qtdAmareloEl.textContent = contadores.amarelo;
    qtdVermelhoEl.textContent = contadores.vermelho;

    renderizarAlertas(listaAlertas);
  }

  /**
   * Classifica um item pelos dias restantes até o vencimento.
   * @param {number} dias - dias até vencer (negativo = já venceu)
   * @returns {{chave:string, badge:string, textoPrazo:string}}
   */
  function calcularStatus(dias) {
    if (dias > 7) {
      return { chave: "verde", badge: "🟢 OK", textoPrazo: `Restam ${dias} dias` };
    } else if (dias >= 1) {
      return { chave: "amarelo", badge: "🟡 Próximo", textoPrazo: `Restam ${dias} dia(s)` };
    } else {
      const texto = dias === 0 ? "Vence hoje!" : `Vencido há ${Math.abs(dias)} dia(s)`;
      return { chave: "vermelho", badge: "🔴 Vencido", textoPrazo: texto };
    }
  }

  /** Desenha a lista de alertas (ou a mensagem de "tudo em dia"). */
  function renderizarAlertas(alertas) {
    alertasDiv.innerHTML = "";

    if (alertas.length === 0) {
      alertasDiv.innerHTML = "<p>✅ Todos os produtos estão com a validade em dia!</p>";
      return;
    }

    const ul = document.createElement("ul");
    alertas.forEach((alerta) => {
      const li = document.createElement("li");
      li.innerHTML = alerta; // seguro: os nomes já passaram por escapeHtml
      ul.appendChild(li);
    });
    alertasDiv.appendChild(ul);
  }

  /** Remove um item da despensa pelo id. */
  function removerItemDespensa(id) {
    // filter() mantém todos, exceto o que tem esse id
    itensDespensa = itensDespensa.filter((p) => p.id !== id);
    salvarStorage("sis_despensa", itensDespensa);
    atualizarDespensa();
  }

  // DELEGAÇÃO DE EVENTOS: um único "ouvinte" na tabela cuida de todos os
  // botões Excluir, mesmo os criados depois (a tabela é redesenhada sempre).
  corpoTabelaDespensa.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao='excluir-despensa']");
    if (botao) removerItemDespensa(Number(botao.dataset.id));
  });

  /* ======================================================================
     7. MÓDULO 2 - PRODUTOS SIMPLES (aba "Produtos Gerais")
     ====================================================================== */

  btnProduto.addEventListener("click", () => {
    const nome = pNome.value.trim();
    const preco = parseFloat(pPreco.value);
    const qtd = parseInt(pQtd.value, 10); // 10 = base decimal

    // isNaN = "is Not a Number": detecta campos vazios/inválidos
    if (!nome || isNaN(preco) || isNaN(qtd)) {
      exibirMsg(prodMsg, "Preencha todos os campos corretamente.");
      return;
    }

    produtosSimples.push({ id: Date.now(), nome, preco, qtd });
    salvarStorage("sis_produtos", produtosSimples);

    pNome.value = "";
    pPreco.value = "";
    pQtd.value = "";

    exibirMsg(prodMsg, "Produto cadastrado!", true);
    renderizarProdutosSimples();
  });

  /** Redesenha a tabela de produtos simples. */
  function renderizarProdutosSimples() {
    listaProdutos.innerHTML = "";

    if (produtosSimples.length === 0) {
      vazioProd.classList.remove("hidden"); // mostra "Nenhum produto..."
      return;
    }
    vazioProd.classList.add("hidden");

    produtosSimples.forEach((prod) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(prod.nome)}</td>
        <td class="n">R$ ${prod.preco.toFixed(2)}</td>
        <td class="n">${prod.qtd}</td>
        <td style="text-align:right;">
          <button type="button" class="sec" style="padding:2px 8px;"
                  data-acao="excluir-produto" data-id="${prod.id}">Excluir</button>
        </td>
      `;
      listaProdutos.appendChild(tr);
    });
  }

  function removerProdutoSimples(id) {
    produtosSimples = produtosSimples.filter((p) => p.id !== id);
    salvarStorage("sis_produtos", produtosSimples);
    renderizarProdutosSimples();
  }

  listaProdutos.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao='excluir-produto']");
    if (botao) removerProdutoSimples(Number(botao.dataset.id));
  });

  /* ======================================================================
     8. MÓDULO 3 - GESTÃO DE USUÁRIOS
     ====================================================================== */

  btnUsuario.addEventListener("click", () => {
    const username = uNome.value.trim();
    const senha = uSenha.value;

    if (!username || !senha) {
      exibirMsg(userMsg, "Preencha o usuário e a senha.");
      return;
    }
    if (usuarios.some((u) => u.username === username)) {
      exibirMsg(userMsg, "Usuário já existe.");
      return;
    }

    usuarios.push({ username, senha });
    salvarStorage("sis_usuarios", usuarios);

    uNome.value = "";
    uSenha.value = "";

    exibirMsg(userMsg, "Usuário cadastrado com sucesso!", true);
    renderizarUsuarios();
  });

  /** Redesenha a lista de usuários. */
  function renderizarUsuarios() {
    listaUsuarios.innerHTML = "";

    usuarios.forEach((user) => {
      const tr = document.createElement("tr");

      // Coluna do nome (textContent já é seguro contra HTML malicioso)
      const tdNome = document.createElement("td");
      tdNome.textContent = user.username;

      // Coluna da ação
      const tdAcao = document.createElement("td");
      tdAcao.style.textAlign = "right";

      if (user.username === usuarioLogado) {
        // Não permite excluir a si mesmo
        const small = document.createElement("small");
        small.style.color = "#666";
        small.textContent = "(Você)";
        tdAcao.appendChild(small);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sec";
        btn.style.padding = "2px 8px";
        btn.textContent = "Excluir";
        // dataset guarda o nome com segurança, mesmo com aspas ou símbolos
        btn.dataset.acao = "excluir-usuario";
        btn.dataset.username = user.username;
        tdAcao.appendChild(btn);
      }

      tr.appendChild(tdNome);
      tr.appendChild(tdAcao);
      listaUsuarios.appendChild(tr);
    });
  }

  function removerUsuario(username) {
    // Proteção extra: nunca remove o usuário logado
    if (username === usuarioLogado) return;

    usuarios = usuarios.filter((u) => u.username !== username);
    salvarStorage("sis_usuarios", usuarios);
    renderizarUsuarios();
  }

  listaUsuarios.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao='excluir-usuario']");
    if (botao) removerUsuario(botao.dataset.username);
  });

  /* ======================================================================
     9. UTILITÁRIOS
     ====================================================================== */

  /** Converte um objeto Date para o formato dd/mm/aaaa. */
  function formatarDataBR(data) {
    // padStart(2, "0") completa com zero à esquerda: 5 -> "05"
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0"); // +1: meses começam em 0
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Protege contra injeção de HTML (XSS). Ao colocar o texto num elemento
   * via textContent, o navegador trata tudo como texto puro; ao ler de volta
   * com innerHTML, símbolos como < > & já saem escapados.
   */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});
