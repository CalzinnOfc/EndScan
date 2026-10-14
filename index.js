const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

// Extrator de resultados do DuckDuckGo (HTML)
async function searchDuckDuckGo(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const results = [];

    $('.result').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      let link = $(el).find('.result__url').attr('href') || '';
      const snippet = $(el).find('.result__snippet').text().trim();

      if (title) {
        link = link.trim();
        if (!link.startsWith('http')) link = 'https://' + link;
        results.push({ title, link, snippet, source: 'AetherSeek Engine' });
      }
    });
    return results;
  } catch (err) {
    console.error('Erro na busca (DuckDuckGo):', err.message);
    return [];
  }
}

// Extrator de resultados do Yahoo Search
async function searchYahoo(query) {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const results = [];

    $('#web ol.reg > li').each((i, el) => {
      const titleEl = $(el).find('h3.title a');
      const title = titleEl.text().trim();
      let link = titleEl.attr('href') || '';
      const snippet = $(el).find('.compText, .p-abs').text().trim();

      if (title && link) {
        // Limpa redirecionamento do Yahoo se necessário
        if (link.includes('RU=')) {
          const match = link.match(/RU=([^/]+)/);
          if (match && match[1]) {
            link = decodeURIComponent(match[1]);
          }
        }
        results.push({ title, link, snippet, source: 'Yahoo Web' });
      }
    });
    return results;
  } catch (err) {
    console.error('Erro na busca (Yahoo):', err.message);
    return [];
  }
}

// Rota Principal (Interface HTML do AetherSeek)
app.get('/', (req, res) => {
  const query = req.query.q || '';
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${query ? query + ' - AetherSeek' : 'AetherSeek - Buscador Inteligente'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #c9d1d9; min-height: 100vh; }
        .container { max-width: 850px; margin: 0 auto; padding: 40px 20px; }
        
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 46px; font-weight: 800; background: linear-gradient(135deg, #a855f7, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-decoration: none; display: inline-block; letter-spacing: -1px; }
        .tagline { color: #8b949e; font-size: 14px; margin-top: 6px; }

        .search-box { display: flex; gap: 10px; background: #161b22; padding: 8px; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
        .search-box input { flex: 1; background: transparent; border: none; outline: none; padding: 12px 16px; font-size: 16px; color: #f0f6fc; }
        .search-box button { background: linear-gradient(135deg, #a855f7, #2563eb); border: none; padding: 12px 26px; color: #fff; font-weight: 600; border-radius: 8px; cursor: pointer; transition: opacity 0.2s; }
        .search-box button:hover { opacity: 0.9; }

        .results-container { margin-top: 30px; }
        .result-card { background: #161b22; padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #30363d; transition: transform 0.2s, border-color 0.2s; }
        .result-card:hover { transform: translateY(-2px); border-color: #a855f7; }
        .result-source { font-size: 11px; font-weight: bold; color: #c084fc; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
        .result-title { font-size: 18px; color: #58a6ff; text-decoration: none; font-weight: 600; display: inline-block; margin-bottom: 6px; }
        .result-title:hover { text-decoration: underline; }
        .result-url { font-size: 13px; color: #3fb950; display: block; word-break: break-all; margin-bottom: 8px; }
        .result-snippet { font-size: 14px; color: #8b949e; line-height: 1.5; }

        .loading { text-align: center; color: #8b949e; padding: 40px; font-size: 18px; }
        .empty-state { text-align: center; color: #484f58; margin-top: 60px; font-size: 15px; }
        footer { text-align: center; margin-top: 50px; color: #484f58; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="/" class="logo">AetherSeek</a>
          <p class="tagline">Buscador Inteligente e Agregador Web sem API</p>
        </div>

        <form class="search-box" action="/" method="GET">
          <input type="text" name="q" value="${query}" placeholder="Pesquisar na web sem rastreamento..." required />
          <button type="submit">Buscar</button>
        </form>

        <div id="results" class="results-container">
          ${query ? '<div class="loading">⚡ AetherSeek está extraindo e organizando os resultados...</div>' : '<p class="empty-state">Digite o termo desejado para iniciar a busca agilizada.</p>'}
        </div>

        <footer>
          AetherSeek Engine &copy; 2026 - Agregador de Busca Privado
        </footer>
      </div>

      ${query ? `
      <script>
        fetch('/api/search?q=${encodeURIComponent(query)}')
          .then(res => res.json())
          .then(data => {
            const container = document.getElementById('results');
            if (!data || data.length === 0) {
              container.innerHTML = '<div class="empty-state">Nenhum resultado encontrado para esta busca.</div>';
              return;
            }
            container.innerHTML = data.map(item => \`
              <div class="result-card">
                <span class="result-source">\${item.source}</span>
                <a href="\${item.link}" target="_blank" rel="noopener noreferrer" class="result-title">\${item.title}</a>
                <span class="result-url">\${item.link}</span>
                <p class="result-snippet">\${item.snippet}</p>
              </div>
            \`).join('');
          })
          .catch(() => {
            document.getElementById('results').innerHTML = '<div class="empty-state">Ocorreu um erro ao consultar os motores. Tente novamente.</div>';
          });
      </script>
      ` : ''}
    </body>
    </html>
  `);
});

// API interna de agregação
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  // Consulta em paralelo motores web sem pagar API
  const [ddg, yahoo] = await Promise.all([
    searchDuckDuckGo(query),
    searchYahoo(query)
  ]);

  // Junta e intercala os resultados
  const combined = [];
  const max = Math.max(ddg.length, yahoo.length);

  for (let i = 0; i < max; i++) {
    if (ddg[i]) combined.push(ddg[i]);
    if (yahoo[i]) combined.push(yahoo[i]);
  }

  res.json(combined);
});

app.listen(PORT, () => {
  console.log(`AetherSeek rodando na porta ${PORT}`);
});
