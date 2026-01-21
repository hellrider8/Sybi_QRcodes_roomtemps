const express = require('express');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
const PORT = process.env.PORT || 8080;

// Firebase Admin sicher initialisieren
try {
    if (!admin.apps.length) {
        admin.initializeApp();
        console.log('[FIREBASE] Admin SDK initialisiert.');
    }
} catch (e) {
    console.error('[FIREBASE] Initialisierungsfehler:', e.message);
}

// Datenbank-ID explizit auf 'tekkoconfig' setzen
let db;
let configRef;

try {
    db = getFirestore('tekkoconfig');
    configRef = db.collection('configs').doc('global');
    console.log('[FIRESTORE] Datenbank "tekkoconfig" erfolgreich verbunden.');
} catch (e) {
    console.error('[FIRESTORE] Fehler beim Zugriff auf "tekkoconfig":', e.message);
    // Fallback auf Default, falls tekkoconfig nicht erreichbar
    db = admin.firestore();
    configRef = db.collection('configs').doc('global');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Hilfsfunktion: Entfernt alle 'undefined' Werte
function sanitize(obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitize(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitize(v)])
    );
  }
  return obj;
}

const DEFAULT_CONFIG = {
    apiMode: 'local',
    cloudProvider: 'gekko',
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
    sessionDurationMinutes: 15,
    lastUpdated: 0
};

app.get('/api/config', async (req, res) => {
    try {
        const doc = await configRef.get();
        if (!doc.exists) return res.json(DEFAULT_CONFIG);
        res.json({ ...DEFAULT_CONFIG, ...doc.data() });
    } catch (err) {
        res.json(DEFAULT_CONFIG);
    }
});

app.post('/api/config', async (req, res) => {
    try {
        const cleanData = sanitize(req.body);
        const newConfig = { ...cleanData, lastUpdated: Date.now() };
        await configRef.set(newConfig, { merge: true });
        res.json(newConfig);
    } catch (err) {
        res.status(500).json({ error: 'Datenbank-Fehler', details: err.message });
    }
});

app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url');
    try {
        const fetchOptions = { method: 'GET', headers: { 'Accept': 'application/json' } };
        if (req.headers.authorization) fetchOptions.headers['Authorization'] = req.headers.authorization;
        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.text();
        res.status(response.status).send(data);
    } catch (err) {
        res.status(502).send('Proxy Failed');
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
