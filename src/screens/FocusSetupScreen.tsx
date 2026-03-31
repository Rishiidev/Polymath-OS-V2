import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Zap, Lock, Brain } from 'lucide-react';
import { Skill, FocusSession } from '../types';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/helpers';
import { FOCUS_DURATIONS } from '../constants';
import { Button } from '../components/Button';

export const FocusSetupScreen = () => {
  const { state, dispatch } = useApp();
  const skills = state.user?.skills || [];
  const [duration, setDuration] = useState(25);
  const [outcome, setOutcome] = useState('');
  const [skillId, setSkillId] = useState<string | undefined>(skills[0]?.id);

  const handleStart = () => {
    dispatch({
      type: 'SET_FOCUS_SESSION',
      session: {
        id: generateId(),
        durationMinutes: duration,
        outcome,
        startTime: Date.now(),
        completed: false,
        skillId
      }
    });
    dispatch({ type: 'SET_VIEW', view: 'focus_session' });
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex flex-col font-sans">
      <header className="flex items-center gap-4 mb-12">
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })} className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">DEEP WORK</h2>
      </header>

      <div className="flex-1 flex flex-col gap-12 max-w-md mx-auto w-full">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Select Duration</label>
            <div className="grid grid-cols-3 gap-3">
              {FOCUS_DURATIONS.map(d => (
                <button key={d} onClick={() => setDuration(d)} className={`py-4 rounded-2xl font-black text-xl border-2 transition-all ${duration === d ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]' : 'border-[var(--border-primary)] text-[var(--text-muted)]'}`}>
                  {d}m
                </button>
              ))}
            </div>
          </div>

          {/* FIX BUG #10: Handle empty skills array */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Select Skill</label>
            {skills.length > 0 ? (
              <select
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-2xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
                value={skillId}
                onChange={(e) => setSkillId(e.target.value || undefined)}
              >
                <option value="">General (no specific skill)</option>
                {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <div className="p-4 border border-dashed border-[var(--border-secondary)] rounded-2xl flex items-center gap-3">
                <Brain size={20} className="text-[var(--text-dimmed)]" />
                <p className="text-xs text-[var(--text-muted)] italic">No skills added yet. Focus on your general goal.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Defined Outcome</label>
            <textarea
              autoFocus
              placeholder="What will be physically different after this session?"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-2xl p-6 text-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors resize-none h-40"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-[var(--accent-5)] border border-[var(--accent-10)] rounded-[32px] flex gap-4">
          <Lock className="text-[var(--accent)] shrink-0" size={20} />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Entering Deep Work locks the system. You are committing to this outcome. Leaving early requires a justification.
          </p>
        </div>

        <Button onClick={handleStart} disabled={!outcome.trim()} className="w-full py-6 text-xl">
          Enter Focus Mode <Zap size={24} fill="currentColor" />
        </Button>
      </div>
    </motion.div>
  );
};
