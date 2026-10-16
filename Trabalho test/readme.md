📄 Detalhamento Completo do Código HTML
🔹 Estrutura Básica e Cabeçalho
html
Preview
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sistema de Gestão e Despensa</title>
  <link rel="stylesheet" href="./CSS/style.css">
</head>
Tabela
Elemento	Explicação
<!DOCTYPE html>	Declara que o documento segue o padrão HTML5
<html lang="pt-BR">	Define o idioma como português do Brasil — ajuda navegadores e leitores de tela
<meta charset="UTF-8">	Define a codificação de caracteres → garante acentuação (ç, ã, ê...) correta
<meta name="viewport" ...>	Faz o site se adaptar ao tamanho da tela (celular, tablet, PC)
<title>	Título que aparece na aba do navegador
<link rel="stylesheet" ...>	Conecta o arquivo de estilos CSS localizado na pasta CSS/
🔹 Corpo Principal e Contêiner Raiz
html
Preview
<body>
  <main id="painel-principal">
    <!-- TODO O CONTEÚDO FICA AQUI -->
  </main>
  <script src="./JS/script.js"></script>
</body>
</html>
<main> = contêiner principal da aplicação, identificado como painel-principal
<script src="./JS/script.js"> = carrega a lógica de programação em JavaScript, localizado na pasta JS/
A estrutura está organizada em seções: tela de login e tela do sistema
🔹 Seção 1 — Tela de Login / Cadastro de Conta
html
Preview
<section id="telaAuth" class="auth card">
  <h1 id="authTitulo">Stok</h1>
  <p class="sub" id="authSub">Entrar</p>
id="telaAuth" = identificador único para manipular visibilidade via JS
class="auth card" = auth estiliza a área de autenticação; card aplica o visual de caixa com sombra
h1 = nome do sistema; p.sub = subtítulo que alterna entre "Entrar" e "Criar conta"
Campos de Entrada
html
Preview
<div class="field">
  <label for="aUser">Usuário</label>
  <input id="aUser" autocomplete="username">
</div>
<div class="field">
  <label for="aPass">Senha</label>
  <input id="aPass" type="password" autocomplete="current-password">
</div>
<div id="boxConfirma" class="hidden field">
  <label for="aPass2">Confirmar senha</label>
  <input id="aPass2" type="password" autocomplete="new-password">
</div>
<label> = rótulo ligado ao campo (clica no texto → foca no input)
autocomplete = dica ao navegador para preenchimento automático seguro
class="hidden" = campo de confirmação de senha fica oculto por padrão; aparece só no cadastro
type="password" = oculta os caracteres digitados
Mensagens e Botões
html
Preview
<p class="msg" id="authMsg" role="alert"></p>
<div class="row" style="margin-top:12px">
  <button id="btnAuth" type="button">Entrar</button>
  <button class="link" id="btnTroca" type="button">Criar uma conta</button>
</div>
role="alert" = marca a mensagem como importante para leitores de tela
class="row" = alinha os botões lado a lado
class="link" = estiliza o botão como um link de texto (sem fundo)
type="button" = não envia formulário automaticamente; tudo é controlado pelo JS
🔹 Seção 2 — Tela do Sistema (após login)
html
Preview
<section id="telaApp" class="hidden">
  <!-- CABEÇALHO, ABAS E CONTEÚDO -->
</section>
Começa oculta (hidden) e só aparece após login bem-sucedido
Cabeçalho
html
Preview
<div class="top card">
  <div>
    <h1>Controle de Produtos e Despensa</h1>
    <div class="sub" style="margin:0">Logado como <strong id="nomeLogado"></strong></div>
  </div>
  <button class="sec" id="btnSair" type="button">Sair</button>
</div>
id="nomeLogado" = nome do usuário conectado é inserido aqui via JS
class="sec" = botão secundário (estilo discreto)
Layout com título à esquerda e botão Sair à direita
Navegação por Abas
html
Preview
<nav class="tabs card">
  <button class="tab-btn active" data-tab="tabDespensa">🥑 Painel da Despensa</button>
  <button class="tab-btn" data-tab="tabProdutos">📦 Produtos Gerais</button>
  <button class="tab-btn" data-tab="tabUsuarios">👤 Gestão de Usuários</button>
