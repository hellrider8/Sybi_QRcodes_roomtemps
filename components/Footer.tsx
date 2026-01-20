
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

          {/* Sybtec Branding mit echtem S-Logo */}
          <div className="pt-8 flex justify-center items-center">
            <a 
              href="https://www.sybtec.de/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 group transition-opacity hover:opacity-100 opacity-90"
            >
              <div className="relative w-8 h-8">
                <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-sm">
                  {/* Purple Part of the S */}
                  <path 
                    d="M30 110 L30 90 C30 70 50 70 50 70 L70 70 C85 70 85 50 85 50 C85 30 70 30 65 30 L40 30 C20 30 20 10 20 10 L20 0" 
                    fill="none" 
                    stroke="#4B0082" 
                    strokeWidth="18" 
                    strokeLinecap="square"
                  />
                  {/* Green Part of the S */}
                  <path 
                    d="M70 10 L70 30 C70 50 50 50 50 50 L30 50 C15 50 15 70 15 70 C15 90 30 90 35 90 L60 90 C80 90 80 110 80 110 L80 120" 
                    fill="none" 
                    stroke="#76C74D" 
                    strokeWidth="18" 
                    strokeLinecap="square"
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
