
import React from 'react';

interface FooterProps {
  hauptMode: string;
  subMode: string;
  feuchte: number;
}

const Footer: React.FC<FooterProps> = ({ hauptMode, subMode, feuchte }) => {
  const hasValidHumidity = feuchte > 0;

  // Logik für die Alarm-Farben (Rot bei Aus oder Hand)
  const isHauptAlert = hauptMode.toUpperCase().includes('AUS') || hauptMode.toUpperCase().includes('HAND');
  
  // Die Hauptbetriebsart wird rot, wenn sie nicht im Automatik-Modus ist (laut Screenshots)
  const hauptBg = isHauptAlert ? '#ef4444' : 'var(--color-secondary)';
  
  // Die Betriebsart (Sub-Modus) behält meistens die Akzentfarbe oder Grau
  const subBg = isHauptAlert ? 'var(--color-secondary)' : 'var(--color-accent)';

  // Formatierung der Labels für bessere Lesbarkeit (z.B. "HANDBETRIEB" statt "HAND")
  const formatLabel = (label: string) => {
    const l = label.toUpperCase();
    if (l === 'AUTOMATIK') return 'AUTOMATIK';
    if (l.includes('AUS')) return 'AUSGESCHALTET';
    if (l.includes('HAND')) return 'HANDBETRIEB';
    return l;
  };

  return (
    <div className="mt-auto w-full">
      <div 
        className="rounded-t-[3rem] p-10 pb-8 shadow-[0_-10px_25px_rgba(0,0,0,0.08)]"
        style={{backgroundColor: 'var(--color-primary)'}}
      >
        <div className="max-w-md mx-auto space-y-5">
          
          {/* Hauptbetriebsart */}
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Hauptbetriebsart</span>
            <div 
              className="px-6 py-2 rounded-[2px] min-w-[140px] text-xs font-bold tracking-wide shadow-md uppercase text-center flex items-center justify-center transition-colors duration-300"
              style={{backgroundColor: hauptBg}}
            >
              {formatLabel(hauptMode)}
            </div>
          </div>

          {/* Betriebsart */}
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-extralight uppercase tracking-widest opacity-80">Betriebsart</span>
            <div 
              className="px-6 py-2 rounded-[2px] min-w-[140px] text-xs font-bold tracking-wide border border-white/10 shadow-sm uppercase text-center flex items-center justify-center transition-colors duration-300"
              style={{backgroundColor: subBg}}
            >
              {subMode.toUpperCase()}
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
