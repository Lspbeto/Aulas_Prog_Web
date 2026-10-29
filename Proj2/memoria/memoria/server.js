// Memória — IA local que aprende com textos. Sem dependências (só Node 18+).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORT || 3000;
const CHAVE = process.env.ANTHROPIC_API_KEY || '';           // opcional
const MODELO = process.env.MODELO || 'claude-sonnet-5-5';
const ARQ = path.join(__dirname, 'data', 'memoria.json');
const PUBLICO = path.join(__dirname, 'public');

// ---------- Texto: normalização, radicais, trechos ----------
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const PARADAS = new Set(norm(`a o as os um uma uns umas de do da dos das em no na nos nas por para com sem
sobre entre e ou mas que se como quando onde qual quais quem ao aos pelo pela pelos pelas seu sua seus suas
meu minha eu tu ele ela eles elas voce voces é são foi ser ter tem há isso isto esse essa esses essas este
esta estes estas mais muito muita já não sim também então só até`).split(/\s+/));
const SUFIXOS = ['amentos', 'imentos', 'adores', 'idades', 'mente', 'acoes', 'coes', 'cao', 'idade', 'adora',
  'ador', 'ando', 'endo', 'indo', 'avam', 'aram', 'es', 'as', 'os', 's', 'a', 'o'];
function radical(p) {
  for (const suf of SUFIXOS) if (p.endsWith(suf) && p.length - suf.length >= 4) return p.slice(0, -suf.length);
  return p;
}
const tokens = s => (norm(s).match(/[a-z0-9]+/g) || []).filter(p => !PARADAS.has(p) && p.length > 1).map(radical);
const frases = t => t.split(/(?<=[.!?])\s+|\n+/).map(f => f.trim()).filter(Boolean);

function dividir(texto, alvo = 600) {
  const trechos = [];
  for (const par of texto.split(/\n\s*\n/)) {
    let atual = [];
    for (const f of frases(par)) {
      atual.push(f);
      if (atual.join(' ').length >= alvo) { trechos.push(atual.join(' ')); atual = atual.slice(-1); }
    }
    if (atual.length && (!trechos.length || atual.join(' ') !== trechos[trechos.length - 1])) trechos.push(atual.join(' '));
  }
  return trechos.filter(t => t.length > 15);
}

// ---------- Memória (persistida em JSON) ----------
let fontes = [];            // { id, titulo, criadoEm, texto }
let trechos = [], df = new Map(), mediaLen = 1;

function carregar() {
  try { fontes = JSON.parse(fs.readFileSync(ARQ, 'utf8')).fontes || []; } catch { fontes = []; }
  indexar();
}
function salvar() {
  fs.mkdirSync(path.dirname(ARQ), { recursive: true });
  fs.writeFileSync(ARQ + '.tmp', JSON.stringify({ fontes }, null, 2));
  fs.renameSync(ARQ + '.tmp', ARQ);
}
function indexar() {
  trechos = []; df = new Map();
  for (const f of fontes) for (const texto of dividir(f.texto)) {
    const tk = tokens(texto), tf = new Map();
    tk.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
    trechos.push({ fonteId: f.id, titulo: f.titulo, texto, tf, len: tk.length });
  }
  mediaLen = trechos.reduce((s, t) => s + t.len, 0) / (trechos.length || 1) || 1;
}

