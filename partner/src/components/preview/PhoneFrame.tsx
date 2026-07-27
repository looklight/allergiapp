'use client';

// Cornice telefono per l'anteprima della scheda app.
export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[360px] rounded-[44px] border-[10px] border-[#1a1a1a] bg-[#1a1a1a] shadow-2xl">
      <div className="overflow-hidden rounded-[34px] bg-white">
        {/* Status bar */}
        <div className="flex h-9 items-center justify-between px-7 pt-1">
          <span className="text-[13px] font-semibold text-[#333333]">9:41</span>
          <div className="flex items-center gap-1.5">
            <svg className="h-3 w-4 text-[#333333]" viewBox="0 0 16 12" fill="currentColor">
              <path d="M8 9.5a2 2 0 110 2.5 2 2 0 010-2.5zM4.5 7.5a5 5 0 017 0l-1.4 1.4a3 3 0 00-4.2 0zM1.5 4.5a9.5 9.5 0 0113 0l-1.4 1.4a7.5 7.5 0 00-10.2 0z" />
            </svg>
            <svg className="h-3 w-6 text-[#333333]" viewBox="0 0 24 12">
              <rect x="0.5" y="0.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" />
              <rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor" />
              <rect x="21.5" y="4" width="2" height="4" rx="1" fill="currentColor" />
            </svg>
          </div>
        </div>
        {/* Contenuto scrollabile */}
        <div className="h-[560px] overflow-y-auto">{children}</div>
        {/* Home indicator */}
        <div className="flex h-6 items-center justify-center">
          <div className="h-1 w-32 rounded-full bg-[#1a1a1a]/80" />
        </div>
      </div>
    </div>
  );
}
