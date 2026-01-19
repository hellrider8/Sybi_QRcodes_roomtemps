
import React from 'react';
import { QrCode, Lock } from 'lucide-react';

const ExpiredScreen: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#00828c] text-white p-10 text-center">
      <div className="mb-8 relative">
        <QrCode size={120} strokeWidth={1} className="opacity-20" />
        <Lock size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>
      <h2 className="text-2xl font-extralight tracking-wide mb-4">Zugriff abgelaufen</h2>
      <p className="text-sm font-extralight opacity-80 leading-relaxed max-w-xs">
        Ihre Sitzung von 15 Minuten ist beendet. Bitte scannen Sie den QR-Code erneut, um die Steuerung für diesen Raum freizuschalten.
      </p>
      <div className="mt-12 border border-white/20 px-6 py-2 rounded-sm text-[10px] uppercase tracking-[0.2em] opacity-60">
        Sicherheitssystem Aktiv
      </div>
    </div>
  );
};

export default ExpiredScreen;
