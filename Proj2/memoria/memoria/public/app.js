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
    info.textContent = `${f.trechos} trechos, ${f.caracteres.toLocaleString('pt-BR')} caracteres`;
    nome.append(info);
    const bt = document.createElement('button'); bt.textContent = 'Esquecer'; bt.type = 'button';
    bt.onclick = async () => {
      if (confirm(`Esquecer "${f.titulo}"?`)) mostrarEstado(await api('fontes/' + f.id, { method: 'DELETE' }));
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
    } catch (err) { aviso(`${arq.name}: ${err.message}`, true); }
  }
  if (ok) aviso(`${ok} arquivo(s) aprendido(s).`);
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
