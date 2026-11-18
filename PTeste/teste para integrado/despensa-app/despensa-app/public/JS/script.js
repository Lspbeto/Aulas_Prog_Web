/* >>> VERSÃO COM MONGODB <<<
   Os dados NÃO ficam mais no localStorage: ficam no MongoDB, acessados pela
   API do server.js (rotas /api/...). No navegador guardamos só o TOKEN de login.
   Trechos alterados estão marcados com "API:" nos comentários. */

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
  const btnSalvarDespensa = document.getElementById("btnSalvarDespensa");
  const btnCancelarDespensa = document.getElementById("btnCancelarDespensa");

  // --- Aba Produtos Gerais ---
  const pNome = document.getElementById("pNome");
  const pPreco = document.getElementById("pPreco");
  const pQtd = document.getElementById("pQtd");
  const btnProduto = document.getElementById("btnProduto");
  const prodMsg = document.getElementById("prodMsg");
  const listaProdutos = document.getElementById("listaProdutos");
  const vazioProd = document.getElementById("vazioProd");
  const btnCancelarProduto = document.getElementById("btnCancelarProduto");

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

  // API: as listas começam vazias e são preenchidas com os dados do MongoDB
  // (função carregarDados) depois que o usuário entra.
  let usuarios = [];
  let produtosSimples = [];
  let itensDespensa = [];

  // API: prefixo das rotas do back-end (mesmo domínio do site, então basta "/api")
  const API_BASE = "/api";

  // id do item que está sendo editado (null = nenhum, ou seja, modo "cadastrar")
  let editandoDespensaId = null;
  let editandoProdutoId = null;

  // CORREÇÃO: aqui estava o "git fetch origin main" no código original
  let usuarioLogado = localStorage.getItem("sis_usuarioLogado") || null;

  // API: token JWT recebido no login; é enviado em toda requisição protegida
  let token = localStorage.getItem("sis_token") || null;

  /**
   * API: faz uma requisição ao back-end e devolve o JSON da resposta.
   * Se o servidor responder com erro, lança um Error com a mensagem dele
   * (quem chamou mostra essa mensagem na tela com exibirMsg).
   * @param {string} caminho  - rota depois de /api (ex.: "/despensa")
   * @param {string} metodo   - GET, POST, PUT ou DELETE
   * @param {object|null} corpo - dados enviados em JSON (POST/PUT)
   */
  async function api(caminho, metodo = "GET", corpo = null) {
    const opcoes = { method: metodo, headers: { "Content-Type": "application/json" } };
    if (token) opcoes.headers.Authorization = `Bearer ${token}`; // prova que está logado
    if (corpo !== null) opcoes.body = JSON.stringify(corpo);     // objeto -> texto JSON

    let resposta;
    try {
      resposta = await fetch(API_BASE + caminho, opcoes);
    } catch (erro) {
      // fetch só falha por problema de rede / servidor fora do ar
      throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
    }

    let dados = null;
    try { dados = await resposta.json(); } catch (erro) { /* resposta sem corpo */ }

    if (!resposta.ok) {
      // 401 com token salvo = sessão expirada/inválida: volta para o login
      if (resposta.status === 401 && token) {
        encerrarSessaoLocal();
        exibirAuth();
        exibirMsg(authMsg, "Sessão expirada. Faça login novamente.");
      }
      throw new Error((dados && dados.mensagem) || `Erro ${resposta.status}`);
    }
    return dados;
  }

  /** API: busca no MongoDB tudo que as três abas precisam, em paralelo. */
  async function carregarDados() {
    [itensDespensa, produtosSimples, usuarios] = await Promise.all([
      api("/despensa"),
      api("/produtos"),
      api("/usuarios")
    ]);
  }

  /** API: apaga a sessão guardada no navegador (token e nome). */
  function encerrarSessaoLocal() {
    token = null;
    usuarioLogado = null;
    localStorage.removeItem("sis_token");
    localStorage.removeItem("sis_usuarioLogado");
  }

  /** API: guarda a sessão recebida no login/cadastro e abre o sistema. */
  async function iniciarSessao(resposta) {
    token = resposta.token;
    usuarioLogado = resposta.username;
    localStorage.setItem("sis_token", token);
    localStorage.setItem("sis_usuarioLogado", usuarioLogado);
    await exibirApp();
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

  /**
   * Normaliza um nome para comparação: ignora maiúsculas/minúsculas,
   * acentos e espaços repetidos. Ex.: "  Açúcar " e "acucar" são iguais.
   */
  function normalizarNome(texto) {
    return String(texto)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  /**
   * CONSULTA: verifica se já existe um item com esse nome na lista.
   * @param {Array} lista       - itensDespensa ou produtosSimples
   * @param {string} nome       - nome que se quer cadastrar
   * @param {number|null} idIgnorar - id do item em edição (ele não conta como duplicado)
   * @returns {object|undefined} o item encontrado, ou undefined se não existe
   */
  function buscarDuplicado(lista, nome, idIgnorar = null) {
    const alvo = normalizarNome(nome);
    return lista.find((i) => i.id !== idIgnorar && normalizarNome(i.nome) === alvo);
  }

  // Mensagem de aviso do formulário da despensa
  const despMsg = document.getElementById("despMsg");

  /* ======================================================================
     3. INICIALIZAÇÃO
     ====================================================================== */
  init();

  /** Decide qual tela mostrar ao abrir a página. */
  async function init() {
    if (token) {
      try {
        // API: pergunta ao servidor se o token salvo ainda vale
        const eu = await api("/auth/me");
        usuarioLogado = eu.username;
        await exibirApp();
        return;
      } catch (erro) {
        encerrarSessaoLocal(); // token inválido: cai no login
      }
    }
    exibirAuth();
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
  async function exibirApp() {
    telaAuth.classList.add("hidden");
    telaApp.classList.remove("hidden");
    nomeLogado.textContent = usuarioLogado;

    await carregarDados(); // API: traz os dados do MongoDB antes de desenhar as telas

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
  btnAuth.addEventListener("click", async () => {
    const user = aUser.value.trim(); // trim() remove espaços das pontas
    const pass = aPass.value;

    if (!user || !pass) {
      exibirMsg(authMsg, "Preencha todos os campos obrigatórios.");
      return; // interrompe a função
    }

    try {
      if (modoLogin) {
        // ----- LOGIN -----
        // API: POST /api/auth/login -> o servidor confere a senha e devolve o token
        const resposta = await api("/auth/login", "POST", { username: user, senha: pass });
        await iniciarSessao(resposta);
      } else {
        // ----- CADASTRO -----
        if (pass !== aPass2.value) {
          exibirMsg(authMsg, "As senhas não coincidem.");
          return;
        }
        // API: POST /api/auth/register -> cria o usuário no MongoDB e já loga
        const resposta = await api("/auth/register", "POST", { username: user, senha: pass });
        await iniciarSessao(resposta);
      }
    } catch (erro) {
      exibirMsg(authMsg, erro.message); // ex.: "Usuário ou senha incorretos."
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
    encerrarSessaoLocal(); // API: apaga token e nome do navegador
    sairEdicaoDespensa();
    sairEdicaoProduto();
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

  // Ao enviar o formulário: cria um novo item OU salva a edição de um existente
  formProdutoDespensa.addEventListener("submit", async (e) => {
    e.preventDefault(); // impede a página de recarregar

    const dados = {
      nome: document.getElementById("produto").value.trim(),
      categoria: document.getElementById("categoria").value,
      quantidade: parseFloat(document.getElementById("quantidade").value),
      unidade: document.getElementById("unidade").value,
      validade: document.getElementById("validade").value, // formato "AAAA-MM-DD"
      local: document.getElementById("local").value.trim() || "-", // vazio vira "-"
      valor: parseFloat(document.getElementById("valor").value) || 0 // vazio vira 0
    };

    // CONSULTA: já existe esse ingrediente? (ao editar, ignora o próprio item)
    // (o servidor também confere, mas aqui o aviso aparece sem esperar a rede)
    const duplicado = buscarDuplicado(itensDespensa, dados.nome, editandoDespensaId);
    if (duplicado) {
      exibirMsg(despMsg, `"${duplicado.nome}" já está cadastrado na despensa. Edite o item existente em vez de criar outro.`);
      return; // interrompe: não salva
    }

    try {
      if (editandoDespensaId !== null) {
        // ----- EDIÇÃO -----
        // API: PUT /api/despensa/:id -> atualiza o documento no MongoDB
        const atualizado = await api(`/despensa/${editandoDespensaId}`, "PUT", dados);
        itensDespensa = itensDespensa.map((i) => (i.id === atualizado.id ? atualizado : i));
      } else {
        // ----- CADASTRO -----
        // API: POST /api/despensa -> o MongoDB cria o id (no lugar do Date.now())
        const criado = await api("/despensa", "POST", dados);
        itensDespensa.push(criado);
      }
      sairEdicaoDespensa(); // limpa o formulário e volta ao modo "cadastrar"
      atualizarDespensa();
    } catch (erro) {
      exibirMsg(despMsg, erro.message);
    }
  });

  /** Carrega um item da despensa no formulário para edição. */
  function iniciarEdicaoDespensa(id) {
    const item = itensDespensa.find((p) => p.id === id);
    if (!item) return;

    editandoDespensaId = id;
    document.getElementById("produto").value = item.nome;
    document.getElementById("categoria").value = item.categoria;
    document.getElementById("quantidade").value = item.quantidade;
    document.getElementById("unidade").value = item.unidade;
    document.getElementById("validade").value = item.validade;
    document.getElementById("local").value = item.local === "-" ? "" : item.local;
    document.getElementById("valor").value = item.valor || "";

    btnSalvarDespensa.textContent = "💾 Salvar alterações";
    btnCancelarDespensa.classList.remove("hidden");
    atualizarDespensa(); // destaca a linha em edição
    formProdutoDespensa.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("produto").focus();
  }

  /** Sai do modo edição: limpa o formulário e restaura o botão. */
  function sairEdicaoDespensa() {
    editandoDespensaId = null;
    formProdutoDespensa.reset();
    btnSalvarDespensa.textContent = "➕ Adicionar à Despensa";
    btnCancelarDespensa.classList.add("hidden");
  }

  btnCancelarDespensa.addEventListener("click", () => {
    sairEdicaoDespensa();
    atualizarDespensa(); // remove o destaque da linha
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
          <div class="acoes">
            <button type="button" class="sec editar" style="padding:2px 8px;"
                    data-acao="editar-despensa" data-id="${item.id}">Editar</button>
            <button type="button" class="sec" style="padding:2px 8px;"
                    data-acao="excluir-despensa" data-id="${item.id}">Excluir</button>
          </div>
        </td>
      `;
      if (item.id === editandoDespensaId) tr.classList.add("editando");
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
  async function removerItemDespensa(id) {
    try {
      // API: DELETE /api/despensa/:id -> apaga o documento no MongoDB
      await api(`/despensa/${id}`, "DELETE");
      if (id === editandoDespensaId) sairEdicaoDespensa(); // não edita item excluído
      // filter() mantém todos, exceto o que tem esse id
      itensDespensa = itensDespensa.filter((p) => p.id !== id);
      atualizarDespensa();
    } catch (erro) {
      exibirMsg(despMsg, erro.message);
    }
  }

  // DELEGAÇÃO DE EVENTOS: um único "ouvinte" na tabela cuida de todos os
  // botões Excluir, mesmo os criados depois (a tabela é redesenhada sempre).
  corpoTabelaDespensa.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao]");
    if (!botao) return;
    const id = botao.dataset.id; // API: id do MongoDB é texto (não usar Number)
    if (botao.dataset.acao === "editar-despensa") iniciarEdicaoDespensa(id);
    if (botao.dataset.acao === "excluir-despensa") removerItemDespensa(id);
  });

  /* ======================================================================
     7. MÓDULO 2 - PRODUTOS SIMPLES (aba "Produtos Gerais")
     ====================================================================== */

  btnProduto.addEventListener("click", async () => {
    const nome = pNome.value.trim();
    const preco = parseFloat(pPreco.value);
    const qtd = parseInt(pQtd.value, 10); // 10 = base decimal

    // isNaN = "is Not a Number": detecta campos vazios/inválidos
    if (!nome || isNaN(preco) || isNaN(qtd)) {
      exibirMsg(prodMsg, "Preencha todos os campos corretamente.");
      return;
    }

    // CONSULTA: já existe um produto com esse nome? (ao editar, ignora o próprio)
    const duplicado = buscarDuplicado(produtosSimples, nome, editandoProdutoId);
    if (duplicado) {
      exibirMsg(prodMsg, `O produto "${duplicado.nome}" já está cadastrado.`);
      return; // interrompe: não salva
    }

    const editando = editandoProdutoId !== null;

    try {
      if (editando) {
        // API: PUT /api/produtos/:id -> atualiza no MongoDB
        const atualizado = await api(`/produtos/${editandoProdutoId}`, "PUT", { nome, preco, qtd });
        produtosSimples = produtosSimples.map((p) => (p.id === atualizado.id ? atualizado : p));
      } else {
        // API: POST /api/produtos -> cria no MongoDB
        const criado = await api("/produtos", "POST", { nome, preco, qtd });
        produtosSimples.push(criado);
      }

      sairEdicaoProduto(); // limpa os campos e volta ao modo "adicionar"
      exibirMsg(prodMsg, editando ? "Produto atualizado!" : "Produto cadastrado!", true);
      renderizarProdutosSimples();
    } catch (erro) {
      exibirMsg(prodMsg, erro.message);
    }
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
        <td>
          <div class="acoes">
            <button type="button" class="sec editar" style="padding:2px 8px;"
                    data-acao="editar-produto" data-id="${prod.id}">Editar</button>
            <button type="button" class="sec" style="padding:2px 8px;"
                    data-acao="excluir-produto" data-id="${prod.id}">Excluir</button>
          </div>
        </td>
      `;
      if (prod.id === editandoProdutoId) tr.classList.add("editando");
      listaProdutos.appendChild(tr);
    });
  }

  /** Carrega um produto nos campos para edição. */
  function iniciarEdicaoProduto(id) {
    const prod = produtosSimples.find((p) => p.id === id);
    if (!prod) return;

    editandoProdutoId = id;
    pNome.value = prod.nome;
    pPreco.value = prod.preco;
    pQtd.value = prod.qtd;

    btnProduto.textContent = "Salvar";
    btnCancelarProduto.classList.remove("hidden");
    renderizarProdutosSimples(); // destaca a linha em edição
    pNome.focus();
  }

  /** Sai do modo edição: limpa os campos e restaura o botão. */
  function sairEdicaoProduto() {
    editandoProdutoId = null;
    pNome.value = "";
    pPreco.value = "";
    pQtd.value = "";
    btnProduto.textContent = "Adicionar";
    btnCancelarProduto.classList.add("hidden");
  }

  btnCancelarProduto.addEventListener("click", () => {
    sairEdicaoProduto();
    renderizarProdutosSimples(); // remove o destaque da linha
  });

  async function removerProdutoSimples(id) {
    try {
      // API: DELETE /api/produtos/:id -> apaga no MongoDB
      await api(`/produtos/${id}`, "DELETE");
      if (id === editandoProdutoId) sairEdicaoProduto(); // não edita item excluído
      produtosSimples = produtosSimples.filter((p) => p.id !== id);
      renderizarProdutosSimples();
    } catch (erro) {
      exibirMsg(prodMsg, erro.message);
    }
  }

  listaProdutos.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao]");
    if (!botao) return;
    const id = botao.dataset.id; // API: id do MongoDB é texto (não usar Number)
    if (botao.dataset.acao === "editar-produto") iniciarEdicaoProduto(id);
    if (botao.dataset.acao === "excluir-produto") removerProdutoSimples(id);
  });

  /* ======================================================================
     8. MÓDULO 3 - GESTÃO DE USUÁRIOS
     ====================================================================== */

  btnUsuario.addEventListener("click", async () => {
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

    try {
      // API: POST /api/usuarios -> o servidor guarda o HASH da senha no MongoDB
      const criado = await api("/usuarios", "POST", { username, senha });
      usuarios.push(criado);

      uNome.value = "";
      uSenha.value = "";

      exibirMsg(userMsg, "Usuário cadastrado com sucesso!", true);
      renderizarUsuarios();
    } catch (erro) {
      exibirMsg(userMsg, erro.message);
    }
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

  async function removerUsuario(username) {
    // Proteção extra: nunca remove o usuário logado
    if (username === usuarioLogado) return;

    try {
      // API: DELETE /api/usuarios/:username (encodeURIComponent protege símbolos no nome)
      await api(`/usuarios/${encodeURIComponent(username)}`, "DELETE");
      usuarios = usuarios.filter((u) => u.username !== username);
      renderizarUsuarios();
    } catch (erro) {
      exibirMsg(userMsg, erro.message);
    }
  }

  listaUsuarios.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao='excluir-usuario']");
    if (botao) removerUsuario(botao.dataset.username);
  });

  /* ======================================================================
     9. RELATÓRIO (imprimir e baixar PDF)
     ====================================================================== */

  const btnImprimir = document.getElementById("btnImprimir");
  const btnPdf = document.getElementById("btnPdf");
  const relMsg = document.getElementById("relMsg");
  const areaRelatorio = document.getElementById("relatorioImpressao");

  const CABECALHO_DESPENSA = ["Produto", "Categoria", "Quantidade", "Validade", "Prazo", "Status", "Local", "Preço"];
  const CABECALHO_PRODUTOS = ["Nome", "Preço", "Quantidade"];
  const ROTULO_STATUS = { verde: "OK", amarelo: "Próximo", vermelho: "Vencido" };
  // Cores do texto da coluna Status no PDF (RGB)
  const COR_STATUS = { verde: [46, 125, 50], amarelo: [183, 121, 0], vermelho: [179, 38, 30] };

  /** Formata número como moeda: 12.5 -> "R$ 12,50". */
  function moeda(valor) {
    return "R$ " + Number(valor || 0).toFixed(2).replace(".", ",");
  }

  /** Reúne e calcula tudo que o relatório precisa (usado pelo PDF e pela impressão). */
  function montarDadosRelatorio() {
    const hoje = obterHoje();
    const contadores = { verde: 0, amarelo: 0, vermelho: 0 };
    let total = 0;

    // Cópia ordenada por validade (não altera a lista original)
    const ordenados = [...itensDespensa].sort((a, b) => a.validade.localeCompare(b.validade));

    const despensa = ordenados.map((item) => {
      const [ano, mes, dia] = item.validade.split("-");
      const dataValidade = new Date(ano, mes - 1, dia);
      dataValidade.setHours(0, 0, 0, 0);
      const dias = Math.ceil((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      const st = calcularStatus(dias);
      contadores[st.chave]++;
      total += Number(item.valor) || 0;

      return {
        chave: st.chave,
        colunas: [
          item.nome,
          item.categoria,
          `${item.quantidade} ${item.unidade}`,
          formatarDataBR(dataValidade),
          st.textoPrazo,
          ROTULO_STATUS[st.chave], // sem emoji: o PDF não os desenha
          item.local,
          moeda(item.valor)
        ]
      };
    });

    const produtos = produtosSimples.map((p) => [p.nome, moeda(p.preco), String(p.qtd)]);

    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");

    return {
      dataHoje: formatarDataBR(hoje),
      dataArquivo: `${hoje.getFullYear()}-${mm}-${dd}`,
      usuario: usuarioLogado,
      contadores,
      despensa,
      produtos,
      total
    };
  }

  /** Monta uma tabela HTML (usada na impressão). */
  function tabelaHtml(cabecalho, linhas, mensagemVazia) {
    const th = cabecalho.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
    const corpo = linhas.length
      ? linhas.map((l) => "<tr>" + l.map((c) => `<td>${escapeHtml(c)}</td>`).join("") + "</tr>").join("")
      : `<tr><td colspan="${cabecalho.length}" style="text-align:center">${mensagemVazia}</td></tr>`;
    return `<table><thead><tr>${th}</tr></thead><tbody>${corpo}</tbody></table>`;
  }

  /** IMPRIMIR: preenche a área oculta e abre a janela de impressão. */
  function imprimirRelatorio() {
    const d = montarDadosRelatorio();

    areaRelatorio.innerHTML = `
      <h1>Relatório da Despensa</h1>
      <p>Data de referência: <strong>${d.dataHoje}</strong> &nbsp;|&nbsp; Gerado por: <strong>${escapeHtml(d.usuario)}</strong></p>
      <p>Dentro da validade: <strong>${d.contadores.verde}</strong> &nbsp;|&nbsp;
         Próximos do vencimento: <strong>${d.contadores.amarelo}</strong> &nbsp;|&nbsp;
         Vencidos: <strong>${d.contadores.vermelho}</strong></p>

      <h2>Ingredientes da despensa</h2>
      ${tabelaHtml(CABECALHO_DESPENSA, d.despensa.map((l) => l.colunas), "Nenhum ingrediente na despensa.")}
      <p style="text-align:right">Soma dos preços: <strong>${moeda(d.total)}</strong></p>

      <h2>Produtos gerais</h2>
      ${tabelaHtml(CABECALHO_PRODUTOS, d.produtos, "Nenhum produto cadastrado.")}
    `;

    window.print(); // o CSS @media print mostra só esta área
  }

  /** BAIXAR PDF: gera o arquivo com jsPDF + autoTable e baixa direto. */
  function baixarPdf() {
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) {
      exibirMsg(relMsg, "Não foi possível carregar o gerador de PDF (verifique a internet). Use Imprimir e escolha “Salvar como PDF”.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    if (typeof doc.autoTable !== "function") {
      exibirMsg(relMsg, "Não foi possível carregar o gerador de tabelas do PDF. Use Imprimir e escolha “Salvar como PDF”.");
      return;
    }

    const d = montarDadosRelatorio();
    const verde = [45, 90, 68];

    // --- Cabeçalho do relatório ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Relatório da Despensa", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Data de referência: ${d.dataHoje}    |    Gerado por: ${d.usuario}`, 14, 23);
    doc.text(
      `Dentro da validade: ${d.contadores.verde}    |    Próximos do vencimento: ${d.contadores.amarelo}    |    Vencidos: ${d.contadores.vermelho}`,
      14, 29
    );

    // --- Tabela 1: despensa ---
    const corpoDespensa = d.despensa.length
      ? d.despensa.map((l) => l.colunas)
      : [[{ content: "Nenhum ingrediente na despensa.", colSpan: 8, styles: { halign: "center" } }]];

    doc.autoTable({
      startY: 34,
      head: [CABECALHO_DESPENSA],
      body: corpoDespensa,
      foot: d.despensa.length
        ? [[{ content: "Soma dos preços", colSpan: 7, styles: { halign: "right" } }, moeda(d.total)]]
        : undefined,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: verde },
      footStyles: { fillColor: [225, 236, 228], textColor: [27, 42, 35] },
      // Colore o texto da coluna Status (índice 5)
      didParseCell: (dados) => {
        if (dados.section === "body" && dados.column.index === 5 && d.despensa[dados.row.index]) {
          dados.cell.styles.textColor = COR_STATUS[d.despensa[dados.row.index].chave];
          dados.cell.styles.fontStyle = "bold";
        }
      }
    });

    // --- Tabela 2: produtos gerais ---
    let y = doc.lastAutoTable.finalY + 12;
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Produtos gerais", 14, y);

    doc.autoTable({
      startY: y + 4,
      head: [CABECALHO_PRODUTOS],
      body: d.produtos.length
        ? d.produtos
        : [[{ content: "Nenhum produto cadastrado.", colSpan: 3, styles: { halign: "center" } }]],
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: verde },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } }
    });

    // --- Numeração das páginas ---
    const total = doc.getNumberOfPages();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${total}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
    }

    doc.save(`relatorio-despensa-${d.dataArquivo}.pdf`);
    exibirMsg(relMsg, "PDF gerado!", true);
  }

  btnImprimir.addEventListener("click", imprimirRelatorio);
  btnPdf.addEventListener("click", baixarPdf);

  /* ======================================================================
     10. SUGESTÕES: LISTA DOS JÁ CADASTRADOS ENQUANTO DIGITA
     ====================================================================== */

  // Guarda a função "fechar" de cada lista para fechar todas de uma vez
  const fechadoresSugestoes = [];

  /** "2026-10-20" -> "20/10/2026" */
  function dataBRdeISO(iso) {
    const [ano, mes, dia] = String(iso).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Liga uma lista de sugestões a um campo de texto.
   * Ao digitar (ou clicar no campo), aparece uma aba logo abaixo mostrando
   * os itens já cadastrados que combinam com o que foi digitado.
   *
   * @param {HTMLInputElement} input - campo que o usuário digita
   * @param {Function} obterItens    - devolve a lista ATUAL de itens:
   *                                   [{ titulo, detalhe, aoEscolher? }]
   * @param {string} plural          - nome usado nos textos (ex.: "ingredientes")
   */
  function ativarSugestoes(input, obterItens, plural) {
    const pai = input.parentElement;
    const caixa = document.createElement("div");
    caixa.className = "sugestoes hidden";
    caixa.setAttribute("role", "listbox");

    pai.classList.add("tem-sugestoes"); // position: relative (ver CSS)
    pai.appendChild(caixa);
    input.setAttribute("autocomplete", "off"); // evita a lista do navegador por cima

    function fechar() {
      caixa.classList.add("hidden");
    }
    fechadoresSugestoes.push(fechar);

    function abrir() {
      const termo = normalizarNome(input.value);
      const todos = obterItens();
      const lista = termo
        ? todos.filter((i) => normalizarNome(i.titulo).includes(termo))
        : todos;

      caixa.innerHTML = "";

      // Cabeçalho com o resumo
      const cab = document.createElement("div");
      cab.className = "sug-cab";
      if (todos.length === 0) {
        cab.textContent = `Nenhum item cadastrado ainda em ${plural}.`;
      } else if (lista.length === 0) {
        cab.textContent = `Nenhum cadastrado parecido: pode cadastrar.`;
      } else {
        const clicavel = lista.some((i) => i.aoEscolher);
        cab.textContent =
          `Já cadastrados (${lista.length})` + (clicavel ? " - clique para editar" : "");
      }
      caixa.appendChild(cab);

      // Itens (no máximo 50 para não pesar; a lista rola)
      lista.slice(0, 50).forEach((item) => {
        const linha = document.createElement("div");
        linha.className = "sug-item";
        linha.setAttribute("role", "option");

        const igual = normalizarNome(item.titulo) === termo;
        if (igual) linha.classList.add("igual");
        if (item.aoEscolher) linha.classList.add("clicavel");

        const nome = document.createElement("strong");
        nome.textContent = item.titulo;
        linha.appendChild(nome);

        if (item.detalhe) {
          const det = document.createElement("small");
          det.textContent = item.detalhe;
          linha.appendChild(det);
        }
        if (igual) {
          const aviso = document.createElement("span");
          aviso.className = "sug-aviso";
          aviso.textContent = "já existe";
          linha.appendChild(aviso);
        }

        // mousedown (e não click) para rodar antes de o campo perder o foco
        linha.addEventListener("mousedown", (e) => {
          e.preventDefault();
          if (item.aoEscolher) {
            fechar(); // a lista só reabre ao digitar/clicar no campo
            item.aoEscolher();
          }
        });
        caixa.appendChild(linha);
      });

      caixa.classList.remove("hidden");
    }

    input.addEventListener("input", abrir); // sempre que digitar
    input.addEventListener("click", abrir); // ao clicar no campo
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") fechar();
    });
    // Clicou fora do campo/lista: fecha
    document.addEventListener("click", (e) => {
      if (!pai.contains(e.target)) fechar();
    });
  }

  // Ao enviar o formulário (ex.: ENTER), fecha as listas abertas
  document.addEventListener("submit", () => fechadoresSugestoes.forEach((f) => f()));

  // --- Ingredientes da despensa (clique = editar o item) ---
  ativarSugestoes(
    document.getElementById("produto"),
    () =>
      itensDespensa
        .filter((i) => i.id !== editandoDespensaId) // o item em edição não aparece
        .map((i) => ({
          titulo: i.nome,
          detalhe: `${i.categoria} · ${i.quantidade} ${i.unidade} · vence ${dataBRdeISO(i.validade)}`,
          aoEscolher: () => iniciarEdicaoDespensa(i.id)
        })),
    "ingredientes"
  );

  // --- Produtos gerais (clique = editar o produto) ---
  ativarSugestoes(
    pNome,
    () =>
      produtosSimples
        .filter((p) => p.id !== editandoProdutoId)
        .map((p) => ({
          titulo: p.nome,
          detalhe: `${moeda(p.preco)} · qtd ${p.qtd}`,
          aoEscolher: () => iniciarEdicaoProduto(p.id)
        })),
    "produtos"
  );

  // --- Usuários (só consulta; senhas nunca são exibidas) ---
  ativarSugestoes(
    uNome,
    () =>
      usuarios.map((u) => ({
        titulo: u.username,
        detalhe: u.username === usuarioLogado ? "você" : ""
      })),
    "usuários"
  );

  /* ======================================================================
     11. UTILITÁRIOS
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
