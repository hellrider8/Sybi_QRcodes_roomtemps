
import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Settings, Shield, RefreshCw, Globe, Wifi, Eye, AlertCircle, CheckCircle2, Terminal, Copy, Server, Activity, Search, Hash, QrCode as QrIcon, Lock } from 'lucide-react';
import { gekkoService } from '../services/gekkoService.ts';
import { RoomDefinition } from '../types.ts';
import { QRCodeCanvas } from 'qrcode.react';

interface AdminPanelProps {
  onClose: () => void;
  onPreviewRoom: (roomId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onPreviewRoom }) => {
  const [config, setConfig] = useState(gekkoService.getConfig());
  const [activeTab, setActiveTab] = useState<'api' | 'rooms' | 'export' | 'hosting'>('api');
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
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

  const handleDiscover = async () => {
    if (!config.ip && config.apiMode === 'local') {
      alert("Bitte zuerst IP-Adresse eingeben.");
      return;
    }
    if (!config.gekkoId && config.apiMode === 'cloud') {
      alert("Bitte zuerst Live-ID eingeben.");
      return;
    }

    setIsDiscovering(true);
    gekkoService.setConfig(config);
    try {
      const result = await gekkoService.discoverRooms();
      if (result.rooms && result.rooms.length > 0) {
        const existingIds = new Set(config.rooms.map(r => r.id));
        const newRooms = result.rooms.filter(r => !existingIds.has(r.id));
        
        if (newRooms.length === 0) {
          alert("Keine neuen Räume gefunden.");
        } else {
          const updatedRooms = [...config.rooms, ...newRooms];
          setConfig({ ...config, rooms: updatedRooms });
          alert(`${newRooms.length} neue Räume gefunden.`);
        }
      } else if (result.error) {
        alert("Fehler: " + result.error);
      }
    } catch (e) {
      alert("Suche fehlgeschlagen.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const updateRoom = (index: number, updates: Partial<RoomDefinition>) => {
    const newRooms = [...config.rooms];
    newRooms[index] = { ...newRooms[index], ...updates };
    setConfig({ ...config, rooms: newRooms });
  };

  // Erzeugt einen Magic-Link mit verschlüsseltem Token
  const getQrUrl = (roomId: string) => {
    // Sicherstellen dass baseUrl IMMER die Root ist
    const baseUrl = window.location.origin + "/";
    const token = gekkoService.generateToken(roomId);
    return `${baseUrl}?t=${token}`;
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

      <div className="flex bg-slate-100 border-b overflow-x-auto scrollbar-hide">
        {[
          {id: 'api', label: 'Verbindung'},
          {id: 'rooms', label: 'Räume'},
          {id: 'export', label: 'QR-Export'},
          {id: 'hosting', label: 'Sicherheit'}
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-[#00828c]">Modus</span>
                <span className="text-sm font-medium">{config.useMock ? 'Demo-Modus' : 'Echtzeit-Betrieb'}</span>
              </div>
              <button onClick={() => setConfig({...config, useMock: !config.useMock})} className={`w-14 h-7 rounded-full relative transition-all ${config.useMock ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${config.useMock ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'local' ? 'bg-white text-[#00828c]' : 'text-slate-500'}`}>LOKAL</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'cloud' ? 'bg-white text-[#00828c]' : 'text-slate-500'}`}>CLOUD</button>
              </div>

              <input type="text" placeholder={config.apiMode === 'local' ? "Gekko IP" : "Live-ID"} className="admin-input" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="User" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                <input type="password" placeholder="Passwort/Key" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
              </div>

              <button onClick={testConnection} disabled={isTesting} className="w-full py-3 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                {isTesting ? <RefreshCw className="animate-spin" size={14}/> : <Wifi size={14}/>} Testen
              </button>

              {testResult.msg && (
                <div className={`p-4 rounded-lg text-[10px] font-bold flex items-center gap-2 border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {testResult.success ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>} {testResult.msg}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="max-w-2xl mx-auto space-y-4 pb-20">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-bold uppercase text-slate-800">Konfigurierte Räume</h3>
               <div className="flex gap-2">
                 <button onClick={handleDiscover} disabled={isDiscovering} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2">
                   {isDiscovering ? <RefreshCw size={12} className="animate-spin"/> : <Search size={12}/>} Auto-Suche
                 </button>
                 <button onClick={() => setConfig({...config, rooms: [...config.rooms, {id: `item${config.rooms.length}`, name: 'Neuer Raum', enabled: true}]})} className="bg-[#00828c] text-white px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2">
                   <Plus size={12}/> Hinzufügen
                 </button>
               </div>
             </div>

             {config.rooms.map((r, i) => (
               <div key={i} className="bg-white p-5 rounded-xl border shadow-sm group">
                 <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <span className="text-[10px] font-bold text-[#00828c] uppercase">Raum #{i+1}</span>
                    <div className="flex gap-2">
                      <button onClick={() => onPreviewRoom(r.id)} className="p-1.5 text-[#00828c] hover:bg-teal-50 rounded"><Eye size={18}/></button>
                      <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-400">Anzeigename</label>
                      <input type="text" className="admin-input" value={r.name} onChange={e => updateRoom(i, {name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-400">Gekko ID</label>
                      <input type="text" className="admin-input font-mono text-[#00828c]" value={r.id} onChange={e => updateRoom(i, {id: e.target.value})} />
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 flex items-start gap-3">
              <Lock size={20} className="text-amber-600 mt-1 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">Sicherheits-Modus Aktiv</p>
                <p className="text-[10px] text-amber-700 leading-relaxed mt-1">
                  Die QR-Codes enthalten jetzt verschlüsselte Tokens. Sobald ein Handy den Code scannt, wird die Adresse im Browser sofort bereinigt, damit der Link nicht einfach weitergegeben werden kann.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {config.rooms.map(r => (
                 <div key={r.id} className="bg-white p-6 border rounded-2xl flex flex-col items-center shadow-sm">
                   <div className="w-full flex justify-between mb-4 border-b pb-2">
                     <span className="text-[10px] font-bold uppercase text-slate-500 truncate">{r.name}</span>
                     <span className="text-[8px] font-mono text-slate-300 uppercase">{r.id}</span>
                   </div>
                   <div className="p-4 bg-white rounded-xl border border-slate-50 mb-4">
                     <QRCodeCanvas value={getQrUrl(r.id)} size={180} level="H" />
                   </div>
                   <p className="text-[8px] text-slate-300 break-all text-center mb-4 font-mono leading-tight px-2">
                     {getQrUrl(r.id).substring(0, 40)}...
                   </p>
                   <button 
                    onClick={() => { navigator.clipboard.writeText(getQrUrl(r.id)); alert("Sicherer Link kopiert!"); }}
                    className="w-full py-2.5 bg-slate-50 border rounded-lg text-[9px] font-bold uppercase text-slate-600 flex items-center justify-center gap-2"
                   >
                     <Copy size={12}/> Link kopieren
                   </button>
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {activeTab === 'hosting' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
               <h3 className="font-bold text-sm mb-4 uppercase flex items-center gap-2"><Lock size={16}/> System-Schlüssel</h3>
               <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                 Dieser Schlüssel wird zur Generierung der QR-Tokens verwendet. Wenn du ihn änderst, werden alle alten QR-Codes sofort ungültig.
               </p>
               <div className="flex gap-2">
                 <input 
                  type="text" 
                  className="admin-input font-mono text-xs" 
                  value={config.secretKey} 
                  onChange={e => setConfig({...config, secretKey: e.target.value})} 
                 />
                 <button 
                  onClick={() => setConfig({...config, secretKey: 'sybtec-' + Math.random().toString(36).substring(7)})}
                  className="p-2 bg-slate-100 rounded text-slate-500 hover:bg-slate-200"
                  title="Neu generieren"
                 >
                   <RefreshCw size={16}/>
                 </button>
               </div>
            </div>
            
            <div className="bg-slate-900 text-slate-400 p-8 rounded-2xl text-center">
               <Server className="mx-auto text-slate-700 mb-4" size={48}/>
               <h3 className="font-bold text-xs text-white uppercase mb-2">Proxy Server Status</h3>
               <p className="text-[9px] uppercase tracking-widest text-teal-500 font-bold">Aktiv & Sicher</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t flex justify-end gap-3 bg-white">
        <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase">Schließen</button>
        <button onClick={handleSave} className="px-10 py-2.5 bg-[#00828c] text-white rounded-lg text-xs font-bold uppercase shadow-lg hover:bg-[#006a72] transition-all">Speichern</button>
      </div>
    </div>
  );
};

export default AdminPanel;
