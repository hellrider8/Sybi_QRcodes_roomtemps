
import React from 'react';

interface FooterProps {
  hauptMode: string;
  subMode: string;
  feuchte: number;
}

const Footer: React.FC<FooterProps> = ({ hauptMode, subMode, feuchte }) => {
  return (
    <div className="mt-auto w-full">
      {/* Main Footer Panel */}
      <div className="bg-[#00828c] rounded-t-[3rem] p-10 pb-8 shadow-[0_-10px_25px_rgba(0,0,0,0.08)]">
        <div className="max-w-md mx-auto space-y-5">
          
          {/* Hauptbetriebsart */}
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Hauptbetriebsart</span>
            <button className="bg-[#535353] px-6 py-2 rounded-[2px] min-w-[130px] text-xs font-normal tracking-wide hover:bg-[#404040] active:scale-95 transition-all shadow-sm uppercase">
              {hauptMode}
            </button>
          </div>

          {/* Betriebsart */}
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Betriebsart</span>
            <button className="bg-[#006a72] px-6 py-2 rounded-[2px] min-w-[130px] text-xs font-normal tracking-wide border border-white/10 hover:bg-[#005a61] active:scale-95 transition-all shadow-sm uppercase">
              {subMode}
            </button>
          </div>

          {/* Feuchte */}
          <div className="flex justify-between items-center text-white pt-2 border-t border-white/5">
            <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Feuchte</span>
            <span className="text-sm font-light tracking-wider mr-2">{feuchte.toFixed(1)} % rF</span>
          </div>

          {/* Sybtec Branding mit korrigiertem S-Logo */}
          <div className="pt-8 flex justify-center items-center">
            <a 
              href="https://www.sybtec.de/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 group transition-opacity hover:opacity-100 opacity-90"
            >
              <div className="relative w-8 h-8">
                <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-sm">
                  {/* Purple Part of the S (Top Hook) */}
                  <path 
                    d="M 22,45 C 22,10 78,10 78,45 C 78,55 65,60 50,60" 
                    fill="none" 
                    stroke="#9333ea" 
                    strokeWidth="18" 
                    strokeLinecap="round"
                  />
                  {/* Green Part of the S (Bottom Hook) */}
                  <path 
                    d="M 78,75 C 78,110 22,110 22,75 C 22,65 35,60 50,60" 
                    fill="none" 
                    stroke="#84cc16" 
                    strokeWidth="18" 
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-[10px] text-white uppercase tracking-[0.4em] font-light mt-1">
                powered by sybtec
              </span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Footer;
