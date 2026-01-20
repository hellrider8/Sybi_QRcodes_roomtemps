
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Middleware für On-the-fly Transpilierung von .ts und .tsx Dateien
app.get(['/*.tsx', '/*.ts'], async (req, res, next) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const result = await esbuild.transform(content, {
                loader: req.path.endsWith('tsx') ? 'tsx' : 'ts',
                target: 'esnext',
                format: 'esm',
            });
            res.type('application/javascript').send(result.code);
        } catch (err) {
            res.status(500).send(`Transpilation Error: ${err.message}`);
        }
    } else {
        next();
    }
});

// Statische Dateien servieren (für Bilder, HTML, CSS)
app.use(express.static(__dirname));

// Integrierter Gekko-Proxy
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

// SPA Fallback (für alle anderen Pfade index.html liefern)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
==================================================
  TEKKO SERVER LÄUFT (TRANSPILE MODE)
==================================================
  URL: http://localhost:${PORT}
==================================================
    `);
});
