
import React from 'react';

interface StatusLineProps {
  regler: number;
  ventilator: number;
}

const StatusLine: React.FC<StatusLineProps> = ({ regler, ventilator }) => {
  return (
    <div className="w-full max-w-sm px-10 mx-auto mt-12">
      <div className="border-t border-gray-300 mb-3 opacity-60"></div>
      <div className="flex justify-between text-[#535353] text-[13px] font-extralight px-1">
        <div className="flex gap-6">
          <span className="opacity-70 uppercase tracking-wider">Regler</span>
          <span className="font-normal">{regler}%</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="opacity-70 uppercase tracking-wider">Ventilator</span>
          <div className="flex items-end gap-[3px] h-3.5">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={`w-[3px] rounded-t-[1px] transition-all duration-500 ${i <= ventilator + 1 ? 'bg-[#535353]' : 'bg-gray-300'}`}
                style={{ height: `${i * 25}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusLine;
