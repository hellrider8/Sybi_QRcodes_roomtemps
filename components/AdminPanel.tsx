
import { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, Download, X, QrCode as QrIcon, Settings, Shield, RefreshCw, Globe, Server, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, Zap, Eye, Bug, Terminal, Copy, Info, FileCode, Command } from 'lucide-react';
import { gekkoService } from '../services/gekkoService';
import { RoomDefinition } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface AdminPanelProps {
  onClose: () => void;
  onPreviewRoom: (roomId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onPreviewRoom }) => {
  const [config, setConfig] = useState(gekkoService.getConfig());
  const [activeTab, setActiveTab] = useState<'api' | 'rooms' | 'export' | 'deploy'>('api');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [debugLog, setDebugLog] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const checkConnectivity = useCallback(async () => {
    if (config.useMock) {
      setIsOnline(true);
      return;
    }
    const result = await gekkoService.testConnection();
    setIsOnline(result.success);
  }, [config.useMock]);

  useEffect(() => {
    checkConnectivity();
  }, []);

  const handleSave = () => {
    gekkoService.setConfig(config);
    alert("Konfiguration gespeichert.");
    checkConnectivity();
  };

  const performConnectionTest = async () => {
    setTestStatus('testing');
    setTestMessage('');
    gekkoService.setConfig(config);
    const result = await gekkoService.testConnection();
    setTestStatus(result.success ? 'success' : 'error');
    setIsOnline(result.success);
    setTestMessage(result.message);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("In Zwischenablage kopiert!");
  };

  const setupScript = `
# 1. Nginx & Node Tools installieren
apt update && apt install nginx nodejs npm -y

# 2. Proxy (CORS-Anywhere) dauerhaft mit PM2 starten
npm install -g pm2
PORT=8080 pm2 start npx --name "tekko-proxy" -- cors-anywhere 0.0.0.0:8080
pm2 save
pm2 startup

# 3. Berechtigungen für das Web-Verzeichnis setzen
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

echo "SETUP FERTIG! Kopiere jetzt die Dateien in /var/www/html"
  `.trim();

  const getRoomUrl = (roomId: string) => `${window.location.origin}${window.location.pathname}?room=${roomId}&access=true`;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden text-slate-800">
      <div className="bg-[#00828c] text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <Shield size={20} />
          <h2 className="text-lg font-light uppercase tracking-widest">Admin Backend</h2>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/20 ${isOnline === true ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isOnline === true ? 'bg-green-400' : 'bg-red-500'}`} />
            <span>{isOnline === true ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={24} /></button>
      </div>

      <div className="flex bg-slate-100 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button onClick={() => setActiveTab('api')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'api' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><Settings size={14} className="inline mr-2" /> API</button>
        <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'rooms' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><Eye size={14} className="inline mr-2" /> Räume</button>
        <button onClick={() => setActiveTab('export')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'export' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><QrIcon size={14} className="inline mr-2" /> QR Export</button>
        <button onClick={() => setActiveTab('deploy')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'deploy' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><Server size={14} className="inline mr-2" /> Hosting</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6 pb-12">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`p-3 rounded border text-xs font-bold uppercase ${config.apiMode === 'local' ? 'bg-[#00828c] text-white' : 'bg-slate-50'}`}>Lokal</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`p-3 rounded border text-xs font-bold uppercase ${config.apiMode === 'cloud' ? 'bg-[#00828c] text-white' : 'bg-slate-50'}`}>Cloud</button>
              </div>
              <input type="text" className="admin-input" placeholder="IP oder GekkoID" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
              <input type="text" className="admin-input" placeholder="Benutzer" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
              <input type="password" placeholder="Passwort" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
              <div className="bg-slate-50 p-4 rounded border">
                <label className="admin-label mt-0">CORS Proxy (Dein Port 8080)</label>
                <input type="text" placeholder="http://LXC-IP:8080/" className="admin-input" value={config.corsProxy || ''} onChange={e => setConfig({...config, corsProxy: e.target.value})} />
              </div>
              <button onClick={performConnectionTest} className="w-full py-3 bg-slate-800 text-white rounded text-xs font-bold uppercase flex items-center justify-center gap-2">
                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={14} /> : null} Testen
              </button>
            </div>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="max-w-2xl mx-auto space-y-6 pb-12">
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
              <h3 className="text-sm font-bold uppercase text-red-700 mb-2 flex items-center gap-2"><Command size={18} /> Fix: "Command not found"</h3>
              <p className="text-xs text-red-600 mb-4">Nutze diesen Befehl, um den Proxy sicher zu starten (benötigt kein Pfad-Setup):</p>
              <div className="bg-slate-900 text-green-400 p-4 rounded font-mono text-[11px] relative group">
                <code>npx cors-anywhere 0.0.0.0:8080 &</code>
                <button onClick={() => copyToClipboard('npx cors-anywhere 0.0.0.0:8080 &')} className="absolute right-3 top-3 p-1 hover:bg-white/10 rounded"><Copy size={16}/></button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold uppercase text-[#00828c] mb-4 flex items-center gap-2"><Terminal size={18} /> Full LXC-Setup Script</h3>
              <p className="text-xs text-slate-500 mb-4">Kopiere das hier komplett in dein Proxmox-Terminal (Root), um alles auf einmal einzurichten:</p>
              <div className="bg-slate-900 text-green-400 p-4 rounded font-mono text-[11px] relative group overflow-x-auto whitespace-pre">
                <code>{setupScript}</code>
                <button onClick={() => copyToClipboard(setupScript)} className="absolute right-3 top-3 p-1 bg-[#00828c] text-white rounded hover:scale-105 transition-transform"><Copy size={16}/></button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-4">
              <Info className="text-blue-500 shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-bold uppercase mb-1">So kommen die Dateien auf die VM:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Erstelle auf der VM die Dateien: <code>nano /var/www/html/index.html</code> (Inhalt von hier einfügen)</li>
                  <li>Ebenso für: <code>index.tsx</code>, <code>App.tsx</code>, etc.</li>
                  <li>Fertig! Da wir <strong>Babel im Browser</strong> nutzen, musst du nichts kompilieren.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Andere Tabs bleiben funktional gleich... */}
        {activeTab === 'rooms' && (
           <div className="max-w-2xl mx-auto space-y-4">
              <button onClick={() => setConfig({...config, rooms: [...config.rooms, {id:'new', name:'Neuer Raum', enabled:true}]})} className="bg-[#00828c] text-white px-4 py-2 rounded text-xs uppercase font-bold">Raum hinzufügen</button>
              {config.rooms.map((r, i) => (
                <div key={i} className="bg-white p-3 border rounded-lg flex justify-between items-center shadow-sm">
                  <span className="font-bold text-sm">{r.name}</span>
                  <button onClick={() => onPreviewRoom(r.id)} className="text-[#00828c] hover:bg-slate-100 p-2 rounded-full"><Eye size={18}/></button>
                </div>
              ))}
           </div>
        )}

        {activeTab === 'export' && (
           <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
             {config.rooms.map(r => (
               <div key={r.id} className="bg-white p-4 border rounded-xl flex flex-col items-center">
                 <span className="text-xs font-bold mb-2">{r.name}</span>
                 <QRCodeCanvas value={getRoomUrl(r.id)} size={100} />
               </div>
             ))}
           </div>
        )}
      </div>

      <div className="p-4 bg-white border-t flex justify-end gap-3">
        <button onClick={onClose} className="px-6 py-2 text-xs font-semibold uppercase text-slate-500">Schließen</button>
        <button onClick={handleSave} className="px-8 py-2 bg-[#00828c] text-white rounded text-xs font-semibold uppercase shadow-md">Speichern</button>
      </div>
    </div>
  );
};

export default AdminPanel;
