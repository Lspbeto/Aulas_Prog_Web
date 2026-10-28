const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// BANCOS DE DADOS EM MEMÓRIA (Simulação)
// ==========================================

const users = [
    { id: 1, username: 'admin', password: '123', role: 'admin' },
    { id: 2, username: 'operador1', password: '123', role: 'operator' }
];

let inventory = [
    { id: 1, name: 'X-Burger', price: 15.00, stock: 10 },
    { id: 2, name: 'Batata Frita', price: 8.00, stock: 15 },
    { id: 3, name: 'Refrigerante 350ml', price: 5.00, stock: 20 }
];

let sales = [];

// ==========================================
// MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
// ==========================================

function getUserId(req) {
    const raw = req.headers['x-user-id'] ?? (req.body && req.body.userId);
    return Number(raw);
}

function verifyAdmin(req, res, next) {
    const user = users.find(u => u.id === getUserId(req));
    if (!user) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    req.user = user;
    next();
}

function verifyStaff(req, res, next) {
    const user = users.find(u => u.id === getUserId(req));
    if (!user) return res.status(401).json({ error: 'Usuário não autenticado.' });
    req.user = user;
    next();
}

// ==========================================
// ROTAS DA APLICAÇÃO
// ==========================================

app.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });
    res.json({ message: 'Login realizado com sucesso!', userId: user.id, username: user.username, role: user.role });
});

app.get('/users', verifyAdmin, (req, res) => {
    res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role })));
});

app.post('/users', verifyAdmin, (req, res) => {
    const { username, password, role } = req.body || {};
    if (!username || !password || !role) return res.status(400).json({ error: 'Preencha todos os campos.' });
    if (users.some(u => u.username.toLowerCase() === String(username).toLowerCase())) {
        return res.status(400).json({ error: 'Usuário já existe.' });
    }
    const newUser = { id: users.length + 1, username: String(username).trim(), password: String(password), role };
    users.push(newUser);
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: { id: newUser.id, username: newUser.username, role: newUser.role } });
});

app.get('/products', verifyStaff, (req, res) => res.json(inventory));

app.post('/products', verifyAdmin, (req, res) => {
    const { name, price, stock } = req.body;
    if (!name || price === undefined || stock === undefined) return res.status(400).json({ error: 'Dados incompletos.' });
    const priceNum = Number(price), stockNum = Number(stock);
    
    const existing = inventory.find(p => p.name.toLowerCase() === String(name).toLowerCase());
    if (existing) {
        existing.price = priceNum;
        existing.stock += stockNum;
        return res.json({ message: 'Estoque atualizado!', product: existing });
    }
    const newProduct = { id: inventory.length > 0 ? Math.max(...inventory.map(p => p.id)) + 1 : 1, name: String(name), price: priceNum, stock: stockNum };
    inventory.push(newProduct);
    res.status(201).json({ message: 'Produto cadastrado!', product: newProduct });
});

app.post('/sales', verifyStaff, (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Carrinho vazio.' });

    const requested = new Map();
    for (const item of items) {
        const pid = Number(item.productId), q = Number(item.quantity);
        if (q <= 0) return res.status(400).json({ error: 'Quantidade inválida.' });
        requested.set(pid, (requested.get(pid) || 0) + q);
    }

    for (const [pid, q] of requested) {
        const product = inventory.find(p => p.id === pid);
        if (!product || product.stock < q) return res.status(400).json({ error: `Estoque insuficiente para ${product ? product.name : pid}.` });
    }

    let total = 0;
    const soldItems = [];
    for (const [pid, q] of requested) {
        const product = inventory.find(p => p.id === pid);
        product.stock -= q;
        const subtotal = product.price * q;
        total += subtotal;
        soldItems.push({ productId: product.id, name: product.name, quantity: q, unitPrice: product.price, subtotal });
    }

    const newSale = {
        saleId: sales.length > 0 ? Math.max(...sales.map(s => s.saleId)) + 1 : 1,
        operatorId: req.user.id,
        operatorName: req.user.username,
        items: soldItems,
        total,
        date: new Date().toISOString()
    };
    sales.push(newSale);
    res.status(201).json({ message: 'Venda realizada!', sale: newSale });
});

app.get('/sales', verifyAdmin, (req, res) => {
    res.json({
        totalSalesCount: sales.length,
        totalRevenue: sales.reduce((acc, s) => acc + s.total, 0),
        sales
    });
});

app.put('/sales/:id', verifyAdmin, (req, res) => {
    const saleId = Number(req.params.id);
    const { items } = req.body;
    const sale = sales.find(s => s.saleId === saleId);
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada.' });

    // Devolve estoque anterior
    for (const old of sale.items) {
        const p = inventory.find(i => i.id === old.productId);
        if (p) p.stock += old.quantity;
    }

    const requested = new Map();
    for (const item of items) {
        requested.set(Number(item.productId), Number(item.quantity));
    }

    for (const [pid, q] of requested) {
        const p = inventory.find(i => i.id === pid);
        if (!p || p.stock < q) {
            // Reverte
            for (const old of sale.items) {
                const prod = inventory.find(i => i.id === old.productId);
                if (prod) prod.stock -= old.quantity;
            }
            return res.status(400).json({ error: `Estoque insuficiente para alteração.` });
        }
    }

    let newTotal = 0;
    const newItems = [];
    for (const [pid, q] of requested) {
        const p = inventory.find(i => i.id === pid);
        p.stock -= q;
        const subtotal = p.price * q;
        newTotal += subtotal;
        newItems.push({ productId: p.id, name: p.name, quantity: q, unitPrice: p.price, subtotal });
    }

    sale.items = newItems;
    sale.total = newTotal;
    res.json({ message: 'Venda alterada com sucesso!', sale });
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));