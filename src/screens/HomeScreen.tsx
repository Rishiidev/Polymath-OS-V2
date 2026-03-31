import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Zap, Target, AlertCircle, Plus, Clock, ChevronRight, Trophy, Brain, UserCircle, History } from 'lucide-react';
import { INSIGHTS } from '../constants';
import { useApp } from '../context/AppContext';
import { getStuckTask } from '../utils/taskEngine';
import { Button } from '../components/Button';
import { SortableTask } from '../components/SortableTask';
import { CustomTaskModal } from '../components/CustomTaskModal';
import { Modal } from '../components/Modal';
import { Task } from '../types';

export const HomeScreen = () => {
  const { state, dispatch } = useApp();
  const { user, tasks } = state;
  const [customTaskModal, setCustomTaskModal] = useState(false);
  const [allDoneModal, setAllDoneModal] = useState(false);

  const insight = useMemo(() => INSIGHTS[Math.floor(Date.now() / 86400000) % INSIGHTS.length], []);

  if (!user) return null;

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    dispatch({ type: 'REORDER_TASKS', activeId: active.id, overId: over?.id ?? null });
  };

  const handleStuck = () => {
    dispatch({ type: 'START_TASK', task: getStuckTask() });
  };

  const handleDoItNow = () => {
    const nextTask = tasks.find(t => !t.completed);
    if (nextTask) {
      dispatch({ type: 'START_TASK', task: nextTask });
    } else {
      // FIX BUG #11: Replace alert() with styled modal
      setAllDoneModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-[var(--accent-text)]">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center">
            <Zap className="text-[var(--accent-text)] w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black tracking-tighter text-lg leading-none">POLYMATH</h1>
            <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Action Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'traits' })} className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors" title="Identity Engine">
            <Trophy size={20} />
          </button>
          <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'history' })} className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors" title="History">
            <History size={20} />
          </button>
          <button onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', show: true })} className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors" title="Settings">
            <UserCircle size={20} />
          </button>
        </div>
      </header>

      <main className="p-6 space-y-8 pb-32">
        {/* Focus of the Day */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <Target size={16} />
              <span className="text-xs font-mono uppercase tracking-widest">Focus of the Day</span>
            </div>
            <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'focus_setup' })} className="flex items-center gap-1 text-[var(--accent)] text-[10px] font-mono uppercase tracking-widest hover:opacity-80">
              <Clock size={12} /> Deep Work
            </button>
          </div>
          <p className="text-2xl font-medium leading-tight italic text-gray-200">"{insight}"</p>
        </section>

        {/* Skills Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Brain size={16} />
              <span className="text-xs font-mono uppercase tracking-widest">Active Skills</span>
            </div>
            <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'skills' })} className="text-[var(--accent)] text-[10px] font-mono uppercase tracking-widest hover:opacity-80">Manage</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.skills.length > 0 ? (
              user.skills.map(skill => (
                <div key={skill.id} className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-full text-xs font-bold text-gray-300">{skill.name}</div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-dimmed)] italic">No skills defined. Add some to personalize actions.</p>
            )}
          </div>
        </section>

        {/* Actions Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Zap size={16} />
              <span className="text-xs font-mono uppercase tracking-widest">Daily Micro-Actions</span>
            </div>
            <button onClick={() => setCustomTaskModal(true)} className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.filter(t => t.type === 'planned' || t.type === 'user').map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.filter(t => t.type === 'planned' || t.type === 'user').map(task => (
                  <div key={task.id}>
                    <SortableTask task={task} onStart={(t: Task) => dispatch({ type: 'START_TASK', task: t })} />
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </section>

        {/* Traits Preview */}
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'traits' })} className="w-full flex items-center justify-between p-6 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[32px] group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-10)] flex items-center justify-center text-[var(--accent)]">
              <Trophy size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold">Identity Engine</p>
              <p className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">View your evolution</p>
            </div>
          </div>
          <ChevronRight className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
        </button>

        {/* Bottom Controls */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent pt-12">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <Button variant="secondary" className="flex-1" onClick={handleStuck}>
              <AlertCircle size={20} /> I'm Stuck
            </Button>
            <Button className="flex-1" onClick={handleDoItNow}>
              Do It Now <Zap size={20} fill="currentColor" />
            </Button>
          </div>
        </div>
      </main>

      {/* Custom Task Modal */}
      <CustomTaskModal
        isOpen={customTaskModal}
        onClose={() => setCustomTaskModal(false)}
        onAdd={(task: Task) => {
          dispatch({ type: 'ADD_TASK', task });
          setCustomTaskModal(false);
        }}
      />

      {/* All Done Modal — FIX BUG #11: replaces alert() */}
      <Modal
        isOpen={allDoneModal}
        onClose={() => setAllDoneModal(false)}
        title="ALL ACTIONS COMPLETE"
        description="Daily actions complete. You've built momentum. Come back tomorrow for new challenges."
        confirmText="Got it"
        onConfirm={() => setAllDoneModal(false)}
        cancelText="Close"
      />
    </div>
  );
};
