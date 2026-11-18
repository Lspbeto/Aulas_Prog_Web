# UML — Sistema de Gestão e Despensa

Diagramas em Mermaid (renderizam no GitHub, no VS Code com a extensão *Markdown Preview Mermaid* e em <https://mermaid.live>).

## 1. Arquitetura e implantação

```mermaid
flowchart LR
    U["Usuário<br/>(navegador)"] -->|"HTTPS"| R
    subgraph R["Render - Web Service (Node.js)"]
        direction TB
        S["server.js<br/>Express"]
        ST["public/<br/>index.html, CSS, JS"]
        API["routes/*<br/>API REST /api"]
        S --> ST
        S --> API
    end
    API -->|"Mongoose<br/>mongodb+srv"| M[("MongoDB Atlas<br/>banco: despensa")]
    G["GitHub<br/>repositório"] -->|"git push dispara deploy"| R
```

## 2. Casos de uso

```mermaid
flowchart LR
    V(["Visitante"])
    L(["Usuário logado"])
    subgraph SIS["Sistema de Despensa"]
        UC1("Criar conta")
        UC2("Entrar")
        UC3("Sair")
        UC4("Autenticar token")
        UC5("Cadastrar ingrediente")
        UC6("Editar ingrediente")
        UC7("Excluir ingrediente")
        UC8("Ver resumo e alertas de validade")
        UC9("Imprimir ou baixar PDF")
        UC10("Cadastrar produto")
        UC11("Editar produto")
        UC12("Excluir produto")
        UC13("Cadastrar usuário")
        UC14("Excluir usuário")
    end
    V --- UC1
    V --- UC2
    L --- UC3
    L --- UC5
    L --- UC6
    L --- UC7
    L --- UC8
    L --- UC9
    L --- UC10
    L --- UC11
    L --- UC12
    L --- UC13
    L --- UC14
    UC5 -.->|"include"| UC4
    UC6 -.->|"include"| UC4
    UC7 -.->|"include"| UC4
    UC10 -.->|"include"| UC4
    UC11 -.->|"include"| UC4
    UC12 -.->|"include"| UC4
    UC13 -.->|"include"| UC4
    UC14 -.->|"include"| UC4
```

## 3. Diagrama de classes (back-end)

```mermaid
classDiagram
    class Usuario {
        +ObjectId _id
        +String username  «unique»
        +String senhaHash
        +Date createdAt
        +Date updatedAt
    }
    class Produto {
        +ObjectId _id
        +String nome
        +String nomeNormalizado  «unique»
        +Number preco  «min 0»
        +Number qtd  «inteiro, min 0»
    }
    class ItemDespensa {
        +ObjectId _id
        +String nome
        +String nomeNormalizado  «unique»
        +String categoria  «enum»
        +Number quantidade  «min 0.01»
        +String unidade  «enum»
        +String validade  «AAAA-MM-DD»
        +String local
        +Number valor
    }
    class AuthRouter {
        +POST /register()
        +POST /login()
        +GET /me()
    }
    class UsuariosRouter {
        +GET /()
        +POST /()
        +DELETE /:username()
    }
    class ProdutosRouter {
        +GET /()
        +POST /()
        +PUT /:id()
        +DELETE /:id()
    }
    class DespensaRouter {
        +GET /()
        +POST /()
        +PUT /:id()
        +DELETE /:id()
    }
    class AutenticarMiddleware {
        +autenticar(req, res, next)
    }
    class Helpers {
        +normalizarNome(texto)
        +asyncHandler(fn)
        +pegarCampos(origem, campos)
        +aplicarToJSON(schema)
    }
    AuthRouter ..> Usuario : usa
    UsuariosRouter ..> Usuario : usa
    ProdutosRouter ..> Produto : usa
    DespensaRouter ..> ItemDespensa : usa
    UsuariosRouter ..> AutenticarMiddleware : protegida por
    ProdutosRouter ..> AutenticarMiddleware : protegida por
    DespensaRouter ..> AutenticarMiddleware : protegida por
    AuthRouter ..> AutenticarMiddleware : so em /me
    Produto ..> Helpers
    ItemDespensa ..> Helpers
    Usuario ..> Helpers
```

## 4. Estados da interface (front-end)

```mermaid
stateDiagram-v2
    [*] --> VerificandoSessao : abrir página (init)
    VerificandoSessao --> TelaLogin : sem token ou token inválido
    VerificandoSessao --> TelaApp : GET /auth/me ok
    TelaLogin --> TelaCadastro : btnTroca - Criar uma conta
    TelaCadastro --> TelaLogin : btnTroca - Já tenho uma conta
    TelaLogin --> TelaApp : POST /auth/login ok
    TelaCadastro --> TelaApp : POST /auth/register ok
    TelaApp --> TelaLogin : btnSair ou 401
    state TelaApp {
        [*] --> AbaDespensa
        AbaDespensa --> AbaProdutos : clicar na aba
        AbaProdutos --> AbaUsuarios : clicar na aba
        AbaUsuarios --> AbaDespensa : clicar na aba
    }
```

## 5. Sequências — um diagrama por comando

### 5.1 Criar conta (`btnAuth` em modo cadastro) — `POST /api/auth/register`

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant S as Express (auth.js)
    participant DB as MongoDB
    U->>F: preenche usuário, senha, confirmação e clica Cadastrar
    F->>F: confere campos e senhas iguais
    F->>S: POST /api/auth/register
    S->>DB: Usuario.exists(username)
    alt já existe
        DB-->>S: documento
        S-->>F: 409 Este usuário já existe
        F-->>U: exibirMsg(authMsg)
    else novo
        S->>S: bcrypt.hash(senha)
        S->>DB: Usuario.create(username, senhaHash)
        S->>S: jwt.sign(...)
        S-->>F: 201 token e username
        F->>F: guarda token no localStorage
        F->>F: exibirApp()
    end
```

### 5.2 Entrar (`btnAuth` em modo login) — `POST /api/auth/login`

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant S as Express (auth.js)
    participant DB as MongoDB
    U->>F: preenche usuário e senha e clica Entrar
    F->>S: POST /api/auth/login
    S->>DB: Usuario.findOne(username)
    DB-->>S: usuário ou nulo
    S->>S: bcrypt.compare(senha, senhaHash)
    alt credenciais corretas
        S-->>F: 200 token e username
        F->>F: iniciarSessao() e exibirApp()
    else incorretas
        S-->>F: 401 Usuário ou senha incorretos
        F-->>U: exibirMsg(authMsg)
    end
```

### 5.3 Abrir a página com sessão salva (`init`) — `GET /api/auth/me` e carga dos dados

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant S as Express
    participant A as middleware autenticar
    participant DB as MongoDB
    U->>F: abre o site
    F->>S: GET /api/auth/me (Bearer token)
    S->>A: valida o token
    A-->>S: req.usuario
    S->>DB: Usuario.findById(id)
    DB-->>S: usuário
    S-->>F: 200 username
    par carregarDados()
        F->>S: GET /api/despensa
        S->>DB: ItemDespensa.find().sort(validade)
        DB-->>S: itens
        S-->>F: lista
    and
        F->>S: GET /api/produtos
        S->>DB: Produto.find()
        DB-->>S: produtos
        S-->>F: lista
    and
        F->>S: GET /api/usuarios
        S->>DB: Usuario.find()
        DB-->>S: usuários sem senha
        S-->>F: lista
    end
    F->>F: atualizarDespensa(), renderizarProdutosSimples(), renderizarUsuarios()
```

### 5.4 Sair (`btnSair`) e sessão expirada

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant S as Express
    U->>F: clica em Sair
    F->>F: encerrarSessaoLocal() apaga token e nome
    F->>F: exibirAuth()
    Note over F,S: Sessão expirada
    F->>S: qualquer chamada protegida
    S-->>F: 401
    F->>F: encerrarSessaoLocal() e exibirAuth()
    F-->>U: Sessão expirada. Faça login novamente.
```

### 5.5 Cadastrar ou editar ingrediente (formulário da despensa) — `POST` / `PUT /api/despensa`

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant S as Express (despensa.js)
    participant DB as MongoDB
    U->>F: envia o formulário
    F->>F: buscarDuplicado() no front
    alt duplicado
        F-->>U: exibirMsg(despMsg)
    else
        alt editandoDespensaId nulo (cadastro)
            F->>S: POST /api/despensa
            S->>DB: ItemDespensa.create(campos permitidos)
            DB-->>S: documento criado
            S-->>F: 201 item com id
            F->>F: itensDespensa.push(item)
        else editando
            F->>S: PUT /api/despensa/:id
            S->>DB: findById(id)
            S->>DB: item.set(campos) e save()
            DB-->>S: documento salvo
            S-->>F: 200 item
            F->>F: substitui o item na lista
        end
        F->>F: sairEdicaoDespensa() e atualizarDespensa()
    end
    opt erro de validação ou nome duplicado
        S-->>F: 400 ou 409 com mensagem
        F-->>U: exibirMsg(despMsg)
    end
```

### 5.6 Excluir ingrediente (botão Excluir) — `DELETE /api/despensa/:id`

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant S as Express (despensa.js)
    participant DB as MongoDB
    U->>F: clica em Excluir na linha
    F->>F: delegação de eventos lê data-id
    F->>S: DELETE /api/despensa/:id
    S->>DB: findByIdAndDelete(id)
    alt encontrado
        S-->>F: 200 Ingrediente excluído
        F->>F: filtra a lista e atualizarDespensa()
    else não encontrado
        S-->>F: 404
        F-->>U: exibirMsg(despMsg)
    end
```

### 5.7 Produtos gerais — `POST` / `PUT` / `DELETE /api/produtos`

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant S as Express (produtos.js)
    participant DB as MongoDB
    U->>F: preenche nome, preço, quantidade e clica Adicionar ou Salvar
    F->>F: valida campos e buscarDuplicado()
    alt novo
        F->>S: POST /api/produtos
        S->>DB: Produto.create()
    else edição
        F->>S: PUT /api/produtos/:id
        S->>DB: findById() e save()
    end
    DB-->>S: documento
    S-->>F: 201 ou 200 produto
    F->>F: renderizarProdutosSimples()
    U->>F: clica em Excluir
    F->>S: DELETE /api/produtos/:id
    S->>DB: findByIdAndDelete(id)
    S-->>F: 200
    F->>F: remove da lista e renderiza
```

### 5.8 Usuários — `POST /api/usuarios` e `DELETE /api/usuarios/:username`

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário logado
    participant F as script.js
    participant S as Express (usuarios.js)
    participant DB as MongoDB
    U->>F: informa usuário e senha e clica Cadastrar
    F->>S: POST /api/usuarios
    S->>DB: Usuario.exists(username)
    S->>S: bcrypt.hash(senha)
    S->>DB: Usuario.create()
    S-->>F: 201 usuário sem senha
    F->>F: renderizarUsuarios()
    U->>F: clica em Excluir
    F->>S: DELETE /api/usuarios/:username
    alt é o próprio usuário logado
        S-->>F: 400 não pode excluir a si mesmo
    else outro usuário
        S->>DB: Usuario.deleteOne(username)
        S-->>F: 200
        F->>F: remove da lista e renderizarUsuarios()
    end
```

### 5.9 Relatório (`btnImprimir` e `btnPdf`) — somente no navegador

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as script.js
    participant P as jsPDF / window.print
    U->>F: clica em Imprimir ou Baixar PDF
    F->>F: montarDadosRelatorio() usa os dados já carregados da API
    alt Imprimir
        F->>F: preenche #relatorioImpressao
        F->>P: window.print()
    else PDF
        F->>P: jsPDF + autoTable
        P-->>U: download do arquivo relatorio-despensa-AAAA-MM-DD.pdf
    end
```

### 5.10 Deploy (comandos de terminal e Render)

```mermaid
sequenceDiagram
    autonumber
    actor D as Desenvolvedor
    participant G as GitHub
    participant R as Render
    participant A as MongoDB Atlas
    D->>D: npm install
    D->>D: cp .env.example .env
    D->>D: npm start (teste local)
    D->>G: git init, git add ., git commit, git branch -M main
    D->>G: git remote add origin URL
    D->>G: git push -u origin main
    G-->>R: webhook de novo commit
    R->>R: buildCommand npm install
    R->>R: startCommand npm start
    R->>A: mongoose.connect(MONGO_URI)
    A-->>R: conectado
    R->>R: GET /health devolve status ok
    R-->>D: site no ar
```

## 6. Catálogo de comandos

### 6.1 API REST

| # | Método | Rota | Login | Corpo (JSON) | Sucesso | Erros |
|---|---|---|---|---|---|---|
| 1 | GET | `/health` | não | — | 200 `{status, banco}` | — |
| 2 | POST | `/api/auth/register` | não | `{username, senha}` | 201 `{token, username}` | 400, 409 |
| 3 | POST | `/api/auth/login` | não | `{username, senha}` | 200 `{token, username}` | 401 |
| 4 | GET | `/api/auth/me` | sim | — | 200 `{username}` | 401 |
| 5 | GET | `/api/usuarios` | sim | — | 200 lista | 401 |
| 6 | POST | `/api/usuarios` | sim | `{username, senha}` | 201 usuário | 400, 409 |
| 7 | DELETE | `/api/usuarios/:username` | sim | — | 200 | 400, 404 |
| 8 | GET | `/api/produtos` | sim | — | 200 lista | 401 |
| 9 | POST | `/api/produtos` | sim | `{nome, preco, qtd}` | 201 produto | 400, 409 |
| 10 | PUT | `/api/produtos/:id` | sim | `{nome, preco, qtd}` | 200 produto | 400, 404, 409 |
| 11 | DELETE | `/api/produtos/:id` | sim | — | 200 | 400, 404 |
| 12 | GET | `/api/despensa` | sim | — | 200 lista por validade | 401 |
| 13 | POST | `/api/despensa` | sim | `{nome, categoria, quantidade, unidade, validade, local, valor}` | 201 item | 400, 409 |
| 14 | PUT | `/api/despensa/:id` | sim | mesmos campos | 200 item | 400, 404, 409 |
| 15 | DELETE | `/api/despensa/:id` | sim | — | 200 | 400, 404 |

### 6.2 Ações da interface → função → rota

| Ação na tela | Função em `script.js` | Rota |
|---|---|---|
| Abrir página | `init()` → `carregarDados()` | `GET /auth/me`, `GET /despensa`, `GET /produtos`, `GET /usuarios` |
| Entrar | `btnAuth` (login) → `iniciarSessao()` | `POST /auth/login` |
| Criar conta | `btnAuth` (cadastro) → `iniciarSessao()` | `POST /auth/register` |
| Sair | `btnSair` → `encerrarSessaoLocal()` | — |
| Adicionar/Salvar ingrediente | `submit` do `formProduto` | `POST` ou `PUT /despensa` |
| Editar ingrediente | `iniciarEdicaoDespensa()` | — (preenche o formulário) |
| Excluir ingrediente | `removerItemDespensa()` | `DELETE /despensa/:id` |
| Adicionar/Salvar produto | `btnProduto` | `POST` ou `PUT /produtos` |
| Excluir produto | `removerProdutoSimples()` | `DELETE /produtos/:id` |
| Cadastrar usuário | `btnUsuario` | `POST /usuarios` |
| Excluir usuário | `removerUsuario()` | `DELETE /usuarios/:username` |
| Imprimir / PDF | `imprimirRelatorio()` / `baixarPdf()` | — |

### 6.3 Terminal

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências |
| `cp .env.example .env` | cria o arquivo de configuração local |
| `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | gera o `JWT_SECRET` |
| `npm start` | inicia o servidor (`node server.js`) |
| `npm run dev` | inicia com reinício automático (`node --watch server.js`) |
| `git init` | cria o repositório local |
| `git add .` | prepara os arquivos |
| `git commit -m "mensagem"` | registra a versão |
| `git branch -M main` | nomeia a branch como `main` |
| `git remote add origin URL` | liga ao GitHub |
| `git push -u origin main` | envia o código (dispara o deploy no Render) |
| `curl URL/health` | testa se o servidor e o banco estão no ar |
