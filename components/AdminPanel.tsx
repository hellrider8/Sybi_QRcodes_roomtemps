import React, { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, Download, X, QrCode as QrIcon, Settings, Shield, RefreshCw, Globe, Server, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, Zap, Eye, Bug, Terminal, Copy, Info, FileCode, Command, Check } from 'lucide-react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
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

  const useDefaultProxy = () => {
    setConfig({ ...config, corsProxy: 'https://cors-anywhere.herokuapp.com/' });
  };

  const performConnectionTest = async () => {
    setTestStatus('testing');
    setTestMessage('');
    gekkoService.setConfig(config);
    const result = await gekkoService.testConnection();
    
    if (result.success) {
      setTestStatus('success');
      setIsOnline(true);
    } else {
      setTestStatus('error');
      setIsOnline(false);
    }
    setTestMessage(result.message);
  };

  const addRoom = () => {
    const newRoom: RoomDefinition = { id: `item${config.rooms.length}`, name: 'Neuer Raum', enabled: true };
    setConfig({ ...config, rooms: [...config.rooms, newRoom] });
  };

  const discoverRooms = async () => {
    setIsDiscovering(true);
    setDebugLog("Lade Daten...");
    try {
      gekkoService.setConfig(config);
      const result = await gekkoService.discoverRooms();
      let fullDebug = `--- LOG ---\n${result.debugInfo}\n`;
      if (result.error) fullDebug += `FEHLER: ${result.error}\n`;
      if (result.rawData) fullDebug += `\n--- API ANTWORT ---\n${JSON.stringify(result.rawData, null, 2)}`;
      setDebugLog(fullDebug);
      if (result.rooms.length > 0) setConfig(prev => ({ ...prev, rooms: result.rooms }));
    } catch (e: any) {
      setDebugLog(`KRITISCHER FEHLER: ${e.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const removeRoom = (index: number) => setConfig({ ...config, rooms: config.rooms.filter((_, i) => i !== index) });
  const updateRoom = (index: number, updates: Partial<RoomDefinition>) => setConfig({ ...config, rooms: config.rooms.map((r, i) => i === index ? { ...r, ...updates } : r) });
  const getRoomUrl = (roomId: string) => `${window.location.origin}${window.location.pathname}?room=${roomId}&access=true`;

  const handlePreview = (roomId: string) => {
    gekkoService.setConfig(config);
    onPreviewRoom(roomId);
  };

  const exportZip = async () => {
    const zip = new JSZip();
    for (const room of config.rooms.filter(r => r.enabled)) {
      const canvas = document.getElementById(`qr-${room.id}`) as HTMLCanvasElement;
      if (canvas) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
        if (blob) zip.file(`${room.name.replace(/\s+/g, '_')}.png`, blob);
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, "TEKKO_QR_Codes.zip");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const MAGIC_COMMAND = `apt update && apt install nginx -y && npm install -g pm2 && chown -R www-data:www-data /var/www/html && pm2 start npx --name "proxy" -- cors-anywhere 0.0.0.0:8080 && pm2 save && pm2 startup`;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden text-slate-800 touch-none">
      <div className="bg-[#00828c] text-white p-4 flex items-center justify-between shadow-lg shrink-0">
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

      <div className="flex bg-slate-100 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0">
        <button onClick={() => setActiveTab('api')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'api' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><Settings size={14} className="inline mr-2" /> API</button>
        <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'rooms' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><Eye size={14} className="inline mr-2" /> Räume</button>
        <button onClick={() => setActiveTab('export')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'export' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><QrIcon size={14} className="inline mr-2" /> QR Export</button>
        <button onClick={() => setActiveTab('deploy')} className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'deploy' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:text-slate-700'}`}><Server size={14} className="inline mr-2" /> Hosting</button>
      </div>

      <div className="flex-1 scrollable p-6 bg-slate-50">
        {activeTab === 'deploy' && (
          <div className="max-w-2xl mx-auto space-y-8 pb-12">
            
            {/* Step 0: The "I want it to work now" command */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-500 p-2 rounded-lg text-black"><Zap size={20} fill="currentColor" /></div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">Das "Alles-Fixen" Kommando</h3>
                  <p className="text-[10px] text-slate-400">Installiert Nginx, PM2, setzt Rechte und startet den Proxy automatisch.</p>
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded-xl font-mono text-[11px] text-green-400 border border-green-500/20 relative group overflow-hidden">
                <code className="block break-all leading-relaxed pr-8">{MAGIC_COMMAND}</code>
                <button 
                  onClick={() => copyToClipboard(MAGIC_COMMAND, 'magic')} 
                  className="absolute right-3 top-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                  {copiedId === 'magic' ? <Check size={16} className="text-green-400" /> : <Copy size={16}/>}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] px-1">Checkliste für den Erfolg</h4>
              
              <div className="grid gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 flex gap-4 shadow-sm hover:border-[#00828c] transition-colors">
                  <div className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-[#00828c]">1</div>
                  <div className="text-xs">
                    <p className="font-bold mb-1 uppercase tracking-tight">Dateien hochladen</p>
                    <p className="text-slate-500 leading-relaxed">Kopiere alle Dateien deiner App (index.html, etc.) nach <code className="bg-slate-50 px-1 border rounded text-red-500">/var/www/html/</code>.</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 flex gap-4 shadow-sm hover:border-[#00828c] transition-colors">
                  <div className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-[#00828c]">2</div>
                  <div className="text-xs">
                    <p className="font-bold mb-1 uppercase tracking-tight">Proxy erreichbar machen</p>
                    <p className="text-slate-500 leading-relaxed">Im Tab <strong className="text-slate-700">API</strong> muss als Proxy-URL deine eigene IP stehen, z.B.: <br/><code className="bg-slate-50 px-1 border rounded text-blue-500">http://{config.ip || 'DEINE-IP'}:8080/</code></p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 flex gap-4 shadow-sm hover:border-[#00828c] transition-colors">
                  <div className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-[#00828c]">3</div>
                  <div className="text-xs">
                    <p className="font-bold mb-1 uppercase tracking-tight">Nginx Rechte</p>
                    <p className="text-slate-500 leading-relaxed">Falls du im Browser nur "Welcome to Nginx" siehst, lösche die alte index-Datei: <br/><code className="bg-slate-50 px-1 border rounded">rm /var/www/html/index.nginx-debian.html</code></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex gap-5">
              <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                <HelpCircle size={24} />
              </div>
              <div className="text-xs text-blue-900 space-y-2">
                <p className="font-bold uppercase tracking-wider text-[10px]">Noch Probleme?</p>
                <p className="leading-relaxed opacity-80">Wenn der Browser die Dateien nicht lädt (403 Forbidden), hast du ein Rechte-Problem. Der Befehl oben (Magic Command) fixt das automatisch mit <code>chown</code>.</p>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6 pb-12">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`p-3 rounded border text-xs font-bold uppercase ${config.apiMode === 'local' ? 'bg-[#00828c] text-white' : 'bg-slate-50'}`}>Lokal</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`p-3 rounded border text-xs font-bold uppercase ${config.apiMode === 'cloud' ? 'bg-[#00828c] text-white' : 'bg-slate-50'}`}>Cloud</button>
              </div>

              {config.apiMode === 'local' ? (
                <input type="text" className="admin-input" placeholder="IP Adresse (z.B. 192.168.1.50)" value={config.ip} onChange={e => setConfig({...config, ip: e.target.value})} />
              ) : (
                <input type="text" className="admin-input" placeholder="myGEKKO Live ID" value={config.gekkoId} onChange={e => setConfig({...config, gekkoId: e.target.value})} />
              )}

              <input type="text" className="admin-input" placeholder="Benutzername" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
              <input type="password" placeholder="Passwort / Key" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />

              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <label className="admin-label mt-0">Proxy URL (CORS Bypass)</label>
                <input type="text" placeholder="http://[IP]:8080/" className="admin-input mb-3" value={config.corsProxy || ''} onChange={e => setConfig({...config, corsProxy: e.target.value})} />
                <button onClick={useDefaultProxy} className="w-full py-2 bg-white border rounded text-[10px] font-bold uppercase shadow-sm">Online-Demoproxy</button>
              </div>

              <button onClick={performConnectionTest} className="w-full py-3 bg-slate-800 text-white rounded text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all">
                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={14} /> : null}
                Verbindung Testen
              </button>
              
              {testMessage && (
                <div className={`p-3 rounded text-[10px] flex items-start gap-2 ${testStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {testStatus === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                  <div>
                    <p className="font-bold">{testStatus === 'success' ? 'Erfolg' : 'Fehler'}</p>
                    <p>{testMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="max-w-2xl mx-auto space-y-4 pb-10">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold uppercase text-slate-400">Gefundene Räume ({config.rooms.length})</h3>
              <div className="flex gap-2">
                <button 
                  onClick={discoverRooms} 
                  disabled={isDiscovering}
                  className="bg-slate-600 text-white px-3 py-1.5 rounded text-[10px] flex items-center gap-2 uppercase font-bold disabled:opacity-50"
                >
                  {isDiscovering ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                  Auto-Import
                </button>
                <button onClick={addRoom} className="bg-[#00828c] text-white px-3 py-1.5 rounded text-[10px] flex items-center gap-2 uppercase font-bold"><Plus size={12} /> Neu</button>
              </div>
            </div>

            {debugLog && (
              <div className="bg-slate-900 rounded-lg p-4 mb-6 shadow-2xl border border-slate-700 relative group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-bold uppercase tracking-widest">
                    <Bug size={14} /> Debug
                  </div>
                  <button onClick={() => setDebugLog(null)} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
                </div>
                <pre className="text-green-400 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-64 leading-relaxed">
                  {debugLog}
                </pre>
              </div>
            )}
            
            <div className="grid gap-3">
              {config.rooms.map((room, idx) => (
                <div key={`${room.id}-${idx}`} className="bg-white p-3 border border-slate-200 rounded-lg flex items-center gap-4 group hover:border-[#00828c] transition-all">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      className="font-bold text-slate-800 w-full mb-0.5 focus:outline-none bg-transparent" 
                      value={room.name} 
                      onChange={e => updateRoom(idx, { name: e.target.value })} 
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter">ID: {room.id}</span>
                      {room.category && <span className="text-[9px] bg-[#00828c]/10 text-[#00828c] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">{room.category}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handlePreview(room.id)}
                      className="p-2 text-[#00828c] hover:bg-[#00828c]/10 rounded-full transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => removeRoom(idx)} 
                      className="text-red-400 p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-2xl mx-auto pb-10 text-center">
            <button onClick={exportZip} className="w-full bg-[#535353] text-white py-3 rounded text-xs mb-6 font-bold shadow-md hover:bg-slate-700">ALLES ALS .ZIP EXPORTIEREN</button>
            <div className="grid grid-cols-2 gap-4">
              {config.rooms.filter(r => r.enabled).map(room => (
                <div key={room.id} className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
                  <span className="font-bold text-[11px] mb-2 truncate w-full">{room.name}</span>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <QRCodeCanvas id={`qr-${room.id}`} value={getRoomUrl(room.id)} size={120} level="H" includeMargin={true} />
                  </div>
                  <span className="text-[8px] text-slate-300 mt-2 uppercase tracking-widest font-mono">{room.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
        <button onClick={onClose} className="px-6 py-2 text-xs font-semibold uppercase text-slate-500 hover:text-slate-800">Schließen</button>
        <button onClick={handleSave} className="px-8 py-2 bg-[#00828c] text-white rounded text-xs font-semibold uppercase shadow-md hover:bg-[#007078] transition-all">Speichern</button>
      </div>
    </div>
  );
};

export default AdminPanel;
