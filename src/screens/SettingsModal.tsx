import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Settings } from '../types';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { clearAllData } from '../utils/storage';
import { FOCUS_DURATIONS } from '../constants';

export const SettingsModal = () => {
  const { state, dispatch } = useApp();
  const { settings, user } = state;
  const [resetConfirm, setResetConfirm] = useState(false);
  const [strictConfirm, setStrictConfirm] = useState(false);
  const [hardcoreConfirm, setHardcoreConfirm] = useState(false);

  if (!state.showSettings) return null;

  const update = (updates: Partial<Settings>) => {
    dispatch({ type: 'SET_SETTINGS', settings: { ...settings, ...updates } });
  };

  const handleStrictToggle = () => {
    if (!settings.strictMode) {
      // FIX BUG #11: Replace confirm() with modal
      setStrictConfirm(true);
    } else {
      update({ strictMode: false });
    }
  };

  const handleHardcoreToggle = () => {
    if (!settings.hardcoreMode) {
      // FIX BUG #11: Replace confirm() with modal
      setHardcoreConfirm(true);
    } else {
      update({ hardcoreMode: false });
    }
  };

  const handleReset = () => {
    clearAllData();
    window.location.reload();
  };

  const handleExport = () => {
    const data = {
      tasks: state.tasks,
      history: state.events,
      traits: user?.traits,
      settings: state.settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polymath_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-[var(--text-primary)] font-sans">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', show: false })} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="relative bg-[var(--bg-deep)] border border-[var(--border-primary)] rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-tighter">SETTINGS</h3>
              <button onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', show: false })} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={20} /></button>
            </div>

            <div className="space-y-8">
              {/* Profile Info (read-only from User) */}
              {user && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">Profile</p>
                  <div className="space-y-3">
                    <div className="bg-[var(--bg-tertiary)] rounded-2xl p-4"><span className="text-xs text-[var(--text-muted)]">Name:</span> <span className="font-bold">{user.name}</span></div>
                    <div className="bg-[var(--bg-tertiary)] rounded-2xl p-4"><span className="text-xs text-[var(--text-muted)]">Goal:</span> <span className="font-bold">{user.goal || 'Not set'}</span></div>
                    <div className="bg-[var(--bg-tertiary)] rounded-2xl p-4"><span className="text-xs text-[var(--text-muted)]">Blocker:</span> <span className="font-bold capitalize">{user.blocker}</span></div>
                  </div>
                </div>
              )}

              {/* Appearance */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">Appearance</p>
                <div className="space-y-4">
                  {/* TODO Bug #7: Theme toggle currently cosmetic-only — full CSS rework needed */}
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl">
                    <span className="font-bold">Theme</span>
                    <div className="flex gap-2">
                      {(['dark', 'light'] as const).map(t => (
                        <button key={t} onClick={() => update({ theme: t })} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${settings.theme === t ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--bg-deep)] text-[var(--text-muted)]'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  {/* TODO Bug #8: Accent color saved but not fully applied */}
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl">
                    <span className="font-bold">Accent</span>
                    <div className="flex gap-2">
                      {(['green', 'blue', 'orange', 'purple'] as const).map(c => {
                        const colorMap = { green: '#D4FF00', blue: '#3B82F6', orange: '#F97316', purple: '#A855F7' };
                        return (
                          <button key={c} onClick={() => update({ accentColor: c })} className={`w-8 h-8 rounded-full border-2 transition-all ${settings.accentColor === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: colorMap[c] }} />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">Execution</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl">
                    <span className="font-bold">Strict Mode</span>
                    <button onClick={handleStrictToggle} className={`w-12 h-6 rounded-full transition-all ${settings.strictMode ? 'bg-[var(--accent)]' : 'bg-[var(--border-secondary)]'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.strictMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl">
                    <span className="font-bold">Early Completion</span>
                    <select className="bg-[var(--bg-deep)] border border-[var(--border-secondary)] rounded-xl px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none" value={settings.earlyCompletion} onChange={(e) => update({ earlyCompletion: e.target.value as any })}>
                      <option value="ask">Ask</option>
                      <option value="always">Always Allow</option>
                      <option value="lock">Lock</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl">
                    <span className="font-bold">Focus Duration</span>
                    <select className="bg-[var(--bg-deep)] border border-[var(--border-secondary)] rounded-xl px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none" value={settings.focusDuration} onChange={(e) => update({ focusDuration: Number(e.target.value) as any })}>
                      {FOCUS_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notifications — TODO Bug #14: These toggles are cosmetic-only */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">Notifications</p>
                <div className="space-y-4">
                  {([
                    { key: 'taskReminder' as const, label: 'Task Reminders' },
                    { key: 'timerCompletion' as const, label: 'Timer Completion' },
                    { key: 'reEngagement' as const, label: 'Re-engagement' },
                    { key: 'aggressiveNudges' as const, label: 'Aggressive Nudges' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl">
                      <span className="font-bold">{label}</span>
                      <button onClick={() => update({ [key]: !settings[key] } as any)} className={`w-12 h-6 rounded-full transition-all ${settings[key] ? 'bg-[var(--accent)]' : 'bg-[var(--border-secondary)]'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">Advanced</p>
                <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-2xl">
                  <span className="font-bold">Hardcore Mode</span>
                  <button onClick={handleHardcoreToggle} className={`w-12 h-6 rounded-full transition-all ${settings.hardcoreMode ? 'bg-red-500' : 'bg-[var(--border-secondary)]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.hardcoreMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Data */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">Data</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleExport}>Export Data</Button>
                  <Button variant="danger" className="flex-1" onClick={() => setResetConfirm(true)}>Reset All</Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* FIX BUG #11: All confirm() replaced with Modals */}
      <Modal isOpen={resetConfirm} onClose={() => setResetConfirm(false)} title="RESET ALL DATA?" description="This will permanently delete all your tasks, history, traits, and settings. This cannot be undone." confirmText="Reset Everything" variant="danger" onConfirm={handleReset} />
      <Modal isOpen={strictConfirm} onClose={() => setStrictConfirm(false)} title="ENABLE STRICT MODE?" description="Strict Mode requires justification to exit any active task or focus session. Are you sure?" confirmText="Enable" onConfirm={() => { update({ strictMode: true }); setStrictConfirm(false); }} />
      <Modal isOpen={hardcoreConfirm} onClose={() => setHardcoreConfirm(false)} title="⚠️ HARDCORE MODE" description="WARNING: This enables maximum accountability. Failed tasks will reduce adaptation factor significantly. Are you ready?" confirmText="Enable" variant="danger" onConfirm={() => { update({ hardcoreMode: true }); setHardcoreConfirm(false); }} />
    </>
  );
};
