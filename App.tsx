
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const hasAccess = params.get('access') === 'true';
    
    const config = gekkoService.getConfig();
    const roomValid = config.rooms.find(r => r.id === roomId && r.enabled);

    if (roomId && roomValid) {
      setCurrentRoomId(roomId);
      gekkoService.setCurrentRoom(roomId);
      
      if (hasAccess) {
        localStorage.setItem('gekko_session_start', Date.now().toString());
        localStorage.setItem('gekko_current_room', roomId);
        window.history.replaceState({}, '', window.location.pathname + `?room=${roomId}`);
      }
    } else {
      const storedRoom = localStorage.getItem('gekko_current_room');
      if (storedRoom) {
        setCurrentRoomId(storedRoom);
        gekkoService.setCurrentRoom(storedRoom);
      }
    }
  }, []);

  const checkExpiry = useCallback(() => {
    if (isPreview) {
      setIsExpired(false);
      return;
    }
    const startTimeStr = localStorage.getItem('gekko_session_start');
    if (!startTimeStr || !currentRoomId) {
      setIsExpired(true);
      return;
    }
    if (Date.now() - parseInt(startTimeStr, 10) > SESSION_DURATION_MS) {
      setIsExpired(true);
    } else {
      setIsExpired(false);
    }
  }, [currentRoomId, isPreview]);

  useEffect(() => {
    checkExpiry();
    const timer = setInterval(checkExpiry, 5000);
    return () => clearInterval(timer);
  }, [checkExpiry]);

  const refreshData = useCallback(async () => {
    if ((isExpired && !isPreview) || !currentRoomId) return;
    try {
      const data = await gekkoService.fetchStatus(currentRoomId);
      setStatus(data);
      setLoading(false);
    } catch (e: any) {
      console.error("Fetch Error", e);
      setLoading(false);
    }
  }, [isExpired, isPreview, currentRoomId]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleTempAdjust = async (delta: number) => {
    if (!status || (isExpired && !isPreview) || !currentRoomId) return;
    const newOffset = parseFloat((status.offset + delta).toFixed(2));
    const newSoll = parseFloat((status.sollTemp + delta).toFixed(2));
    setStatus(prev => prev ? { ...prev, sollTemp: newSoll, offset: newOffset } : null);
    await gekkoService.setAdjustment(newOffset, currentRoomId);
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

  if (showAdmin) return <AdminPanel onClose={() => setShowAdmin(false)} onPreviewRoom={(id) => { setIsPreview(true); setCurrentRoomId(id); gekkoService.setCurrentRoom(id); setShowAdmin(false); setLoading(true); refreshData(); }} />;

  if (!currentRoomId || (isExpired && !isPreview)) return (
    <div className="h-screen w-full max-w-md mx-auto relative overflow-hidden shadow-2xl">
      <ExpiredScreen />
      <div className="absolute top-0 left-0 w-full h-20" onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd} />
    </div>
  );

  if (loading || !status) return <div className="h-screen w-full flex items-center justify-center bg-[#e0e4e7]"><div className="w-10 h-10 border-2 border-t-transparent border-[#00828c] rounded-full animate-spin"></div></div>;

  return (
    <div className="h-screen flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative overflow-hidden select-none">
      <div onMouseDown={handleAdminStart} onMouseUp={handleAdminEnd} onTouchStart={handleAdminStart} onTouchEnd={handleAdminEnd}>
        <Header roomName={status.roomName} category={status.category} onBack={() => setIsPreview(false)} showBack={isPreview} />
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
