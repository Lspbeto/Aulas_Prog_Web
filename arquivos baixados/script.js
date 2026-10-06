// ---------- "Banco de dados" em memória + localStorage ----------
const memoria = {};

function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v ? JSON.parse(v) : padrao;
  } catch (e) {
    return memoria[chave] !== undefined ? memoria[chave] : padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (e) {
    memoria[chave] = valor;
  }
}

let usuarios = ler("usuarios", []);   // [{usuario, hash}]
let produtos = ler("produtos", []);   // [{id, nome, preco, qtd}]
let sessao   = ler("sessao", null);   // nome do usuário logado ou null

// ---------- Utilidades ----------
const $ = (id) => document.getElementById(id);

async function gerarHash(usuario, senha) {
  const dados = new TextEncoder().encode(usuario.toLowerCase() + ":" + senha);
  const buf = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function msg(el, texto, ok) {
  el.textContent = texto;
  el.className = "msg" + (ok ? " ok" : "");
}

const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function criarUsuario(usuario, senha) {
  usuario = usuario.trim();
  if (usuario.length < 3) return "O usuário precisa ter ao menos 3 caracteres.";
  if (senha.length < 4) return "A senha precisa ter ao menos 4 caracteres.";
  if (usuarios.some(u => u.usuario.toLowerCase() === usuario.toLowerCase()))
    return "Esse usuário já existe.";
  usuarios.push({ usuario, hash: await gerarHash(usuario, senha) });
  gravar("usuarios", usuarios);
  return null;
}

// ---------- Login / cadastro ----------
let modoCadastro = false;

function alternarModo() {
  modoCadastro = !modoCadastro;
  $("authTitulo").textContent = modoCadastro ? "Criar conta" : "Entrar";
  $("authSub").textContent = modoCadastro ? "Escolha um usuário e uma senha." : "Use seu usuário e senha.";
  $("btnAuth").textContent = modoCadastro ? "Criar conta" : "Entrar";
  $("btnTroca").textContent = modoCadastro ? "Já tenho conta" : "Criar uma conta";
  $("boxConfirma").classList.toggle("hidden", !modoCadastro);
  msg($("authMsg"), "");
}

async function enviarAuth() {
  const usuario = $("aUser").value.trim();
  const senha = $("aPass").value;
  const aviso = $("authMsg");
  if (!usuario || !senha) return msg(aviso, "Preencha usuário e senha.");

  if (modoCadastro) {
    if (senha !== $("aPass2").value) return msg(aviso, "As senhas não coincidem.");
    const erro = await criarUsuario(usuario, senha);
    if (erro) return msg(aviso, erro);
  } else {
    const achado = usuarios.find(u => u.usuario.toLowerCase() === usuario.toLowerCase());
    const h = await gerarHash(usuario, senha);
    if (!achado || achado.hash !== h) return msg(aviso, "Usuário ou senha incorretos.");
    return entrar(achado.usuario);
  }
  entrar(usuario);
}

function entrar(nome) {
  sessao = nome;
  gravar("sessao", sessao);
  $("aUser").value = $("aPass").value = $("aPass2").value = "";
  render();
}

function sair() {
  sessao = null;
  gravar("sessao", null);
  render();
}

// ---------- Produtos ----------
function adicionarProduto() {
  const nome = $("pNome").value.trim();
  const preco = parseFloat($("pPreco").value);
  const qtd = parseInt($("pQtd").value, 10);
  const aviso = $("prodMsg");
  if (!nome) return msg(aviso, "Informe o nome do produto.");
  if (isNaN(preco) || preco < 0) return msg(aviso, "Informe um preço válido.");
  if (isNaN(qtd) || qtd < 0) return msg(aviso, "Informe uma quantidade válida.");
  produtos.push({ id: Date.now(), nome, preco, qtd });
  gravar("produtos", produtos);
  $("pNome").value = $("pPreco").value = $("pQtd").value = "";
  msg(aviso, "Produto adicionado.", true);
  render();
}

function removerProduto(id) {
  produtos = produtos.filter(p => p.id !== id);
  gravar("produtos", produtos);
  render();
}

// ---------- Usuários (dentro do sistema) ----------
async function adicionarUsuario() {
  const erro = await criarUsuario($("uNome").value, $("uSenha").value);
  if (erro) return msg($("userMsg"), erro);
  $("uNome").value = $("uSenha").value = "";
  msg($("userMsg"), "Usuário cadastrado.", true);
  render();
}

function removerUsuario(nome) {
  if (nome === sessao) return;
  usuarios = usuarios.filter(u => u.usuario !== nome);
  gravar("usuarios", usuarios);
  render();
}

// ---------- Desenho da tela ----------
function celula(texto, classe) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (classe) td.className = classe;
  return td;
}

function botaoRemover(acao, desativado) {
  const td = document.createElement("td");
  td.className = "n";
  const b = document.createElement("button");
  b.className = "del";
  b.textContent = "Remover";
  b.disabled = !!desativado;
  b.onclick = acao;
  td.appendChild(b);
  return td;
}

function render() {
  const logado = sessao && usuarios.some(u => u.usuario === sessao);
  if (!logado) sessao = null;
  $("telaAuth").classList.toggle("hidden", !!logado);
  $("telaApp").classList.toggle("hidden", !logado);
  if (!logado) return;

  $("nomeLogado").textContent = sessao;

  const lp = $("listaProdutos");
  lp.innerHTML = "";
  produtos.forEach(p => {
    const tr = document.createElement("tr");
    tr.append(celula(p.nome), celula(brl(p.preco), "n"), celula(String(p.qtd), "n"),
              botaoRemover(() => removerProduto(p.id)));
    lp.appendChild(tr);
  });
  $("vazioProd").classList.toggle("hidden", produtos.length > 0);

  const lu = $("listaUsuarios");
  lu.innerHTML = "";
  usuarios.forEach(u => {
    const tr = document.createElement("tr");
    tr.append(celula(u.usuario + (u.usuario === sessao ? " (você)" : "")),
              botaoRemover(() => removerUsuario(u.usuario), u.usuario === sessao));
    lu.appendChild(tr);
  });
}

// ---------- Eventos ----------
$("btnAuth").onclick = enviarAuth;
$("btnTroca").onclick = alternarModo;
$("btnSair").onclick = sair;
$("btnProduto").onclick = adicionarProduto;
$("btnUsuario").onclick = adicionarUsuario;
["aUser", "aPass", "aPass2"].forEach(id =>
  $(id).addEventListener("keydown", e => { if (e.key === "Enter") enviarAuth(); }));

// Sem nenhum usuário ainda? Já abre na tela de cadastro.
if (usuarios.length === 0) alternarModo();
render();
