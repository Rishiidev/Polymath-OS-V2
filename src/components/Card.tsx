import React from 'react';

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[32px] p-6 ${className}`}>
    {children}
  </div>
);
