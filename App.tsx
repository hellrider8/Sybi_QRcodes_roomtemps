
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.tsx';
import MainControl from './components/MainControl.tsx';
import StatusLine from './components/StatusLine.tsx';
import Footer from './components/Footer.tsx';
import ExpiredScreen from './components/ExpiredScreen.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { gekkoService } from './services/gekkoService.ts';
import { GekkoStatus } from './types.ts';

const SESSION_DURATION_MS = 15 * 60 * 1000;
const POLLING_INTERVAL_MS = 10000;

const App: React.FC = () => {
  const [status, setStatus] = useState<GekkoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryReason, setExpiryReason] = useState<string>("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  const pressTimer = useRef<number | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('gekko_session_start');
    localStorage.removeItem('gekko_current_room');
    setCurrentRoomId(null);
    setStatus(null);
    setIsExpired(true);
    setExpiryReason("Abgemeldet");
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
  }, []);

  useEffect(() => {
    const init = async () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('t');
      const roomIdDirect = params.get('room');

      gekkoService.logToServer('INFO', 'App Initialisierung...', { token: !!token, room: roomIdDirect });

      if (path === '/admin' || path === '/admin/') {
        const pw = prompt("System-Passwort für Admin-Bereich:");
        if (pw === "sybtec" || pw === "") setShowAdmin(true);
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
          setExpiryReason("Token ungültig oder Schlüssel-Mismatch");
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
    const storedRoom = localStorage.getItem('gekko_current_room');

    if (!startTimeStr || !currentRoomId) {
      if (!isExpired) {
        setIsExpired(true);
        setExpiryReason("Keine aktive Sitzung (bitte QR scannen)");
      }
      return;
    }

    if (currentRoomId !== storedRoom) {
      setIsExpired(true);
      setExpiryReason("Raum-Mismatch");
      return;
    }

    const startTime = parseInt(startTimeStr, 10);
    if (Date.now() - startTime > SESSION_DURATION_MS) {
      setIsExpired(true);
      setExpiryReason("Sitzung abgelaufen (15 min)");
    } else {
      setIsExpired(false);
    }
  }, [currentRoomId, isPreview, showAdmin, loading, isExpired]);

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
      const data = await gekkoService.fetchStatus(currentRoomId);
      setStatus(data);
    } catch (e: any) {
      gekkoService.logToServer('ERROR', 'Status-Update fehlgeschlagen', { error: e.message });
    }
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
    const newOffset = parseFloat((status.offset + delta).toFixed(2));
    const newSoll = parseFloat((status.sollTemp + delta).toFixed(2));
    setStatus(prev => prev ? { ...prev, sollTemp: newSoll, offset: newOffset } : null);
    const success = await gekkoService.setAdjustment(newOffset, currentRoomId);
    if (!success) refreshData();
  };

  const handleAdminStart = () => {
    pressTimer.current = window.setTimeout(() => {
      const pw = prompt("System-Passwort:");
      if (pw === "sybtec" || pw === "") setShowAdmin(true);
    }, 2000);
  };

  const handleAdminEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e0e4e7]">
        <div className="w-10 h-10 border-4 border-[#00828c]/20 border-t-[#00828c] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showAdmin) {
    return (
      <AdminPanel 
        onClose={() => setShowAdmin(false)} 
        onPreviewRoom={(id) => { 
          setIsPreview(true); 
          setCurrentRoomId(id); 
          gekkoService.setCurrentRoom(id); 
          setShowAdmin(false); 
        }} 
      />
    );
  }

  if (!currentRoomId || isExpired) {
    return (
      <div className="h-screen w-full max-w-md mx-auto relative overflow-hidden shadow-2xl bg-[#00828c]">
        <ExpiredScreen reason={expiryReason} onAdminClick={() => setShowAdmin(true)} />
        <div className="absolute top-0 left-0 w-full h-24" onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd} />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e0e4e7]">
        <span className="text-[10px] font-bold text-[#00828c] uppercase tracking-widest">Lade Status...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative overflow-hidden select-none">
      <div onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd}>
        <Header 
          roomName={status.roomName} 
          category={status.category} 
          onBack={isPreview ? () => window.location.reload() : logout} 
          showBack={isPreview || !!currentRoomId} 
          isLogout={!isPreview}
        />
      </div>
      <main className="flex-1 flex flex-col relative">
        <MainControl soll={status.sollTemp} ist={status.istTemp} offset={status.offset} mode={status.betriebsart} onAdjust={handleTempAdjust} />
        <StatusLine regler={status.reglerPercent} ventilator={status.ventilatorState} />
        <Footer hauptMode={status.hauptbetriebsart} subMode={status.betriebsart} feuchte={status.feuchte} />
      </main>
    </div>
  );
};

export default App;
