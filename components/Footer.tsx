
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

          {/* Sybtec Branding Watermark with Logo */}
          <div className="pt-8 flex flex-col justify-center items-center gap-2">
            <div className="flex items-center gap-2.5 opacity-25 hover:opacity-60 transition-opacity">
               <svg width="22" height="22" viewBox="0 0 100 100" className="fill-white">
                  {/* Clean Sybtec Symbol Style */}
                  <path d="M50 5 L95 50 L50 95 L5 50 Z" stroke="white" strokeWidth="2" fill="none" />
                  <path d="M50 20 L80 50 L50 80 L20 50 Z" fill="white" />
                  <rect x="40" y="40" width="20" height="20" fill="#00828c" transform="rotate(45 50 50)" />
               </svg>
               <a 
                href="https://www.sybtec.de/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[9px] text-white uppercase tracking-[0.4em] font-light"
               >
                powered by sybtec
               </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Footer;
