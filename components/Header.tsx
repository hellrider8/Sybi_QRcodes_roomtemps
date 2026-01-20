
import React, { useState, useEffect } from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';

interface HeaderProps {
  roomName: string;
  category: string;
  onBack?: () => void;
  showBack?: boolean;
  isLogout?: boolean;
}

const Header: React.FC<HeaderProps> = ({ roomName, category, onBack, showBack, isLogout }) => {
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
        <h1 className="text-[10px] font-extralight leading-none tracking-[0.2em] opacity-70 mb-1 uppercase">Raumregelung</h1>
        <p className="text-[20px] font-bold opacity-100 uppercase tracking-tight leading-tight">
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
              <LogOut size={22} strokeWidth={1.5} className="cursor-pointer text-white/70 hover:text-white" />
            ) : (
              <ChevronLeft size={28} strokeWidth={1} className="cursor-pointer" />
            )}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
