
const express = require('express');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');
const admin = require('firebase-admin');

// Firebase Admin initialisieren
// Im Google Cloud Run Umfeld werden die Credentials automatisch vom Dienstkonto übernommen.
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            // projectId wird automatisch erkannt, wenn im GCP Umfeld
        });
        console.log('[FIREBASE] Firebase Admin erfolgreich initialisiert.');
    }
} catch (e) {
    console.error('[FIREBASE] Fehler bei der Initialisierung:', e.message);
}

const db = admin.firestore();
// Wir nutzen eine eindeutige Collection für die TEKKO Einstellungen
const configRef = db.collection('tekko_system').doc('globalConfig');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Standard-Konfiguration
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
            console.log('[FIRESTORE] Keine Konfiguration gefunden, sende Defaults.');
            return res.json(DEFAULT_CONFIG);
        }
        console.log('[FIRESTORE] Konfiguration geladen.');
        const data = doc.data();
        res.json({ ...DEFAULT_CONFIG, ...data });
    } catch (err) {
        console.error('[FIRESTORE-GET-ERROR]', err.message);
        // Fallback auf Default, damit die App nicht abstürzt
        res.json(DEFAULT_CONFIG);
    }
});

// API: Konfiguration speichern
app.post('/api/config', async (req, res) => {
    try {
        const newConfig = { 
            ...req.body, 
            lastUpdated: Date.now() 
        };
        
        console.log(`[FIRESTORE] Speichere Konfiguration (Version: ${newConfig.lastUpdated})...`);
        await configRef.set(newConfig, { merge: true });
        
        res.json(newConfig);
    } catch (err) {
        console.error('[FIRESTORE-SAVE-ERROR]', err.message);
        res.status(500).send('Fehler beim Speichern in Firestore: ' + err.message);
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
        res.set('Access-Control-Allow-Origin', '*');
        res.send(data);
    } catch (err) {
        console.error('[PROXY-ERROR]', err.message);
        res.status(502).send('Proxy Request Failed');
    }
});

// On-the-fly transpilation für TS/TSX
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
    console.log(`Persistence: Google Cloud Firestore (Collection: tekko_system)`);
});