</nav>
data-tab="xxx" = atributo personalizado → liga o botão ao conteúdo correspondente
class="active" = marca a aba que está visível no carregamento
<nav> = marcação semântica de área de navegação
🔹 Aba 1 — Painel da Despensa (tabDespensa)
html
Preview
<div id="tabDespensa" class="tab-content">
tab-content = contêiner de conteúdo; só um fica visível por vez
Resumo do Estoque
html
Preview
<section aria-labelledby="titulo-resumo" class="card">
  <h2 id="titulo-resumo">Resumo do estoque</h2>
  <p>Data de referência: <strong id="dataHoje"></strong></p>
  <ul id="resumo">
    <li>🟢 Produtos dentro da validade: <strong id="qtdVerde">0</strong></li>
    <li>🟡 Produtos próximos do vencimento: <strong id="qtdAmarelo">0</strong></li>
    <li>🔴 Produtos vencidos: <strong id="qtdVermelho">0</strong></li>
  </ul>
</section>
aria-labelledby = acessibilidade → liga a seção ao seu título
Os valores 0 são atualizados dinamicamente pelo JavaScript
Emojis coloridos representam o status visualmente
Legenda de Cores
html
Preview
<section aria-labelledby="titulo-legenda" class="card">
  <h2 id="titulo-legenda">🚦 Situação dos produtos</h2>
  <p>🟢 <strong>Verde:</strong> produto dentro do prazo (mais de 7 dias).</p>
  <p>🟡 <strong>Amarelo:</strong> produto próximo do vencimento (1 a 7 dias).</p>
  <p>🔴 <strong>Vermelho:</strong> produto vencido (vence hoje ou já passou).</p>
</section>
Explica o critério de classificação das datas de validade
Formulário de Cadastro de Ingredientes
html
Preview
<form id="formProduto">
  <div class="form-grid">
    <!-- Campos organizados em grade -->
    <div>
      <label for="produto">Nome do ingrediente</label>
      <input type="text" id="produto" name="produto" placeholder="Ex: Arroz" required>
    </div>
    <div>
      <label for="categoria">Categoria</label>
      <select id="categoria" name="categoria" required>
        <option value="">Selecione</option>
        <option value="Grãos">Grãos</option>
        <option value="Carnes">Carnes</option>
        <!-- ... outras opções -->
      </select>
    </div>
    <div>
      <label for="quantidade">Quantidade</label>
      <input type="number" id="quantidade" name="quantidade" min="0.01" step="any" required>
    </div>
    <div>
      <label for="unidade">Unidade</label>
      <select id="unidade" name="unidade">
        <option value="kg">Quilograma (kg)</option>
        <!-- ... outras opções -->
      </select>
    </div>
    <div>
      <label for="validade">Data de validade</label>
      <input type="date" id="validade" name="validade" required>
    </div>
    <div>
      <label for="local">Local de armazenamento</label>
      <input type="text" id="local" name="local" placeholder="Ex: Prateleira 2">
    </div>
    <div>
      <label for="valor">Preço do produto (R$)</label>
      <input type="number" id="valor" name="valor" step="0.01" min="0" placeholder="Ex: 12,50">
    </div>
  </div>
  <button type="submit" style="margin-top: 12px;">➕ Adicionar à Despensa</button>
</form>
required = campo de preenchimento obrigatório
placeholder = texto de exemplo que desaparece ao digitar
type="date" = abre um calendário nativo para escolher a data
step="any" = aceita números decimais; step="0.01" = valores monetários
name = nome do campo, útil para identificação no JS
Lista de Ingredientes — Tabela
html
Preview
<section aria-labelledby="titulo-lista" class="card">
  <h2 id="titulo-lista">📋 Lista de ingredientes</h2>
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th scope="col">Produto</th>
          <th scope="col">Categoria</th>
          <th scope="col">Quantidade</th>
          <th scope="col">Validade</th>
          <th scope="col">Prazo</th>
          <th scope="col">Status</th>
          <th scope="col">Local</th>
          <th scope="col">Ação</th>
        </tr>
      </thead>
      <tbody id="corpoTabela"></tbody>
    </table>
  </div>
