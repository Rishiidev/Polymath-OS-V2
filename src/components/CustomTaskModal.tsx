import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Task } from '../types';
import { Button } from './Button';
import { generateId } from '../utils/helpers';
import { validateTaskInput } from '../utils/taskEngine';

interface CustomTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void;
}

export const CustomTaskModal = ({ isOpen, onClose, onAdd }: CustomTaskModalProps) => {
  const [text, setText] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmedText = text.trim();
    const validation = validateTaskInput(trimmedText, durationMinutes);
    if (!validation.valid) {
      setError(validation.error || "Invalid task.");
      return;
    }
    onAdd({
      id: generateId(),
      text: trimmedText,
      durationSeconds: durationMinutes * 60,
      type: 'user',
      completed: false,
      timestamp: Date.now(),
      tags: tags.split(',').map(t => t.trim()).filter(t => t !== '')
    });
    setText('');
    setDurationMinutes(15);
    setTags('');
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-6 text-[var(--text-primary)] font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-tighter">ADD ACTION</h3>
              <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Task Description</label>
                <textarea
                  autoFocus
                  placeholder="e.g. Write 5 lines of code for the login page."
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors resize-none h-24"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(null); }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Duration (Minutes)</label>
                <input
                  type="number" min="1" max="30"
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
                  value={durationMinutes}
                  onChange={(e) => { setDurationMinutes(Number(e.target.value)); setError(null); }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Tags (comma separated)</label>
                <input
                  type="text" placeholder="e.g. work, coding, urgent"
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

              <div className="p-4 bg-[var(--accent-5)] border border-[var(--accent-10)] rounded-2xl">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-2">Requirements</p>
                <ul className="text-[10px] text-[var(--text-secondary)] space-y-1">
                  <li>• Must start with an action verb</li>
                  <li>• Must be specific and physical</li>
                  <li>• No vague words (better, more, try)</li>
                  <li>• Under 30 minutes</li>
                </ul>
              </div>

              <Button onClick={handleAdd} className="w-full">
                Add to Engine
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
