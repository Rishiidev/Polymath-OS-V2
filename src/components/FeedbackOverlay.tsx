import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy } from 'lucide-react';
import { FeedbackData } from '../types';

export const FeedbackOverlay = ({ feedback, onDismiss }: { feedback: FeedbackData | null; onDismiss: () => void }) => (
  <AnimatePresence>
    {feedback && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="fixed inset-0 flex items-center justify-center z-[200] p-6 cursor-pointer"
        onClick={onDismiss}
      >
        <div className="bg-[var(--accent)] text-[var(--accent-text)] p-8 rounded-[40px] shadow-[0_0_60px_var(--accent-glow)] flex flex-col items-center gap-4 text-center max-w-sm border-4 border-white/20">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.8, ease: "easeInOut", repeat: Infinity }}
            className="w-20 h-20 bg-[var(--bg-primary)]/10 rounded-full flex items-center justify-center"
          >
            <Trophy size={40} />
          </motion.div>
          <div>
            <h3 className="text-3xl font-black tracking-tighter uppercase">
              {feedback.trait === 'discipline' ? 'DISCIPLINE UPGRADED' :
               feedback.trait === 'courage' ? 'COURAGE UPGRADED' : 'CONSISTENCY UPGRADED'}
            </h3>
            <p className="font-bold opacity-80 leading-tight mt-3 text-lg">
              {feedback.text}
            </p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="bg-[var(--bg-primary)] text-[var(--text-primary)] px-6 py-3 rounded-full text-lg font-mono font-bold overflow-hidden whitespace-nowrap mt-2 shadow-inner"
          >
            +{feedback.value} {feedback.trait.toUpperCase()}
          </motion.div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
