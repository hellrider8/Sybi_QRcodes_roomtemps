
import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Settings, Shield, RefreshCw, Globe, Wifi, Eye, AlertCircle, CheckCircle2, Terminal, Copy, Server, Activity, Search, Hash, QrCode as QrIcon } from 'lucide-react';
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
        alert("Import-Fehler: " + result.error);
      } else {
        alert("Keine Räume gefunden. Prüfe die Gekko API-Berechtigungen.");
      }
    } catch (e) {
      alert("Netzwerkfehler bei der Suche.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const updateRoom = (index: number, updates: Partial<RoomDefinition>) => {
    const newRooms = [...config.rooms];
    newRooms[index] = { ...newRooms[index], ...updates };
    setConfig({ ...config, rooms: newRooms });
  };

  // Erzeugt den sauberen Link für den QR Code
  const getQrUrl = (roomId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('access', 'true');
    return url.toString();
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
          {id: 'rooms', label: 'Raumliste'},
          {id: 'export', label: 'QR-Codes'},
          {id: 'hosting', label: 'System'}
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-[#00828c] mb-0.5">Betriebsmodus</span>
                <span className="text-sm font-medium">{config.useMock ? 'Simulation (Demo)' : 'Echtzeit (Live)'}</span>
              </div>
              <button onClick={() => setConfig({...config, useMock: !config.useMock})} className={`w-14 h-7 rounded-full relative transition-all duration-300 ${config.useMock ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${config.useMock ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`flex-1 py-2 rounded-md text-[10px] font-bold transition-all ${config.apiMode === 'local' ? 'bg-white shadow-sm text-[#00828c]' : 'text-slate-500'}`}>LOKAL (IP)</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`flex-1 py-2 rounded-md text-[10px] font-bold transition-all ${config.apiMode === 'cloud' ? 'bg-white shadow-sm text-[#00828c]' : 'text-slate-500'}`}>CLOUD (MY-GEKKO)</button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">{config.apiMode === 'local' ? 'Gekko IP Adresse' : 'Live-ID'}</label>
                <input type="text" placeholder={config.apiMode === 'local' ? "z.B. 192.168.1.50" : "79Y8-..."} className="admin-input" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">API Benutzer</label>
                  <input type="text" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Key / Passwort</label>
                  <input type="password" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
                </div>
              </div>

              <button onClick={testConnection} disabled={isTesting} className="w-full py-3.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all">
                {isTesting ? <RefreshCw className="animate-spin" size={16}/> : <Wifi size={16}/>}
                Verbindung prüfen
              </button>

              {testResult.msg && (
                <div className={`p-4 rounded-lg text-[11px] font-medium flex items-center gap-3 border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} animate-in fade-in slide-in-from-top-2`}>
                  {testResult.success ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="max-w-2xl mx-auto space-y-4 pb-20">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
               <div>
                 <h3 className="text-sm font-bold uppercase text-slate-800">Raumliste</h3>
                 <p className="text-[10px] text-slate-400 uppercase tracking-wider">{config.rooms.length} Räume konfiguriert</p>
               </div>
               <div className="flex gap-2 w-full sm:w-auto">
                 <button onClick={handleDiscover} disabled={isDiscovering} className="flex-1 sm:flex-none bg-slate-800 text-white px-5 py-2.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                   {isDiscovering ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
                   Auto-Import
                 </button>
                 <button onClick={() => setConfig({...config, rooms: [...config.rooms, {id: `item${config.rooms.length}`, name: 'Neuer Raum', enabled: true}]})} className="flex-1 sm:flex-none bg-[#00828c] text-white px-5 py-2.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-[#006a72] transition-colors">
                   <Plus size={14}/>
                   Raum hinzufügen
                 </button>
               </div>
             </div>

             <div className="grid grid-cols-1 gap-4">
               {config.rooms.map((r, i) => (
                 <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm group hover:border-[#00828c]/50 transition-all">
                   <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">#{i+1}</div>
                        <span className="text-[10px] font-bold text-[#00828c] uppercase tracking-widest">Konfiguration</span>
                      </div>
                      <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onPreviewRoom(r.id)} className="p-2 text-[#00828c] hover:bg-teal-50 rounded-lg transition-colors" title="Vorschau"><Eye size={18}/></button>
                        <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Löschen"><Trash2 size={18}/></button>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Anzeigename</label>
                        <input type="text" className="admin-input" placeholder="z.B. Wohnzimmer" value={r.name} onChange={e => updateRoom(i, {name: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-slate-400 ml-1 flex items-center gap-1">Gekko ITEM-ID <AlertCircle size={8} title="Technischer Name im Gekko"/></label>
                        <input type="text" className="admin-input font-mono text-xs text-[#00828c]" placeholder="item0" value={r.id} onChange={e => updateRoom(i, {id: e.target.value})} />
                      </div>
                   </div>
                 </div>
               ))}
             </div>

             {config.rooms.length === 0 && (
               <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
                 <Activity size={48} className="mx-auto text-slate-300 mb-4" />
                 <p className="text-sm font-medium text-slate-400">Keine Räume vorhanden.<br/>Klicke auf <b>Auto-Import</b> um zu starten.</p>
               </div>
             )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {config.rooms.map(r => (
                 <div key={r.id} className="bg-white p-6 border border-slate-200 rounded-2xl flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
                   <div className="w-full flex justify-between items-center mb-4">
                     <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter truncate max-w-[120px]">{r.name}</span>
                     <span className="text-[8px] px-2 py-0.5 bg-slate-100 rounded font-mono text-slate-400 uppercase">{r.id}</span>
                   </div>
                   
                   <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-inner mb-4">
                     <QRCodeCanvas 
                        value={getQrUrl(r.id)} 
                        size={160} 
                        level="M" 
                        includeMargin={false}
                        imageSettings={{
                          src: "https://www.sybtec.de/favicon.ico",
                          x: undefined,
                          y: undefined,
                          height: 24,
                          width: 24,
                          excavate: true,
                        }}
                     />
                   </div>
                   
                   <p className="text-[8px] text-slate-300 text-center leading-tight mb-4 break-all px-2 font-mono">
                     {getQrUrl(r.id)}
                   </p>
                   
                   <button 
                    onClick={() => { navigator.clipboard.writeText(getQrUrl(r.id)); alert("Link kopiert!"); }}
                    className="w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2"
                   >
                     <Copy size={12}/> Link Kopieren
                   </button>
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {activeTab === 'hosting' && (
          <div className="max-w-md mx-auto space-y-4">
             <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-teal-50 text-[#00828c] rounded-full flex items-center justify-center mb-6">
                  <Server size={32}/>
                </div>
                <h3 className="font-bold text-lg mb-2">System Status</h3>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Proxy Aktiv</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                  Der integrierte Node.js Proxy übernimmt die Kommunikation mit dem Gekko. Alle Anfragen werden über <code>/api/proxy</code> geschleust, um Browser-Sicherheitsrichtlinien (CORS) einzuhalten.
                </p>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t flex justify-end gap-3 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Schließen</button>
        <button onClick={handleSave} className="px-10 py-2.5 bg-[#00828c] text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-teal-700/20 hover:bg-[#006a72] active:scale-95 transition-all">Speichern</button>
      </div>
    </div>
  );
};

export default AdminPanel;
