
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.tsx';
import MainControl from './components/MainControl.tsx';
import StatusLine from './components/StatusLine.tsx';
import Footer from './components/Footer.tsx';
import ExpiredScreen from './components/ExpiredScreen.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { gekkoService } from './services/gekkoService.ts';
import { GekkoStatus, SkinType } from './types.ts';
import { AlertCircle } from 'lucide-react';

const STATUS_POLLING_MS = 10000;
const EXPIRY_CHECK_MS = 5000; 
const SYNC_LOCK_TIMEOUT_MS = 5000; 

const App: React.FC = () => {
  const [status, setStatus] = useState<GekkoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryReason, setExpiryReason] = useState<string>("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [useMock, setUseMock] = useState(true);
  
  const [optimisticOffset, setOptimisticOffset] = useState<number | null>(null);
  const lastClickTime = useRef<number>(0);
  const pressTimer = useRef<number | null>(null);
  const isInitializing = useRef<boolean>(true);

  const [globalSettings, setGlobalSettings] = useState({
    sessionDurationMinutes: 15,
    minOffset: -3.0,
    maxOffset: 3.0,
    stepSize: 0.5,
    skin: 'tekko' as SkinType,
    customColor: '#00828c'
  });

  const applySkinColors = (skin: SkinType, customColor: string) => {
    let primary = "#00828c";
    let secondary = "#535353";
    let accent = "#006a72";

    switch (skin) {
      case 'mygekko':
        primary = "#1a2533";
        secondary = "#3d4a5c";
        accent = "#0d1621";
        break;
      case 'sybtec':
        primary = "#540d9e"; 
        secondary = "#535353";
        accent = "#7dbb26"; 
        break;
      case 'custom':
        primary = customColor;
        secondary = "#535353";
        accent = customColor; 
        break;
      case 'tekko':
      default:
        primary = "#00828c";
        secondary = "#535353";
        accent = "#006a72";
        break;
    }

    document.documentElement.style.setProperty('--color-primary', primary);
    document.documentElement.style.setProperty('--color-secondary', secondary);
    document.documentElement.style.setProperty('--color-accent', accent);
  };

  const loadGlobalConfig = async () => {
    const config = await gekkoService.loadConfig();
    setUseMock(config.useMock);
    const newSettings = {
      sessionDurationMinutes: Number(config.sessionDurationMinutes) || 15,
      minOffset: config.minOffset !== undefined ? Number(config.minOffset) : -3.0,
      maxOffset: config.maxOffset !== undefined ? Number(config.maxOffset) : 3.0,
      stepSize: config.stepSize !== undefined ? Number(config.stepSize) : 0.5,
      skin: config.skin || 'tekko',
      customColor: config.customColor || '#00828c'
    };
    setGlobalSettings(newSettings);
    applySkinColors(newSettings.skin, newSettings.customColor);
  };

  const checkExpiry = useCallback(() => {
    if (showAdmin || isPreview || isInitializing.current) return;
    
    const sessionStartStr = localStorage.getItem('gekko_session_start');
    if (!sessionStartStr) {
      if (!isExpired) {
        setIsExpired(true);
        setExpiryReason("Keine aktive Sitzung");
      }
      return;
    }

    const sessionStart = parseInt(sessionStartStr);
    const elapsedMs = Date.now() - sessionStart;
    
    // Kleiner Puffer von 10 Sekunden für gerade gestartete Sitzungen
    if (elapsedMs < 10000) return;

    const limitMs = (globalSettings.sessionDurationMinutes || 15) * 60 * 1000;
    
    if (elapsedMs > limitMs) {
      setIsExpired(true);
      setExpiryReason("Sitzungszeit abgelaufen");
      localStorage.removeItem('gekko_session_start');
      localStorage.removeItem('gekko_current_room');
    }
  }, [globalSettings.sessionDurationMinutes, showAdmin, isPreview, isExpired]);

  const refreshData = useCallback(async () => {
    if (loading || isExpired || !currentRoomId || showAdmin) return;
    try {
      const fresh = await gekkoService.fetchStatus(currentRoomId);
      const now = Date.now();
      const isLocked = (now - lastClickTime.current) < SYNC_LOCK_TIMEOUT_MS;

      if (isLocked && optimisticOffset !== null) {
        if (Math.abs(Number(fresh.offset) - optimisticOffset) < 0.001) {
          setOptimisticOffset(null);
          setStatus(fresh);
        } else {
          setStatus({
            ...fresh,
            offset: optimisticOffset,
            sollTemp: Number(fresh.sollTemp) + (optimisticOffset - Number(fresh.offset))
          });
        }
      } else {
        setOptimisticOffset(null);
        setStatus(fresh);
      }
    } catch (e) {}
  }, [isExpired, loading, currentRoomId, showAdmin, optimisticOffset]);

  const handleLogout = () => {
    localStorage.removeItem('gekko_session_start');
    localStorage.removeItem('gekko_current_room');
    setIsExpired(true);
    setExpiryReason("Abgemeldet");
    setCurrentRoomId(null);
    setStatus(null);
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    setTimeout(() => window.location.reload(), 50);
  };

  useEffect(() => {
    const init = async () => {
      isInitializing.current = true;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('t');
      const roomIdDirect = params.get('room');

      await loadGlobalConfig();

      if (token) {
        const decoded = gekkoService.decodeToken(token);
        if (decoded) {
          setCurrentRoomId(decoded.roomId);
          gekkoService.setCurrentRoom(decoded.roomId);
          localStorage.setItem('gekko_session_start', Date.now().toString());
          localStorage.setItem('gekko_current_room', decoded.roomId);
          window.history.replaceState({}, '', window.location.origin + window.location.pathname + `?room=${decoded.roomId}`);
          setIsExpired(false);
        } else {
          setIsExpired(true);
          setExpiryReason("Ungültiger Zugang");
        }
      } else if (roomIdDirect) {
        setCurrentRoomId(roomIdDirect);
        gekkoService.setCurrentRoom(roomIdDirect);
        // Bei direktem Room-Zugriff prüfen wir die Session aus dem Storage
        const start = localStorage.getItem('gekko_session_start');
        if (!start) {
            setIsExpired(true);
            setExpiryReason("Sitzung abgelaufen");
        }
      } else {
        setIsExpired(true);
        setExpiryReason("Bitte QR-Code scannen");
      }
      
      setLoading(false);
      // Verzögerung der Ablaufprüfung um 2 Sekunden nach Init
      setTimeout(() => {
        isInitializing.current = false;
      }, 2000);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading && !isExpired && !showAdmin && !isPreview) {
      const interval = setInterval(checkExpiry, EXPIRY_CHECK_MS);
      return () => clearInterval(interval);
    }
  }, [checkExpiry, loading, isExpired, showAdmin, isPreview]);

  const handleTempAdjust = async (delta: number) => {
    if (!status || isExpired || !currentRoomId) return;
    
    const baseOffset = optimisticOffset !== null ? optimisticOffset : Number(status.offset);
    const step = Number(globalSettings.stepSize) || 0.5;
    
    let nextOffset = Math.round((baseOffset + delta) / step) * step;
    const min = Number(globalSettings.minOffset);
    const max = Number(globalSettings.maxOffset);
    
    if (nextOffset > max) nextOffset = max;
    if (nextOffset < min) nextOffset = min;
    
    if (Math.abs(nextOffset - baseOffset) < 0.001) return; 

    lastClickTime.current = Date.now();
    setOptimisticOffset(nextOffset);
    
    setStatus(prev => prev ? {
      ...prev,
      offset: nextOffset,
      sollTemp: Number(prev.sollTemp) + (nextOffset - (optimisticOffset !== null ? optimisticOffset : Number(prev.offset)))
    } : null);
    
    const ok = await gekkoService.setAdjustment(nextOffset, currentRoomId);
    if (!ok) {
      setOptimisticOffset(null);
      refreshData();
    }
  };

  const handleAdminStart = () => {
    pressTimer.current = window.setTimeout(() => {
      const pw = prompt("Admin Passwort:");
      if (pw === "sybtec" || pw === "admin") setShowAdmin(true);
    }, 3000);
  };

  const handleAdminEnd = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  useEffect(() => {
    if (!loading && currentRoomId && !showAdmin && !isExpired) {
      refreshData();
      const interval = setInterval(refreshData, STATUS_POLLING_MS);
      return () => clearInterval(interval);
    }
  }, [refreshData, currentRoomId, showAdmin, loading, isExpired]);

  if (loading) return null; // Der Spinner kommt jetzt direkt aus der index.html
  
  if (showAdmin) return <AdminPanel onClose={async () => { await loadGlobalConfig(); setShowAdmin(false); }} onPreviewRoom={(id) => { setIsPreview(true); setCurrentRoomId(id); gekkoService.setCurrentRoom(id); setShowAdmin(false); }} />;
  
  if (!currentRoomId || isExpired) return <div className="min-h-screen max-w-md mx-auto bg-[#00828c] relative" style={{backgroundColor: 'var(--color-primary)'}}><ExpiredScreen reason={expiryReason} sessionMinutes={globalSettings.sessionDurationMinutes} /><div className="absolute top-0 w-full h-32 z-[60]" onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd} /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative select-none overflow-x-hidden">
      {useMock && (
        <div className="bg-amber-500 text-white text-[9px] font-bold py-1 px-4 flex items-center justify-center gap-2 z-50 shadow-sm uppercase tracking-widest">
          <AlertCircle size={10} /> Simulationsmodus aktiv
        </div>
      )}
      <div onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd}>
        <Header 
          roomName={status?.roomName || ""} 
          category={status?.category || ""} 
          onBack={isPreview ? () => window.location.reload() : handleLogout} 
          showBack={true} 
          isLogout={!isPreview}
          isDemo={useMock}
        />
      </div>
      <main className="flex-1 flex flex-col relative pb-4">
        {status && <MainControl soll={status.sollTemp} ist={status.istTemp} offset={status.offset} mode={status.betriebsart} onAdjust={handleTempAdjust} stepSize={Number(globalSettings.stepSize)} />}
        {status && <StatusLine regler={status.reglerPercent} ventilator={status.ventilatorState} />}
        {status && <Footer subMode={status.betriebsart} feuchte={status.feuchte} />}
      </main>
    </div>
  );
};

export default App;
