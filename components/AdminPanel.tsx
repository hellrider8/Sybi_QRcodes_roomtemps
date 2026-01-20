
import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Settings, Shield, RefreshCw, Globe, Wifi, Eye, AlertCircle, CheckCircle2, Terminal, Copy, Server, Activity, Search, Hash, QrCode as QrIcon, Lock, Clock, Download, FileArchive } from 'lucide-react';
import { gekkoService } from '../services/gekkoService.ts';
import { RoomDefinition } from '../types.ts';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';

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
  const [isExporting, setIsExporting] = useState(false);

  const handleSave = async () => {
    await gekkoService.setConfig(config);
    alert("Einstellungen wurden gespeichert.");
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
      alert("Kopieren fehlgeschlagen. Bitte Link manuell kopieren.");
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    gekkoService.setConfig(config);
    const res = await gekkoService.testConnection();
    setTestResult({ success: res.success, msg: res.message });
    setIsTesting(false);
  };

  const handleDiscover = async () => {
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

  const exportAllQrCodes = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const canvases = document.querySelectorAll('.qr-export-container canvas');
      
      if (canvases.length === 0) {
        alert("Bitte erst den Export-Tab öffnen, damit die Codes generiert werden.");
        setIsExporting(false);
        return;
      }

      canvases.forEach((canvas: any, index) => {
        const roomName = canvas.getAttribute('data-room-name') || `Raum_${index + 1}`;
        const imageData = canvas.toDataURL("image/png").split(',')[1];
        zip.file(`${roomName}.png`, imageData, {base64: true});
      });

      const content = await zip.generateAsync({type: "blob"});
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = "TEKKO_QR_Codes.zip";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Error:", error);
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

              <input type="text" placeholder={config.apiMode === 'local' ? "myGEKKO IP (z.B. 10.10.10.50)" : "Live-ID (z.B. GK-12345)"} className="admin-input" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Benutzer" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                <input type="password" placeholder="Passwort / Key" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
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
               <h3 className="text-sm font-bold uppercase text-slate-800">Gefundene Räume</h3>
               <div className="flex gap-2">
                 <button onClick={handleDiscover} disabled={isDiscovering} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2">
                   {isDiscovering ? <RefreshCw size={12} className="animate-spin"/> : <Search size={12}/>} Räume suchen
                 </button>
               </div>
             </div>

             {config.rooms.map((r, i) => (
               <div key={i} className="bg-white p-5 rounded-xl border shadow-sm group">
                 <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <span className="text-[10px] font-bold text-[#00828c] uppercase">Raum ID: {r.id}</span>
                    <div className="flex gap-2">
                      <button onClick={() => onPreviewRoom(r.id)} className="p-1.5 text-[#00828c] hover:bg-teal-50 rounded" title="Vorschau"><Eye size={18}/></button>
                      <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-2">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Anzeigename im Web-Interface</label>
                    <input type="text" className="admin-input" value={r.name} onChange={e => updateRoom(i, {name: e.target.value})} />
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase text-slate-800">QR-Code Katalog</h3>
              <button 
                onClick={exportAllQrCodes} 
                disabled={isExporting}
                className="bg-[#00828c] text-white px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 shadow-md hover:bg-[#006a72] transition-all disabled:opacity-50"
              >
                {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <FileArchive size={14} />} 
                Alle als ZIP exportieren
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {config.rooms.map(r => (
                 <div key={r.id} className="bg-white p-6 border rounded-2xl flex flex-col items-center shadow-sm">
                   <div className="w-full text-center mb-4 border-b pb-2">
                     <span className="text-xs font-bold uppercase text-[#00828c]">{r.name}</span>
                   </div>
                   <div className="p-4 bg-white rounded-xl border border-slate-100 mb-4 qr-export-container">
                     <QRCodeCanvas 
                        value={getQrUrl(r.id)} 
                        size={180} 
                        level="H" 
                        // Wir übergeben das Attribut direkt an das Canvas für den Export-Loop
                        includeMargin={true}
                        {...({"data-room-name": r.name} as any)}
                      />
                   </div>
                   <button 
                    onClick={() => copyToClipboard(getQrUrl(r.id))}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2"
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
               <h3 className="font-bold text-sm mb-4 uppercase flex items-center gap-2"><Lock size={16}/> Sicherheitsschlüssel</h3>
               <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                 Dieser Schlüssel muss auf dem Server und beim Token-Check identisch sein. 
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
                 >
                   <RefreshCw size={16}/>
                 </button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
               <h3 className="font-bold text-sm mb-4 uppercase flex items-center gap-2"><Clock size={16}/> Sitzungsdauer</h3>
               <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                 Dauer in Minuten, bis ein QR-Code erneut gescannt werden muss.
               </p>
               <div className="flex items-center gap-4">
                 <input 
                  type="number" 
                  className="admin-input w-24 text-center" 
                  value={config.sessionDurationMinutes} 
                  onChange={e => setConfig({...config, sessionDurationMinutes: parseInt(e.target.value) || 1})} 
                  min="1"
                  max="1440"
                 />
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Minuten</span>
               </div>
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