</section>
<thead> = cabeçalho fixo; <tbody> = corpo preenchido via JS
scope="col" = acessibilidade → indica que o título se refere a uma coluna
class="scroll" = adiciona rolagem horizontal em telas pequenas
Alertas de Validade
html
Preview
<section aria-labelledby="titulo-alertas" class="card">
  <h2 id="titulo-alertas">⚠️ Alertas de validade</h2>
  <div id="alertas"></div>
</section>
Itens próximos ou vencidos são listados aqui com destaque
🔹 Aba 2 — Produtos Gerais (tabProdutos)
html
Preview
<div id="tabProdutos" class="tab-content hidden">
  <div class="card">
    <h2>Cadastrar produto rápido</h2>
    <div class="row">
      <div style="flex-basis:220px">
        <label for="pNome">Nome</label>
        <input id="pNome">
      </div>
      <div>
        <label for="pPreco">Preço (R$)</label>
        <input id="pPreco" type="number" min="0" step="0.01">
      </div>
      <div>
        <label for="pQtd">Quantidade</label>
        <input id="pQtd" type="number" min="0" step="1">
      </div>
      <div style="flex:0 0 auto">
        <button id="btnProduto" type="button">Adicionar</button>
      </div>
    </div>
    <p class="msg" id="prodMsg" role="alert"></p>
  </div>
  <div class="card">
    <h2>Produtos cadastrados</h2>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th class="n">Preço</th>
            <th class="n">Qtd</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="listaProdutos"></tbody>
      </table>
    </div>
    <div class="vazio hidden" id="vazioProd">Nenhum produto cadastrado ainda.</div>
  </div>
</div>
Versão simplificada de cadastro sem controle de validade
class="n" = alinha números à direita
id="vazioProd" = mensagem exibida quando a lista está vazia
🔹 Aba 3 — Gestão de Usuários (tabUsuarios)
html
Preview
<div id="tabUsuarios" class="tab-content hidden">
  <div class="card">
    <h2>Cadastrar usuário</h2>
    <div class="row">
      <div>
        <label for="uNome">Usuário</label>
        <input id="uNome" autocomplete="off">
      </div>
      <div>
        <label for="uSenha">Senha</label>
        <input id="uSenha" type="password" autocomplete="new-password">
      </div>
      <div style="flex:0 0 auto">
        <button id="btnUsuario" type="button">Cadastrar</button>
      </div>
    </div>
    <p class="msg" id="userMsg" role="alert"></p>
    <div class="scroll" style="margin-top: 15px;">
      <table>
        <thead>
          <tr>
            <th>Usuários cadastrados</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="listaUsuarios"></tbody>
      </table>
    </div>
  </div>
</div>
autocomplete="off" = desativa preenchimento automático por segurança
Lista todos os usuários com opção de remoção
📊 Resumo da Estrutura
Tabela
Nível	Elemento	Função Principal
Raiz	#painel-principal	Contém tudo
Nível 1	#telaAuth	Login/Cadastro — visível inicialmente
Nível 1	#telaApp	Sistema completo — visível após login
Nível 2	.tabs	Navegação entre 3 abas
Nível 3	#tabDespensa	Controle detalhado com validade, local, categoria
Nível 3	#tabProdutos	Cadastro rápido (nome, preço, quantidade)
Nível 3	#tabUsuarios	Gerenciamento de contas do sistema
Dinâmico	tbody#corpoTabela, #alertas, etc.	Conteúdo gerado/atualizado via JavaScript
🔑 Pontos Importantes de Estrutura
Separação de telas: Login e sistema são seções independentes → JS troca a visibilidade
Abas como conteúdo alternado: apenas uma aba é exibida por vez
Acessibilidade: uso de label, aria-labelledby, role, scope
Semântica correta: <section>, <nav>, <form>, <table> com estrutura completa
Tudo conectado: cada id é referenciado no CSS e no JavaScript
Responsividade preparada: class="scroll", form-grid, row → adaptam-se a telas pequenas
Quer que eu detalhe também o JavaScript (script.js) com toda a lógica de funcionamento? Posso criar e explicar cada função passo a passo.