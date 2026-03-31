import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
  disabled?: boolean;
}

const variants = {
  primary: 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]',
  secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
  outline: 'border border-[var(--border-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
  danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
};

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false
}: ButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
  >
    {children}
  </button>
);
