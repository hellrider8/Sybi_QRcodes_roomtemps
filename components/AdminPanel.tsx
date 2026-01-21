
import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, X, Shield, RefreshCw, Globe, Wifi, CheckCircle2, AlertCircle, Copy, Search, Lock, Clock, Download, SlidersHorizontal } from 'lucide-react';
import { gekkoService } from '../services/gekkoService.ts';
import { RoomDefinition, GekkoConfig } from '../types.ts';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';

interface AdminPanelProps {
  onClose: () => void;
  onPreviewRoom: (roomId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onPreviewRoom }) => {
  const [config, setConfig] = useState<GekkoConfig>(gekkoService.getConfig());
  const [activeTab, setActiveTab] = useState<'api' | 'rooms' | 'export' | 'hosting'>('api');
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, msg?: string}>({});
  const [isExporting, setIsExporting] = useState(false);
  
  // Ref für den versteckten Export-Canvas (High-Res)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleSave = async () => {
    const validatedConfig = {
      ...config,
      minOffset: Number(config.minOffset),
      maxOffset: Number(config.maxOffset),
      stepSize: Number(config.stepSize),
      sessionDurationMinutes: Number(config.sessionDurationMinutes)
    };
    await gekkoService.setConfig(validatedConfig);
    alert("Einstellungen wurden permanent gespeichert.");
  };

  const copyToClipboard = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("Link erfolgreich kopiert!");
    } catch (err) {
      alert("Kopieren fehlgeschlagen.");
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    await gekkoService.setConfig(config);
    const res = await gekkoService.testConnection();
    setTestResult({ success: res.success, msg: res.message });
    setIsTesting(false);
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    await gekkoService.setConfig(config);
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

  const getQrUrl = (roomId: string) => {
    const baseUrl = window.location.protocol + "//" + window.location.host + "/";
    const token = gekkoService.generateToken(roomId);
    return `${baseUrl}?t=${token}`;
  };

  // Hilfsfunktion zum Generieren eines High-Res Bildes
  const generateHighResImageData = async (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      // QRCodeCanvas wird hier nicht direkt genutzt, wir nehmen ein Hilfselement oder lassen qrcode.react rendern
      // Da wir in React sind, nutzen wir eine temporäre Instanz
      resolve(""); // Platzhalter für die Logik unten im Export
    });
  };

  const exportAllQrCodes = async () => {
    if (config.rooms.length === 0) {
      alert("Keine Räume zum Exportieren vorhanden.");
      return;
    }
    
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      // Wir nutzen ein temporäres Canvas-Element für das High-Res Rendering (1024px)
      const exportSize = 1024;
      
      for (const room of config.rooms) {
        const url = getQrUrl(room.id);
        
        // Wir erzeugen ein verstecktes Canvas für jeden Raum im Export
        const tempContainer = document.createElement('div');
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);

        // Wir nutzen eine kleine Verzögerung um sicherzustellen, dass React den Canvas rendert
        // Oder wir zeichnen direkt auf einen Canvas falls möglich. 
        // Einfacher: Wir nutzen die vorhandenen Canvases aber rendern sie beim Klick neu in groß.
        
        // Da wir qrcode.react verwenden, ist es am einfachsten, die Daten-URL eines 
        // temporär erzeugten Canvas-Elements mit hoher Auflösung zu nehmen.
        
        const canvas = document.createElement('canvas');
        const QRCode = (await import('https://esm.sh/qrcode')).default; // Dynamischer Import für Export-Power
        
        await QRCode.toCanvas(canvas, url, {
          width: exportSize,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#00828c',
            light: '#ffffff'
          }
        });

        const imageData = canvas.toDataURL("image/png").split(',')[1];
        const fileName = `${room.name.replace(/[/\\?%*:|"<>]/g, '-')}.png`;
        zip.file(fileName, imageData, {base64: true});
        
        document.body.removeChild(tempContainer);
      }
      
      const content = await zip.generateAsync({type: "blob"});
      const downloadUrl = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `TEKKO_Export_HighRes_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export Fehler:", error);
      alert("Fehler beim Exportieren.");
    } finally {
      setIsExporting(false);
    }
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
          {id: 'export', label: 'QR-Codes'},
          {id: 'hosting', label: 'System & Sicherheit'}
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
                <span className="text-[10px] font-bold uppercase text-[#00828c]">Betriebsmodus</span>
                <span className="text-sm font-medium">{config.useMock ? 'Demo / Simulation' : 'Echtzeit-Betrieb'}</span>
              </div>
              <button onClick={() => setConfig({...config, useMock: !config.useMock})} className={`w-14 h-7 rounded-full relative transition-all ${config.useMock ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${config.useMock ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'local' ? 'bg-white text-[#00828c]' : 'text-slate-500'}`}>LOKAL (LAN)</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'cloud' ? 'bg-white text-[#00828c]' : 'text-slate-500'}`}>CLOUD (LiveID)</button>
              </div>

              {config.apiMode === 'cloud' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-slate-400 block ml-1">Cloud Provider</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => setConfig({...config, cloudProvider: 'gekko'})} 
                      className={`flex-1 py-2 rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-all ${config.cloudProvider === 'gekko' ? 'bg-[#00828c] text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      myGEKKO
                    </button>
                    <button 
                      onClick={() => setConfig({...config, cloudProvider: 'tekko'})} 
                      className={`flex-1 py-2 rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-all ${config.cloudProvider === 'tekko' ? 'bg-[#00828c] text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      TEKKO
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Globe size={14}/></span>
                  <input type="text" placeholder={config.apiMode === 'local' ? "IP (z.B. 10.10.10.50)" : "Live-ID / Gekko-ID"} className="admin-input pl-10" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Benutzer" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                  <input type="password" placeholder="Passwort / Key" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
                </div>
              </div>

              <button onClick={testConnection} disabled={isTesting} className="w-full py-3 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                {isTesting ? <RefreshCw className="animate-spin" size={14}/> : <Wifi size={14}/>} Verbindung testen
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
               <h3 className="text-sm font-bold uppercase text-slate-800">Räume</h3>
               <button onClick={handleDiscover} disabled={isDiscovering} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2">
                 {isDiscovering ? <RefreshCw size={12} className="animate-spin"/> : <Search size={12}/>} Suchen
               </button>
             </div>
             {config.rooms.map((r, i) => (
               <div key={i} className="bg-white p-5 rounded-xl border shadow-sm">
                 <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <span className="text-[10px] font-bold text-[#00828c]">ID: {r.id}</span>
                    <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="text-red-400"><Trash2 size={18}/></button>
                 </div>
                 <input type="text" className="admin-input" value={r.name} onChange={e => updateRoom(i, {name: e.target.value})} />
               </div>
             ))}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h3 className="text-sm font-bold uppercase mb-1">QR-Code Export</h3>
                <p className="text-[10px] text-slate-400">Exporte erfolgen in hoher Auflösung (1024px) für Druckzwecke.</p>
              </div>
              <button 
                onClick={exportAllQrCodes} 
                disabled={isExporting}
                className="bg-[#00828c] text-white px-8 py-3 rounded-lg text-[10px] font-bold uppercase shadow-lg hover:bg-[#006a72] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? <RefreshCw className="animate-spin" size={14}/> : <Download size={14}/>} 
                {isExporting ? 'Generiere ZIP...' : 'ZIP Export (High-Res)'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {config.rooms.map(r => (
                 <div key={r.id} className="bg-white p-6 border rounded-2xl flex flex-col items-center group transition-all hover:shadow-md">
                   <span className="text-[10px] font-bold mb-4 uppercase text-slate-400 group-hover:text-[#00828c]">{r.name}</span>
                   <div className="p-2 border rounded-lg bg-slate-50">
                    <QRCodeCanvas value={getQrUrl(r.id)} size={160} level="H" includeMargin={true} />
                   </div>
                   <button onClick={() => copyToClipboard(getQrUrl(r.id))} className="mt-4 text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 hover:text-[#00828c]"><Copy size={12}/> Link kopieren</button>
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {activeTab === 'hosting' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
               <h3 className="font-bold text-sm mb-4 uppercase flex items-center gap-2 text-[#00828c]"><SlidersHorizontal size={16}/> Regelungsparameter</h3>
               <div className="space-y-4">
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Anpassungsbereich (Min / Max)</label>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="relative">
                       <span className="absolute left-3 top-2.5 text-slate-400 text-xs">MIN</span>
                       <input type="number" step="0.1" className="admin-input pl-12 text-center" value={config.minOffset} onChange={e => setConfig({...config, minOffset: Number(e.target.value)})} />
                     </div>
                     <div className="relative">
                       <span className="absolute left-3 top-2.5 text-slate-400 text-xs">MAX</span>
                       <input type="number" step="0.1" className="admin-input pl-12 text-center" value={config.maxOffset} onChange={e => setConfig({...config, maxOffset: Number(e.target.value)})} />
                     </div>
                   </div>
                 </div>
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Schrittweite</label>
                   <input type="number" step="0.1" className="admin-input text-center" value={config.stepSize} onChange={e => setConfig({...config, stepSize: Number(e.target.value)})} />
                 </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
               <h3 className="font-bold text-sm mb-4 uppercase flex items-center gap-2"><Lock size={16}/> Sicherheitsschlüssel (Token-Verschlüsselung)</h3>
               <p className="text-[9px] text-slate-400 mb-3">Änderungen hier entwerten alle bisherigen QR-Codes sofort.</p>
               <input type="text" className="admin-input font-mono text-xs" value={config.secretKey} onChange={e => setConfig({...config, secretKey: e.target.value})} />
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
               <h3 className="font-bold text-sm mb-4 uppercase flex items-center gap-2"><Clock size={16}/> Sitzungsdauer (Minuten)</h3>
               <input type="number" className="admin-input w-24 text-center font-bold" value={config.sessionDurationMinutes} onChange={e => setConfig({...config, sessionDurationMinutes: Number(e.target.value)})} min="1" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t flex justify-end gap-3 bg-white">
        <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase">Abbrechen</button>
        <button onClick={handleSave} className="px-10 py-2.5 bg-[#00828c] text-white rounded-lg text-xs font-bold uppercase shadow-lg hover:bg-[#006a72] transition-all">Speichern</button>
      </div>
    </div>
  );
};

export default AdminPanel;
