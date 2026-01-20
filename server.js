
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Erlaube CORS für alle Anfragen
app.use(cors());

// Statische Dateien aus dem aktuellen Verzeichnis servieren
app.use(express.static(__dirname));

/**
 * Der integrierte Proxy-Endpunkt.
 * Anfragen an /api/proxy?url=http://... werden an das myGEKKO weitergeleitet.
 */
app.use('/api/proxy', (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing "url" parameter');
    }

    // Wir erstellen den Proxy dynamisch für die Ziel-URL
    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: (path, req) => '', // Entferne den lokalen Pfad komplett
        onProxyRes: (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        },
        onError: (err, req, res) => {
            console.error('Proxy Error:', err);
            res.status(500).send('Proxy to myGEKKO failed');
        }
    })(req, res, next);
});

// Fallback für Single Page Application (liefert index.html bei unbekannten Pfaden)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
==================================================
  TEKKO RAUMREGELUNG - SERVER GESTARTET
==================================================
  Frontend: http://localhost:${PORT}
  Proxy:    Integriert unter /api/proxy
==================================================
    `);
});
