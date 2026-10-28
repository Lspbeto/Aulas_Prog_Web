let session = JSON.parse(sessionStorage.getItem('session') || 'null');
let products = [];
let cart = new Map();
let globalSalesData = { sales: [], totalSalesCount: 0, totalRevenue: 0 };
let globalUsersData = [];
let editingSaleId = null;

const $ = (sel) => document.querySelector(sel);
const money = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (session) headers['x-user-id'] = session.userId;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro inesperado.');
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const data = await api('/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
    session = { userId: data.userId, username: data.username, role: data.role };
    sessionStorage.setItem('session', JSON.stringify(session));
    e.target.reset();
    startApp();
  } catch (err) { $('#login-error').textContent = err.message; }
});

$('#logout').addEventListener('click', () => { session = null; cart.clear(); sessionStorage.removeItem('session'); showLogin(); });

function showLogin() { $('#app-view').hidden = true; $('#login-view').hidden = false; }

async function startApp() {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  const isAdmin = session.role === 'admin';
  $('#user-label').textContent = `${session.username} (${isAdmin ? 'admin' : 'operador'})`;
  document.querySelectorAll('.admin-only').forEach((el) => (el.hidden = !isAdmin));
  switchTab('pdv');
  await loadProducts();
}

document.querySelectorAll('.tab').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  ['pdv', 'dashboard', 'stock', 'users', 'report'].forEach((t) => {
    const el = $(`#tab-${t}`);
    if (el) el.hidden = t !== name;
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'stock') loadProducts();
  if (name === 'users') loadUsers();
  if (name === 'report') loadReport();
}

async function loadProducts() {
  try {
    products = await api('/products');
    renderProducts();
    renderStock();
  } catch (err) { handleError(err); }
}

function renderProducts() {
  $('#product-grid').innerHTML = products.map((p) => {
    const inCart = cart.get(p.id) || 0;
    const left = p.stock - inCart;
    return `<button class="product" data-id="${p.id}" ${left <= 0 ? 'disabled' : ''}>
      <span class="name">${esc(p.name)}</span>
      <span class="price">${money(p.price)}</span>
      <span class="stock ${left <= 3 ? 'low' : ''}">${left <= 0 ? 'Esgotado' : `${left} em estoque`}</span>
    </button>`;
  }).join('') || '<p class="muted">Nenhum produto cadastrado.</p>';
}

$('#product-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.product');
  if (btn) changeQty(Number(btn.dataset.id), 1);
});

function changeQty(id, delta) {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  const next = (cart.get(id) || 0) + delta;
  if (next <= 0) cart.delete(id);
  else if (next <= product.stock) cart.set(id, next);
  renderCart();
  renderProducts();
}

function renderCart() {
  let total = 0;
  const rows = [...cart].map(([id, qty]) => {
    const p = products.find((x) => x.id === id);
    if (!p) return '';
    total += p.price * qty;
    return `<li>
      <span>${esc(p.name)}</span><strong>${money(p.price * qty)}</strong>
      <div class="qty">
        <button data-id="${id}" data-d="-1">−</button>
        <span>${qty}</span>
        <button data-id="${id}" data-d="1">+</button>
      </div>
    </li>`;
  }).join('');
  $('#cart-list').innerHTML = rows || '<li class="empty">Toque em um produto para adicionar.</li>';
  $('#cart-total').textContent = money(total);
  $('#finish-sale').disabled = cart.size === 0;
}

$('#cart-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (btn) changeQty(Number(btn.dataset.id), Number(btn.dataset.d));
});

$('#clear-cart').addEventListener('click', () => { cart.clear(); renderCart(); renderProducts(); });

$('#finish-sale').addEventListener('click', async () => {
  const items = [...cart].map(([productId, quantity]) => ({ productId, quantity }));
  try {
    const data = await api('/sales', { method: 'POST', body: JSON.stringify({ items }) });
    toast(`Venda #${data.sale.saleId} realizada com sucesso!`);
    printReceipt(data.sale);
    cart.clear();
    await loadProducts();
    renderCart();
  } catch (err) { handleError(err); await loadProducts(); }
});

function printReceipt(sale) {
  const pw = window.open('', '_blank', 'width=350,height=500');
  const itemsHtml = sale.items.map(i => `<tr><td>${i.quantity}x ${esc(i.name)}</td><td style="text-align:right;">${money(i.subtotal)}</td></tr>`).join('');
  pw.document.write(`<html><head><title>Cupom #${sale.saleId}</title><style>body{font-family:monospace;font-size:12px;width:260px;margin:0 auto;padding:10px;}</style></head><body><h2 style="text-align:center;">LANCHONETE</h2><p style="text-align:center;">Comprovante</p><hr><p>Pedido: #${sale.saleId}</p><p>Data: ${new Date(sale.date).toLocaleString('pt-BR')}</p><hr><table style="width:100%;">${itemsHtml}</table><hr><p><strong>TOTAL: ${money(sale.total)}</strong></p><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
  pw.document.close();
}

// ===== Dashboard / Relatório na Tela =====
async function loadDashboard() {
  try {
    const data = await api('/sales');
    globalSalesData = data;
    const prods = await api('/products');
    
    $('#dash-revenue').textContent = money(data.totalRevenue);
    $('#dash-count').textContent = data.totalSalesCount;
    const avg = data.totalSalesCount > 0 ? data.totalRevenue / data.totalSalesCount : 0;
    $('#dash-avg').textContent = money(avg);
    
    const lowStockCount = prods.filter(p => p.stock <= 3).length;
    $('#dash-low-stock').textContent = lowStockCount;

    // Calcula mais vendidos
    const counts = {};
    data.sales.forEach(s => s.items.forEach(i => {
      counts[i.name] = (counts[i.name] || 0) + i.quantity;
    }));
    const topSorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    $('#dash-top-products').innerHTML = topSorted.length ? topSorted.map(([name, qty]) => `<li><span>${esc(name)}</span><strong>${qty} un.</strong></li>`).join('') : '<li class="muted">Sem vendas registradas.</li>';

    // Atividade Recente
    const recent = [...data.sales].reverse().slice(0, 5);
    $('#dash-recent-sales').innerHTML = recent.length ? recent.map(s => `<li><span>Pedido #${s.saleId} (${esc(s.operatorName)})</span><strong>${money(s.total)}</strong></li>`).join('') : '<li class="muted">Nenhuma atividade.</li>';

  } catch (err) { handleError(err); }
}

