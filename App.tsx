
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MainControl from './components/MainControl';
import StatusLine from './components/StatusLine';
import Footer from './components/Footer';
import ExpiredScreen from './components/ExpiredScreen';
import AdminPanel from './components/AdminPanel';
import { gekkoService } from './services/gekkoService';
import { GekkoStatus } from './types';
import { Bug, AlertTriangle } from 'lucide-react';

const SESSION_DURATION_MS = 15 * 60 * 1000;
const POLLING_INTERVAL_MS = 10000;

const App: React.FC = () => {
  const [status, setStatus] = useState<GekkoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [rawDebug, setRawDebug] = useState<string>("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const pressTimer = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const hasAccess = params.get('access') === 'true';
    const isTest = params.get('test') === 'true';
    
    const config = gekkoService.getConfig();
    const roomValid = config.rooms.find(r => r.id === roomId && r.enabled);

    if (isTest) {
      localStorage.setItem('gekko_test_mode', 'true');
    }

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
    const isTestMode = localStorage.getItem('gekko_test_mode') === 'true';
    if (isTestMode) {
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
      setRawDebug(gekkoService.lastRawStatus);
      setIsRateLimited(false);
      setLoading(false);
    } catch (e: any) {
      if (e.message?.includes('429')) {
        setIsRateLimited(true);
        setRawDebug("RATE LIMIT (429): Polling pausiert...");
      }
      console.error(e);
      setLoading(false);
    }
  }, [isExpired, isPreview, currentRoomId]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleTempAdjust = async (delta: number) => {
    if (!status || (isExpired && !isPreview) || !currentRoomId || isRateLimited) return;
    if (status.betriebsart !== 'KOMFORT') return;
    
    const newOffset = parseFloat((status.offset + delta).toFixed(2));
    const newSoll = parseFloat((status.sollTemp + delta).toFixed(2));
    
    setStatus(prev => prev ? { ...prev, sollTemp: newSoll, offset: newOffset } : null);
    
    const success = await gekkoService.setAdjustment(newOffset, currentRoomId);
    
    if (!success && gekkoService.lastRawStatus.includes("429")) {
      setIsRateLimited(true);
    }
  };

  const handleAdminStart = () => {
    pressTimer.current = window.setTimeout(() => {
      const pw = prompt("Admin Passwort eingeben:");
      if (pw === "sybtec" || pw === "") {
        setShowAdmin(true);
      }
    }, 2000);
  };

  const handleAdminEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const startPreview = (roomId: string) => {
    setIsPreview(true);
    setCurrentRoomId(roomId);
    gekkoService.setCurrentRoom(roomId);
    setShowAdmin(false);
    setLoading(true);
    refreshData();
  };

  const handleBack = () => {
    if (isPreview) {
      setIsPreview(false);
      setShowAdmin(true);
    }
  };

  if (showAdmin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} onPreviewRoom={startPreview} />;
  }

  if (!currentRoomId || (isExpired && !isPreview)) {
    return (
      <div className="relative h-screen w-full max-w-md mx-auto overflow-hidden shadow-2xl bg-[#00828c] touch-none">
        <ExpiredScreen />
        <div 
          className="absolute top-0 left-0 w-full h-20 z-[100]" 
          onMouseDown={handleAdminStart} 
          onMouseUp={handleAdminEnd}
          onTouchStart={handleAdminStart}
          onTouchEnd={handleAdminEnd}
        />
        {!currentRoomId && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Kein Raum ausgewählt</p>
            <button 
              onClick={() => setShowAdmin(true)}
              className="bg-white/10 text-white/60 text-[10px] px-6 py-2 rounded-full border border-white/20"
            >
              Backend öffnen & Räume einrichten
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading || !status) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#e0e4e7] touch-none">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent border-[#00828c] rounded-full animate-spin"></div>
          <span className="text-[10px] text-[#00828c] uppercase tracking-widest">Lade Raumdaten...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#e0e4e7] max-w-md mx-auto shadow-2xl relative overflow-hidden select-none touch-none">
      <div 
        onMouseDown={handleAdminStart} 
        onMouseUp={handleAdminEnd}
        onTouchStart={handleAdminStart}
        onTouchEnd={handleAdminEnd}
      >
        <Header 
          roomName={status.roomName} 
          category={status.category} 
          onBack={handleBack} 
          showBack={isPreview}
        />
      </div>
      
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {isRateLimited && (
          <div className="absolute top-0 left-0 w-full z-20 bg-amber-500/90 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle size={12} /> API RATE LIMIT - BITTE WARTEN
          </div>
        )}

        <MainControl 
          soll={status.sollTemp} 
          ist={status.istTemp} 
          offset={status.offset}
          mode={status.betriebsart}
          onAdjust={handleTempAdjust} 
        />
        
        <StatusLine 
          regler={status.reglerPercent} 
          ventilator={status.ventilatorState} 
        />
        
        <Footer 
          hauptMode={status.hauptbetriebsart}
          subMode={status.betriebsart}
          feuchte={status.feuchte}
        />
      </main>
      
      {isPreview && (
        <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-2 z-[100]">
          <div className="bg-yellow-500 text-black px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg animate-pulse">
            Vorschau-Modus
          </div>
          <div className="bg-black/80 text-green-400 p-2 rounded text-[8px] font-mono w-full overflow-hidden border border-green-900/50 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1 border-b border-green-900/30 pb-1">
                <Bug size={10} /> <span>RAW SUMSTATE DEBUG</span>
            </div>
            <div className="truncate">{rawDebug || "Warte auf API..."}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
