
import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, X, Shield, RefreshCw, Globe, Wifi, CheckCircle2, AlertCircle, Copy, Search, Lock, Clock, Download, SlidersHorizontal, Info, TriangleAlert } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [hasChangedMode, setHasChangedMode] = useState(false);

  useEffect(() => {
    gekkoService.updateInternalConfig(config);
  }, [config]);

  const handleSave = async () => {
    if (!config.useMock && config.rooms.length === 0) {
      if (!confirm("Du hast keine echten Räume geladen. Fortfahren?")) return;
    }
    
    setIsSaving(true);
    try {
      const validatedConfig = {
        ...config,
        minOffset: Number(config.minOffset),
        maxOffset: Number(config.maxOffset),
        stepSize: Number(config.stepSize),
        sessionDurationMinutes: Number(config.sessionDurationMinutes)
      };
      await gekkoService.setConfig(validatedConfig);
      const updated = gekkoService.getConfig();
      setConfig(updated);
      setHasChangedMode(false);
      alert("Einstellungen permanent gespeichert. QR-Codes sind nun gültig.");
    } catch (e) {
      alert("Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("Link kopiert!");
    } catch (err) {
      alert("Fehler.");
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult({});
    const res = await gekkoService.testConnection();
    setTestResult({ success: res.success, msg: res.message });
    setIsTesting(false);
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const result = await gekkoService.discoverRooms();
      if (result.rooms && result.rooms.length > 0) {
        // Filtere doppelte oder Demo-Räume aus, wenn wir im Echt-Modus sind
        const filtered = result.rooms.filter(r => r.category !== 'DEMO' || config.useMock);
        setConfig({ ...config, rooms: filtered });
        alert(`${filtered.length} Räume erfolgreich eingelesen.`);
      } else {
        alert(`Keine Räume gefunden.\n\nDiagnose: ${result.debugInfo}\nFehler: ${result.error || 'Keiner'}`);
      }
    } catch (e: any) {
      alert("Schwerwiegender Fehler bei der Suche: " + e.message);
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
    if (config.rooms.length === 0) {
      alert("Keine Räume vorhanden.");
      return;
    }
    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (const room of config.rooms) {
        const url = getQrUrl(room.id);
        const canvas = document.createElement('canvas');
        const QRCode = (await import('https://esm.sh/qrcode')).default;
        await QRCode.toCanvas(canvas, url, {
          width: 1024, margin: 2, errorCorrectionLevel: 'H',
          color: { dark: '#00828c', light: '#ffffff' }
        });
        const imageData = canvas.toDataURL("image/png").split(',')[1];
        zip.file(`${room.name.replace(/[/\\?%*:|"<>]/g, '-')}.png`, imageData, {base64: true});
      }
      const content = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(content);
      link.download = `TEKKO_Export_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
    } catch (error) {
      alert("Fehler beim Export.");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleMock = () => {
    const newMockState = !config.useMock;
    setConfig({...config, useMock: newMockState});
    setHasChangedMode(true);
    if (!newMockState) {
       setActiveTab('api');
       alert("Simulation deaktiviert. Bitte prüfe jetzt die Verbindung und suche dann im Reiter 'Räume' nach deinen echten Komponenten.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col text-slate-800">
      <div className="bg-[#00828c] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Shield size={20} />
          <h2 className="text-lg font-bold uppercase tracking-tight">System Backend</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full"><X size={24} /></button>
      </div>

      <div className="flex bg-slate-100 border-b overflow-x-auto scrollbar-hide">
        {[
          {id: 'api', label: 'Verbindung'},
          {id: 'rooms', label: 'Räume'},
          {id: 'export', label: 'QR-Codes'},
          {id: 'hosting', label: 'Regeln'}
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
        {hasChangedMode && (
          <div className="max-w-md mx-auto mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <TriangleAlert className="text-red-500 flex-shrink-0" size={24} />
            <p className="text-[10px] font-bold text-red-700 uppercase leading-tight">
              Modus geändert! Speichern erforderlich, damit QR-Codes und Live-Daten funktionieren.
            </p>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-[#00828c]">Betriebsmodus</span>
                <span className="text-sm font-medium">{config.useMock ? 'Demo / Simulation' : 'Echtzeit-Betrieb'}</span>
              </div>
              <button onClick={toggleMock} className={`w-14 h-7 rounded-full relative transition-all ${config.useMock ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${config.useMock ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'local' ? 'bg-white text-[#00828c] shadow-sm' : 'text-slate-500'}`}>LOKAL (LAN)</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'cloud' ? 'bg-white text-[#00828c] shadow-sm' : 'text-slate-500'}`}>CLOUD (LiveID)</button>
              </div>

              {config.apiMode === 'cloud' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[9px] font-bold uppercase text-slate-400 block ml-1">Cloud Provider</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => setConfig({...config, cloudProvider: 'gekko'})} 
                      className={`flex-1 py-2 rounded text-[10px] font-bold transition-all ${config.cloudProvider === 'gekko' ? 'bg-[#00828c] text-white shadow-md scale-[1.02]' : 'text-slate-500'}`}
                    >
                      myGEKKO
                    </button>
                    <button 
                      onClick={() => setConfig({...config, cloudProvider: 'tekko'})} 
                      className={`flex-1 py-2 rounded text-[10px] font-bold transition-all ${config.cloudProvider === 'tekko' ? 'bg-[#00828c] text-white shadow-md scale-[1.02]' : 'text-slate-500'}`}
                    >
                      TEKKO
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <input type="text" placeholder={config.apiMode === 'local' ? "IP-Adresse des myGEKKO" : "Live-ID / Cloud-ID"} className="admin-input" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Benutzername" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                  <input type="password" placeholder="Passwort/Key" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
                </div>
              </div>

              <button onClick={testConnection} disabled={isTesting} className="w-full py-3 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-black transition-colors active:scale-[0.98]">
                {isTesting ? <RefreshCw className="animate-spin" size={14}/> : <Wifi size={14}/>} Verbindung testen
              </button>

              {testResult.msg && (
                <div className={`p-4 rounded-lg text-[10px] font-bold flex items-center gap-2 border animate-in zoom-in-95 duration-200 ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {testResult.success ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>} {testResult.msg}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="max-w-2xl mx-auto space-y-4 pb-20">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Erkannte Räume</h3>
               <button onClick={handleDiscover} disabled={isDiscovering} className="bg-[#00828c] text-white px-5 py-2.5 rounded-lg text-[10px] font-bold flex items-center gap-2 uppercase shadow-lg hover:bg-[#006a72] active:scale-95 transition-all">
                 {isDiscovering ? <RefreshCw size={12} className="animate-spin"/> : <Search size={12}/>} Liste vom Gekko laden
               </button>
             </div>

             {config.useMock && (
               <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-center mb-6">
                 <Info className="text-amber-500" size={20}/>
                 <p className="text-[10px] text-amber-800 font-medium uppercase">Achtung: Du bist im Simulationsmodus. Die Suche liefert nur Demo-Daten. Deaktiviere die Simulation im Reiter "Verbindung" für echte Daten.</p>
               </div>
             )}

             <div className="grid gap-3">
               {config.rooms.length === 0 ? (
                 <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center text-center">
                   <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <Search className="text-slate-400" size={24}/>
                   </div>
                   <p className="text-xs text-slate-400 font-medium">Noch keine Räume geladen.<br/>Klicke oben auf "Liste laden".</p>
                 </div>
               ) : (
                 config.rooms.map((r, i) => (
                   <div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between gap-4 hover:border-[#00828c] transition-colors group">
                     <div className="flex-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Objekt-ID: {r.id}</span>
                        <input type="text" className="admin-input border-none bg-slate-50 focus:bg-white" value={r.name} onChange={e => updateRoom(i, {name: e.target.value})} />
                     </div>
                     <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={16}/></button>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase mb-1">QR-Code Management</h3>
                <p className="text-[10px] text-slate-400 uppercase">Generiere und exportiere Zugangscodes für alle Räume.</p>
              </div>
              <button onClick={exportAllQrCodes} disabled={isExporting || config.rooms.length === 0} className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-95">
                {isExporting ? <RefreshCw className="animate-spin" size={14}/> : <Download size={14}/>} ZIP-Archiv laden
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {config.rooms.map(r => (
                 <div key={r.id} className="bg-white p-6 border rounded-2xl flex flex-col items-center hover:shadow-md transition-shadow">
                   <span className="text-[10px] font-bold mb-4 uppercase text-[#00828c] text-center">{r.name}</span>
                   <div className="p-2 bg-white border rounded-lg shadow-inner">
                    <QRCodeCanvas value={getQrUrl(r.id)} size={140} level="H" includeMargin={true} />
                   </div>
                   <button onClick={() => copyToClipboard(getQrUrl(r.id))} className="mt-4 text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1 hover:text-[#00828c] transition-colors"><Copy size={10}/> Link kopieren</button>
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {activeTab === 'hosting' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
               <h3 className="font-bold text-xs mb-4 uppercase text-[#00828c] border-b pb-2">Regelwerk & Sitzung</h3>
               <div className="space-y-4">
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Gültigkeit QR-Code (Minuten)</label>
                   <input type="number" className="admin-input" value={config.sessionDurationMinutes} onChange={e => setConfig({...config, sessionDurationMinutes: Number(e.target.value)})} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Min. Offset</label>
                    <input type="number" step="0.5" className="admin-input" value={config.minOffset} onChange={e => setConfig({...config, minOffset: Number(e.target.value)})} />
                   </div>
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Max. Offset</label>
                    <input type="number" step="0.5" className="admin-input" value={config.maxOffset} onChange={e => setConfig({...config, maxOffset: Number(e.target.value)})} />
                   </div>
                 </div>
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Sicherheitsschlüssel (Secret)</label>
                   <input type="text" className="admin-input font-mono text-[11px]" value={config.secretKey} onChange={e => setConfig({...config, secretKey: e.target.value})} />
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex justify-end gap-3 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.08)]">
        <button onClick={onClose} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase hover:text-slate-600">Schließen</button>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className={`px-10 py-3 rounded-lg text-xs font-bold uppercase shadow-lg transition-all flex items-center gap-2 ${hasChangedMode ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-[#00828c] hover:bg-[#006a72] text-white'}`}
        >
          {isSaving ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>}
          {isSaving ? 'Wird gespeichert...' : 'Konfiguration Speichern'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
