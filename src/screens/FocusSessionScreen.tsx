import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';
import { useApp } from '../context/AppContext';
import { formatTime } from '../utils/helpers';
import { notifyTimerComplete } from '../utils/notifications';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { HoldToExitButton } from '../components/HoldToExitButton';

export const FocusSessionScreen = () => {
  const { state, dispatch } = useApp();
  const session = state.focusSession!;
  const { settings } = state;
  const skillName = state.user?.skills.find(s => s.id === session.skillId)?.name;

  const [timeLeft, setTimeLeft] = useState(session.durationMinutes * 60);
  const [countdown, setCountdown] = useState(3);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showStrictConfirm, setShowStrictConfirm] = useState(false);
  const [showEarlyLock, setShowEarlyLock] = useState(false);
  const [showEarlyConfirm, setShowEarlyConfirm] = useState(false);
  // FIX BUG #11: Replace alert() for nudges with in-screen banner
  const [showNudge, setShowNudge] = useState(false);

  const dummyTask: Task = {
    id: 'focus', text: 'Focus Session',
    durationSeconds: session.durationMinutes * 60,
    type: 'planned', completed: false, timestamp: Date.now()
  };

  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener('pointermove', handleActivity);
    return () => window.removeEventListener('pointermove', handleActivity);
  }, []);

  // FIX BUG #11: Replace aggressive alert() with banner
  useEffect(() => {
    if (!settings.aggressiveNudges) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 30000) {
        setShowNudge(true);
        setLastActivity(Date.now());
        setTimeout(() => setShowNudge(false), 3000);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lastActivity, settings.aggressiveNudges]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (countdown > 0) return;
    if (timeLeft <= 0) {
      if (settings.timerCompletion) notifyTimerComplete(session.outcome);
      dispatch({ type: 'COMPLETE_FOCUS', task: { ...dummyTask, completed: true } });
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, countdown]);

  const handleExit = () => {
    // FIX BUG #11: Replace confirm() with modal
    if (settings.strictMode) {
      setShowStrictConfirm(true);
    } else {
      setShowExitConfirm(true);
    }
  };

  const doExit = () => {
    dispatch({ type: 'ABORT_FOCUS', task: dummyTask });
  };

  const handleComplete = () => {
    // FIX BUG #11: Replace alert() and confirm() with modals
    if (settings.earlyCompletion === 'lock' && timeLeft > 0) {
      setShowEarlyLock(true);
      return;
    }
    if (settings.earlyCompletion === 'ask' && timeLeft > 0) {
      setShowEarlyConfirm(true);
      return;
    }
    dispatch({ type: 'COMPLETE_FOCUS', task: { ...dummyTask, completed: true } });
  };

  const progress = (timeLeft / (session.durationMinutes * 60)) * 100;
  const percentDone = Math.round(100 - progress);

  const getAccountabilityMessage = () => {
    if (percentDone < 30) return "No distractions. Execute.";
    if (percentDone < 60) return "Stay with it. Keep pushing.";
    if (percentDone < 90) return "Don't quit now. You're in deep.";
    return "Almost there. Finish strong.";
  };

  if (countdown > 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans z-[150] flex flex-col items-center justify-center p-8">
        <p className="text-[var(--text-muted)] font-mono uppercase tracking-widest mb-4">Entering Deep Work</p>
        <motion.div key={countdown} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-9xl font-black tabular-nums text-[var(--accent)]">
          {countdown}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans z-[150] flex flex-col p-8 overflow-hidden">
      {/* Nudge Banner — FIX BUG #11 */}
      {showNudge && (
        <motion.div initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }} className="absolute top-0 left-0 right-0 bg-[var(--accent)] text-[var(--accent-text)] py-3 text-center font-bold text-sm z-[200]">
          Are you still there? Stay focused!
        </motion.div>
      )}

      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Lock size={20} />
          <span className="font-mono font-bold tracking-widest uppercase">Deep Work Active</span>
        </div>
        {skillName && <div className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Skill: {skillName}</div>}
        <HoldToExitButton onExit={handleExit} />
      </div>

      <div className="flex-1 flex flex-col justify-center gap-12 max-w-md mx-auto w-full">
        <div className="space-y-4 text-center">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Target Outcome</h2>
          <p className="text-3xl font-bold leading-tight italic">"{session.outcome}"</p>
        </div>

        <div className="relative aspect-square flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="stroke-[var(--border-primary)] fill-none" strokeWidth="2" />
            <motion.circle cx="50" cy="50" r="45" className="stroke-[var(--accent)] fill-none" strokeWidth="6" strokeDasharray="282.743" animate={{ strokeDashoffset: 282.743 - (progress / 100) * 282.743 }} transition={{ duration: 1, ease: "linear" }} />
          </svg>
          <div className="flex flex-col items-center z-10">
            <div className="text-8xl font-black tabular-nums tracking-tighter">{formatTime(timeLeft)}</div>
            <div className="text-lg font-mono text-[var(--text-muted)] uppercase tracking-widest mt-2">{percentDone}% done</div>
          </div>
        </div>

        <div className="text-center text-[var(--accent)] font-mono text-sm tracking-widest uppercase animate-pulse">
          {getAccountabilityMessage()}
        </div>
      </div>

      <div className="mt-auto pb-8 flex flex-col items-center gap-4">
        <Button className="w-full" onClick={handleComplete}>
          Outcome Achieved <CheckCircle2 size={20} />
        </Button>
      </div>

      {/* Exit Confirm Modal */}
      <Modal isOpen={showExitConfirm} onClose={() => setShowExitConfirm(false)} title="LEAVE FOCUS MODE?" description="You are in Deep Work. Exiting now means breaking your commitment." confirmText="Confirm Exit" variant="danger" onConfirm={() => { doExit(); setShowExitConfirm(false); }} cancelText="Back to Focus" />

      {/* Strict Mode Exit Modal */}
      <Modal isOpen={showStrictConfirm} onClose={() => setShowStrictConfirm(false)} title="STRICT MODE ACTIVE" description="Strict Mode is enabled. Are you sure you want to abandon this session?" confirmText="Exit Anyway" variant="danger" onConfirm={() => { doExit(); setShowStrictConfirm(false); }} cancelText="Stay Focused" />

      {/* Early Lock Modal */}
      <Modal isOpen={showEarlyLock} onClose={() => setShowEarlyLock(false)} title="LOCKED" description="Early completion is locked until the timer ends. Keep going!" confirmText="OK" onConfirm={() => setShowEarlyLock(false)} cancelText="Close" />

      {/* Early Confirm Modal */}
      <Modal isOpen={showEarlyConfirm} onClose={() => setShowEarlyConfirm(false)} title="COMPLETE EARLY?" description="Are you sure you want to complete this session early?" confirmText="Yes, Complete" onConfirm={() => { dispatch({ type: 'COMPLETE_FOCUS', task: { ...dummyTask, completed: true } }); setShowEarlyConfirm(false); }} cancelText="Keep Going" />
    </motion.div>
  );
};
