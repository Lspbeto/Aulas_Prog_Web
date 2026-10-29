// Memória — arquivo único e portátil. Rode:  node memoria.js   (Node 18+, sem instalar nada)
// Tudo que ela aprende é gravado no FIM deste próprio arquivo (última linha). Copie o arquivo e leve a memória junto.
// Opcional: defina ANTHROPIC_API_KEY para respostas redigidas pelo Claude.
const http = require('http');
const fs = require('fs');

const PORTA = process.env.PORT || 3000;
const CHAVE = process.env.ANTHROPIC_API_KEY || '';
const MODELO = process.env.MODELO || 'claude-sonnet-5-5';
const ESTE = __filename;
const MARCA = '//@@' + 'DADOS@@';       // a linha final do arquivo começa com isto

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

// ---------- Memória gravada no próprio arquivo ----------
let fontes = [];            // { id, titulo, criadoEm, texto }
let trechos = [], df = new Map(), mediaLen = 1, lidoEm = 0;

function carregar() {
  const src = fs.readFileSync(ESTE, 'utf8');
  const i = src.lastIndexOf('\n' + MARCA);
  try { fontes = JSON.parse(Buffer.from(src.slice(i + 1 + MARCA.length).trim(), 'base64').toString('utf8')).fontes || []; }
  catch { fontes = []; }
  lidoEm = fs.statSync(ESTE).mtimeMs;
  indexar();
}
function salvar() {
  const src = fs.readFileSync(ESTE, 'utf8');
  const i = src.lastIndexOf('\n' + MARCA);
  if (i < 0) throw new Error('Marcador de dados não encontrado no arquivo.');
  const novo = src.slice(0, i) + '\n' + MARCA + Buffer.from(JSON.stringify({ fontes }), 'utf8').toString('base64');
  const tmp = ESTE + '.tmp';
  fs.writeFileSync(tmp, novo);
  try { fs.renameSync(tmp, ESTE); } catch { fs.writeFileSync(ESTE, novo); try { fs.unlinkSync(tmp); } catch {} }
  lidoEm = fs.statSync(ESTE).mtimeMs;
}
// Consulta o arquivo de novo se ele mudou no disco (ex.: você trocou por uma cópia mais nova)
function atualizarSeMudou() { try { if (fs.statSync(ESTE).mtimeMs !== lidoEm) carregar(); } catch {} }

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
  atualizarSeMudou();
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

// ---------- Página (embutida) ----------
const PAGINA = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Memória</title>
<style>
:root {
  --fundo: #e8edef;
  --painel: #f7f9f9;
  --tinta: #14262e;
  --suave: #55696f;
  --linha: #b9c6cb;
  --acento: #17606b;
  --marca: #f4d35e;
  --erro: #a3342b;
  --ui: system-ui, "Segoe UI", Roboto, sans-serif;
  --leitura: "Iowan Old Style", Georgia, "Times New Roman", serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fundo); color: var(--tinta); font: 16px/1.5 var(--ui); }

.topo { display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; padding: 1.5rem clamp(1rem, 4vw, 3rem) 0; }
.topo h1 { margin: 0; font: 700 2.2rem/1 var(--leitura); letter-spacing: -.02em; }
.topo p { margin: 0; color: var(--suave); }
.modo { margin-left: auto; font-size: .85rem; color: var(--suave); }

.grade { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 1.5rem;
  padding: 1.5rem clamp(1rem, 4vw, 3rem) 3rem; align-items: start; }
@media (max-width: 800px) { .grade { grid-template-columns: 1fr; } }

section { background: var(--painel); border: 1px solid var(--linha); border-radius: 6px; padding: 1.25rem; }
h2 { margin: 0 0 .75rem; font: 600 1.05rem/1.2 var(--ui); }
h2:not(:first-child) { margin-top: 1.5rem; }

label { display: block; font-size: .9rem; color: var(--suave); margin: .75rem 0 .25rem; }
input, textarea { width: 100%; font: inherit; color: inherit; background: #fff; border: 1px solid var(--linha);
  border-radius: 4px; padding: .55rem .7rem; }
textarea { resize: vertical; }
:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; }

