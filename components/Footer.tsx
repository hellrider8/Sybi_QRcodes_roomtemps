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

          {/* Feuchte - Nur anzeigen wenn vorhanden (>= 0) */}
          {feuchte >= 0 && (
            <div className="flex justify-between items-center text-white pt-2 border-t border-white/5">
              <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Feuchte</span>
              <span className="text-sm font-light tracking-wider mr-2">{feuchte.toFixed(1)} % rF</span>
            </div>
          )}

          {/* Branding Link */}
          <div className="text-center pt-6 opacity-30 hover:opacity-100 transition-opacity">
            <a 
              href="https://www.sybtec.de" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[10px] text-white font-bold uppercase tracking-[0.3em] hover:text-white"
            >
              powered by sybtec
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Footer;