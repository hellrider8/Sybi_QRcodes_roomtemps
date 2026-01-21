
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

  return (
    <header className="bg-[#00828c] text-white h-16 flex items-center px-4 shadow-md z-10 relative overflow-hidden">
      <div className="flex flex-col leading-tight absolute left-4 z-20">
        <span className="text-xl font-light tracking-tight">{formatTime(time)}</span>
        <span className="text-[10px] font-extralight opacity-80 uppercase tracking-wider">{formatDate(time)}</span>
      </div>

      <div className="flex-1 text-center px-12 sm:px-16">
        <div className="flex items-center justify-center gap-1 mb-1">
          <h1 className="text-[10px] font-extralight leading-none tracking-[0.2em] opacity-70 uppercase">Raumregelung</h1>
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
        <div className="absolute right-4 flex items-center z-20">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-black/10 rounded-full transition-colors flex items-center gap-1"
            title={isLogout ? "Abmelden" : "Zurück"}
          >
            {isLogout ? (
              <LogOut size={20} strokeWidth={1.5} className="cursor-pointer text-white/70 hover:text-white" />
            ) : (
              <ChevronLeft size={24} strokeWidth={1.5} className="cursor-pointer" />
            )}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
