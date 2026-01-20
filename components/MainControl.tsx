
import React from 'react';

interface MainControlProps {
  soll: number;
  ist: number;
  offset: number;
  mode: string;
  onAdjust: (delta: number) => void;
}

const MainControl: React.FC<MainControlProps> = ({ soll, ist, offset, mode, onAdjust }) => {
  const isBlocked = mode !== 'KOMFORT';

  return (
    <div className="flex flex-col items-center justify-center py-10 scale-110 sm:scale-100">
      <div className="bg-[#00828c] p-6 w-72 shadow-xl flex flex-col gap-4">
        {/* Temperature Display Row */}
        <div className="space-y-4 px-1">
          <div className="flex justify-between items-baseline text-white">
            <span className="text-xs uppercase tracking-widest font-extralight opacity-80">Soll</span>
            <span className="text-4xl font-extralight tracking-tighter">{soll.toFixed(1)} <span className="text-xl -ml-1">°C</span></span>
          </div>
          <div className="flex justify-between items-baseline text-white">
            <span className="text-xs uppercase tracking-widest font-extralight opacity-80">Ist</span>
            <span className="text-4xl font-extralight tracking-tighter">{ist.toFixed(1)} <span className="text-xl -ml-1">°C</span></span>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-stretch h-14 gap-1 mt-4">
          <button 
            onClick={() => !isBlocked && onAdjust(-0.5)}
            disabled={isBlocked}
            className={`flex-1 bg-[#535353] text-white flex items-center justify-center text-3xl font-extralight transition-all border-r border-teal-600/20 ${
              isBlocked ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:bg-[#404040] active:scale-95'
            }`}
          >
            —
          </button>
          <div className={`w-24 bg-[#00828c] flex items-center justify-center border border-teal-500/50 text-white font-extralight text-base tracking-tighter transition-opacity ${isBlocked ? 'opacity-50' : 'opacity-100'}`}>
            {offset > 0 ? '+' : ''}{offset.toFixed(1)} °C
          </div>
          <button 
            onClick={() => !isBlocked && onAdjust(0.5)}
            disabled={isBlocked}
            className={`flex-1 bg-[#535353] text-white flex items-center justify-center text-3xl font-extralight transition-all border-l border-teal-600/20 ${
              isBlocked ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:bg-[#404040] active:scale-95'
            }`}
          >
            +
          </button>
        </div>
      </div>
      
      {isBlocked && (
        <p className="text-[9px] text-[#00828c] uppercase tracking-widest mt-4 opacity-60 font-bold">
          Anpassung nur im Komfort-Modus möglich
        </p>
      )}
    </div>
  );
};

export default MainControl;