// ---------- Busca BM25 ----------
function buscar(pergunta, k = 4) {
  const q = [...new Set(tokens(pergunta))], N = trechos.length;
  return trechos.map(t => {
    let score = 0;
    for (const termo of q) {
      const f = t.tf.get(termo); if (!f) continue;
      const n = df.get(termo), idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * (f * 2.5) / (f + 1.5 * (0.25 + 0.75 * t.len / mediaLen));
    }
    return { ...t, score };
  }).filter(t => t.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}
function melhoresFrases(pergunta, achados, max = 3) {
  const q = new Set(tokens(pergunta)), vistos = new Set(), pts = [];
  for (const t of achados) for (const f of frases(t.texto)) {
    if (vistos.has(f)) continue; vistos.add(f);
    const s = tokens(f).filter(x => q.has(x)).length;
    if (s) pts.push({ f, s, fonte: t.titulo });
  }
  return pts.sort((a, b) => b.s - a.s).slice(0, max);
}

// ---------- IA opcional (Claude) ----------
async function responderComIA(pergunta, achados, historico) {
  const contexto = achados.map((t, i) => `<trecho n="${i + 1}" fonte="${t.titulo}">${t.texto}</trecho>`).join('\n');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': CHAVE, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODELO, max_tokens: 1000,
      system: 'Você responde em português usando SOMENTE os trechos fornecidos, que vêm da base de conhecimento do usuário. ' +
        'Se os trechos não bastarem, diga isso com clareza. Seja direto e cite a fonte pelo título.',
      messages: [...historico.slice(-6), { role: 'user', content: `<trechos>\n${contexto}\n</trechos>\n\nPergunta: ${pergunta}` }]
    })
  });
  if (!r.ok) throw new Error('API ' + r.status);
  return (await r.json()).content.filter(c => c.type === 'text').map(c => c.text).join('\n');
}

async function perguntar({ pergunta, historico = [] }) {
  const achados = buscar(pergunta);
  if (!achados.length) return {
    resposta: fontes.length ? 'Não encontrei isso no que aprendi. Tente outras palavras ou ensine um texto sobre o assunto.'
      : 'Ainda não aprendi nada. Cole um texto ou envie um arquivo ao lado.',
    destaques: [], fontes: [], modo: 'local'
  };
  const nomes = [...new Set(achados.map(a => a.titulo))];
  if (CHAVE) {
    try { return { resposta: await responderComIA(pergunta, achados, historico), destaques: [], fontes: nomes, modo: 'ia' }; }
    catch (e) { console.error('IA indisponível, usando busca local:', e.message); }
  }
  const destaques = melhoresFrases(pergunta, achados);
  return {
    resposta: destaques.length ? 'Isto é o que encontrei nos textos que você me ensinou:' : achados[0].texto,
    destaques, fontes: nomes, modo: 'local'
  };
}

// ---------- HTTP ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const json = (res, cod, obj) => { res.writeHead(cod, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const corpo = req => new Promise((ok, erro) => {
  let b = ''; req.on('data', c => { b += c; if (b.length > 8e6) { erro(new Error('grande')); req.destroy(); } });
  req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { erro(e); } });
});
const resumo = () => ({
  modoIA: !!CHAVE,
  fontes: fontes.map(f => ({ id: f.id, titulo: f.titulo, criadoEm: f.criadoEm, caracteres: f.texto.length,
    trechos: trechos.filter(t => t.fonteId === f.id).length }))
});

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/estado' && req.method === 'GET') return json(res, 200, resumo());
    if (url.pathname === '/api/aprender' && req.method === 'POST') {
      const { titulo, texto } = await corpo(req);
      if (!texto || texto.trim().length < 20) return json(res, 400, { erro: 'Escreva ou envie um texto com pelo menos 20 caracteres.' });
      fontes.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        titulo: (titulo || '').trim() || 'Texto sem título', criadoEm: new Date().toISOString(), texto: texto.trim() });
      indexar(); salvar(); return json(res, 200, resumo());
    }
    if (url.pathname === '/api/perguntar' && req.method === 'POST') {
      const dados = await corpo(req);
      if (!dados.pergunta?.trim()) return json(res, 400, { erro: 'Digite uma pergunta.' });
      return json(res, 200, await perguntar(dados));
    }
    if (url.pathname.startsWith('/api/fontes/') && req.method === 'DELETE') {
      const id = url.pathname.split('/').pop();
      fontes = fontes.filter(f => f.id !== id); indexar(); salvar(); return json(res, 200, resumo());
    }
    // arquivos estáticos
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const arq = path.join(PUBLICO, rel);
    if (!arq.startsWith(PUBLICO) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    fs.createReadStream(arq).pipe(res);
  } catch (e) { json(res, 500, { erro: e.message }); }
}).listen(PORTA, () => {
  carregar();
  console.log(`Memória rodando em http://localhost:${PORTA}  (${CHAVE ? 'com IA Claude' : 'busca local, sem chave de API'})`);
});
