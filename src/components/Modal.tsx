import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  children?: React.ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  onConfirm,
  cancelText = "Cancel",
  variant = "primary",
  children
}: ModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-[var(--text-primary)] font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[40px] p-8 w-full max-w-sm shadow-2xl"
        >
          <h3 className="text-2xl font-black tracking-tighter mb-2">{title}</h3>
          <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">{description}</p>
          {children}
          <div className="flex flex-col gap-3">
            <Button onClick={onConfirm} variant={variant === 'danger' ? 'danger' : 'primary'}>
              {confirmText}
            </Button>
            <Button onClick={onClose} variant="outline">
              {cancelText}
            </Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
