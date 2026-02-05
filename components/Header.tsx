
import React, { useState, useEffect } from 'react';
import { ChevronLeft, LogOut, Globe, FlaskConical } from 'lucide-react';

interface HeaderProps {
  roomName: string;
  category: string;
  onBack?: () => void;
  showBack?: boolean;
  isLogout?: boolean;
  isDemo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ roomName, category, onBack, showBack, isLogout, isDemo }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' };
    return date.toLocaleDateString('de-DE', options);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (onBack) onBack();
  };

  return (
    <header 
      className="text-white h-16 flex items-center px-4 shadow-md z-[70] relative overflow-hidden"
      style={{backgroundColor: 'var(--color-primary)'}}
    >
      <div className="flex flex-col leading-tight absolute left-4 z-20 pointer-events-none">
        <span className="text-xl font-light tracking-tight">{formatTime(time)}</span>
        <span className="text-[10px] font-extralight opacity-80 uppercase tracking-wider">{formatDate(time)}</span>
      </div>

      <div className="flex-1 text-center px-12 sm:px-16 pointer-events-none">
        <div className="flex items-center justify-center gap-1 mb-1">
          <h1 className="text-[10px] font-extralight leading-none tracking-[0.2em] opacity-70 uppercase">Steuerung</h1>
          {isDemo ? (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500 text-[8px] font-bold rounded text-white animate-pulse">
              <FlaskConical size={8} /> DEMO
            </span>
          ) : (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500 text-[8px] font-bold rounded text-white">
              <Globe size={8} /> LIVE
            </span>
          )}
        </div>
        <p className="text-[18px] sm:text-[20px] font-bold opacity-100 uppercase tracking-tight leading-tight truncate">
          <span className="font-extralight opacity-80">{category || 'RÄUME'}</span> | <span>{roomName}</span>
        </p>
      </div>

      {showBack && (
        <div className="absolute right-2 flex items-center z-[80]">
          <button 
            onClick={handleAction}
            className="p-3 hover:bg-black/10 active:bg-black/20 rounded-full transition-all flex items-center justify-center"
            aria-label={isLogout ? "Abmelden" : "Zurück"}
          >
            {isLogout ? (
              <LogOut size={22} strokeWidth={2} className="text-white drop-shadow-sm" />
            ) : (
              <ChevronLeft size={26} strokeWidth={2} className="text-white" />
            )}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
