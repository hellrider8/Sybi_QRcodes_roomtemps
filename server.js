
const express = require('express');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json());

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
            rooms: [],
            minOffset: -3,
            maxOffset: 3,
            stepSize: 0.5,
            sessionDurationMinutes: 15
        };
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
};

app.get('/api/config', (req, res) => res.json(readConfig()));

app.post('/api/config', (req, res) => {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2));
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Proxy-Logik ohne http-proxy-middleware zur Vermeidung von Memory Leaks
app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url');

    try {
        const fetchOptions = {
            method: 'GET',
            headers: {}
        };

        // Header vom Client (z.B. Authorization) weitergeben
        if (req.headers.authorization) {
            fetchOptions.headers['Authorization'] = req.headers.authorization;
        }
        if (req.headers.accept) {
            fetchOptions.headers['Accept'] = req.headers.accept;
        }

        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.text();
        
        res.status(response.status);
        res.set('Content-Type', response.headers.get('content-type') || 'application/json');
        res.set('Access-Control-Allow-Origin', '*');
        res.send(data);
    } catch (err) {
        console.error('[PROXY-ERROR]', err.message);
        res.status(502).send('Proxy Request Failed');
    }
});

app.get(['/**/*.tsx', '/**/*.ts', '/*.tsx', '/*.ts'], async (req, res, next) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const result = await esbuild.transform(content, {
                loader: req.path.endsWith('tsx') ? 'tsx' : 'ts',
                target: 'esnext',
                format: 'esm',
                jsx: 'automatic',
            });
            res.type('application/javascript').send(result.code);
        } catch (err) {
            res.status(500).send(err.message);
        }
    } else next();
});

app.use(express.static(__dirname));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
    console.log(`TEKKO Server running on http://localhost:${PORT}`);
});
