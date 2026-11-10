// ============================================================
// backend/data/portfolio.js — dados do portfólio
// ALTERAÇÃO: arquivo novo, agora dentro de backend/. Este objeto estava
// dentro do server.js. Separar os dados facilita editar o conteúdo
// (perfil, experiências, projetos, certificados) sem mexer na lógica do servidor.
// ============================================================
const portfolioData = {
    perfil: {
        nome: "Lindomberto de Souza Pinto",
        cargo: "Suporte Técnico em TI & Desenvolvimento de Sistemas",
        localizacao: "Fortaleza, CE",
        telefone: "(85) 99981-2019",
        email: "Ispbeto@gmail.com",
        linkedin: "linkedin.com/in/lindomberto-de-sousa-pinto-19311998",
        resumo: "Profissional com 10 anos de experiência em suporte técnico, infraestrutura e gestão administrativa. Atualmente cursando Análise e Desenvolvimento de Sistemas, unindo vivência sólida em hardware e redes com novas competências em programação web."
    },
    experiencias: [
        {
            cargo: "Técnico de Suporte (Nível 1)",
            empresa: "Sindissétima",
            periodo: "2025 - 2026",
            descricao: "Atendimento técnico a usuários e servidores, instalação/configuração de hardwares, infraestrutura de rede e suporte a sistemas internos do órgão."
        },        
        {
            cargo: "Coordenador de Serviços",
            empresa: "Sindissétima",
            periodo: "2013 - 2022",
            descricao: "Coordenação do setor de saúde, negociação de convênios, suporte a áreas contábeis e manutenção/aquisição de equipamentos para a instituição."
        },
        {
            cargo: "Técnico de Suporte (Nível 1 e 2)",
            empresa: "TRT - Tribunal Regional do Trabalho",
            periodo: "2011 - 2013",
            descricao: "Atendimento técnico a usuários e servidores, instalação/configuração de hardwares e suporte a sistemas internos do órgão."
        }
    ],
    projetos: [
        {
            id: 1,
            titulo: "Manutenção e Diagnóstico de Hardware",
            categoria: "suporte",
            descricao: "Projetos práticos de bancada voltados à recuperação avançada de notebooks e dispositivos móveis.",
            tags: ["Hardware", "Senai", "Manutenção"]
        },
        {
            id: 2,
            titulo: "Sistemas Web e APIs",
            categoria: "desenvolvimento",
            descricao: "Desenvolvimento de códigos e lógica de programação aplicando conceitos de HTML, JavaScript, PHP e Java.",
            tags: ["HTML/CSS", "JavaScript", "PHP", "Java"]
        },
        {
            id: 3,
            titulo: "Infraestrutura e Energia Solar",
            categoria: "infra",
            descricao: "Projetos de instalação e configuração de sistemas fotovoltaicos e redes locais.",
            tags: ["Energia Solar", "Redes", "Senai"]
        }
    ],
    certificados: [
        "Programador web - Senai (12/2026)",
        "Programador - Senai (12/2024)",
        "Manutenção em Notebooks - Senai (01/2024)",
        "Manutenção em Celulares - Senai (01/2024)",
        "Instalador de Placas de Energia Solar - Senai (04/2024)"
    ]
};

// ALTERAÇÃO: exporta o objeto para ser importado em routes/api.js
module.exports = portfolioData;
