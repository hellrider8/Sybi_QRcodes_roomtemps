
// Added React import to fix namespace error
import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

interface HeaderProps {
  roomName: string;
  category: string;
  onBack?: () => void;
  showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ roomName, category, onBack, showBack }) => {
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
      {/* Time & Date on the left */}
      <div className="flex flex-col leading-tight absolute left-4 z-20">
        <span className="text-xl font-light tracking-tight">{formatTime(time)}</span>
        <span className="text-[10px] font-extralight opacity-80 uppercase tracking-wider">{formatDate(time)}</span>
      </div>

      {/* Centered Title and Info */}
      <div className="flex-1 text-center">
        <h1 className="text-xl font-extralight leading-none tracking-wide">Raumregelung</h1>
        <p className="text-[11px] font-extralight mt-1 opacity-90 uppercase tracking-tighter">
          <span className="font-semibold">{category || 'RÄUME'}</span> | <span>{roomName}</span>
        </p>
      </div>

      {/* Conditional Back button on the right */}
      {showBack && (
        <div className="absolute right-4 flex items-center z-20">
          <button 
            onClick={onBack}
            className="p-1 hover:bg-black/10 rounded transition-colors"
          >
            <ChevronLeft size={30} strokeWidth={1} className="cursor-pointer" />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;