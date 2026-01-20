
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.tsx';
import MainControl from './components/MainControl.tsx';
import StatusLine from './components/StatusLine.tsx';
import Footer from './components/Footer.tsx';
import ExpiredScreen from './components/ExpiredScreen.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { gekkoService } from './services/gekkoService.ts';
import { GekkoStatus } from './types.ts';

const POLLING_INTERVAL_MS = 10000;
const SYNC_LOCK_TIMEOUT_MS = 5000; 

const App: React.FC = () => {
  const [status, setStatus] = useState<GekkoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryReason, setExpiryReason] = useState<string>("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  const [optimisticOffset, setOptimisticOffset] = useState<number | null>(null);
  const lastClickTime = useRef<number>(0);
  const pressTimer = useRef<number | null>(null);

  // Initialisiere mit sicheren Standardwerten
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
      sessionDurationMinutes: Number(config.sessionDurationMinutes) || 15,
      minOffset: config.minOffset !== undefined ? Number(config.minOffset) : -3.0,
      maxOffset: config.maxOffset !== undefined ? Number(config.maxOffset) : 3.0,
      stepSize: config.stepSize !== undefined ? Number(config.stepSize) : 0.5
    });
  };

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('t');
      const roomIdDirect = params.get('room');

      await loadGlobalConfig();

      if (window.location.pathname.includes('/admin')) {
        const pw = prompt("Admin Passwort:");
        if (pw === "sybtec" || pw === "admin") setShowAdmin(true);
        else window.location.href = "/";
        setLoading(false);
        return;
      }
      
      // Sitzungs-Logik: Ein Token in der URL startet eine neue Sitzung
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
          setExpiryReason("Ungültiger QR-Code");
        }
      } else if (roomIdDirect) {
        // Direktzugriff über Lesezeichen prüfen
        setCurrentRoomId(roomIdDirect);
        gekkoService.setCurrentRoom(roomIdDirect);
        // checkExpiry wird im Intervall die fehlende session_start Zeit bemerken
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
    
    // Wenn wir in einem Raum sind, aber keine Startzeit haben -> QR Scan erforderlich
    if (!startTimeStr && currentRoomId) {
      if (!isExpired) {
        setIsExpired(true);
        setExpiryReason("Bitte QR-Code scannen (Sitzungsschutz)");
      }
      return;
    }

    if (startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      const durationMs = Number(globalSettings.sessionDurationMinutes) * 60 * 1000;
      if (Date.now() - startTime > durationMs) {
        setIsExpired(true);
        setExpiryReason(`Sitzung abgelaufen (${globalSettings.sessionDurationMinutes} Min.)`);
      } else {
        setIsExpired(false);
      }
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
      const fresh = await gekkoService.fetchStatus(currentRoomId);
      const now = Date.now();
      const isLocked = (now - lastClickTime.current) < SYNC_LOCK_TIMEOUT_MS;

      if (isLocked && optimisticOffset !== null) {
        if (Math.abs(Number(fresh.offset) - optimisticOffset) < 0.01) {
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

  useEffect(() => {
    if (!loading && currentRoomId && !showAdmin && !isExpired) {
      refreshData();
      const interval = setInterval(refreshData, POLLING_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [refreshData, currentRoomId, showAdmin, loading, isExpired]);

  const handleTempAdjust = async (delta: number) => {
    if (!status || isExpired || !currentRoomId) return;
    
    // Basiswert bestimmen und strikt als Number behandeln
    const baseOffset = optimisticOffset !== null ? optimisticOffset : Number(status.offset);
    let nextOffset = Number((baseOffset + delta).toFixed(2));
    
    const min = Number(globalSettings.minOffset);
    const max = Number(globalSettings.maxOffset);

    // Strikte Grenzwertprüfung
    if (nextOffset > max) nextOffset = max;
    if (nextOffset < min) nextOffset = min;

    // Wenn keine Änderung möglich (Limit erreicht)
    if (Math.abs(nextOffset - baseOffset) < 0.01) {
      console.log("Limit erreicht:", nextOffset);
      return; 
    }

    lastClickTime.current = Date.now();
    setOptimisticOffset(nextOffset);
    
    setStatus(prev => prev ? {
      ...prev,
      offset: nextOffset,
      sollTemp: Number(prev.sollTemp) + (nextOffset - baseOffset)
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#e0e4e7]"><div className="w-10 h-10 border-4 border-[#00828c] border-t-transparent rounded-full animate-spin"></div></div>;

  if (showAdmin) return <AdminPanel onClose={async () => { await loadGlobalConfig(); setShowAdmin(false); }} onPreviewRoom={(id) => { setIsPreview(true); setCurrentRoomId(id); gekkoService.setCurrentRoom(id); setShowAdmin(false); }} />;

  if (!currentRoomId || isExpired) return <div className="min-h-screen max-w-md mx-auto bg-[#00828c] relative"><ExpiredScreen reason={expiryReason} sessionMinutes={globalSettings.sessionDurationMinutes} /><div className="absolute top-0 w-full h-32 z-[60]" onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd} /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative select-none overflow-x-hidden">
      <div onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd}>
        <Header roomName={status?.roomName || ""} category={status?.category || ""} onBack={isPreview ? () => window.location.reload() : logout} showBack={true} isLogout={!isPreview} />
      </div>
      <main className="flex-1 flex flex-col relative pb-4">
        {status && <MainControl soll={status.sollTemp} ist={status.istTemp} offset={status.offset} mode={status.betriebsart} onAdjust={handleTempAdjust} stepSize={Number(globalSettings.stepSize)} />}
        {status && <StatusLine regler={status.reglerPercent} ventilator={status.ventilatorState} />}
        {status && <Footer hauptMode={status.hauptbetriebsart} subMode={status.betriebsart} feuchte={status.feuchte} />}
      </main>
    </div>
  );
};

export default App;
