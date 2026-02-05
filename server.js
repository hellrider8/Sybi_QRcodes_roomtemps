
const express = require('express');
const path = require('path');
const cors = require('cors');
const esbuild = require('esbuild');
const fs = require('fs');
const admin = require('firebase-admin');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// Interner Schlüssel für die Verschlüsselung (nicht im Klartext in der DB)
const DB_ENCRYPTION_KEY = Buffer.from('4f506e129f1209348823456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return "";
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', DB_ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', DB_ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return text; // Falls es noch nicht verschlüsselt war
    }
}

// Firebase Admin initialisieren
try {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
} catch (e) {
    console.error('[FIREBASE] Initialisierungsfehler:', e.message);
}

let db;
let configRef;

try {
    db = admin.firestore();
    configRef = db.collection('configs').doc('global');
} catch (e) {
    console.error('[FIREBASE] Firestore Verbindungsfehler:', e.message);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function sanitize(obj) {
  if (Array.isArray(obj)) return obj.map(v => sanitize(v));
  if (obj !== null && typeof obj === 'object') {
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
    minOffset: -3.0,
    maxOffset: 3.0,
    stepSize: 0.5,
    sessionDurationMinutes: 15,
    lastUpdated: 0,
    skin: 'tekko',
    customColor: '#00828c'
};

app.get('/api/config', async (req, res) => {
    try {
        if (!configRef) return res.json(DEFAULT_CONFIG);
        const doc = await configRef.get();
        if (!doc.exists) return res.json(DEFAULT_CONFIG);
        
        const data = doc.data();
        // Passwort entschlüsseln bevor es an den Client geht
        if (data.password) data.password = decrypt(data.password);
        
        res.json({ ...DEFAULT_CONFIG, ...data });
    } catch (err) {
        console.error("Fehler beim Laden der Config:", err);
        res.json(DEFAULT_CONFIG);
    }
});

app.post('/api/config', async (req, res) => {
    try {
        if (!configRef) throw new Error("Datenbank nicht initialisiert");
        const cleanData = sanitize(req.body);
        
        // Passwort verschlüsseln bevor es in Firestore gespeichert wird
        if (cleanData.password) {
            cleanData.password = encrypt(cleanData.password);
        }
        
        const newConfig = { ...cleanData, lastUpdated: Date.now() };
        await configRef.set(newConfig, { merge: true });
        
        // Zurückgeben an Client (wieder entschlüsselt für State-Update)
        const responseData = { ...newConfig };
        if (responseData.password) responseData.password = decrypt(responseData.password);
        
        res.json(responseData);
    } catch (err) {
        console.error("Fehler beim Speichern der Config:", err);
        res.status(500).json({ error: 'DB Error', details: err.message });
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
    console.log(`Server running on port ${PORT}`);
});
