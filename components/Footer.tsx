
import React from 'react';

interface FooterProps {
  subMode: string;
  feuchte: number;
}

const Footer: React.FC<FooterProps> = ({ subMode, feuchte }) => {
  const hasValidHumidity = feuchte > 0;

  // Logik für Alarm-Farbe (Rot bei AUS oder HAND)
  const modeUpper = subMode.toUpperCase();
  const isAlert = modeUpper === 'AUS' || modeUpper === 'HAND';
  
  const modeBg = isAlert ? '#ef4444' : 'var(--color-accent)';

  return (
    <div className="mt-auto w-full">
      <div 
        className="rounded-t-[3rem] p-10 pb-8 shadow-[0_-10px_25px_rgba(0,0,0,0.08)]"
        style={{backgroundColor: 'var(--color-primary)'}}
      >
        <div className="max-w-md mx-auto space-y-5">
          
          {/* Einzige Betriebsart Anzeige */}
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Betriebsart</span>
            <div 
              className="px-8 py-2.5 rounded-[2px] min-w-[150px] text-xs font-bold tracking-widest shadow-md uppercase text-center flex items-center justify-center transition-colors duration-300 border border-white/5"
              style={{backgroundColor: modeBg}}
            >
              {modeUpper}
            </div>
          </div>

          {hasValidHumidity && (
            <div className="flex justify-between items-center text-white pt-2 border-t border-white/5">
              <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Feuchte</span>
              <span className="text-sm font-light tracking-wider mr-2">{feuchte.toFixed(1)} % rF</span>
            </div>
          )}

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
