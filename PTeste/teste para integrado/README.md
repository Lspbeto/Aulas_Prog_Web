# Sistema de Gestão e Despensa — Node + Express + MongoDB (Atlas) + Render

Todos os dados (usuários, produtos e despensa) ficam no **MongoDB**. O mesmo
serviço Express entrega a **API** (`/api/...`) e o **site** (pasta `public/`).

## 1. Estrutura

```
despensa-app/
├── server.js              # entrada: conecta no Mongo, monta rotas, serve o site
├── package.json           # dependências e scripts (npm start / npm run dev)
├── render.yaml            # receita de deploy do Render (Blueprint)
├── .env.example           # modelo das variáveis de ambiente
├── .gitignore             # impede subir node_modules e .env
├── models/                # esquemas do MongoDB (Usuario, Produto, ItemDespensa)
├── routes/                # rotas: auth, usuarios, produtos, despensa
├── middleware/auth.js     # valida o token JWT
├── utils/helpers.js       # funções auxiliares
├── public/                # front-end: index.html, CSS/style.css, JS/script.js
└── docs/UML.md            # diagramas UML de todos os comandos
```

> O arquivo `segundo_index.html` (versão antiga) **não** foi incluído: ele
> aponta para `style.css`/`script.js` na raiz e não é usado pelo sistema atual.

## 2. Rodar no seu computador

```bash
# 1) entre na pasta do projeto
cd despensa-app

# 2) instala as dependências listadas no package.json
npm install

# 3) cria o seu arquivo de configuração a partir do modelo
cp .env.example .env
#    -> abra o .env e preencha MONGO_URI e JWT_SECRET

# 4) gera uma chave aleatória para o JWT_SECRET (copie o resultado para o .env)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 5a) inicia o servidor normalmente
npm start

# 5b) OU inicia reiniciando sozinho a cada alteração de código (desenvolvimento)
npm run dev

# 6) abra no navegador
#    http://localhost:3000
```

## 3. Criar o banco no MongoDB Atlas (gratuito)

1. Crie conta em <https://www.mongodb.com/cloud/atlas> e clique em **Create** → cluster **M0 (Free)**.
2. **Database Access** → *Add New Database User*: crie um usuário e uma senha
   (evite símbolos como `@ : / ?` na senha; se usar, codifique-os na URL).
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   O plano gratuito do Render não tem IP fixo, por isso essa liberação é necessária.
4. **Database** → *Connect* → *Drivers* → copie a string `mongodb+srv://...`.
5. Troque `<password>` pela sua senha e acrescente o nome do banco **antes** do `?`:

```
mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/despensa?retryWrites=true&w=majority
```

Esse texto é o valor de `MONGO_URI`. As coleções (`usuarios`, `produtos`,
`itemdespensas`) são criadas automaticamente no primeiro cadastro.

## 4. Subir o código para o GitHub

```bash
# inicia um repositório Git na pasta (só na primeira vez)
git init

# marca todos os arquivos para o commit (.gitignore deixa .env e node_modules de fora)
git add .

# registra o "retrato" atual do projeto com uma mensagem
git commit -m "Sistema de despensa com MongoDB"

# nomeia a branch principal como "main"
git branch -M main

# liga a pasta ao repositório criado no GitHub (troque pela sua URL)
git remote add origin https://github.com/SEU_USUARIO/despensa-app.git

# envia o código para o GitHub
git push -u origin main
```

## 5. Publicar no Render

**Opção A — Blueprint (usa o `render.yaml`)**

1. No Render: **New +** → **Blueprint** → escolha o repositório do GitHub.
2. Quando pedir `MONGO_URI`, cole a string do Atlas. O `JWT_SECRET` é gerado sozinho.
3. Clique em **Apply**. Ao terminar, a URL `https://sistema-despensa.onrender.com` (ou similar) estará no ar.

**Opção B — manual**

1. **New +** → **Web Service** → escolha o repositório.
2. Preencha:

| Campo | Valor |
|---|---|
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Instance Type | Free |

3. Em **Environment**, adicione: `MONGO_URI` (string do Atlas), `JWT_SECRET` (texto aleatório longo) e `NODE_VERSION` = `20`.
4. **Create Web Service**.

A cada `git push` na branch `main`, o Render refaz o deploy automaticamente.

## 6. Testar a API (opcional)

```bash
URL=http://localhost:3000        # ou a URL do Render

# saúde do servidor (deve mostrar "banco":"conectado")
curl $URL/health

# cria uma conta e mostra o token recebido
curl -X POST $URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ana","senha":"1234"}'

# guarda o token numa variável (cole o token recebido acima)
TOKEN=cole_o_token_aqui

# lista a despensa (rota protegida: exige o token)
curl $URL/api/despensa -H "Authorization: Bearer $TOKEN"

# cadastra um ingrediente
curl -X POST $URL/api/despensa \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Arroz","categoria":"Grãos","quantidade":5,"unidade":"kg","validade":"2027-01-15","local":"Prateleira 2","valor":24.9}'
```

## 7. Pontos de atenção

- **Plano gratuito do Render**: o serviço "dorme" após ~15 min sem acesso; o primeiro acesso depois disso pode levar cerca de 1 minuto.
- **Dados antigos do `localStorage` não migram** para o MongoDB; cadastre de novo (ou peça um script de importação).
- **Senhas** agora são guardadas com hash (bcrypt) e **o login usa token JWT** válido por 7 dias.
- Os dados continuam **compartilhados entre todos os usuários**, como já era no sistema original.
- **Nunca** envie o `.env` ao GitHub: ele contém a senha do banco.
