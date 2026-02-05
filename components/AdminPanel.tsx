
import React, { useState, useEffect } from 'react';
import { Save, Trash2, X, Shield, RefreshCw, Wifi, CheckCircle2, AlertCircle, Copy, Search, Download, Palette } from 'lucide-react';
import { gekkoService } from '../services/gekkoService.ts';
import { RoomDefinition, GekkoConfig, SkinType } from '../types.ts';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';

interface AdminPanelProps {
  onClose: () => void;
  onPreviewRoom: (roomId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onPreviewRoom }) => {
  const [config, setConfig] = useState<GekkoConfig>(gekkoService.getConfig());
  const [activeTab, setActiveTab] = useState<'api' | 'rooms' | 'skins' | 'export' | 'hosting'>('api');
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, msg?: string}>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    gekkoService.updateInternalConfig(config);
    // Sofortige Vorschau der Farben im Admin Panel
    if (config.skin) {
        applyPreviewColors(config.skin, config.customColor);
    }
  }, [config]);

  const applyPreviewColors = (skin: SkinType, customColor: string) => {
    let primary = "#00828c";
    switch (skin) {
      case 'mygekko': primary = "#1a2533"; break;
      case 'sybtec': primary = "#540d9e"; break;
      case 'custom': primary = customColor; break;
      case 'tekko': default: primary = "#00828c"; break;
    }
    document.documentElement.style.setProperty('--color-primary', primary);
  };

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
      alert("Einstellungen erfolgreich gespeichert.");
    } catch (e) { alert("Speichern fehlgeschlagen."); }
    finally { setIsSaving(false); }
  };

  const copyToClipboard = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("URL kopiert!");
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
        alert(`${result.rooms.length} Räume gefunden.`);
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
    } catch (e) { alert("Export fehlgeschlagen."); }
    finally { setIsExporting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col text-slate-800">
      <div className="p-4 flex items-center justify-between shadow-md text-white" style={{backgroundColor: 'var(--color-primary)'}}>
        <div className="flex items-center gap-3">
          <Shield size={20} />
          <h2 className="text-lg font-bold uppercase tracking-tight">System Backend</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={24} /></button>
      </div>

      <div className="flex bg-slate-100 border-b overflow-x-auto scrollbar-hide">
        {['api', 'rooms', 'skins', 'export', 'hosting'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} 
            className={`flex-1 min-w-[100px] py-4 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white border-b-2 text-slate-900' : 'text-slate-500'}`}
            style={activeTab === tab ? {borderColor: 'var(--color-primary)', color: 'var(--color-primary)'} : {}}>
            {tab === 'api' ? 'Verbindung' : tab === 'rooms' ? 'Räume' : tab === 'skins' ? 'Skin' : tab === 'export' ? 'QR-Codes' : 'Regeln'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
        {activeTab === 'api' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 border rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Arbeitsmodus</span>
                <button onClick={() => setConfig({...config, useMock: !config.useMock})} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase transition-all ${config.useMock ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                  {config.useMock ? 'Simulation' : 'Echtzeit'}
                </button>
              </div>

              <div className="flex p-1 bg-slate-50 border rounded-lg">
                <button onClick={() => setConfig({...config, apiMode: 'local'})} className={`flex-1 py-2 rounded text-[10px] font-bold transition-all ${config.apiMode === 'local' ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={config.apiMode === 'local' ? {color: 'var(--color-primary)'} : {}}>LOKAL (LAN)</button>
                <button onClick={() => setConfig({...config, apiMode: 'cloud'})} className={`flex-1 py-2 rounded text-[10px] font-bold transition-all ${config.apiMode === 'cloud' ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={config.apiMode === 'cloud' ? {color: 'var(--color-primary)'} : {}}>CLOUD (WAN)</button>
              </div>

              {config.apiMode === 'cloud' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Cloud Anbieter</label>
                  <div className="flex p-1 bg-white border rounded-md">
                    <button onClick={() => setConfig({...config, cloudProvider: 'gekko'})} className={`flex-1 py-1.5 rounded text-[9px] font-bold transition-all ${config.cloudProvider === 'gekko' ? 'text-white shadow-sm' : 'text-slate-500'}`} style={config.cloudProvider === 'gekko' ? {backgroundColor: 'var(--color-primary)'} : {}}>myGEKKO</button>
                    <button onClick={() => setConfig({...config, cloudProvider: 'tekko'})} className={`flex-1 py-1.5 rounded text-[9px] font-bold transition-all ${config.cloudProvider === 'tekko' ? 'text-white shadow-sm' : 'text-slate-500'}`} style={config.cloudProvider === 'tekko' ? {backgroundColor: 'var(--color-primary)'} : {}}>TEKKO</button>
                  </div>
                </div>
              )}

              <input type="text" placeholder={config.apiMode === 'local' ? "IP-Adresse" : "Cloud-ID"} className="admin-input" value={config.apiMode === 'local' ? config.ip : config.gekkoId} onChange={e => setConfig(config.apiMode === 'local' ? {...config, ip: e.target.value} : {...config, gekkoId: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Benutzername" className="admin-input" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                <input type="password" placeholder="Passwort / Key" className="admin-input" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} />
              </div>
              <button onClick={testConnection} disabled={isTesting} className="w-full py-3 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                {isTesting ? <RefreshCw className="animate-spin" size={14}/> : <Wifi size={14}/>} Verbindung prüfen
              </button>
            </div>
          </div>
        )}

        {activeTab === 'skins' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 border rounded-xl shadow-sm space-y-6">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-2"><Palette size={14}/> Skin Auswahl</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'tekko', name: 'TEKKO', color: '#00828c' },
                  { id: 'mygekko', name: 'myGEKKO', color: '#1a2533' },
                  { id: 'sybtec', name: 'Sybtec', color: '#540d9e' },
                  { id: 'custom', name: 'Individuell', color: config.customColor }
                ].map(s => (
                  <button 
                    key={s.id}
                    onClick={() => setConfig({...config, skin: s.id as any})}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${config.skin === s.id ? 'border-slate-900 shadow-md' : 'border-slate-100'}`}
                  >
                    <div className="w-8 h-8 rounded-full shadow-inner" style={{backgroundColor: s.color}}></div>
                    <span className="text-[10px] font-bold uppercase tracking-tight">{s.name}</span>
                  </button>
                ))}
              </div>

              {config.skin === 'custom' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-2">Eigene Farbe wählen</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        className="w-12 h-10 p-0.5 border-none bg-transparent cursor-pointer" 
                        value={config.customColor} 
                        onChange={e => setConfig({...config, customColor: e.target.value})} 
                      />
                      <input 
                        type="text" 
                        className="admin-input font-mono uppercase" 
                        value={config.customColor} 
                        onChange={e => setConfig({...config, customColor: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="max-w-2xl mx-auto space-y-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold uppercase text-slate-400">Verfügbare Räume</h3>
               <button onClick={handleDiscover} disabled={isDiscovering} className="text-white px-5 py-2.5 rounded-lg text-[10px] font-bold flex items-center gap-2 uppercase shadow-md transition-all" style={{backgroundColor: 'var(--color-primary)'}}>
                 {isDiscovering ? <RefreshCw size={12} className="animate-spin"/> : <Search size={12}/>} Liste synchronisieren
               </button>
             </div>
             <div className="grid gap-3">
               {config.rooms.length === 0 ? (
                 <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 opacity-50 text-xs uppercase font-medium">Keine Räume eingelesen</div>
               ) : (
                 config.rooms.map((r, i) => (
                   <div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between gap-4">
                     <div className="flex-1 min-w-0">
                        <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">ID: {r.id}</span>
                        <input type="text" className="w-full text-sm font-bold border-none bg-slate-50 rounded p-1.5 focus:bg-white" value={r.name} onChange={e => updateRoom(i, {name: e.target.value})} />
                     </div>
                     <button onClick={() => setConfig({...config, rooms: config.rooms.filter((_, idx) => idx !== i)})} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={exportAllQrCodes} className="w-full bg-slate-900 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all">
              <Download size={16}/> QR-Code Paket (ZIP) erstellen
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {config.rooms.map(r => (
                 <div key={r.id} className="bg-white p-6 border rounded-2xl flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
                   <span className="text-[10px] font-bold mb-4 uppercase tracking-wider" style={{color: 'var(--color-primary)'}}>{r.name}</span>
                   <QRCodeCanvas value={getQrUrl(r.id)} size={140} level="H" includeMargin={true} />
                   <button onClick={() => copyToClipboard(getQrUrl(r.id))} className="mt-4 text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1 hover:text-slate-900"><Copy size={10}/> Direktlink kopieren</button>
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {activeTab === 'hosting' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-6 border rounded-2xl shadow-sm space-y-6">
               <h3 className="font-bold text-xs uppercase border-b pb-2" style={{color: 'var(--color-primary)'}}>Regeln & Sicherheit</h3>
               <div className="space-y-4">
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Session-Gültigkeit (QR-Code in Min)</label>
                   <input type="number" className="admin-input font-bold" value={config.sessionDurationMinutes} onChange={e => setConfig({...config, sessionDurationMinutes: Number(e.target.value)})} />
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Min Offset</label>
                    <input type="number" step="0.1" className="admin-input" value={config.minOffset} onChange={e => setConfig({...config, minOffset: Number(e.target.value)})} />
                   </div>
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Max Offset</label>
                    <input type="number" step="0.1" className="admin-input" value={config.maxOffset} onChange={e => setConfig({...config, maxOffset: Number(e.target.value)})} />
                   </div>
                   <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Schrittweite</label>
                    <input type="number" step="0.1" min="0.1" className="admin-input font-bold" value={config.stepSize} onChange={e => setConfig({...config, stepSize: Number(e.target.value)})} style={{color: 'var(--color-primary)'}} />
                   </div>
                 </div>
                 <div>
                   <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Secret Key (Sicherheitssiegel)</label>
                   <input type="text" className="admin-input font-mono text-[11px]" value={config.secretKey} onChange={e => setConfig({...config, secretKey: e.target.value})} />
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex justify-end gap-3 bg-white shadow-lg">
        <button onClick={onClose} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors">Abbrechen</button>
        <button onClick={handleSave} disabled={isSaving} className="text-white px-10 py-3 rounded-lg text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2" style={{backgroundColor: 'var(--color-primary)'}}>
          {isSaving ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>} Konfiguration Speichern
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
