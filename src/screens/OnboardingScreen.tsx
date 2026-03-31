import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ArrowRight } from 'lucide-react';
import { User, Blocker } from '../types';
import { Button } from '../components/Button';
import { useApp } from '../context/AppContext';
import { getMicroActions } from '../utils/taskEngine';
import { generateId } from '../utils/helpers';
import { Task } from '../types';

export const OnboardingScreen = () => {
  const { dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<User>>({
    traits: { discipline: 0, courage: 0, consistency: 0 },
    skills: [],
    adaptationFactor: 1
  });

  const handleSubmit = () => {
    const newUser: User = {
      name: data.name || 'User',
      goal: data.goal || '',
      blocker: data.blocker || 'procrastination',
      traits: { discipline: 0, courage: 0, consistency: 0 },
      skills: [],
      adaptationFactor: 1,
      onboarded: true
    };

    dispatch({ type: 'SET_USER', user: newUser });
    const initialTasks = getMicroActions(newUser.goal, newUser.blocker, newUser.skills, newUser.adaptationFactor);
    dispatch({ type: 'SET_TASKS', tasks: initialTasks });

    const firstAction: Task = {
      id: generateId(),
      text: "Commit to your goal: Write down the very first physical step you need to take.",
      durationSeconds: 120,
      type: 'first',
      completed: false,
      timestamp: Date.now()
    };
    dispatch({ type: 'START_TASK', task: firstAction });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex flex-col font-sans">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col justify-center gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mb-6">
                <Zap className="text-[var(--accent-text)] w-8 h-8" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter leading-tight">
                POLYMATH OS<br />
                <span className="text-[var(--accent)]">ACTION ENGINE</span>
              </h1>
              <p className="text-[var(--text-secondary)] text-lg max-w-xs">A system that forces execution when you feel stuck.</p>
            </div>
            <Button onClick={() => setStep(1)}>Initialize System <ArrowRight size={20} /></Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center gap-8">
            <div className="space-y-2">
              <span className="text-[var(--accent)] font-mono text-sm uppercase tracking-widest">01 / Identity</span>
              <h2 className="text-3xl font-bold">What is your name?</h2>
            </div>
            <input
              autoFocus type="text" placeholder="Name"
              className="bg-transparent border-b-2 border-[var(--border-secondary)] py-4 text-3xl focus:border-[var(--accent)] outline-none transition-colors"
              onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
            />
            <Button onClick={() => setStep(2)} disabled={!data.name}>Next <ArrowRight size={20} /></Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center gap-8">
            <div className="space-y-2">
              <span className="text-[var(--accent)] font-mono text-sm uppercase tracking-widest">02 / Purpose</span>
              <h2 className="text-3xl font-bold">What is your main goal?</h2>
            </div>
            <textarea
              autoFocus placeholder="e.g. Build a SaaS, Run a Marathon..."
              className="bg-transparent border-b-2 border-[var(--border-secondary)] py-4 text-2xl focus:border-[var(--accent)] outline-none transition-colors resize-none h-32"
              onChange={(e) => setData(prev => ({ ...prev, goal: e.target.value }))}
            />
            <Button onClick={() => setStep(3)} disabled={!data.goal}>Next <ArrowRight size={20} /></Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center gap-8">
            <div className="space-y-2">
              <span className="text-[var(--accent)] font-mono text-sm uppercase tracking-widest">03 / Resistance</span>
              <h2 className="text-3xl font-bold">What is your biggest blocker?</h2>
            </div>
            <div className="grid gap-4">
              {(['procrastination', 'overthinking', 'inconsistency'] as Blocker[]).map(b => (
                <button
                  key={b}
                  onClick={() => setData(prev => ({ ...prev, blocker: b }))}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    data.blocker === b
                      ? 'border-[var(--accent)] bg-[var(--accent-5)] text-[var(--text-primary)]'
                      : 'border-[var(--border-primary)] text-[var(--text-muted)]'
                  }`}
                >
                  <span className="capitalize font-bold text-xl">{b}</span>
                </button>
              ))}
            </div>
            <Button onClick={handleSubmit} disabled={!data.blocker}>Activate Engine <ArrowRight size={20} /></Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
