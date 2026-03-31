import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Timer, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';
import { useApp } from '../context/AppContext';
import { formatTime } from '../utils/helpers';
import { getFallbackAction } from '../utils/taskEngine';
import { notifyTimerComplete } from '../utils/notifications';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { HoldToExitButton } from '../components/HoldToExitButton';
import { HoldToConfirmButton } from '../components/HoldToConfirmButton';

export const ActionScreen = () => {
  const { state, dispatch } = useApp();
  const task = state.currentTask!;

  const [startTime] = useState<number>(() => {
    const saved = localStorage.getItem(`task_start_${task.id}`);
    return saved ? parseInt(saved, 10) : Date.now();
  });

  useEffect(() => {
    localStorage.setItem(`task_start_${task.id}`, startTime.toString());
  }, [startTime, task.id]);

  const [screen, setScreen] = useState<'executing' | 'confirming' | 'fallback'>('executing');
  const [timeLeft, setTimeLeft] = useState(task.durationSeconds);
  const [countdown, setCountdown] = useState(3);
  const [abandonModal, setAbandonModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (countdown > 0 || screen !== 'executing') return;
    const checkTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, task.durationSeconds - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setScreen('confirming');
        if (state.settings.timerCompletion) notifyTimerComplete(task.text);
      }
    };
    checkTimer();
    const timer = setInterval(checkTimer, 1000);
    return () => clearInterval(timer);
  }, [startTime, task.durationSeconds, countdown, screen]);

  const progress = Math.min(100, ((task.durationSeconds - timeLeft) / task.durationSeconds) * 100);
  const percentDone = Math.round(progress);

  const getAccountabilityMessage = () => {
    if (percentDone < 30) return "Lock in. Focus.";
    if (percentDone < 60) return "Stay with it.";
    if (percentDone < 90) return "Don't quit now.";
    return "Almost there. Finish strong.";
  };

  const handleComplete = () => {
    dispatch({ type: 'COMPLETE_TASK', task });
    localStorage.removeItem(`task_start_${task.id}`);
  };

  const handleAbandon = () => {
    dispatch({ type: 'ABANDON_TASK' });
    localStorage.removeItem(`task_start_${task.id}`);
  };

  if (countdown > 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans z-50 flex flex-col items-center justify-center p-8">
        <p className="text-[var(--text-muted)] font-mono uppercase tracking-widest mb-4">Locking in</p>
        <motion.div key={countdown} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-9xl font-black tabular-nums">
          {countdown}
        </motion.div>
      </motion.div>
    );
  }

  if (screen === 'confirming') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans z-50 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-5xl font-black tracking-tighter mb-12">Did you actually do it?</h2>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button onClick={() => setCompleteModal(true)} className="w-full py-6 text-xl">✅ Yes, I did it</Button>
          <Button onClick={() => setScreen('fallback')} variant="outline" className="w-full py-6 text-xl">❌ Not yet</Button>
        </div>
        <Modal isOpen={completeModal} onClose={() => setCompleteModal(false)} title="CONFIRM COMPLETION" description="Confirm that you have physically executed this action. No shortcuts." confirmText="Confirm Completion" onConfirm={() => { handleComplete(); setCompleteModal(false); }} />
      </motion.div>
    );
  }

  if (screen === 'fallback') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans z-50 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-3xl font-black tracking-tighter mb-6">Do this smaller version</h2>
        <p className="text-[var(--text-secondary)] mb-12">
          Original: "{task.text}"<br />
          {/* FIX BUG #4: Dynamic fallback instead of hardcoded string */}
          Fallback: "{getFallbackAction(task)}"
        </p>
        <Button onClick={handleAbandon} variant="outline" className="w-full">Back to Dashboard</Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans z-50 flex flex-col p-8">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Timer size={20} />
          <span className="font-mono font-bold tracking-widest uppercase">Executing</span>
        </div>
        <HoldToExitButton onExit={() => setAbandonModal(true)} />
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 max-w-md mx-auto w-full">
        <div className="space-y-4 text-center">
          <h2 className="text-4xl font-black tracking-tighter leading-tight">{task.text}</h2>
          <p className="text-[var(--text-muted)] text-lg">Focus entirely on this one micro-action. Do not look away.</p>
        </div>

        <div className="relative aspect-square flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="stroke-[var(--border-primary)] fill-none" strokeWidth="4" />
            <motion.circle cx="50" cy="50" r="45" className="stroke-[var(--accent)] fill-none" strokeWidth="4" strokeDasharray="282.743" animate={{ strokeDashoffset: 282.743 - (progress / 100) * 282.743 }} transition={{ duration: 1, ease: "linear" }} />
          </svg>
          <div className="flex flex-col items-center z-10">
            <div className="text-7xl font-black tabular-nums tracking-tighter">{formatTime(timeLeft)}</div>
            <div className="text-lg font-mono text-[var(--text-muted)] uppercase tracking-widest mt-1">{percentDone}% done</div>
          </div>
        </div>

        <div className="text-center text-[var(--accent)] font-mono text-sm tracking-widest uppercase animate-pulse">
          {getAccountabilityMessage()}
        </div>
      </div>

      <div className="mt-auto pb-8">
        <HoldToConfirmButton onConfirm={() => setCompleteModal(true)} label="Mark as Done" />
      </div>

      {/* Abandon Modal */}
      <Modal isOpen={abandonModal} onClose={() => setAbandonModal(false)} title="ABANDON ACTION?" description="Momentum is fragile. If you stop now, the resistance wins. Are you sure?" confirmText="Abandon Action" variant="danger" onConfirm={() => { handleAbandon(); setAbandonModal(false); }} />

      {/* Complete Modal */}
      <Modal isOpen={completeModal} onClose={() => setCompleteModal(false)} title="CONFIRM COMPLETION" description="Confirm that you have physically executed this action. No shortcuts." confirmText="Confirm Completion" onConfirm={() => { handleComplete(); setCompleteModal(false); }} />
    </motion.div>
  );
};