// ===== Estoque e Usuários =====
function renderStock() {
  $('#stock-body').innerHTML = products.map((p) => `<tr><td>#${p.id}</td><td>${esc(p.name)}</td><td class="num">${money(p.price)}</td><td class="num ${p.stock <= 3 ? 'low' : ''}">${p.stock}</td></tr>`).join('');
}
$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const d = await api('/products', { method: 'POST', body: JSON.stringify({ name: f.get('name').trim(), price: f.get('price'), stock: f.get('stock') }) });
    toast(d.message); e.target.reset(); await loadProducts();
  } catch (err) { handleError(err); }
});

async function loadUsers() {
  try {
    globalUsersData = await api('/users');
    $('#users-body').innerHTML = globalUsersData.map(u => `<tr><td>#${u.id}</td><td>${esc(u.username)}</td><td>${u.role}</td></tr>`).join('');
  } catch (err) { handleError(err); }
}
$('#user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const d = await api('/users', { method: 'POST', body: JSON.stringify({ username: f.get('username'), password: f.get('password'), role: f.get('role') }) });
    toast(d.message); e.target.reset(); await loadUsers();
  } catch (err) { handleError(err); }
});

// Relatório de Vendas com Alterar
async function loadReport() {
  try {
    globalSalesData = await api('/sales');
    $('#sum-count').textContent = globalSalesData.totalSalesCount;
    $('#sum-revenue').textContent = money(globalSalesData.totalRevenue);
    $('#sales-list').innerHTML = [...globalSalesData.sales].reverse().map((s) => `
      <article class="sale">
        <header>
          <span>Pedido #${s.saleId} · Operador: ${esc(s.operatorName)}</span>
          <div>
            <span>${new Date(s.date).toLocaleString('pt-BR')} — <strong>${money(s.total)}</strong></span>
            <button class="btn ghost" style="padding: 0.2rem 0.5rem; margin-left: 10px;" onclick="openEditSale(${s.saleId})">✏️ Alterar</button>
          </div>
        </header>
        <ul>${s.items.map((i) => `<li>${i.quantity}× ${esc(i.name)} (${money(i.subtotal)})</li>`).join('')}</ul>
      </article>`).join('') || '<p class="muted">Nenhuma venda registrada.</p>';
  } catch (err) { handleError(err); }
}

window.openEditSale = function(saleId) {
  const sale = globalSalesData.sales.find(s => s.saleId === saleId);
  if (!sale) return;
  editingSaleId = saleId;
  $('#modal-sale-id').textContent = saleId;
  $('#modal-items-container').innerHTML = products.map(p => {
    const existing = sale.items.find(i => i.productId === p.id);
    const qty = existing ? existing.quantity : 0;
    return `<div class="modal-item-row"><span>${esc(p.name)} (${money(p.price)})</span><input type="number" min="0" data-product-id="${p.id}" value="${qty}" class="edit-qty-input"></div>`;
  }).join('');
  $('#sale-modal').hidden = false;
};

$('#close-modal').addEventListener('click', () => { $('#sale-modal').hidden = true; editingSaleId = null; });

$('#edit-sale-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editingSaleId) return;
  const items = [];
  document.querySelectorAll('.edit-qty-input').forEach(input => {
    const qty = Number(input.value);
    if (qty > 0) items.push({ productId: Number(input.dataset.productId), quantity: qty });
  });
  try {
    const d = await api(`/sales/${editingSaleId}`, { method: 'PUT', body: JSON.stringify({ items }) });
    toast(d.message);
    $('#sale-modal').hidden = true;
    editingSaleId = null;
    await loadProducts();
    await loadReport();
  } catch (err) { handleError(err); }
});

// Impressões
$('#print-stock').addEventListener('click', () => printWindow('Estoque', products.map(p=>`<tr><td>#${p.id}</td><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td></tr>`).join('')));
$('#print-users').addEventListener('click', () => printWindow('Usuários', globalUsersData.map(u=>`<tr><td>#${u.id}</td><td>${esc(u.username)}</td><td>${u.role}</td></tr>`).join('')));
$('#print-sales').addEventListener('click', () => printWindow('Vendas', globalSalesData.sales.map(s=>`<tr><td>#${s.saleId}</td><td>${esc(s.operatorName)}</td><td>${money(s.total)}</td></tr>`).join('')));

function printWindow(title, rows) {
  const pw = window.open('', '_blank', 'width=700,height=800');
  pw.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;}</style></head><body><h1>Relatório: ${title}</h1><table><thead><tr><th>Info 1</th><th>Info 2</th><th>Info 3</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
  pw.document.close();
}

function handleError(err) { toast(err.message, true); if (/não autenticado/i.test(err.message)) { session = null; sessionStorage.removeItem('session'); showLogin(); } }
session ? startApp() : showLogin();