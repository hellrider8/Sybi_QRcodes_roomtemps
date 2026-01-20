
// Added React import to fix namespace error
import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Settings, Shield, RefreshCw, Globe, Wifi, Eye, AlertCircle, CheckCircle2, Terminal, Copy, Server, Activity } from 'lucide-react';
import { gekkoService } from '../services/gekkoService';
import { RoomDefinition } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

interface AdminPanelProps {
  onClose: () => void;
  onPreviewRoom: (roomId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onPreviewRoom }) => {
  const [config, setConfig] = useState(gekkoService.getConfig());
  const [activeTab, setActiveTab] = useState<'api' | 'rooms' | 'export' | 'hosting'>('api');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, msg?: string}>({});

  const handleSave = () => {
    gekkoService.setConfig(config);
    alert("Einstellungen wurden gespeichert.");
  };

  const testConnection = async () => {
    setIsTesting(true);
    gekkoService.setConfig(config);
    const res = await gekkoService.testConnection();
    setTestResult({ success: res.success, msg: res.message });
    setIsTesting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kopiert!");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col text-slate-800">
      <div className="bg-[#00828c] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Shield size={20} />
          <h2 className="text-lg font-bold uppercase tracking-tight">System Backend</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={24} /></button>
      </div>

      <div className="flex bg-slate-100 border-b overflow-x-auto">
        <button onClick={() => setActiveTab('api')} className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'api' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500'}`}>Verbindung</button>
        <button onClick={() => setActiveTab('rooms')} className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'rooms' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500'}`}>Räume</button>
        <button onClick={() => setActiveTab('hosting')} className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'hosting' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500'}`}>Linux/Proxy</button>
        <button onClick={() => setActiveTab('export')} className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'export' ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500'}`}>QR-Export</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-4 rounded border shadow-sm flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-[#00828c]">Modus</span>
                <span className="text-sm font-medium">{config.useMock ? 'Simulation (Demo)' : 'Echtzeit (Live)'}</span>
              </div>
              <button onClick={() => setConfig({...config, useMock: !config.useMock})} className={`w-12 h-6 rounded-full relative transition-colors ${config.useMock ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.useMock ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="bg-white p-6 rounded border shadow-sm space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`flex-1 py-2 rounded border text-[10px] font-bold ${config.apiMode === 'local' ? 'bg-[#00828c] text-white' : 'bg-slate-50'}`}>LOKAL (IP)</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`flex-1 py-2 rounded border text-[10px] font-bold ${config.apiMode === 'cloud' ? 'bg-[#00828c] text-white' : 'bg-slate-50'}`}>CLOUD</button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">{config.apiMode === 'local' ? 'Gekko IP Adresse' : 'Live-ID'}</label>
                <input type="text" placeholder={config.apiMode === 'local' ? "z.B. 192.168.1.5" : "79Y8-..."} className="admin-input" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Benutzer</label>
                  <input type="text" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Passwort / Key</label>
                  <input type="password"  className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 flex items-center gap-2">
                  <Globe size={10}/> Proxy URL (aus Linux-Container)
                </label>
                <input type="text" placeholder="http://192.168.x.x:8080" className="admin-input border-[#00828c]/30" value={config.corsProxy} onChange={e => setConfig({...config, corsProxy: e.target.value})} />
                <p className="text-[9px] text-slate-400 mt-1 italic uppercase">Zwingend erforderlich für lokale IP-Steuerung im Browser.</p>
              </div>

              <button onClick={testConnection} disabled={isTesting} className="w-full py-3 bg-slate-800 text-white rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                {isTesting ? <RefreshCw className="animate-spin" size={14}/> : <Wifi size={14}/>}
                Verbindung Testen
              </button>

              {testResult.msg && (
                <div className={`p-3 rounded text-[10px] font-bold flex items-center gap-2 border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {testResult.success ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hosting' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Terminal size={20}/></div>
                <div>
                  <h3 className="font-bold text-sm uppercase">Linux Container Setup</h3>
                  <p className="text-[10px] text-slate-400 uppercase">Installation des CORS-Proxys</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-slate-600">1. Node.js & NPM installieren:</p>
                  <div className="bg-slate-900 text-green-400 p-3 rounded font-mono text-[11px] flex justify-between items-center group">
                    <span>apt update && apt install nodejs npm -y</span>
                    <button onClick={() => copyToClipboard('apt update && apt install nodejs npm -y')} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"><Copy size={12}/></button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-slate-600">2. Proxy installieren:</p>
                  <div className="bg-slate-900 text-green-400 p-3 rounded font-mono text-[11px] flex justify-between items-center group">
                    <span>npm install -g cors-anywhere</span>
                    <button onClick={() => copyToClipboard('npm install -g cors-anywhere')} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"><Copy size={12}/></button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-slate-600">3. Proxy starten (Dauerbetrieb):</p>
                  <div className="bg-slate-900 text-green-400 p-3 rounded font-mono text-[11px] flex justify-between items-center group">
                    <span>cors-anywhere 0.0.0.0:8080</span>
                    <button onClick={() => copyToClipboard('cors-anywhere 0.0.0.0:8080')} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"><Copy size={12}/></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#00828c]/5 border border-[#00828c]/20 p-6 rounded text-slate-700">
               <div className="flex items-center gap-3 mb-2 text-[#00828c]">
                 <Server size={18}/>
                 <h4 className="text-xs font-bold uppercase">Pro-Tipp: Autostart</h4>
               </div>
               <p className="text-[11px] leading-relaxed">
                 Nutze <b>pm2</b> im Container, damit der Proxy nach einem Neustart automatisch wieder läuft:
               </p>
               <div className="bg-slate-800 text-slate-300 p-3 rounded font-mono text-[10px] mt-3">
                 npm install -g pm2<br/>
                 pm2 start "cors-anywhere 0.0.0.0:8080" --name proxy<br/>
                 pm2 save
               </div>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="max-w-xl mx-auto space-y-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold uppercase text-slate-400">Raumliste ({config.rooms.length})</h3>
               <button onClick={() => setConfig({...config, rooms: [...config.rooms, {id: `item${config.rooms.length}`, name: 'Neuer Raum', enabled: true}]})} className="bg-[#00828c] text-white px-4 py-2 rounded text-[10px] font-bold shadow-sm">+ Hinzufügen</button>
             </div>
             {config.rooms.map((r, i) => (
               <div key={i} className="bg-white p-4 rounded border flex items-center justify-between shadow-sm hover:border-[#00828c]/30 transition-colors">
                 <input type="text" className="font-bold bg-transparent outline-none flex-1" value={r.name} onChange={e => setConfig({...config, rooms: config.rooms.map((rm, idx) => idx === i ? {...rm, name: e.target.value} : rm)})} />
                 <div className="flex gap-2">
                   <button onClick={() => onPreviewRoom(r.id)} className="p-2 text-[#00828c] hover:bg-slate-50 rounded"><Eye size={18}/></button>
                   <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
             {config.rooms.map(r => (
               <div key={r.id} className="bg-white p-4 border rounded flex flex-col items-center shadow-sm">
                 <span className="text-[10px] font-bold mb-3 uppercase text-slate-500">{r.name}</span>
                 <QRCodeCanvas value={`${window.location.origin}${window.location.pathname}?room=${r.id}&access=true`} size={120} />
                 <span className="text-[8px] mt-2 font-mono text-slate-300 uppercase">{r.id}</span>
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t flex justify-end gap-3 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onClick={onClose} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors">Schließen</button>
        <button onClick={handleSave} className="px-8 py-2 bg-[#00828c] text-white rounded text-xs font-bold uppercase shadow-lg hover:bg-[#006a72] transition-colors">Speichern</button>
      </div>
    </div>
  );
};

export default AdminPanel;