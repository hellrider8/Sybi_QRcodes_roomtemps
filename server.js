
const express = require('express');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');
const admin = require('firebase-admin');

// Firebase Admin sicher initialisieren
try {
    if (!admin.apps.length) {
        admin.initializeApp();
        console.log('[FIREBASE] Admin SDK initialisiert.');
    }
} catch (e) {
    console.error('[FIREBASE] Kritischer Fehler bei Initialisierung:', e.message);
}

const db = admin.firestore();
const configRef = db.collection('tekko_system').doc('globalConfig');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Hilfsfunktion: Entfernt alle 'undefined' Werte, da Firestore diese nicht speichert
function sanitizeData(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        return value === undefined ? null : value;
    }));
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

// API: Konfiguration laden
app.get('/api/config', async (req, res) => {
    try {
        const doc = await configRef.get();
        if (!doc.exists) {
            return res.json(DEFAULT_CONFIG);
        }
        res.json({ ...DEFAULT_CONFIG, ...doc.data() });
    } catch (err) {
        console.error('[CONFIG-GET-ERROR]', err.message);
        res.json(DEFAULT_CONFIG);
    }
});

// API: Konfiguration speichern
app.post('/api/config', async (req, res) => {
    try {
        // Daten säubern (undefined zu null machen)
        const cleanData = sanitizeData(req.body);
        const newConfig = { 
            ...cleanData, 
            lastUpdated: Date.now() 
        };
        
        console.log(`[FIRESTORE] Speichere Konfiguration...`);
        await configRef.set(newConfig, { merge: true });
        console.log(`[FIRESTORE] Gespeichert.`);
        
        res.json(newConfig);
    } catch (err) {
        console.error('[FIRESTORE-SAVE-ERROR]', err);
        res.status(500).json({ error: 'Firestore Save Failed', details: err.message });
    }
});

// Proxy für API-Anfragen an myGEKKO
app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url');

    try {
        const fetchOptions = {
            method: 'GET',
            headers: {}
        };

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`TEKKO Server running on port ${PORT}`);
});
