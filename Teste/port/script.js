// Banco de dados simulado inicial (se não houver produtos salvos)
const produtosIniciais = [
    { id: 1, nome: "Camiseta Básica", preco: 49.90, imagem: "https://via.placeholder.com/250x150?text=Camiseta" },
    { id: 2, nome: "Tênis Esportivo", preco: 199.90, imagem: "https://via.placeholder.com/250x150?text=Tenis" },
    { id: 3, nome: "Mochila Executiva", preco: 120.00, imagem: "https://via.placeholder.com/250x150?text=Mochila" }
];

// Inicializa os produtos no localStorage caso estejam vazios
if (!localStorage.getItem("produtos")) {
    localStorage.setItem("produtos", JSON.stringify(produtosIniciais));
}

// Retorna os produtos cadastrados
function obterProdutos() {
    return JSON.parse(localStorage.getItem("produtos"));
}

// Retorna o carrinho atual do localStorage
function obterCarrinho() {
    return JSON.parse(localStorage.getItem("carrinho")) || [];
}

// Salva o carrinho no localStorage
function salvarCarrinho(carrinho) {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

// Carrega os produtos na vitrine (index.html)
function carregarVitrine() {
    const container = document.getElementById("lista-produtos");
    if (!container) return;

    const produtos = obterProdutos();
    container.innerHTML = "";

    produtos.forEach(produto => {
        container.innerHTML += `
            <div class="card-produto">
                <img src="${produto.imagem}" alt="${produto.nome}">
                <h3>${produto.nome}</h3>
                <p>R$ ${produto.preco.toFixed(2)}</p>
                <button onclick="adicionarAoCarrinho(${produto.id})">Adicionar ao Carrinho</button>
            </div>
        `;
    });
}

// Adiciona um produto ao carrinho
function adicionarAoCarrinho(idProduto) {
    const produtos = obterProdutos();
    const produto = produtos.find(p => p.id === idProduto);
    let carrinho = obterCarrinho();

    // Verifica se o produto já está no carrinho
    const itemExistente = carrinho.find(item => item.id === idProduto);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({ ...produto, quantidade: 1 });
    }

    salvarCarrinho(carrinho);
    atualizarContadorCarrinho();
    alert("Produto adicionado ao carrinho!");
}

// Atualiza o número de itens exibido no cabeçalho
function atualizarContadorCarrinho() {
    const contador = document.getElementById("contador-carrinho");
    if (!contador) return;

    const carrinho = obterCarrinho();
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    contador.innerText = totalItens;
}

// Carrega os itens na página de carrinho (carrinho.html)
function carregarCarrinhoPagina() {
    const container = document.getElementById("itens-carrinho");
    const valorTotalElemento = document.getElementById("valor-total");
    if (!container) return;

    const carrinho = obterCarrinho();cd 
    container.innerHTML = "";

    if (carrinho.length === 0) {
        container.innerHTML = "<p>Seu carrinho está vazio.</p>";
        valorTotalElemento.innerText = "0.00";
        return;
    }

    let totalGeral = 0;

    carrinho.forEach(item => {
        let subtotal = item.preco * item.quantidade;
        totalGeral += subtotal;

        container.innerHTML += `
            <div class="item-carrinho">
                <div>
                    <h4>${item.nome}</h4>
                    <p>R$ ${item.preco.toFixed(2)} x ${item.quantidade}</p>
                </div>
                <div>
                    <strong>Subtotal: R$ ${subtotal.toFixed(2)}</strong>
                    <button class="btn-remover" onclick="removerDoCarrinho(${item.id})">Remover</button>
                </div>
            </div>
        `;
    });

    valorTotalElemento.innerText = totalGeral.toFixed(2);
}

// Remove item do carrinho
function removerDoCarrinho(idProduto) {
    let carrinho = obterCarrinho();
    carrinho = carrinho.filter(item => item.id !== idProduto);
    salvarCarrinho(carrinho);
    carregarCarrinhoPagina();
    atualizarContadorCarrinho();
}

// Finalizar compra (simulação)
function finalizarCompra() {
    const carrinho = obterCarrinho();
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    alert("Compra finalizada com sucesso! Obrigado pela preferência.");
    localStorage.removeItem("carrinho");
    carregarCarrinhoPagina();
    atualizarContadorCarrinho();
}