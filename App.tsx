
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.tsx';
import MainControl from './components/MainControl.tsx';
import StatusLine from './components/StatusLine.tsx';
import Footer from './components/Footer.tsx';
import ExpiredScreen from './components/ExpiredScreen.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { gekkoService } from './services/gekkoService.ts';
import { GekkoStatus, GekkoConfig } from './types.ts';

const POLLING_INTERVAL_MS = 10000;
const SYNC_LOCK_DURATION_MS = 3500; // Dauer, wie lange Server-Updates ignoriert werden nach Klick

const App: React.FC = () => {
  const [status, setStatus] = useState<GekkoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryReason, setExpiryReason] = useState<string>("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  // Optimistic UI state
  const isAdjusting = useRef<boolean>(false);
  const adjustTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);

  const [globalSettings, setGlobalSettings] = useState({
    sessionDurationMinutes: 15,
    minOffset: -3.0,
    maxOffset: 3.0,
    stepSize: 0.5
  });

  const logout = useCallback(() => {
    localStorage.removeItem('gekko_session_start');
    localStorage.removeItem('gekko_current_room');
    setCurrentRoomId(null);
    setStatus(null);
    setIsExpired(true);
    setExpiryReason("Abgemeldet");
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
  }, []);

  const loadGlobalConfig = async () => {
    const config = await gekkoService.loadConfig();
    setGlobalSettings({
      sessionDurationMinutes: config.sessionDurationMinutes || 15,
      minOffset: config.minOffset !== undefined ? config.minOffset : -3.0,
      maxOffset: config.maxOffset !== undefined ? config.maxOffset : 3.0,
      stepSize: config.stepSize || 0.5
    });
  };

  useEffect(() => {
    const init = async () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('t');
      const roomIdDirect = params.get('room');

      await loadGlobalConfig();

      if (path === '/admin' || path === '/admin/') {
        const pw = prompt("System-Passwort für Admin-Bereich:");
        if (pw === "sybtec" || pw === "admin") setShowAdmin(true);
        else window.location.href = "/";
        setLoading(false);
        return;
      }
      
      if (token) {
        const decoded = gekkoService.decodeToken(token);
        if (decoded) {
          setCurrentRoomId(decoded.roomId);
          gekkoService.setCurrentRoom(decoded.roomId);
          localStorage.setItem('gekko_session_start', Date.now().toString());
          localStorage.setItem('gekko_current_room', decoded.roomId);
          const cleanUrl = window.location.origin + window.location.pathname + `?room=${decoded.roomId}`;
          window.history.replaceState({}, '', cleanUrl);
          setLoading(false);
          return;
        } else {
          setExpiryReason("Sicherheitsschlüssel-Konflikt");
          setIsExpired(true);
        }
      } 
      
      if (roomIdDirect) {
        setCurrentRoomId(roomIdDirect);
        gekkoService.setCurrentRoom(roomIdDirect);
      } else {
        const storedRoom = localStorage.getItem('gekko_current_room');
        if (storedRoom) {
          setCurrentRoomId(storedRoom);
          gekkoService.setCurrentRoom(storedRoom);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const checkExpiry = useCallback(() => {
    if (loading || isPreview || showAdmin) return;
    const startTimeStr = localStorage.getItem('gekko_session_start');
    if (!startTimeStr || !currentRoomId) {
      if (!isExpired) { setIsExpired(true); setExpiryReason("Keine aktive Sitzung"); }
      return;
    }
    const startTime = parseInt(startTimeStr, 10);
    const durationMs = globalSettings.sessionDurationMinutes * 60 * 1000;
    if (Date.now() - startTime > durationMs) {
      setIsExpired(true);
      setExpiryReason(`Sitzung abgelaufen`);
    } else {
      setIsExpired(false);
    }
  }, [currentRoomId, isPreview, showAdmin, loading, isExpired, globalSettings.sessionDurationMinutes]);

  useEffect(() => {
    if (!loading) {
      checkExpiry();
      const timer = setInterval(checkExpiry, 5000);
      return () => clearInterval(timer);
    }
  }, [checkExpiry, loading]);

  const refreshData = useCallback(async () => {
    if (loading || isExpired || !currentRoomId || showAdmin) return;
    try {
      const freshData = await gekkoService.fetchStatus(currentRoomId);
      
      // Wenn der User gerade aktiv anpasst, überschreiben wir die Soll-Werte nicht 
      // mit möglicherweise veralteten Server-Daten (Sync-Lock)
      if (isAdjusting.current) {
        setStatus(prev => {
          if (!prev) return freshData;
          return {
            ...freshData, // Nimm alles Neue (Ist-Temp, Feuchte, Ventil...)
            offset: prev.offset, // Behalte aber den lokalen (optimistischen) Offset
            sollTemp: prev.sollTemp // Behalte die lokale Soll-Temp
          };
        });
      } else {
        setStatus(freshData);
      }
    } catch (e: any) {}
  }, [isExpired, loading, currentRoomId, showAdmin]);

  useEffect(() => {
    if (!loading && currentRoomId && !showAdmin && !isExpired) {
      refreshData();
      const interval = setInterval(refreshData, POLLING_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [refreshData, currentRoomId, showAdmin, loading, isExpired]);

  const handleTempAdjust = async (delta: number) => {
    if (!status || isExpired || !currentRoomId) return;
    
    // 1. Lock setzen: Wir verhindern, dass Hintergrund-Updates unsere Werte überschreiben
    isAdjusting.current = true;
    if (adjustTimer.current) clearTimeout(adjustTimer.current);
    
    // Timer für das Aufheben des Locks (wird bei jedem Klick erneuert)
    adjustTimer.current = window.setTimeout(() => {
      isAdjusting.current = false;
    }, SYNC_LOCK_DURATION_MS);

    // 2. Berechne neuen Offset (Optimistisch)
    let newOffset = parseFloat((status.offset + delta).toFixed(2));
    if (newOffset > globalSettings.maxOffset) newOffset = globalSettings.maxOffset;
    if (newOffset < globalSettings.minOffset) newOffset = globalSettings.minOffset;

    if (newOffset === status.offset) return;

    const actualDelta = newOffset - status.offset;
    const newSoll = parseFloat((status.sollTemp + actualDelta).toFixed(2));

    // 3. Sofortiges lokales State-Update (Optimistic UI)
    setStatus(prev => prev ? { ...prev, sollTemp: newSoll, offset: newOffset } : null);
    
    // 4. Befehl an myGEKKO senden
    const success = await gekkoService.setAdjustment(newOffset, currentRoomId);
    if (!success) {
      // Bei Fehler: Lock aufheben und Daten neu laden
      isAdjusting.current = false;
      refreshData();
    }
  };

  const handleAdminStart = () => {
    pressTimer.current = window.setTimeout(() => {
      const pw = prompt("System-Passwort:");
      if (pw === "sybtec" || pw === "admin") setShowAdmin(true);
    }, 3000);
  };

  const handleAdminEnd = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#e0e4e7]">
        <div className="w-10 h-10 border-4 border-[#00828c]/20 border-t-[#00828c] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showAdmin) {
    return (
      <AdminPanel 
        onClose={async () => { await loadGlobalConfig(); setShowAdmin(false); }} 
        onPreviewRoom={(id) => { 
          setIsPreview(true); setCurrentRoomId(id); gekkoService.setCurrentRoom(id); setShowAdmin(false); 
        }} 
      />
    );
  }

  if (!currentRoomId || isExpired) {
    return (
      <div className="min-h-screen w-full max-w-md mx-auto relative shadow-2xl bg-[#00828c] overflow-x-hidden">
        <ExpiredScreen reason={expiryReason} sessionMinutes={globalSettings.sessionDurationMinutes} />
        <div className="absolute top-0 left-0 w-full h-32 z-50" onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd} />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#e0e4e7]">
        <span className="text-[10px] font-bold text-[#00828c] uppercase tracking-widest">Initialisierung...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative select-none overflow-x-hidden">
      <div onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd}>
        <Header roomName={status.roomName} category={status.category} onBack={isPreview ? () => window.location.reload() : logout} showBack={isPreview || !!currentRoomId} isLogout={!isPreview} />
      </div>
      <main className="flex-1 flex flex-col relative pb-4 overflow-y-auto overflow-x-hidden">
        <MainControl soll={status.sollTemp} ist={status.istTemp} offset={status.offset} mode={status.betriebsart} onAdjust={handleTempAdjust} stepSize={globalSettings.stepSize} />
        <StatusLine regler={status.reglerPercent} ventilator={status.ventilatorState} />
        <Footer hauptMode={status.hauptbetriebsart} subMode={status.betriebsart} feuchte={status.feuchte} />
      </main>
    </div>
  );
};

export default App;
