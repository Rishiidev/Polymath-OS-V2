import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Shield, Flame, Trophy, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateLevel } from '../utils/helpers';
import { Card } from '../components/Card';

export const IdentityEngineScreen = () => {
  const { state, dispatch } = useApp();
  const user = state.user!;
  const level = calculateLevel(user.traits);

  const traitData = [
    { key: 'discipline' as const, label: 'Discipline', icon: Shield, desc: 'Executing planned actions consistently.' },
    { key: 'courage' as const, label: 'Courage', icon: Flame, desc: 'Overcoming resistance and taking action when stuck.' },
    { key: 'consistency' as const, label: 'Consistency', icon: Trophy, desc: 'Completing all daily tasks repeatedly.' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex flex-col font-sans">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })} className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">IDENTITY ENGINE</h2>
      </header>

      <div className="mb-8 text-center">
        <div className="w-24 h-24 bg-[var(--accent)] rounded-[28px] flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl font-black text-[var(--accent-text)]">{level}</span>
        </div>
        <p className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest">Level</p>
        <p className="text-2xl font-bold mt-1">{user.name}</p>
      </div>

      <div className="space-y-4 mb-8">
        {traitData.map(({ key, label, icon: Icon, desc }) => (
          <div key={key}>
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-10)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-lg">{label}</h3>
                  <span className="font-mono font-black text-2xl text-[var(--accent)]">{user.traits[key]}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{desc}</p>
                <div className="mt-3 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--accent)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (user.traits[key] / (level * 5)) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            </div>
          </Card>
          </div>
        ))}
      </div>

      <Card className="bg-[var(--accent-5)] border-[var(--accent-10)]">
        <div className="flex gap-3">
          <Info className="text-[var(--accent)] shrink-0" size={16} />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Traits are earned through action. Complete planned tasks to build <b>Discipline</b>.
            Overcome being stuck to build <b>Courage</b>. Complete all daily tasks to build <b>Consistency</b>.
          </p>
        </div>
      </Card>
    </motion.div>
  );
};
