import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { Skill } from '../types';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/helpers';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const SkillsScreen = () => {
  const { state, dispatch } = useApp();
  const user = state.user!;
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillIntensity, setNewSkillIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [newSkillHint, setNewSkillHint] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const addSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: Skill = {
      id: generateId(),
      name: newSkillName.trim(),
      intensity: newSkillIntensity,
      lastUsed: 0,
      goalHint: newSkillHint.trim()
    };
    dispatch({ type: 'UPDATE_USER', updates: { skills: [...user.skills, newSkill] } });
    setNewSkillName('');
    setNewSkillHint('');
    setShowAddForm(false);
  };

  const removeSkill = (id: string) => {
    dispatch({ type: 'UPDATE_USER', updates: { skills: user.skills.filter(s => s.id !== id) } });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 flex flex-col font-sans">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })} className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tighter">SKILLS</h2>
      </header>

      <div className="space-y-4 mb-8">
        {user.skills.length === 0 && (
          <Card>
            <p className="text-[var(--text-muted)] text-sm italic text-center py-4">No skills added yet. Add your first skill to unlock personalized actions.</p>
          </Card>
        )}
        {user.skills.map(skill => (
          <div key={skill.id}>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{skill.name}</h3>
                <p className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">
                  Intensity: {skill.intensity} {skill.goalHint && `• ${skill.goalHint}`}
                </p>
              </div>
              <button onClick={() => removeSkill(skill.id)} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </Card>
          </div>
        ))}
      </div>

      {showAddForm ? (
        <Card className="space-y-4">
          <input
            autoFocus type="text" placeholder="Skill name (e.g. Coding, Writing)"
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map(i => (
              <button key={i} onClick={() => setNewSkillIntensity(i)} className={`py-3 rounded-xl text-sm font-bold capitalize border-2 transition-all ${newSkillIntensity === i ? 'border-[var(--accent)] bg-[var(--accent-10)] text-[var(--text-primary)]' : 'border-[var(--border-primary)] text-[var(--text-muted)]'}`}>
                {i}
              </button>
            ))}
          </div>
          <input
            type="text" placeholder="Goal hint (e.g. Ship 1 feature/week)"
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
            value={newSkillHint}
            onChange={(e) => setNewSkillHint(e.target.value)}
          />
          <div className="flex gap-3">
            <Button onClick={addSkill} disabled={!newSkillName.trim()} className="flex-1">Add Skill</Button>
            <Button onClick={() => setShowAddForm(false)} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowAddForm(true)} className="w-full">
          <Plus size={20} /> Add Skill
        </Button>
      )}
    </motion.div>
  );
};
