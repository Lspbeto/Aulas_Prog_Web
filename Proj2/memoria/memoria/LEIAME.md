# Memória

IA local e portátil que aprende com textos que você ensina.

## Como usar
1. Instale o Node.js 18 ou superior.
2. Na pasta do projeto: `node server.js`
3. Abra http://localhost:3000

Nada para instalar (zero dependências). Tudo que ela aprende fica em `data/memoria.json`;
para levar a IA para outro computador, copie a pasta inteira.

## Respostas com IA (opcional)
Sem chave, ela responde com busca local (BM25), mostrando as frases mais relevantes dos seus textos.
Para respostas redigidas pelo Claude, usando apenas o que você ensinou:

- Windows (PowerShell): `$env:ANTHROPIC_API_KEY="sua-chave"; node server.js`
- Mac/Linux: `ANTHROPIC_API_KEY=sua-chave node server.js`

Variáveis: `PORT` (padrão 3000) e `MODELO` (padrão claude-sonnet-5-5).
