
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json());

// Hilfsfunktion zum Lesen der Config
const readConfig = () => {
    if (!fs.existsSync(CONFIG_FILE)) {
        return {
            apiMode: 'local',
            ip: '',
            gekkoId: '',
            username: '',
            password: '',
            useMock: true,
            secretKey: 'sybtec-static-access-key-2024',
            rooms: []
        };
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
};

// Endpunkt: Config laden
app.get('/api/config', (req, res) => {
    res.json(readConfig());
});

// Endpunkt: Config speichern
app.post('/api/config', (req, res) => {
    try {
        const newConfig = req.body;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
        console.log(`[SERVER] Konfiguration aktualisiert.`);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Debug-Endpunkt für Handy-Logs
app.post('/api/log', (req, res) => {
    const { level, message, data } = req.body;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[CLIENT-LOG ${timestamp}] [${level}] ${message}`, data || '');
    res.sendStatus(200);
});

// Middleware für On-the-fly Transpilierung
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
  TEKKO SERVER LÄUFT (Zentrale Config Aktiv)
==================================================
  URL: http://localhost:${PORT}
  Config: ${CONFIG_FILE}
==================================================
    `);
});
