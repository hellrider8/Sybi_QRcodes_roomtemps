
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
    // URL komplett säubern
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t'); // Magic Token
    const roomIdDirect = params.get('room'); // Fallback für Legacy

    // 1. Admin Check
    if (path === '/admin' || path === '/admin/') {
      const pw = prompt("System-Passwort für Admin-Bereich:");
      if (pw === "sybtec" || pw === "") {
        setShowAdmin(true);
      } else {
        window.location.href = "/";
      }
      setLoading(false);
      return;
    }
    
    // 2. Token Verarbeitung (Sicherer Weg)
    if (token) {
      const decoded = gekkoService.decodeToken(token);
      if (decoded) {
        setCurrentRoomId(decoded.roomId);
        gekkoService.setCurrentRoom(decoded.roomId);
        localStorage.setItem('gekko_session_start', Date.now().toString());
        localStorage.setItem('gekko_current_room', decoded.roomId);
        
        // URL SOFORT BEREINIGEN - Der Token verschwindet aus der Adresszeile!
        // Wir lassen nur noch ?room=... zur Info stehen, aber ohne den Access-Token
        const cleanUrl = window.location.origin + window.location.pathname + `?room=${decoded.roomId}`;
        window.history.replaceState({}, '', cleanUrl);
      }
    } 
    // 3. Fallback / Session-Wiederherstellung
    else if (roomIdDirect) {
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
  }, []);

  const checkExpiry = useCallback(() => {
    if (isPreview || showAdmin) {
      setIsExpired(false);
      return;
    }

    const startTimeStr = localStorage.getItem('gekko_session_start');
    const storedRoom = localStorage.getItem('gekko_current_room');

    if (!startTimeStr || !currentRoomId || currentRoomId !== storedRoom) {
      setIsExpired(true);
      return;
    }

    const startTime = parseInt(startTimeStr, 10);
    const now = Date.now();

    if (now - startTime > SESSION_DURATION_MS) {
      setIsExpired(true);
    } else {
      setIsExpired(false);
    }
  }, [currentRoomId, isPreview, showAdmin]);

  useEffect(() => {
    checkExpiry();
    const timer = setInterval(checkExpiry, 5000);
    return () => clearInterval(timer);
  }, [checkExpiry]);

  const refreshData = useCallback(async () => {
    if ((isExpired && !isPreview) || !currentRoomId || showAdmin) return;

    try {
      const data = await gekkoService.fetchStatus(currentRoomId);
      setStatus(data);
    } catch (e: any) {
      console.error("Status-Update Fehler:", e);
    }
  }, [isExpired, isPreview, currentRoomId, showAdmin]);

  useEffect(() => {
    if (currentRoomId && !showAdmin) {
      refreshData();
      const interval = setInterval(refreshData, POLLING_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [refreshData, currentRoomId, showAdmin]);

  const handleTempAdjust = async (delta: number) => {
    if (!status || (isExpired && !isPreview) || !currentRoomId) return;
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

  if (showAdmin) {
    return (
      <AdminPanel 
        onClose={() => {
          setShowAdmin(false);
          if (window.location.pathname.includes('admin')) {
             window.location.href = "/";
          }
        }} 
        onPreviewRoom={(id) => { 
          setIsPreview(true); 
          setCurrentRoomId(id); 
          gekkoService.setCurrentRoom(id); 
          setShowAdmin(false); 
          refreshData(); 
        }} 
      />
    );
  }

  if (!currentRoomId || (isExpired && !isPreview)) {
    return (
      <div className="h-screen w-full max-w-md mx-auto relative overflow-hidden shadow-2xl bg-[#00828c]">
        <ExpiredScreen onAdminClick={() => setShowAdmin(true)} />
        <div 
          className="absolute top-0 left-0 w-full h-24" 
          onMouseDown={handleAdminStart} 
          onMouseUp={handleAdminEnd} 
          onTouchStart={handleAdminStart} 
          onTouchEnd={handleAdminEnd} 
        />
      </div>
    );
  }

  if (loading || !status) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e0e4e7]">
        <div className="w-12 h-12 border-4 border-[#00828c]/20 border-t-[#00828c] rounded-full animate-spin mb-4"></div>
        <span className="text-[10px] font-bold text-[#00828c] uppercase tracking-widest">Initialisierung...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative overflow-hidden select-none">
      <div onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd}>
        <Header 
          roomName={status.roomName} 
          category={status.category} 
          onBack={isPreview ? () => { setIsPreview(false); window.location.reload(); } : logout} 
          showBack={isPreview || !!currentRoomId} 
          isLogout={!isPreview}
        />
      </div>
      <main className="flex-1 flex flex-col relative">
        <MainControl 
          soll={status.sollTemp} 
          ist={status.istTemp} 
          offset={status.offset} 
          mode={status.betriebsart} 
          onAdjust={handleTempAdjust} 
        />
        <StatusLine regler={status.reglerPercent} ventilator={status.ventilatorState} />
        <Footer hauptMode={status.hauptbetriebsart} subMode={status.betriebsart} feuchte={status.feuchte} />
      </main>
    </div>
  );
};

export default App;