button, .arquivo { font: 600 .95rem var(--ui); border-radius: 4px; padding: .55rem 1rem; cursor: pointer;
  border: 1px solid var(--acento); background: var(--acento); color: #fff; margin: 0; display: inline-block; }
.arquivo { background: transparent; color: var(--acento); }
button:hover { background: #124c55; }
button:disabled { opacity: .55; cursor: wait; }
.acoes { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: .9rem; }
.aviso { min-height: 1.4em; margin: .6rem 0 0; font-size: .9rem; color: var(--acento); }
.aviso.erro { color: var(--erro); }

.fontes { list-style: none; margin: 0; padding: 0; }
.fontes li { display: flex; gap: .5rem; align-items: center; padding: .55rem 0; border-top: 1px solid var(--linha); }
.fontes .nome { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.fontes small { display: block; color: var(--suave); }
.fontes button { background: transparent; color: var(--erro); border-color: var(--linha); padding: .3rem .6rem; font-size: .85rem; }
.fontes button:hover { background: #f3dedb; }
.fontes .vazio, .log .vazio { color: var(--suave); border: 0; }

.log { min-height: 320px; max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; padding-bottom: .5rem; }
.eu { align-self: flex-end; max-width: 80%; background: var(--tinta); color: #fff; padding: .55rem .9rem; border-radius: 14px 14px 2px 14px; }
.ela { max-width: 70ch; font-family: var(--leitura); font-size: 1.05rem; line-height: 1.65; }
.ela p { margin: 0 0 .6rem; white-space: pre-wrap; }
.ela blockquote { margin: 0 0 .6rem; padding: .1rem .5rem; background: linear-gradient(transparent 12%, var(--marca) 12%, var(--marca) 92%, transparent 92%);
  display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.ela .bloco { display: block; margin-bottom: .6rem; }
.ela .de { display: block; font: .8rem var(--ui); color: var(--suave); margin-top: .2rem; }
.ela .fonte { font: .85rem var(--ui); color: var(--suave); border-top: 1px solid var(--linha); padding-top: .4rem; }

.pergunta { display: flex; gap: .6rem; margin-top: 1rem; }
.pergunta input { flex: 1; }
</style>
</head>
<body>
<header class="topo">
  <h1>Memória</h1>
  <p>Ensine textos. Pergunte depois.</p>
  <span id="modo" class="modo"></span>
</header>

<main class="grade">
  <section class="ensinar" aria-labelledby="t-ensinar">
    <h2 id="t-ensinar">Ensinar</h2>
    <form id="form-ensinar">
      <label for="titulo">Título</label>
      <input id="titulo" placeholder="Ex.: Manual da empresa">
      <label for="texto">Texto</label>
      <textarea id="texto" rows="7" placeholder="Cole aqui o conteúdo que a Memória deve aprender"></textarea>
      <div class="acoes">
        <button type="submit">Ensinar texto</button>
        <label class="arquivo">Enviar arquivos
          <input id="arquivos" type="file" accept=".txt,.md,.csv,.json,.html" multiple hidden>
        </label>
      </div>
      <p id="aviso" role="status" class="aviso"></p>
    </form>

    <h2>O que ela sabe</h2>
    <ul id="fontes" class="fontes"></ul>
  </section>

  <section class="conversa" aria-labelledby="t-conversa">
    <h2 id="t-conversa">Perguntar</h2>
    <div id="log" class="log" aria-live="polite">
      <p class="vazio">Faça uma pergunta sobre os textos que você ensinou.</p>
    </div>
    <form id="form-perguntar" class="pergunta">
      <input id="pergunta" placeholder="Digite sua pergunta" autocomplete="off" aria-label="Pergunta">
      <button type="submit">Perguntar</button>
    </form>
  </section>
</main>
<script>
const $ = s => document.querySelector(s);
const historico = [];

async function api(rota, opcoes = {}) {
  const r = await fetch('/api/' + rota, {
    headers: { 'content-type': 'application/json' }, ...opcoes,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Algo deu errado.');
  return dados;
}

function aviso(msg, erro = false) {
  const el = $('#aviso'); el.textContent = msg; el.classList.toggle('erro', erro);
}

function mostrarEstado(estado) {
  $('#modo').textContent = estado.modoIA ? 'Respostas com IA Claude' : 'Busca local, sem internet';
  const ul = $('#fontes'); ul.innerHTML = '';
  if (!estado.fontes.length) {
    ul.innerHTML = '<li class="vazio">Nada ainda. Ensine o primeiro texto.</li>'; return;
  }
  for (const f of estado.fontes) {
    const li = document.createElement('li');
    const nome = document.createElement('span'); nome.className = 'nome';
    nome.textContent = f.titulo;
    const info = document.createElement('small');
    info.textContent = \`\${f.trechos} trechos, \${f.caracteres.toLocaleString('pt-BR')} caracteres\`;
    nome.append(info);
    const bt = document.createElement('button'); bt.textContent = 'Esquecer'; bt.type = 'button';
    bt.onclick = async () => {
      if (confirm(\`Esquecer "\${f.titulo}"?\`)) mostrarEstado(await api('fontes/' + f.id, { method: 'DELETE' }));
    };
    li.append(nome, bt); ul.append(li);
  }
}

$('#form-ensinar').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    mostrarEstado(await api('aprender', { method: 'POST', body: { titulo: $('#titulo').value, texto: $('#texto').value } }));
    $('#titulo').value = ''; $('#texto').value = ''; aviso('Texto aprendido.');
  } catch (err) { aviso(err.message, true); }
});

$('#arquivos').addEventListener('change', async e => {
  let ok = 0;
  for (const arq of e.target.files) {
    try {
      const texto = await arq.text();
      mostrarEstado(await api('aprender', { method: 'POST', body: { titulo: arq.name, texto } })); ok++;
    } catch (err) { aviso(\`\${arq.name}: \${err.message}\`, true); }
  }
  if (ok) aviso(\`\${ok} arquivo(s) aprendido(s).\`);
  e.target.value = '';
});

function balao(classe) {
  const log = $('#log'); log.querySelector('.vazio')?.remove();
  const div = document.createElement('div'); div.className = classe; log.append(div);
  log.scrollTop = log.scrollHeight; return div;
}

$('#form-perguntar').addEventListener('submit', async e => {
  e.preventDefault();
  const pergunta = $('#pergunta').value.trim(); if (!pergunta) return;
  $('#pergunta').value = '';
  balao('eu').textContent = pergunta;
  const ela = balao('ela'); ela.textContent = 'Procurando no que aprendi...';
  const botao = $('#form-perguntar button'); botao.disabled = true;
  try {
    const r = await api('perguntar', { method: 'POST', body: { pergunta, historico } });
    ela.textContent = '';
    const p = document.createElement('p'); p.textContent = r.resposta; ela.append(p);
    for (const d of r.destaques) {
      const bloco = document.createElement('span'); bloco.className = 'bloco';
      const q = document.createElement('blockquote'); q.textContent = d.f;
      const de = document.createElement('span'); de.className = 'de'; de.textContent = d.fonte;
      bloco.append(q, de); ela.append(bloco);
    }
    if (r.fontes.length) {
      const f = document.createElement('div'); f.className = 'fonte';
      f.textContent = 'Fontes: ' + r.fontes.join(', '); ela.append(f);
    }
    historico.push({ role: 'user', content: pergunta }, { role: 'assistant', content: r.resposta });
  } catch (err) { ela.textContent = err.message; }
  botao.disabled = false; $('#log').scrollTop = $('#log').scrollHeight; $('#pergunta').focus();
});

api('estado').then(mostrarEstado).catch(() => aviso('Não consegui falar com o servidor.', true));
</script>
</body>
</html>
`;

// ---------- HTTP ----------
const json = (res, cod, obj) => { res.writeHead(cod, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const corpo = req => new Promise((ok, erro) => {
  let b = ''; req.on('data', c => { b += c; if (b.length > 8e6) { erro(new Error('Texto grande demais.')); req.destroy(); } });
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
    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGINA);
    }
    if (url.pathname === '/api/estado' && req.method === 'GET') { atualizarSeMudou(); return json(res, 200, resumo()); }
    if (url.pathname === '/api/aprender' && req.method === 'POST') {
      const { titulo, texto } = await corpo(req);
      if (!texto || texto.trim().length < 20) return json(res, 400, { erro: 'Escreva ou envie um texto com pelo menos 20 caracteres.' });
      atualizarSeMudou();
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
      atualizarSeMudou();
      const id = url.pathname.split('/').pop();
      fontes = fontes.filter(f => f.id !== id); indexar(); salvar(); return json(res, 200, resumo());
    }
    res.writeHead(404); res.end('Não encontrado');
  } catch (e) { json(res, 500, { erro: e.message }); }
}).listen(PORTA, () => {
  carregar();
  console.log(`Memória em http://localhost:${PORTA}  (${fontes.length} texto(s) na memória; ${CHAVE ? 'com IA Claude' : 'busca local'})`);
});
//@@DADOS@@eyJmb250ZXMiOltdfQ==