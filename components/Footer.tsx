
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

          {/* Sybtec Branding mit Original Logo-SVG (Interlaced S) */}
          <div className="pt-8 flex flex-col justify-center items-center gap-2">
            <div className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
               <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  {/* Purple Interlaced Path Style (The stylized S) */}
                  <path 
                    d="M20,30 C20,10 80,10 80,30 L80,45 C80,55 70,55 70,55 L30,55 C20,55 20,65 20,75 L20,90" 
                    fill="none" 
                    stroke="#4B0082" 
                    strokeWidth="14" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Green Interlaced Path Style */}
                  <path 
                    d="M80,10 L80,25 C80,35 70,35 70,35 L30,35 C20,35 20,45 20,55 L20,70 C20,90 80,90 80,70" 
                    fill="none" 
                    stroke="#76C74D" 
                    strokeWidth="14" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
               </svg>
               <a 
                href="https://www.sybtec.de/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-white uppercase tracking-[0.4em] font-light"
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
