import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export const HoldToExitButton = ({ onExit }: { onExit: () => void }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsHolding(true);
    setProgress(0);
    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / 2000) * 100, 100);
      setProgress(p);

      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsHolding(false);
        onExit();
      }
    }, 16);
  };

  const stopHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex items-center gap-3">
      {isHolding && (
        <span className="text-xs font-mono text-red-500 uppercase tracking-widest animate-pulse">
          Hold to quit
        </span>
      )}
      <button
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-primary)] overflow-hidden group touch-none select-none"
        style={{ WebkitTouchCallout: 'none' }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 bg-red-500/40"
          style={{ height: `${progress}%` }}
        />
        <X size={24} className={`relative z-10 transition-colors ${isHolding ? 'text-red-500' : 'group-hover:text-red-400'}`} />
      </button>
    </div>
  );
};
