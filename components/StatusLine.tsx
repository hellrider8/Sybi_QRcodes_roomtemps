
import React from 'react';

interface StatusLineProps {
  regler: number;
  ventilator: number;
}

const StatusLine: React.FC<StatusLineProps> = ({ regler, ventilator }) => {
  const filledBars = regler === 0 ? 0 : Math.ceil(regler / 25);

  return (
    <div className="w-full max-w-sm px-10 mx-auto mt-2 mb-20">
      <div className="border-t border-gray-300 mb-4 opacity-40"></div>
      <div className="flex justify-between items-center text-[#535353] text-[13px] font-extralight px-1">
        <div className="flex gap-6 items-center">
          <span className="opacity-60 uppercase tracking-widest text-[10px] font-bold">Regler</span>
          <span className="font-normal text-sm">{regler}%</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="opacity-60 uppercase tracking-widest text-[10px] font-bold">Ventil</span>
          <div className="flex items-end gap-[4px] h-4 w-10 justify-end">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={`w-[5px] rounded-t-[1.5px] transition-all duration-300 ${i <= filledBars ? '' : 'bg-gray-300/60'}`}
                style={{ 
                    height: `${i * 25}%`,
                    backgroundColor: i <= filledBars ? 'var(--color-primary)' : undefined
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusLine;
