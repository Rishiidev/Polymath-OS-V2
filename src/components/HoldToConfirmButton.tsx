import React, { useState, useRef, useEffect } from 'react';

export const HoldToConfirmButton = ({ onConfirm, label }: { onConfirm: () => void; label: string }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        onConfirm();
      }
    }, 16);
  };

  const stopHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full py-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] font-black text-xl overflow-hidden group touch-none select-none"
      style={{ WebkitTouchCallout: 'none' }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-[var(--bg-primary)]/20"
        style={{ height: `${progress}%` }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isHolding ? "Confirming..." : label}
      </span>
    </button>
  );
};
