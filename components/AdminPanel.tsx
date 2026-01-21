import React, { useState, useEffect } from 'react';
import { Save, Trash2, X, Shield, RefreshCw, Wifi, CheckCircle2, AlertCircle, Copy, Search, Download, TriangleAlert } from 'lucide-react';
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
      setConfig(gekkoService.getConfig());
      setHasChangedMode(false);
      alert("Gespeichert.");
    } catch (e) { alert("Fehler beim Speichern."); }
    finally { setIsSaving(false); }
  };

  const copyToClipboard = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("Kopiert!");
  };

  const testConnection = async () => {
    setIsTesting(true);
    const res = await gekkoService.testConnection();
    setTestResult({ success: res.success, msg: res.message });
    setIsTesting(false);
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const result = await gekkoService.discoverRooms();
      if (result.rooms && result.rooms.length > 0) {
        setConfig({ ...config, rooms: result.rooms });
        alert(`${result.rooms.length} Räume eingelesen.`);
      } else { alert("Keine Räume gefunden."); }
    } catch (e: any) { alert("Fehler: " + e.message); }
    finally { setIsDiscovering(false); }
  };

  const updateRoom = (index: number, updates: Partial<RoomDefinition>) => {
    const newRooms = [...config.rooms];
    newRooms[index] = { ...newRooms[index], ...updates };
    setConfig({ ...config, rooms: newRooms });
  };

  const getQrUrl = (roomId: string) => {
    const baseUrl = window.location.origin;
    const token = gekkoService.generateToken(roomId);
    return `${baseUrl}?t=${token}`;
  };

  const exportAllQrCodes = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (const room of config.rooms) {
        const url = getQrUrl(room.id);
        const canvas = document.createElement('canvas');
        const QRCode = (await import('https://esm.sh/qrcode')).default;
        await QRCode.toCanvas(canvas, url, { width: 1024 });
        const img = canvas.toDataURL("image/png").split(',')[1];
        zip.file(`${room.name.replace(/[/\\?%*:|"<>]/g, '-')}.png`, img, {base64: true});
      }
      const blob = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = "QR_Codes.zip";
      link.click();
    } catch (e) { alert("Export-Fehler"); }
    finally { setIsExporting(false); }
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
        {['api', 'rooms', 'export', 'hosting'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} 
            className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white border-b-2 border-[#00828c] text-[#00828c]' : 'text-slate-500'}`}>
            {tab === 'api' ? 'Verbindung' : tab === 'rooms' ? 'Räume' : tab === 'export' ? 'QR-Codes' : 'Regeln'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 border rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Modus</span>
                <button onClick={() => { setConfig({...config, useMock: !config.useMock}); setHasChangedMode(true); }} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase transition-all ${config.useMock ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                  {config.useMock ? 'Simulation' : 'Echtzeit'}
                </button>
              </div>

              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'local' ? 'bg-white text-[#00828c] shadow-sm' : 'text-slate-500'}`}>LOKAL (LAN)</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`flex-1 py-2 rounded text-[10px] font-bold ${config.apiMode === 'cloud' ? 'bg-white text-[#00828c] shadow-sm' : 'text-slate-500'}`}>CLOUD</button>
              </div>

              {config.apiMode === 'cloud' && (
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  <button onClick={() => setConfig({...config, cloudProvider: 'gekko'})} className={`flex-1 py-1.5 rounded text-[9px] font-bold ${config.cloudProvider === 'gekko' ? 'bg-white text-[#00828c] shadow-sm' : 'text-slate-500'}`}>myGEKKO Cloud</button>
                  <button onClick={() => setConfig({...config, cloudProvider: 'tekko'})} className={`flex-1 py-1.5 rounded text-[9px] font-bold ${config.cloudProvider === 'tekko' ? 'bg-white text-[#00828c] shadow-sm' : 'text-slate-500'}`}>TEKKO Cloud</button>
                </div>
              )}

              <input type="text" placeholder={config.apiMode === 'local' ? "IP-Adresse" : "Cloud-ID"} className="admin-input" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Benutzer" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                <input type="password" placeholder="Passwort" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
              </div>
              <button onClick={testConnection} disabled={isTesting} className="w-full py-3 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
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
          <div className="max-w-2xl mx-auto space-y-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold uppercase text-slate-400">Räume (Gruppen gefiltert)</h3>
               <button onClick={handleDiscover} disabled={isDiscovering} className="bg-[#00828c] text-white px-5 py-2.5 rounded-lg text-[10px] font-bold flex items-center gap-2 uppercase shadow-md hover:bg-[#006a72] transition-all">
                 {isDiscovering ? <RefreshCw size={12} className="animate-spin"/> : <Search size={12}/>} Liste laden
               </button>
             </div>
             <div className="grid gap-3">
               {config.rooms.map((r, i) => (
                 <div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between gap-4">
                   <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">ID: {r.id}</span>
                      <input type="text" className="w-full text-sm font-bold border-none bg-slate-50 rounded p-1.5 focus:bg-white" value={r.name} onChange={e => updateRoom(i, {name: e.target.value})} />
                   </div>
                   <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={exportAllQrCodes} className="w-full bg-slate-900 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all">
              <Download size={16}/> ZIP-Archiv laden
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {config.rooms.map(r => (
                 <div key={r.id} className="bg-white p-6 border rounded-2xl flex flex-col items-center shadow-sm">
                   <span className="text-[10px] font-bold mb-4 uppercase text-[#00828c]">{r.name}</span>
                   <QRCodeCanvas value={getQrUrl(r.id)} size={140} level="H" />
                   <button onClick={() => copyToClipboard(getQrUrl(r.id))} className="mt-4 text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1 hover:text-[#00828c]"><Copy size={10}/> Link kopieren</button>
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {activeTab === 'hosting' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 border rounded-2xl shadow-sm space-y-6">
               <h3 className="font-bold text-xs uppercase text-[#00828c] border-b pb-2">Regeln</h3>
               <div className="space-y-4">
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">QR-Gültigkeit (Min)</label>
                   <input type="number" className="admin-input" value={config.sessionDurationMinutes} onChange={e => setConfig({...config, sessionDurationMinutes: Number(e.target.value)})} />
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Min</label>
                    <input type="number" step="0.1" className="admin-input" value={config.minOffset} onChange={e => setConfig({...config, minOffset: Number(e.target.value)})} />
                   </div>
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Max</label>
                    <input type="number" step="0.1" className="admin-input" value={config.maxOffset} onChange={e => setConfig({...config, maxOffset: Number(e.target.value)})} />
                   </div>
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Schrittweite</label>
                    <input type="number" step="0.1" min="0.1" className="admin-input font-bold text-[#00828c]" value={config.stepSize} onChange={e => setConfig({...config, stepSize: Number(e.target.value)})} />
                   </div>
                 </div>
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Sicherheitsschlüssel</label>
                   <input type="text" className="admin-input font-mono text-[11px]" value={config.secretKey} onChange={e => setConfig({...config, secretKey: e.target.value})} />
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex justify-end gap-3 bg-white shadow-lg">
        <button onClick={onClose} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase hover:text-slate-600">Abbrechen</button>
        <button onClick={handleSave} disabled={isSaving} className="bg-[#00828c] text-white px-10 py-3 rounded-lg text-xs font-bold uppercase shadow-lg hover:bg-[#006a72] transition-all flex items-center gap-2">
          {isSaving ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>} Speichern
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;