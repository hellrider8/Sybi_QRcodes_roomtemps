
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Middleware für On-the-fly Transpilierung - fängt alle .ts und .tsx Anfragen ab
app.get(['/**/*.tsx', '/**/*.ts', '/*.tsx', '/*.ts'], async (req, res, next) => {
    const cleanPath = req.path;
    const filePath = path.join(__dirname, cleanPath);

    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const result = await esbuild.transform(content, {
                loader: cleanPath.endsWith('tsx') ? 'tsx' : 'ts',
                target: 'esnext',
                format: 'esm',
                jsx: 'automatic',
            });
            res.type('application/javascript').send(result.code);
        } catch (err) {
            console.error('Transpilation Error:', err);
            res.status(500).send(`Transpilation Error: ${err.message}`);
        }
    } else {
        next();
    }
});

app.use(express.static(__dirname));

// Integrierter Gekko-Proxy für CORS-Umgehung
app.use('/api/proxy', (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing "url" parameter');
    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: () => '',
        onProxyRes: (proxyRes) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        },
        onError: (err) => {
            console.error('Proxy Error:', err);
            res.status(500).send('Proxy failed');
        }
    })(req, res, next);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
==================================================
  TEKKO SERVER LÄUFT (FINAL VERSION)
==================================================
  URL: http://localhost:${PORT}
  Proxy: Aktiv (/api/proxy)
==================================================
    `);
});
