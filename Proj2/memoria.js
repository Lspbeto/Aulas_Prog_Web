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
//@@DADOS@@eyJmb250ZXMiOlt7ImlkIjoibXZ0bjQ0NGJ6cm8iLCJ0aXR1bG8iOiJUZXh0byBzZW0gdMOtdHVsbyIsImNyaWFkb0VtIjoiMjAyNi0xMC0yOVQxNDozMDowNC43NjNaIiwidGV4dG8iOiJHVUlBIEUgQ09OVEXDmkRPIERFIFBST0dSQU1Bw4fDg08gUEFSQSBUUkVJTkFNRU5UTyBERSBJQVxuXG5cblxuPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuMS4gSU5UUk9EVcOHw4NPIEFPIENPTlRFw5pETyBFIEVTVFJVVFVSQSBET1MgREFET1NcblxuPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuRXN0ZSBkb2N1bWVudG8gcmXDum5lIGNvbmNlaXRvcywgZGlyZXRyaXplcyBlIGxpc3RhZ2VucyBkZSByZWN1cnNvcyBlbSBcblxucG9ydHVndcOqcyBwYXJhIGEgY3JpYcOnw6NvIGRlIHVtIGRhdGFzZXQgZW0gdGV4dG8gcHVybyAoLnR4dCkgZGVzdGluYWRvIFxuXG5hbyB0cmVpbmFtZW50byBvdSBhbGltZW50YcOnw6NvIGRlIG1vZGVsb3MgZGUgSW50ZWxpZ8OqbmNpYSBBcnRpZmljaWFsIFxuXG4oUkFHLCBGaW5lLVR1bmluZyBvdSBQcm9tcHRpbmcgZGUgY29udGV4dG8pLlxuXG5cblxuQSBlc2NvbGhhIGRlIG1hdGVyaWFpcyBlbSBwb3J0dWd1w6pzIGUgY29tIGxpY2Vuw6dhIGFiZXJ0YSDDqSBmdW5kYW1lbnRhbCBcblxucGFyYSBnYXJhbnRpciBsZWdhbGlkYWRlLCBjb2Vyw6puY2lhIGxpbmd1w61zdGljYSBlIGJvYSBlc3RydXR1cmHDp8OjbyBkb3MgXG5cbnRva2VucyBkZSBlbnRyYWRhLlxuXG5cblxuPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuMi4gRk9OVEVTIERFIExJVlJPUyBFIE1BVEVSSUFMIERFIFBST0dSQU1Bw4fDg08gRU0gUE9SVFVHVcOKUyAoT1BFTiBTT1VSQ0UpXG5cbj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblxuXG4yLjEgUkVQT1NJVMOTUklPIEZSRUUgUFJPR1JBTU1JTkcgQk9PS1MgKFBPUlRVR1XDilMpXG5cbi0gRGVzY3Jpw6fDo286IE8gbWFpb3IgcmVwb3NpdMOzcmlvIGNvbXVuaXTDoXJpbyBjb20gbGl2cm9zLCB0dXRvcmlhaXMgZSBcblxuICBhcG9zdGlsYXMgZ3JhdHVpdGFzIHNvYnJlIGRlc2Vudm9sdmltZW50byBkZSBzb2Z0d2FyZS5cblxuLSBMaW5ndWFnZW5zIGNvYmVydGFzOiBQeXRob24sIEphdmFTY3JpcHQsIEphdmEsIEMsIEMrKywgQyMsIFJ1c3QsIEdvLCBcblxuICBQSFAsIFJ1YnksIFNRTCwgSFRNTC9DU1MgZSBTaGVsbCBTY3JpcHQuXG5cbi0gVMOzcGljb3MgYWRpY2lvbmFpczogRW5nZW5oYXJpYSBkZSBTb2Z0d2FyZSwgQWxnb3JpdG1vcywgRXN0cnV0dXJhIGRlIFxuXG4gIERhZG9zLCBHaXQgZSBHaXRIdWIsIEFycXVpdGV0dXJhIGRlIFNpc3RlbWFzIGUgUmVkZXMuXG5cblxuXG4yLjIgQVBPU1RJTEFTIEFCRVJUQVMgRSBFLUJPT0tTIENPTSBMSUNFTsOHQSBMSVZSRVxuXG4tIEFwb3N0aWxhcyBDYWVsdW0vQWx1cmE6IE1hdGVyaWFpcyBjb2JyaW5kbyBKYXZhLCBPcmllbnRhw6fDo28gYSBPYmpldG9zLCBcblxuICBEZXNlbnZvbHZpbWVudG8gV2ViIGNvbSBIVE1MLCBDU1MsIEphdmFTY3JpcHQsIGUgQyMuXG5cbi0gUGVuc2UgZW0gUHl0aG9uIChBbGxlbiBCLiBEb3duZXkgLSBUcmFkdcOnw6NvIFBULUJSKTogTGl2cm8gaW50cm9kdXTDs3JpbyBcblxuICBmb2NhZG8gbmEgbMOzZ2ljYSBkZSBwcm9ncmFtYcOnw6NvLCBlc3RydXR1cmFzIGRlIGRhZG9zIGUgb3JpZW50YcOnw6NvIGEgXG5cbiAgb2JqZXRvcyBlbSBQeXRob24uXG5cbi0gQSBCeXRlIG9mIFB5dGhvbiAoVHJhZHXDp8OjbyBQVC1CUik6IEd1aWEgZGlyZXRvIHBhcmEgaW5pY2lhbnRlcyBlIFxuXG4gIGRlc2Vudm9sdmVkb3JlcyBpbnRlcm1lZGnDoXJpb3MuXG5cbi0gRG9jdW1lbnRhw6fDo28gT2ZpY2lhbCBkbyBQeXRob24gKFBULUJSKTogVG9kbyBvIHR1dG9yaWFsIG9maWNpYWwgZGEgXG5cbiAgbGluZ3VhZ2VtIHRyYWR1emlkbyBwYXJhIG8gcG9ydHVndcOqcy5cblxuLSBQcm8gR2l0IChTY290dCBDaGFjb24gZSBCZW4gU3RyYXViKTogTGl2cm8gb2ZpY2lhbCBzb2JyZSBHaXQgZSBjb250cm9sZSBcblxuICBkZSB2ZXJzw6NvLCB0b3RhbG1lbnRlIHRyYWR1emlkbyBlIGFiZXJ0by5cblxuXG5cbj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbjMuIENPTkNFSVRPUyBGVU5EQU1FTlRBSVMgUEFSQSBPIERBVEFTRVRcblxuPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG5cbjMuMSBMw5NHSUNBIERFIFBST0dSQU1Bw4fDg08gRSBBTEdPUklUTU9TXG5cblVtIGFsZ29yaXRtbyDDqSB1bWEgc2VxdcOqbmNpYSBmaW5pdGEgZGUgaW5zdHJ1w6fDtWVzIGJlbSBkZWZpbmlkYXMgZSBcblxubsOjbyBhbWLDrWd1YXMsIGRlc3RpbmFkYXMgw6Agc29sdcOnw6NvIGRlIHVtIHByb2JsZW1hIGVzcGVjw61maWNvLlxuXG5cblxuRXhlbXBsbyBkZSBlc3RydXR1cmEgY29uZGljaW9uYWwgZW0gcHNldWRvY8OzZGlnbzpcblxuICAgIFNFIGlkYWRlID49IDE4IEVOVEFPXG5cbiAgICAgICAgRVNDUkVWQSBcIkFjZXNzbyBwZXJtaXRpZG9cIlxuXG4gICAgU0VOQU9cblxuICAgICAgICBFU0NSRVZBIFwiQWNlc3NvIG5lZ2Fkb1wiXG5cbiAgICBGSU1fU0VcblxuXG5cbjMuMiBFU1RSVVRVUkFTIERFIERBRE9TXG5cbi0gVmV0b3JlcyAoQXJyYXlzKTogQ29sZcOnw7VlcyBvcmRlbmFkYXMgZGUgZWxlbWVudG9zIGFjZXNzw612ZWlzIHBvciDDrW5kaWNlcy5cblxuLSBMaXN0YXMgRW5jYWRlYWRhczogRXN0cnV0dXJhcyBvbmRlIGNhZGEgZWxlbWVudG8gYXBvbnRhIHBhcmEgbyBwcsOzeGltby5cblxuLSBQaWxoYXMgKExJRk8pOiBPIMO6bHRpbW8gZWxlbWVudG8gYSBlbnRyYXIgw6kgbyBwcmltZWlybyBhIHNhaXIuXG5cbi0gRmlsYXMgKEZJRk8pOiBPIHByaW1laXJvIGVsZW1lbnRvIGEgZW50cmFyIMOpIG8gcHJpbWVpcm8gYSBzYWlyLlxuXG4tIERpY2lvbsOhcmlvcy9NYXBhczogRXN0cnV0dXJhcyBkZSBjaGF2ZS12YWxvciBwYXJhIGJ1c2NhIHLDoXBpZGEuXG5cblxuXG4zLjMgUFJPR1JBTUHDh8ODTyBPUklFTlRBREEgQSBPQkpFVE9TIChQT08pXG5cbi0gQ2xhc3NlOiBNb2xkZSBvdSBibHVlcHJpbnQgcGFyYSBhIGNyaWHDp8OjbyBkZSBvYmpldG9zLlxuXG4tIE9iamV0bzogSW5zdMOibmNpYSBkZSB1bWEgY2xhc3NlIGNvbnRlbmRvIGF0cmlidXRvcyBlIG3DqXRvZG9zLlxuXG4tIEVuY2Fwc3VsYW1lbnRvOiBFc2NvbmRlciBvcyBkZXRhbGhlcyBpbnRlcm5vcyBkZSBpbXBsZW1lbnRhw6fDo28uXG5cbi0gSGVyYW7Dp2E6IENhcGFjaWRhZGUgZGUgdW1hIGNsYXNzZSBoZXJkYXIgcHJvcHJpZWRhZGVzIGRlIG91dHJhLlxuXG4tIFBvbGltb3JmaXNtbzogQ2FwYWNpZGFkZSBkZSBtw6l0b2RvcyBkaWZlcmVudGVzIHJlc3BvbmRlcmVtIGRlIGZvcm1hcyBcblxuICBlc3BlY8OtZmljYXMgw6AgbWVzbWEgY2hhbWFkYS5cblxuXG5cbj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbjQuIEFVVE9NQVRJWkFORE8gQSBDT05WRVJTw4NPIFBBUkEgVFhUIENPTSBQWVRIT05cblxuPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG5cbkFiYWl4byBlc3TDo28gb3Mgc2NyaXB0cyB1dGlsaXTDoXJpb3MgZW0gUHl0aG9uIHBhcmEgY29udmVydGVyIGFycXVpdm9zIFxuXG5NYXJrZG93biBlIFBERiBwYXJhIGZvcm1hdG8gLnR4dCBsaW1wbyBlbSBVVEYtOC5cblxuXG5cbi0tLSBTQ1JJUFQgMTogQ09OVkVSVEVSIE1BUktET1dOICgubWQpIFBBUkEgVEVYVE8gUFVSTyAoLnR4dCkgLS0tXG5cblxuXG5pbXBvcnQgb3NcblxuXG5cbmRlZiBjb252ZXJ0ZXJfbWRfcGFyYV90eHQoZGlyZXRvcmlvX29yaWdlbSwgZGlyZXRvcmlvX2Rlc3Rpbm8pOlxuXG4gICAgaWYgbm90IG9zLnBhdGguZXhpc3RzKGRpcmV0b3Jpb19kZXN0aW5vKTpcblxuICAgICAgICBvcy5tYWtlZGlycyhkaXJldG9yaW9fZGVzdGlubylcblxuICAgICAgICBcblxuICAgIGZvciByb290LCBkaXJzLCBmaWxlcyBpbiBvcy53YWxrKGRpcmV0b3Jpb19vcmlnZW0pOlxuXG4gICAgICAgIGZvciBmaWxlIGluIGZpbGVzOlxuXG4gICAgICAgICAgICBpZiBmaWxlLmVuZHN3aXRoKCcubWQnKTpcblxuICAgICAgICAgICAgICAgIGNhbWluaG9fbWQgPSBvcy5wYXRoLmpvaW4ocm9vdCwgZmlsZSlcblxuICAgICAgICAgICAgICAgIG5vbWVfdHh0ID0gb3MucGF0aC5zcGxpdGV4dChmaWxlKVswXSArICcudHh0J1xuXG4gICAgICAgICAgICAgICAgY2FtaW5ob190eHQgPSBvcy5wYXRoLmpvaW4oZGlyZXRvcmlvX2Rlc3Rpbm8sIG5vbWVfdHh0KVxuXG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICB3aXRoIG9wZW4oY2FtaW5ob19tZCwgJ3InLCBlbmNvZGluZz0ndXRmLTgnKSBhcyBmX2luOlxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRldWRvID0gZl9pbi5yZWFkKClcblxuICAgICAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgIHdpdGggb3BlbihjYW1pbmhvX3R4dCwgJ3cnLCBlbmNvZGluZz0ndXRmLTgnKSBhcyBmX291dDpcblxuICAgICAgICAgICAgICAgICAgICBmX291dC53cml0ZShjb250ZXVkbylcblxuICAgICAgICAgICAgICAgIHByaW50KGZcIkNvbnZlcnRpZG86IHtmaWxlfSAtPiB7bm9tZV90eHR9XCIpXG5cblxuXG4tLS0gU0NSSVBUIDI6IEVYVFJBSVIgVEVYVE8gREUgUERGUyBQQVJBIFRYVCAtLS1cblxuXG5cbmltcG9ydCBwZGZwbHVtYmVyXG5cblxuXG5kZWYgZXh0cmFpcl9wZGZfcGFyYV90eHQoY2FtaW5ob19wZGYsIGNhbWluaG9fdHh0KTpcblxuICAgIHdpdGggcGRmcGx1bWJlci5vcGVuKGNhbWluaG9fcGRmKSBhcyBwZGYsIG9wZW4oY2FtaW5ob190eHQsICd3JywgZW5jb2Rpbmc9J3V0Zi04JykgYXMgdHh0OlxuXG4gICAgICAgIGZvciBudW1lcm9fcGFnaW5hLCBwYWdpbmEgaW4gZW51bWVyYXRlKHBkZi5wYWdlcywgc3RhcnQ9MSk6XG5cbiAgICAgICAgICAgIHRleHRvID0gcGFnaW5hLmV4dHJhY3RfdGV4dCgpXG5cbiAgICAgICAgICAgIGlmIHRleHRvOlxuXG4gICAgICAgICAgICAgICAgdHh0LndyaXRlKGZcIlxcbi0tLSBQQUdJTkEge251bWVyb19wYWdpbmF9IC0tLVxcblwiKVxuXG4gICAgICAgICAgICAgICAgdHh0LndyaXRlKHRleHRvICsgJ1xcbicpXG5cbiAgICBwcmludChmXCJQREYgZXh0cmHDrWRvIGNvbSBzdWNlc3NvIHBhcmE6IHtjYW1pbmhvX3R4dH1cIilcblxuXG5cbj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbjUuIEJPQVMgUFLDgVRJQ0FTIE5BIFBSRVBBUkHDh8ODTyBERSBEQURPUyBQQVJBIElBXG5cbj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbjEuIENvZGlmaWNhw6fDo28gVVRGLTg6IFNlbXByZSBzYWx2ZSBvcyBhcnF1aXZvcyBlbSBVVEYtOCBwYXJhIGV2aXRhciBxdWUgXG5cbiAgIGFjZW50b3MgKMOjLCDDpywgw6ksIMO0KSBzZWphbSBjb3Jyb21waWRvcyBlbSBjYXJhY3RlcmVzIGVzdHJhbmhvcy5cblxuMi4gTGltcGV6YSBkZSBSdcOtZG86IFJlbW92YSBjYWJlw6dhbGhvcyBkZSBww6FnaW5hIHJlcGV0aXRpdm9zLCBuw7ptZXJvcyBkZSBcblxuICAgcMOhZ2luYSBzb2x0b3MsIHN1bcOhcmlvcyBleHRlbnNvcyBlIMOtbmRpY2VzIHJlbWlzc2l2b3MuXG5cbjMuIEZyYWdtZW50YcOnw6NvIChDaHVua2luZyk6IFBhcmEgc2lzdGVtYXMgUkFHIChSZXRyaWV2YWwtQXVnbWVudGVkIFxuXG4gICBHZW5lcmF0aW9uKSwgZGl2aWRhIG8gYXJxdWl2byBmaW5hbCBlbSBibG9jb3MgZGUgNTAwIGEgMTAwMCB0b2tlbnMsIFxuXG4gICBtYW50ZW5kbyBwYXLDoWdyYWZvcyBlIGZ1bsOnw7VlcyBkZSBjw7NkaWdvIGNvbXBsZXRvcyBubyBtZXNtbyBibG9jby4ifSx7ImlkIjoibXZ0bjZmbTR4eWYiLCJ0aXR1bG8iOiJUZXh0byBzZW0gdMOtdHVsbyIsImNyaWFkb0VtIjoiMjAyNi0xMC0yOVQxNDozMTo1Mi45NzJaIiwidGV4dG8iOiI9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuTElWUk8gVMOJQ05JQ086IElOVFJPRFXDh8ODTyDDgCBQUk9HUkFNQcOHw4NPLCBBTEdPUklUTU9TIEUgRVNUUlVUVVJBUyBERSBEQURPU1xuTMONTkdVQTogUE9SVFVHVcOKUyAoUFQtQlIpXG5VU086IENPTkpVTlRPIERFIERBRE9TIERFIFRSRUlOQU1FTlRPIEUgQ09OVEVYVE8gUEFSQSBNT0RFTE9TIERFIElBXG49PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4tLS0gQ0FQw41UVUxPIDE6IENPTkNFSVRPUyBGVU5EQU1FTlRBSVMgREUgUFJPR1JBTUHDh8ODTyAtLS1cblxuMS4xIE8gUVVFIMOJIFVNIEFMR09SSVRNTz9cblVtIGFsZ29yaXRtbyDDqSB1bWEgc2VxdcOqbmNpYSBmaW5pdGEgZGUgaW5zdHJ1w6fDtWVzIGJlbSBkZWZpbmlkYXMgZSBuw6NvIGFtYsOtZ3VhcywgZXhlY3V0YWRhcyBlbSBvcmRlbSBwYXJhIHJlc29sdmVyIHVtIHByb2JsZW1hIG91IHJlYWxpemFyIHVtYSB0YXJlZmEuIE5hIGNpw6puY2lhIGRhIGNvbXB1dGHDp8Ojbywgb3MgYWxnb3JpdG1vcyBmb3JtYW0gYSBiYXNlIGzDs2dpY2EgcGFyYSBhIGNvbnN0cnXDp8OjbyBkZSBzb2Z0d2FyZXMuXG5cbjEuMiBWQVJJw4FWRUlTIEUgVElQT1MgREUgREFET1NcblVtYSB2YXJpw6F2ZWwgw6kgdW0gZXNwYcOnbyBhbG9jYWRvIG5hIG1lbcOzcmlhIGRvIGNvbXB1dGFkb3IgZGVzdGluYWRvIGEgYXJtYXplbmFyIHZhbG9yZXMgcXVlIHBvZGVtIHNlciBtb2RpZmljYWRvcyBkdXJhbnRlIGEgZXhlY3XDp8OjbyBkbyBwcm9ncmFtYS5cblxuT3MgdGlwb3MgZGUgZGFkb3MgcHJpbWl0aXZvcyBtYWlzIGNvbXVucyBzw6NvOlxuLSBJbnRlaXJvIChJbnRlZ2VyKTogTsO6bWVyb3MgaW50ZWlyb3MgcG9zaXRpdm9zIG91IG5lZ2F0aXZvcyAoZXg6IC01LCAwLCA0MikuXG4tIFBvbnRvIEZsdXR1YW50ZSAoRmxvYXQvRG91YmxlKTogTsO6bWVyb3MgcmVhaXMgY29tIGNhc2FzIGRlY2ltYWlzIChleDogMy4xNDE1OSwgLTAuMDEpLlxuLSBCb29sZWFubyAoQm9vbGVhbik6IFZhbG9yZXMgbMOzZ2ljb3MgcXVlIGFzc3VtZW0gYXBlbmFzIFZlcmRhZGVpcm8gKFRydWUpIG91IEZhbHNvIChGYWxzZSkuXG4tIENhcmFjdGVyZSAoQ2hhcikgZSBUZXh0byAoU3RyaW5nKTogU2VxdcOqbmNpYXMgZGUgY2FyYWN0ZXJlcyBhbGZhbnVtw6lyaWNvcyBlbmNhZGVhZG9zIChleDogXCJPbMOhLCBNdW5kbyFcIikuXG5cbjEuMyBFU1RSVVRVUkFTIERFIENPTlRST0xFIERFIEZMVVhPXG5BcyBlc3RydXR1cmFzIGRlIGNvbnRyb2xlIGRldGVybWluYW0gYSBvcmRlbSBlbSBxdWUgYXMgaW5zdHJ1w6fDtWVzIGRvIGPDs2RpZ28gc8OjbyBleGVjdXRhZGFzLlxuXG4xLjMuMSBDb25kaWNpb25haXMgKFNlIC8gU2Vuw6NvKVxuUGVybWl0ZW0gYSBleGVjdcOnw6NvIGNvbmRpY2lvbmFsIGRlIGJsb2NvcyBkZSBjw7NkaWdvIGNvbSBiYXNlIGVtIGV4cHJlc3PDtWVzIGJvb2xlYW5hcy5cbkV4ZW1wbG8gY29uY2VpdHVhbDpcblNFIChpZGFkZSA+PSAxOCkgRU5Uw4NPXG4gICAgSW1wcmltaXIgXCJBY2Vzc28gbGliZXJhZG9cIlxuU0VOw4NPXG4gICAgSW1wcmltaXIgXCJBY2Vzc28gbmVnYWRvXCJcblxuMS4zLjIgTGHDp29zIGRlIFJlcGV0acOnw6NvIChMb29wcylcblBlcm1pdGVtIHJlcGV0aXIgdW0gYmxvY28gZGUgY8OzZGlnbyBlbnF1YW50byB1bWEgY29uZGnDp8OjbyBmb3IgdmVyZGFkZWlyYS5cbi0gTGHDp28gRW5xdWFudG8gKFdoaWxlKTogVmVyaWZpY2EgYSBjb25kacOnw6NvIGFudGVzIGRlIGNhZGEgZXhlY3XDp8OjbyBkbyBibG9jby5cbi0gTGHDp28gUGFyYSAoRm9yKTogVXRpbGl6YWRvIHF1YW5kbyBvIG7Dum1lcm8gZGUgaXRlcmHDp8O1ZXMgw6kgcHJldmlhbWVudGUgY29uaGVjaWRvLlxuXG4tLS0gQ0FQw41UVUxPIDI6IFBBUkFESUdNQVMgREUgUFJPR1JBTUHDh8ODTyAtLS1cblxuMi4xIFBST0dSQU1Bw4fDg08gRVNUUlVUVVJBREEgRSBJTVBFUkFUSVZBXG5PIHBhcmFkaWdtYSBpbXBlcmF0aXZvIGZvY2EgZW0gZGVzY3JldmVyICpjb21vKiBvIHByb2dyYW1hIGRldmUgYWx0ZXJhciBzZXUgZXN0YWRvIHBhc3NvIGEgcGFzc28uIEEgcHJvZ3JhbWHDp8OjbyBlc3RydXR1cmFkYSBvcmdhbml6YSBvIGPDs2RpZ28gZW0gc3Vicm90aW5hcywgZnVuw6fDtWVzIGUgYmxvY29zIGNvbmRpY2lvbmFpcy9yZXBldGl0aXZvcywgZXZpdGFuZG8gbyB1c28gZGUgZGVzdmlvcyBpbmNvbmRpY2lvbmFpcyAoY29tbyBjb21hbmRvcyBnb3RvKS5cblxuMi4yIFBST0dSQU1Bw4fDg08gT1JJRU5UQURBIEEgT0JKRVRPUyAoUE9PKVxuQSBQT08gb3JnYW5pemEgbyBzb2Z0d2FyZSBlbSB1bmlkYWRlcyBjaGFtYWRhcyBvYmpldG9zLCBxdWUgY29tYmluYW0gZGFkb3MgKGF0cmlidXRvcykgZSBjb21wb3J0YW1lbnRvcyAobcOpdG9kb3MpLlxuXG5QcmluY2lwYWlzIHBpbGFyZXMgZGEgUE9POlxuLSBBYnN0cmHDp8OjbzogUmVwcmVzZW50YcOnw6NvIGRhcyBjYXJhY3RlcsOtc3RpY2FzIGVzc2VuY2lhaXMgZGUgdW0gb2JqZXRvIG5vIGRvbcOtbmlvIGRvIHByb2JsZW1hLlxuLSBFbmNhcHN1bGFtZW50bzogT2N1bHRhbWVudG8gZG9zIGRldGFsaGVzIGludGVybm9zIGRlIGltcGxlbWVudGHDp8OjbyBlIHByb3Rlw6fDo28gZG9zIGRhZG9zIGRlIGFjZXNzbyBkaXJldG8gZXh0ZXJuby5cbi0gSGVyYW7Dp2E6IE1lY2FuaXNtbyBxdWUgcGVybWl0ZSBhIHVtYSBjbGFzc2UgaGVyZGFyIGF0cmlidXRvcyBlIG3DqXRvZG9zIGRlIG91dHJhIGNsYXNzZSAoY2xhc3NlIG3Do2Uvc3VwZXJjbGFzc2UpLlxuLSBQb2xpbW9yZmlzbW86IENhcGFjaWRhZGUgZGUgZGlmZXJlbnRlcyBvYmpldG9zIHJlc3BvbmRlcmVtIMOgIG1lc21hIG1lbnNhZ2VtIGRlIGZvcm1hcyBkaXN0aW50YXMgY29uZm9ybWUgc3VhIGNsYXNzZSBlc3BlY8OtZmljYS5cblxuMi4zIFBST0dSQU1Bw4fDg08gRlVOQ0lPTkFMXG5QYXJhZGlnbWEgZGVjbGFyYXRpdm8gZm9jYSBuYSBhdmFsaWHDp8OjbyBkZSBmdW7Dp8O1ZXMgbWF0ZW3DoXRpY2FzIHB1cmFzIGUgbmEgaW11dGFiaWxpZGFkZSBkb3MgZGFkb3MuIEV2aXRhIGVmZWl0b3MgY29sYXRlcmFpcyAoc2lkZSBlZmZlY3RzKSBlIG8gY29tcGFydGlsaGFtZW50byBkZSBlc3RhZG8gbXV0w6F2ZWwuXG5cbi0tLSBDQVDDjVRVTE8gMzogRVNUUlVUVVJBUyBERSBEQURPUyAtLS1cblxuMy4xIEFSUkFZUyBFIFZFVE9SRVNcblVtIEFycmF5IMOpIHVtYSBjb2xlw6fDo28gY29udMOtZ3VhIGRlIGVsZW1lbnRvcyBkbyBtZXNtbyB0aXBvIGFybWF6ZW5hZG9zIGVtIHBvc2nDp8O1ZXMgY29uc2VjdXRpdmFzIGRlIG1lbcOzcmlhLiBPIGFjZXNzbyBhb3MgZWxlbWVudG9zIG9jb3JyZSB2aWEgw61uZGljZXMgbnVtw6lyaWNvcywgY29tIGNvbXBsZXhpZGFkZSBkZSB0ZW1wbyBkZSBhY2Vzc28gTygxKS5cblxuMy4yIExJU1RBUyBFTkNBREVBREFTXG5VbWEgTGlzdGEgRW5jYWRlYWRhIChMaW5rZWQgTGlzdCkgw6kgdW1hIGVzdHJ1dHVyYSBsaW5lYXIgb25kZSBvcyBlbGVtZW50b3MgKG7Ds3MpIGNvbnTDqm0gdW0gdmFsb3IgZSB1bWEgcmVmZXLDqm5jaWEgKHBvbnRlaXJvKSBwYXJhIG8gcHLDs3hpbW8gZWxlbWVudG8gZGEgbGlzdGEuIE7Do28gZXhpZ2UgYWxvY2HDp8OjbyBjb250w61ndWEgZGUgbWVtw7NyaWEuXG4tIFZhbnRhZ2VtOiBJbnNlcsOnw7VlcyBlIHJlbW/Dp8O1ZXMgZGluw6JtaWNhcyBzZW0gbmVjZXNzaWRhZGUgZGUgcmVhbG9jYcOnw6NvIGRlIG1lbcOzcmlhIGludGVpcmEuXG4tIERlc3ZhbnRhZ2VtOiBBY2Vzc28gc2VxdWVuY2lhbCBPKG4pLCBzZW0gYWNlc3NvIGRpcmV0byBwb3Igw61uZGljZS5cblxuMy4zIFBJTEhBUyAoU1RBQ0tTKVxuRXN0cnV0dXJhIGRlIGRhZG9zIGxpbmVhciBxdWUgc2VndWUgbyBwcmluY8OtcGlvIExJRk8gKExhc3QgSW4sIEZpcnN0IE91dCAtIE8gw7psdGltbyBhIGVudHJhciDDqSBvIHByaW1laXJvIGEgc2FpcikuXG5PcGVyYcOnw7VlcyBwcmluY2lwYWlzOlxuLSBQdXNoOiBJbnNlcmUgdW0gZWxlbWVudG8gbm8gdG9wbyBkYSBwaWxoYS5cbi0gUG9wOiBSZW1vdmUgZSByZXRvcm5hIG8gZWxlbWVudG8gZG8gdG9wby5cbi0gUGVlay9Ub3A6IFZpc3VhbGl6YSBvIGVsZW1lbnRvIGRvIHRvcG8gc2VtIHJlbW92w6otbG8uXG5cbjMuNCBGSUxBUyAoUVVFVUVTKVxuRXN0cnV0dXJhIGRlIGRhZG9zIGxpbmVhciBxdWUgc2VndWUgbyBwcmluY8OtcGlvIEZJRk8gKEZpcnN0IEluLCBGaXJzdCBPdXQgLSBPIHByaW1laXJvIGEgZW50cmFyIMOpIG8gcHJpbWVpcm8gYSBzYWlyKS5cbk9wZXJhw6fDtWVzIHByaW5jaXBhaXM6XG4tIEVucXVldWU6IEFkaWNpb25hIHVtIGVsZW1lbnRvIGFvIGZpbmFsIGRhIGZpbGEuXG4tIERlcXVldWU6IFJlbW92ZSBvIHByaW1laXJvIGVsZW1lbnRvIGRhIGZpbGEuXG5cbjMuNSBUQUJFTEFTIEhBU0ggKE1BUEFTIERFIENIQVZFLVZBTE9SKVxuRXN0cnV0dXJhcyBxdWUgbWFwZWlhbSBjaGF2ZXMgcGFyYSB2YWxvcmVzIHV0aWxpemFuZG8gdW1hIGZ1bsOnw6NvIGRlIGVzcGFsaGFtZW50byAoaGFzaCBmdW5jdGlvbikuIE9mZXJlY2VtIGJ1c2NhLCBpbnNlcsOnw6NvIGUgcmVtb8Onw6NvIGNvbSB0ZW1wbyBtw6lkaW8gTygxKS5cblxuMy42IMOBUkJPUkVTIEUgR1JBRk9TXG4tIMOBcnZvcmVzOiBFc3RydXR1cmFzIGhpZXLDoXJxdWljYXMgbsOjbyBsaW5lYXJlcyBjb21wb3N0YXMgcG9yIG7Ds3MgcmFpeiwgZmlsaG9zIGUgZm9saGFzLiBBIMOBcnZvcmUgQmluw6FyaWEgZGUgQnVzY2EgKEJTVCkgZ2FyYW50ZSBxdWUgZWxlbWVudG9zIMOgIGVzcXVlcmRhIHPDo28gbWVub3JlcyBxdWUgbyBuw7MgcGFpIGUgw6AgZGlyZWl0YSBzw6NvIG1haW9yZXMuXG4tIEdyYWZvczogQ29uanVudG9zIGRlIHbDqXJ0aWNlcyAobsOzcykgY29uZWN0YWRvcyBwb3IgYXJlc3RhcyAobGluaGFzKSwgcG9kZW5kbyBzZXIgZGlyZWNpb25hZG9zIG91IG7Do28gZGlyZWNpb25hZG9zLCBwb25kZXJhZG9zIG91IG7Do28uXG5cbi0tLSBDQVDDjVRVTE8gNDogQU7DgUxJU0UgREUgQUxHT1JJVE1PUyBFIENPTVBMRVhJREFERSAtLS1cblxuNC4xIE5PVEHDh8ODTyBCSUctT1xuQSBOb3Rhw6fDo28gQmlnLU8gZGVzY3JldmUgbyBsaW1pdGUgc3VwZXJpb3IgZG8gdGVtcG8gZGUgZXhlY3XDp8OjbyBvdSB1c28gZGUgbWVtw7NyaWEgZGUgdW0gYWxnb3JpdG1vIGVtIGZ1bsOnw6NvIGRvIHRhbWFuaG8gZGEgZW50cmFkYSAobiksIGZvY2FuZG8gbm8gcGlvciBjZW7DoXJpby5cblxuUHJpbmNpcGFpcyBvcmRlbnMgZGUgY29tcGxleGlkYWRlOlxuLSBPKDEpOiBUZW1wbyBjb25zdGFudGUgKGV4OiBhY2Vzc28gYSB1bSBlbGVtZW50byBkZSB1bSBhcnJheSBwb3Igw61uZGljZSkuXG4tIE8obG9nIG4pOiBUZW1wbyBsb2dhcsOtdG1pY28gKGV4OiBidXNjYSBiaW7DoXJpYSBlbSBsaXN0YSBvcmRlbmFkYSkuXG4tIE8obik6IFRlbXBvIGxpbmVhciAoZXg6IGJ1c2NhIHNpbXBsZXMgZW0gbGlzdGEgbsOjbyBvcmRlbmFkYSkuXG4tIE8obiBsb2cgbik6IFRlbXBvIGxpbmVhcsOtdG1pY28gKGV4OiBhbGdvcml0bW9zIGVmaWNpZW50ZXMgZGUgb3JkZW5hw6fDo28gY29tbyBNZXJnZSBTb3J0IGUgUXVpY2sgU29ydCkuXG4tIE8obl4yKTogVGVtcG8gcXVhZHLDoXRpY28gKGV4OiBhbGdvcml0bW9zIHNpbXBsZXMgZGUgb3JkZW5hw6fDo28gY29tbyBCdWJibGUgU29ydCBvdSBsYcOnb3MgYW5pbmhhZG9zKS5cbi0gTygyXm4pOiBUZW1wbyBleHBvbmVuY2lhbCAoZXg6IHNvbHXDp8O1ZXMgZGUgZm9yw6dhIGJydXRhIHBhcmEgcHJvYmxlbWFzIGNvbWJpbmF0w7NyaW9zKS5cblxuNC4yIEFMR09SSVRNT1MgREUgT1JERU5Bw4fDg09cbi0gQnViYmxlIFNvcnQ6IENvbXBhcmEgZWxlbWVudG9zIGFkamFjZW50ZXMgZSBvcyB0cm9jYSBzZSBlc3RpdmVyZW0gZm9yYSBkZSBvcmRlbS4gU2ltcGxlcywgcG9yw6ltIGluZWZpY2llbnRlIHBhcmEgZ3JhbmRlcyBjb25qdW50b3MgKE8obl4yKSkuXG4tIFF1aWNrIFNvcnQ6IEFsZ29yaXRtbyBkZSBkaXZpc8OjbyBlIGNvbnF1aXN0YSBxdWUgZXNjb2xoZSB1bSBwaXZvIGUgcGFydGljaW9uYSBvIGFycmF5IGVtIGVsZW1lbnRvcyBtZW5vcmVzIGUgbWFpb3JlcyBxdWUgbyBwaXZvLiBDb21wbGV4aWRhZGUgbcOpZGlhIE8obiBsb2cgbikuXG4tIE1lcmdlIFNvcnQ6IERpdmlkZSBhIGxpc3RhIG5hIG1ldGFkZSByZWN1cnNpdmFtZW50ZSwgb3JkZW5hIGNhZGEgbWV0YWRlIGUganVudGEgKG1lcmdlKSBvcyByZXN1bHRhZG9zIG9yZGVuYWRvcy4gR2FyYW50aWRvIE8obiBsb2cgbikgbm8gcGlvciBjYXNvLlxuXG4tLS0gQ0FQw41UVUxPIDU6IEJPQVMgUFLDgVRJQ0FTIEUgQVJRVUlURVRVUkEgREUgU09GVFdBUkUgLS0tXG5cbjUuMSBQUklOQ8ONUElPUyBTT0xJRFxuQ2luY28gcHJpbmPDrXBpb3MgZGUgZGVzaWduIHBhcmEgZGVzZW52b2x2aW1lbnRvIG9yaWVudGFkbyBhIG9iamV0b3Mgc3VzdGVudMOhdmVsOlxuMS4gUyAtIFNpbmdsZSBSZXNwb25zaWJpbGl0eSBQcmluY2lwbGUgKFByaW5jw61waW8gZGEgUmVzcG9uc2FiaWxpZGFkZSDDmm5pY2EpOiBVbWEgY2xhc3NlIGRldmUgdGVyIGFwZW5hcyB1bWEgcmF6w6NvIHBhcmEgbXVkYXIuXG4yLiBPIC0gT3Blbi9DbG9zZWQgUHJpbmNpcGxlIChQcmluY8OtcGlvIGRvIEFiZXJ0by9GZWNoYWRvKTogRW50aWRhZGVzIGRlIHNvZnR3YXJlIGRldmVtIGVzdGFyIGFiZXJ0YXMgcGFyYSBleHRlbnPDo28sIG1hcyBmZWNoYWRhcyBwYXJhIG1vZGlmaWNhw6fDo28uXG4zLiBMIC0gTGlza292IFN1YnN0aXR1dGlvbiBQcmluY2lwbGUgKFByaW5jw61waW8gZGEgU3Vic3RpdHVpw6fDo28gZGUgTGlza292KTogT2JqZXRvcyBkZSB1bWEgc3VwZXJjbGFzc2UgZGV2ZW0gcG9kZXIgc2VyIHN1YnN0aXR1w61kb3MgcG9yIG9iamV0b3MgZGUgc3VhcyBzdWJjbGFzc2VzIHNlbSBxdWVicmFyIGEgYXBsaWNhw6fDo28uXG40LiBJIC0gSW50ZXJmYWNlIFNlZ3JlZ2F0aW9uIFByaW5jaXBsZSAoUHJpbmPDrXBpbyBkYSBTZWdyZWdhw6fDo28gZGUgSW50ZXJmYWNlcyk6IE11aXRhcyBpbnRlcmZhY2VzIGVzcGVjw61maWNhcyBzw6NvIG1lbGhvcmVzIGRvIHF1ZSB1bWEgaW50ZXJmYWNlIMO6bmljYSBnZXJhbC5cbjUuIEQgLSBEZXBlbmRlbmN5IEludmVyc2lvbiBQcmluY2lwbGUgKFByaW5jw61waW8gZGEgSW52ZXJzw6NvIGRlIERlcGVuZMOqbmNpYSk6IERlcGVuZGEgZGUgYWJzdHJhw6fDtWVzLCBuw6NvIGRlIGltcGxlbWVudGHDp8O1ZXMgY29uY3JldGFzLlxuXG41LjIgVEVTVEVTIERFIFNPRlRXQVJFXG4tIFRlc3RlcyBVbml0w6FyaW9zOiBWYWxpZGFtIG8gY29tcG9ydGFtZW50byBkZSBwZXF1ZW5hcyB1bmlkYWRlcyBkZSBjw7NkaWdvIGlzb2xhZGFzIChmdW7Dp8O1ZXMgb3UgbcOpdG9kb3MpLlxuLSBUZXN0ZXMgZGUgSW50ZWdyYcOnw6NvOiBWZXJpZmljYW0gc2UgZGlmZXJlbnRlcyBtw7NkdWxvcyBvdSBzZXJ2acOnb3MgZnVuY2lvbmFtIGNvcnJldGFtZW50ZSBxdWFuZG8gY29tYmluYWRvcy5cbi0gVGVzdGVzIFBvbnRhIGEgUG9udGEgKEUyRSk6IFNpbXVsYW0gbyBmbHV4byBjb21wbGV0byBkbyB1c3XDoXJpbyBubyBzaXN0ZW1hLlxuPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0ifV19