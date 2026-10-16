// ---------- Dados iniciais ----------
const PRODUTOS_INICIAIS = [
  { id: 1, nome: "Arroz",  categoria: "Grãos",      quantidade: 20, unidade: "kg", validade: "2026-12-20", local: "Prateleira 1", valor: null },
  { id: 2, nome: "Leite",  categoria: "Laticínios", quantidade: 10, unidade: "L",  validade: "2026-10-08", local: "Geladeira 1",  valor: null },
  { id: 3, nome: "Frango", categoria: "Carnes",     quantidade: 5,  unidade: "kg", validade: "2026-09-28", local: "Freezer 2",    valor: null },
  { id: 4, nome: "Tomate", categoria: "Verduras",   quantidade: 8,  unidade: "kg", validade: "2026-10-05", local: "Geladeira 2",  valor: null },
  { id: 5, nome: "Feijão", categoria: "Grãos",      quantidade: 15, unidade: "kg", validade: "2026-11-15", local: "Prateleira 2", valor: null },
];

const CHAVE_STORAGE = "despensa:produtos";
const LIMITE_ALERTA = 7; // dias

// ---------- Armazenamento (com fallback se o navegador bloquear) ----------
function carregarProdutos() {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE);
    if (salvo) return JSON.parse(salvo);
  } catch (e) {
    console.warn("Não foi possível ler o armazenamento local:", e);
  }
  return PRODUTOS_INICIAIS.map(p => ({ ...p }));
}

function salvarProdutos() {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(produtos));
  } catch (e) {
    console.warn("Não foi possível salvar:", e);
  }
}

let produtos = carregarProdutos();

// ---------- Datas e status ----------
function hojeZerado() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function lerData(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia); // evita problema de fuso horário
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function diasRestantes(validadeISO) {
  return Math.round((lerData(validadeISO) - hojeZerado()) / 86400000);
}

function classificar(dias) {
  if (dias <= 0)            return { chave: "vermelho", icone: "🔴", texto: "Vencido" };
  if (dias <= LIMITE_ALERTA) return { chave: "amarelo",  icone: "🟡", texto: "Próximo do vencimento" };
  return                          { chave: "verde",    icone: "🟢", texto: "Dentro da validade" };
}

function textoPrazo(dias) {
  const n = Math.abs(dias);
  return `${dias} ${n === 1 ? "dia" : "dias"}`;
}

// ---------- Renderização ----------
const $ = id => document.getElementById(id);

function criarCelula(texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  return td;
}

function renderTabela(lista) {
  const corpo = $("corpoTabela");
  corpo.replaceChildren();

  if (lista.length === 0) {
    const tr = document.createElement("tr");
    const td = criarCelula("Nenhum produto cadastrado. Use o formulário acima para adicionar o primeiro.");
    td.colSpan = 8;
    tr.appendChild(td);
    corpo.appendChild(tr);
    return;
  }

  lista.forEach(p => {
    const tr = document.createElement("tr");
    tr.className = `linha-${p.status.chave}`;

    tr.append(
      criarCelula(p.nome),
      criarCelula(p.categoria),
      criarCelula(`${p.quantidade} ${p.unidade}`),
      criarCelula(formatarData(p.validade)),
      criarCelula(textoPrazo(p.dias)),
      criarCelula(`${p.status.icone} ${p.status.texto}`),
      criarCelula(p.local || "—")
    );

    const tdAcao = document.createElement("td");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "Remover";
    botao.setAttribute("aria-label", `Remover ${p.nome} do estoque`);
    botao.addEventListener("click", () => removerProduto(p.id));
    tdAcao.appendChild(botao);
    tr.appendChild(tdAcao);

    corpo.appendChild(tr);
  });
}

function renderResumo(lista) {
  const conta = chave => lista.filter(p => p.status.chave === chave).length;
  $("qtdVerde").textContent = conta("verde");
  $("qtdAmarelo").textContent = conta("amarelo");
  $("qtdVermelho").textContent = conta("vermelho");
}

function mensagemAlerta(p) {
  const nome = p.nome.toLowerCase();
  if (p.dias === 0) return `${p.nome} vence hoje e, pela regra, é considerado vencido. Retire-o do estoque.`;
  if (p.dias < 0) {
    const n = Math.abs(p.dias);
    return `${p.nome} está vencido há ${n} ${n === 1 ? "dia" : "dias"}. Retire o produto do estoque.`;
  }
  return `${p.nome} vence em ${p.dias} ${p.dias === 1 ? "dia" : "dias"} (${formatarData(p.validade)}). Use ${p.dias === 1 ? "hoje ou amanhã" : "em breve"}.`;
}

function renderAlertas(lista) {
  const area = $("alertas");
  area.replaceChildren();

  const comAlerta = lista
    .filter(p => p.status.chave !== "verde")
    .sort((a, b) => a.dias - b.dias); // mais críticos primeiro

  if (comAlerta.length === 0) {
    const p = document.createElement("p");
    p.textContent = "🟢 Nenhum produto vencido ou perto de vencer.";
    area.appendChild(p);
    return;
  }

  comAlerta.forEach(prod => {
    const art = document.createElement("article");
    art.className = `alerta alerta-${prod.status.chave}`;

    const h3 = document.createElement("h3");
    h3.textContent = prod.status.chave === "vermelho"
      ? "🔴 Produto vencido"
      : "🟡 Produto próximo do vencimento";

    const p = document.createElement("p");
    p.textContent = mensagemAlerta(prod);

    art.append(h3, p);
    area.appendChild(art);
  });
}

function atualizarTela() {
  const enriquecidos = produtos
    .map(p => {
      const dias = diasRestantes(p.validade);
      return { ...p, dias, status: classificar(dias) };
    })
    .sort((a, b) => a.dias - b.dias); // vencidos e mais urgentes no topo

  $("dataHoje").textContent = hojeZerado().toLocaleDateString("pt-BR");
  renderTabela(enriquecidos);
  renderResumo(enriquecidos);
  renderAlertas(enriquecidos);
}

// ---------- Ações ----------
function removerProduto(id) {
  produtos = produtos.filter(p => p.id !== id);
  salvarProdutos();
  atualizarTela();
}

$("formProduto").addEventListener("submit", evento => {
  evento.preventDefault(); // evita recarregar a página e perder os dados

  const dados = new FormData(evento.target);
  const proximoId = produtos.reduce((max, p) => Math.max(max, p.id), 0) + 1;

  produtos.push({
    id: proximoId,
    nome: dados.get("produto").trim(),
    categoria: dados.get("categoria"),
    quantidade: Number(dados.get("quantidade")),
    unidade: dados.get("unidade"),
    validade: dados.get("validade"),
    local: dados.get("local").trim(),
    valor: dados.get("valor") ? Number(dados.get("valor")) : null,
  });

  salvarProdutos();
  atualizarTela();
  evento.target.reset();
  $("produto").focus();
});

// ---------- Início ----------
atualizarTela();
