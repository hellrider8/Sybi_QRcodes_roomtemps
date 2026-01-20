
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.tsx';
import MainControl from './components/MainControl.tsx';
import StatusLine from './components/StatusLine.tsx';
import Footer from './components/Footer.tsx';
import ExpiredScreen from './components/ExpiredScreen.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { gekkoService } from './services/gekkoService.ts';
import { GekkoStatus } from './types.ts';

const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 Minuten
const POLLING_INTERVAL_MS = 10000; // 10 Sekunden Status-Update

const App: React.FC = () => {
  const [status, setStatus] = useState<GekkoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  const pressTimer = useRef<number | null>(null);

  // Initialisierung & URL-Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomIdFromUrl = params.get('room');
    const hasAccessFlag = params.get('access') === 'true';
    
    const config = gekkoService.getConfig();

    // 1. Fall: Ein Raum wird über URL/QR aufgerufen
    if (roomIdFromUrl) {
      const roomValid = config.rooms.find(r => r.id === roomIdFromUrl);
      
      if (roomValid) {
        setCurrentRoomId(roomIdFromUrl);
        gekkoService.setCurrentRoom(roomIdFromUrl);
        
        // Wenn 'access=true' dabei ist -> Timer neu starten (neuer Scan)
        if (hasAccessFlag) {
          localStorage.setItem('gekko_session_start', Date.now().toString());
          localStorage.setItem('gekko_current_room', roomIdFromUrl);
          // URL säubern (access=true entfernen)
          const newUrl = window.location.pathname + `?room=${roomIdFromUrl}`;
          window.history.replaceState({}, '', newUrl);
        }
      }
    } 
    // 2. Fall: Kein Raum in URL, schaue ob noch einer im Speicher ist
    else {
      const storedRoom = localStorage.getItem('gekko_current_room');
      if (storedRoom) {
        setCurrentRoomId(storedRoom);
        gekkoService.setCurrentRoom(storedRoom);
      }
    }
    
    setLoading(false);
  }, []);

  // Expiry Check Logic
  const checkExpiry = useCallback(() => {
    if (isPreview) {
      setIsExpired(false);
      return;
    }

    const startTimeStr = localStorage.getItem('gekko_session_start');
    const storedRoom = localStorage.getItem('gekko_current_room');

    // Wenn kein Startzeitpunkt oder kein Raum -> Sofort Sperren
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
  }, [currentRoomId, isPreview]);

  // Timer für Expiry
  useEffect(() => {
    checkExpiry();
    const timer = setInterval(checkExpiry, 5000);
    return () => clearInterval(timer);
  }, [checkExpiry]);

  // Daten-Polling
  const refreshData = useCallback(async () => {
    if (isExpired && !isPreview) return;
    if (!currentRoomId) return;

    try {
      const data = await gekkoService.fetchStatus(currentRoomId);
      setStatus(data);
    } catch (e: any) {
      console.error("Fetch Error:", e);
    }
  }, [isExpired, isPreview, currentRoomId]);

  useEffect(() => {
    if (currentRoomId) {
      refreshData();
      const interval = setInterval(refreshData, POLLING_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [refreshData, currentRoomId]);

  const handleTempAdjust = async (delta: number) => {
    if (!status || (isExpired && !isPreview) || !currentRoomId) return;
    
    const newOffset = parseFloat((status.offset + delta).toFixed(2));
    const newSoll = parseFloat((status.sollTemp + delta).toFixed(2));
    
    // Optimistisches UI Update
    setStatus(prev => prev ? { ...prev, sollTemp: newSoll, offset: newOffset } : null);
    
    const success = await gekkoService.setAdjustment(newOffset, currentRoomId);
    if (!success) {
      // Bei Fehler zurückrollen oder Refresh erzwingen
      refreshData();
    }
  };

  const handleAdminStart = () => {
    pressTimer.current = window.setTimeout(() => {
      const pw = prompt("Admin Passwort eingeben:");
      if (pw === "sybtec" || pw === "") setShowAdmin(true);
    }, 2000);
  };

  const handleAdminEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Render Logic
  if (showAdmin) {
    return (
      <AdminPanel 
        onClose={() => setShowAdmin(false)} 
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
      <div className="h-screen w-full max-w-md mx-auto relative overflow-hidden shadow-2xl">
        <ExpiredScreen />
        <div 
          className="absolute top-0 left-0 w-full h-20" 
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
      <div className="h-screen w-full flex items-center justify-center bg-[#e0e4e7]">
        <div className="w-10 h-10 border-2 border-t-transparent border-[#00828c] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative overflow-hidden select-none">
      <div onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd}>
        <Header 
          roomName={status.roomName} 
          category={status.category} 
          onBack={() => { setIsPreview(false); window.location.reload(); }} 
          showBack={isPreview} 
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
