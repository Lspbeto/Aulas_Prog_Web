// Rota 4: Executar um módulo salvo de forma dinâmica
app.post('/api/execute', (req, res) => {
    const { filename, inputData } = req.body;
    const filePath = path.join(MODULES_DIR, path.basename(filename));

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Módulo não encontrado para execução.' });
    }

    try {
        // Lê o código do arquivo salvo
        const scriptCode = fs.readFileSync(filePath, 'utf8');

        /* 
          Sandbox simples: criamos uma função dinâmica encapsulada.
          O código salvo na pasta /modules deve expor uma função chamada 'processar(input)'
        */
        const dynamicFunction = new Function('input', `
            ${scriptCode}
            if (typeof processar === 'function') {
                return processar(input);
            } else {
                return "Erro: O módulo precisa conter uma função chamada 'processar(input)'.";
            }
        `);

        const resultado = dynamicFunction(inputData);
        res.json({ success: true, output: resultado });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao executar o código: ' + error.message });
    }
});